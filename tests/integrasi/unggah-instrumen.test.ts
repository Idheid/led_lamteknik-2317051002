import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek, instrumenAktifUntuk } from "@/modules/led/data/proyek";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import {
  aktifkanVersiCek, bacaInfoEkstraksi, buatVersiJenjang, dataCekInstrumen, konfirmasiButir, mulaiEkstraksi, simpanButirCek,
  unggahBerkasInstrumen,
} from "@/modules/led/data/unggah-instrumen";
import { prosesEkstraksiInstrumen } from "@/modules/led/proses/instrumen";
import { berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

process.env.GENERATE_JEDA_MAKS_MS = "0";

const FIKSTUR = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur/instrumen", n));
const BERKAS = {
  template: { nama: "Template LEDPS 2025.docx", isi: FIKSTUR("template-ledps-2025.docx") },
  matriks: { nama: "Matriks Sarjana 2025.pdf", isi: FIKSTUR("matriks-sarjana-2025.pdf") },
  pedoman: { nama: "Pedoman Penilaian 2025.pdf", isi: FIKSTUR("pedoman-penilaian-2025.pdf") },
};

interface ButirSeed { kode: string; no: number; sub: string | null; bobot: number; jenis: string; subBagian: string | string[]; deskriptorSkor4: string }
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json"), "utf8")) as {
  butir: ButirSeed[];
  bagian: { kode: string; subBagian: { kode: string; berlakuUntuk: string[]; jenjangOverride?: string[] }[] }[];
};
const KODE_RUMUS = new Set(["6-I", "6-II", "9", "10", "11", "18", "19", "23", "25", "26", "27", "28", "30", "31", "32", "33", "34", "35", "36", "37", "40", "41", "42", "43-I", "43-II", "44", "45", "46", "47", "49", "50", "51", "52"]);

let admin: Pengguna;
let pj: Pengguna;
const tiruan = { panggilan: 0, gagalSetelah: Infinity, prompt: [] as string[] };

/**
 * Model tiruan yang "membaca" prompt: untuk setiap baris matriks dan setiap baris bobot di prompt, kembalikan butir
 * dengan sub-indikator sesuai tabel bobot dan usulan sub-bagian/jenis/rumus seperti data instrumen bawaan.
 */
function keluaran(pengguna: string) {
  const bobot = [...pengguna.matchAll(/^- (\d+)(?:-([IVX]+))?: bobot /gm)].map((m) => ({ no: m[1], sub: m[2] ?? null }));
  const nomor = [...pengguna.matchAll(/^### Baris No (\d+)/gm)].map((m) => m[1]);
  const butir = nomor.flatMap((no) => {
    const seed = SEED.butir.filter((b) => String(b.no) === no);
    const subs = bobot.filter((b) => b.no === no);
    // butir 58: tabel bobot memberi satu bobot, tetapi matriks punya dua sub-indikator (I dan II)
    const daftar = seed.length > 1 && subs.length <= 1 ? seed.map((s) => ({ no, sub: s.sub })) : subs.length ? subs : [{ no, sub: null }];
    return daftar.map((x) => {
      const s = seed.find((b) => (b.sub ?? null) === x.sub) ?? seed[0];
      const kode = x.sub ? `${no}-${x.sub}` : no;
      return {
        no, sub: x.sub, elemen: `Elemen ${kode}`, indikator: `Indikator ${kode}`,
        skor4: s?.deskriptorSkor4 ?? "", skor3: "Skor 3", skor2: "Skor 2", skor1: "", skor0: "",
        tabelLkps: [], jenis: (s?.jenis ?? "narasi") as "narasi" | "angka",
        kodeRumus: KODE_RUMUS.has(kode) ? kode : null,
        subBagian: s ? [s.subBagian].flat() : [],
      };
    });
  });
  return { butir };
}

function galatKuota(): APICallError {
  return new APICallError({
    message: "Resource has been exhausted (e.g. check quota).",
    url: "https://generativelanguage.googleapis.com/v1beta/models/x:generateContent",
    requestBodyValues: {},
    statusCode: 429,
    responseBody: JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED", details: [{ "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } }),
    isRetryable: true,
  });
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: [], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false });
  aturModelUji((_kunci, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => {
      const pengguna = opsi.prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .map((c) => ("text" in c ? c.text : "")).join("\n");
      tiruan.prompt.push(pengguna);
      if (tiruan.panggilan >= tiruan.gagalSetelah) throw galatKuota();
      tiruan.panggilan += 1;
      return {
        content: [{ type: "text", text: JSON.stringify(keluaran(pengguna)) }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: { inputTokens: { total: 3000, noCache: 3000, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 2000, text: 2000, reasoning: undefined } },
        warnings: [],
      };
    },
  }));
  await tambahKunci(admin, { label: "Kunci fakultas", kunci: "AIzaSyKunciInstrumenUji00000000000000001" });
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("Revisi 19 Okt tahap 4: unggah instrumen Sarjana (template, matriks, pedoman) → ekstraksi → cek → aktifkan", async () => {
  const lama = await instrumenAktifUntuk("S1");
  assert.ok(lama, "versi bawaan aktif untuk S1");
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "22201", identitas: {} }));
  const ledLama = await buatProyek(pj, { nama: "LED Sipil", tahunPengajuan: 2026 });

  await assert.rejects(buatVersiJenjang(pj, { nama: "x", kode: "X", jenjang: "S1", tahunInstrumen: 2025 }), GalatAkses, "Tim Prodi tidak mengurus instrumen");
  const versi = await buatVersiJenjang(admin, { nama: "Instrumen LAM Teknik 2025 Sarjana", kode: "LAMTEKNIK-2025-S1", jenjang: "S1", tahunInstrumen: 2025, peraturan: ["Perlem LAM Teknik 2025"] });
  assert.equal(versi.status, "draf");
  assert.equal(versi.aktif, false);
  assert.ok(await prisma.tabelLkpsAcuan.count({ where: { versiId: versi.id } }) > 0, "tabel LKPS acuan disalin dari versi rujukan");

  await assert.rejects(mulaiEkstraksi(admin, versi.id), GalatPengguna, "berkas belum lengkap");
  await assert.rejects(unggahBerkasInstrumen(admin, versi.id, "matriks", { nama: "a.pdf", isi: Buffer.from("bukan pdf") }), GalatPengguna);
  await unggahBerkasInstrumen(admin, versi.id, "template", BERKAS.template);
  await unggahBerkasInstrumen(admin, versi.id, "matriks", BERKAS.matriks);
  const { usulanHalamanBobot } = await unggahBerkasInstrumen(admin, versi.id, "pedoman", BERKAS.pedoman);
  assert.equal(usulanHalamanBobot, "223-227", "letak tabel bobot Sarjana terdeteksi di Pedoman Penilaian");
  assert.equal((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versi.id } })).halamanBobot, "223-227");

  await mulaiEkstraksi(admin, versi.id);
  assert.equal(await prosesEkstraksiInstrumen(versi.id), "selesai");
  assert.equal(await prosesEkstraksiInstrumen(versi.id), "dilewati", "ekstraksi selesai tidak diproses ulang");

  // template diurai tanpa AI: sub-bagian dan kodenya sama dengan instrumen bawaan untuk jenjang Sarjana
  // struktur template semua jenjang disimpan (untuk ekspor); sub-bagian yang berlaku untuk S1 sama dengan bawaan
  const sub = await prisma.subBagian.findMany({ where: { bagian: { versiId: versi.id } }, orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }] });
  const harap = (j: string) => SEED.bagian.flatMap((b) => b.subBagian.filter((s) => (s.jenjangOverride?.length ? s.jenjangOverride : s.berlakuUntuk).includes(j)).map((s) => s.kode));
  for (const j of ["S1", "D3", "S2", "PPI"]) {
    assert.deepEqual(sub.filter((s) => berlakuUntukJenjang(s, j)).map((s) => s.kode), harap(j), `sub-bagian jenjang ${j}`);
  }
  assert.equal(sub.length, SEED.bagian.flatMap((b) => b.subBagian).length, "seluruh sub-bagian template tersimpan");

  // AI dipanggil per kelompok kecil baris matriks; prompt memuat tabel bobot, daftar sub-bagian, katalog rumus
  const info = bacaInfoEkstraksi((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versi.id } })).ekstraksi)!;
  assert.equal(info.jumlahBaris, 60, "60 baris butir di Matriks Sarjana");
  assert.equal(tiruan.panggilan, info.jumlahKelompok);
  assert.ok(tiruan.panggilan >= 8, "tidak dikirim sekaligus");
  assert.match(tiruan.prompt[0], /## TABEL BOBOT[\s\S]*- 1: bobot 1\.14/);
  assert.match(tiruan.prompt[0], /## DAFTAR SUB-BAGIAN TEMPLATE LED[\s\S]*C\.1-IKU-a \| /);
  assert.match(tiruan.prompt[0], /## KATALOG RUMUS[\s\S]*6-I \| Relevansi kerja sama/);

  // 60 nomor butir → 72 butir dan sub-indikator, sama dengan data butir bawaan
  const butir = await prisma.butirPenilaian.findMany({ where: { versiId: versi.id }, orderBy: { urutan: "asc" }, include: { subBagian: { include: { subBagian: true } } } });
  assert.equal(butir.length, 72);
  assert.deepEqual(butir.map((b) => b.kode), SEED.butir.map((b) => b.kode));
  for (const b of butir) {
    const s = SEED.butir.find((x) => x.kode === b.kode)!;
    assert.equal(Number(b.bobot), s.bobot, `bobot ${b.kode}`);
    assert.deepEqual(b.subBagian.map((x) => x.subBagian.kode).sort(), [s.subBagian].flat().sort(), `sub-bagian ${b.kode}`);
    assert.equal(b.dikonfirmasi, false);
    assert.ok(b.usulanAi.includes("subBagian") && b.usulanAi.includes("jenis") && b.usulanAi.includes("kodeRumus"), "usulan AI ditandai");
  }
  const b58 = butir.filter((b) => b.no === 58);
  assert.deepEqual(b58.map((b) => b.kode), ["58-I", "58-II"]);
  assert.ok(b58.every((b) => b.usulanAi.includes("bobot")), "bobot 2,92 dibagi rata dua sub-indikator dan ditandai");
  assert.equal(butir.find((b) => b.kode === "41")?.kodeRumus, "41");
  assert.deepEqual(butir.find((b) => b.kode === "1")?.unsurSkor4.length, 4, "daftar cek skor 4 dari deskriptor resmi");

  // pemeriksaan otomatis: total bobot 100,01 diterima; aktivasi menunggu semua butir dicek
  let cek = (await dataCekInstrumen(admin, versi.id)).cek;
  assert.equal(cek.totalBobot, 100.01);
  assert.deepEqual(cek.galat, ["72 butir belum dicek dan dikonfirmasi."]);
  await assert.rejects(aktifkanVersiCek(admin, versi.id), /belum dicek/);

  // PJ menyunting satu butir (bobot salah) → pemeriksaan bobot menolak, lalu diperbaiki
  const b1 = butir[0];
  const masukan = {
    jenjang: "S1" as const, kode: b1.kode, no: b1.no, sub: b1.sub ?? "", urutan: b1.urutan, bagianKode: b1.bagianKode, elemen: "Kekhasan VMTS",
    indikator: b1.indikator, bobot: 2, jenis: b1.jenis, tabelLkps: ["1"], deskriptorSkor4: b1.deskriptorSkor4, unsurSkor4: [],
    subBagianIds: b1.subBagian.map((x) => x.subBagianId), catatan: "",
  };
  await simpanButirCek(admin, versi.id, b1.id, masukan);
  for (const b of butir.slice(1)) await konfirmasiButir(admin, versi.id, b.id);
  cek = (await dataCekInstrumen(admin, versi.id)).cek;
  assert.equal(cek.belumDikonfirmasi, 0);
  assert.match(cek.galat.join(" "), /Total bobot 100,87/);
  await assert.rejects(aktifkanVersiCek(admin, versi.id), /Total bobot/);
  await simpanButirCek(admin, versi.id, b1.id, { ...masukan, bobot: 1.14 });
  const disunting = await prisma.butirPenilaian.findUniqueOrThrow({ where: { id: b1.id } });
  assert.equal(disunting.elemen, "Kekhasan VMTS");
  assert.deepEqual(disunting.usulanAi, []);
  assert.equal(disunting.unsurSkor4.length, 4);

  await aktifkanVersiCek(admin, versi.id);
  const aktif = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versi.id } });
  assert.equal(aktif.status, "aktif");
  assert.equal(aktif.dicekOlehId, admin.id);
  assert.equal((await instrumenAktifUntuk("S1"))?.id, versi.id, "LED baru memakai instrumen yang baru diaktifkan");
  const versiLama = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: lama.id } });
  assert.equal(versiLama.aktif, false, "versi lama jenjang yang sama dinonaktifkan");
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: ledLama.id } })).versiId, lama.id, "LED lama tetap memakai versi lamanya");
  await assert.rejects(unggahBerkasInstrumen(admin, versi.id, "matriks", BERKAS.matriks), GalatPengguna, "versi aktif tidak bisa diubah");

  // perbaikan 2 Nov 2026 (I1): sidik jari versi yang diaktifkan dipelajari; template resmi sudah ada di sidik-jari.json
  const dipelajari = await prisma.sidikJariInstrumen.findMany({ orderBy: { jenis: "asc" } });
  assert.deepEqual(dipelajari.map((x) => `${x.jenis}:${x.tahun}:${x.status}`), ["matriks:2025:resmi", "pedoman:2025:resmi"]);
  assert.equal(dipelajari[0].jenjang, "S1");
});

test("Ekstraksi berhenti rapi saat kuota habis, lalu dilanjutkan dari kelompok yang sama setelah kunci baru diisi", async () => {
  const versi = await buatVersiJenjang(admin, { nama: "Instrumen Sarjana (salinan uji)", kode: "LAMTEKNIK-2025-S1-B", jenjang: "S1", tahunInstrumen: 2025 });
  const dikenali: string[] = [];
  for (const jenis of ["template", "matriks", "pedoman"] as const) dikenali.push(...(await unggahBerkasInstrumen(admin, versi.id, jenis, BERKAS[jenis])).info);
  assert.ok(dikenali.includes("Berkas dikenali: Matriks Penilaian instrumen 2025 (LAMTEKNIK-2025-S1)."), "berkas versi aktif dikenali pada unggahan berikutnya");
  tiruan.panggilan = 0;
  tiruan.gagalSetelah = 3;
  await mulaiEkstraksi(admin, versi.id);
  assert.equal(await prosesEkstraksiInstrumen(versi.id), "tertunda");
  let info = bacaInfoEkstraksi((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versi.id } })).ekstraksi)!;
  assert.equal(info.status, "tertunda");
  assert.equal(info.kelompokSelesai, 3);
  assert.match(info.pesan ?? "", /kunci/i);
  const sebagian = await prisma.butirPenilaian.count({ where: { versiId: versi.id } });
  assert.ok(sebagian > 0 && sebagian < 72, "butir dari kelompok yang sudah selesai tetap tersimpan");

  tiruan.gagalSetelah = Infinity;
  const k = await tambahKunci(admin, { label: "Kunci baru", kunci: "AIzaSyKunciInstrumenUji00000000000000002" });
  assert.equal(k.ekstraksiDilanjutkan, 1);
  assert.equal(await prosesEkstraksiInstrumen(versi.id), "selesai");
  info = bacaInfoEkstraksi((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: versi.id } })).ekstraksi)!;
  assert.equal(info.kelompokSelesai, info.jumlahKelompok);
  assert.equal(await prisma.butirPenilaian.count({ where: { versiId: versi.id } }), 72, "tidak ada butir ganda setelah dilanjutkan");

  // ekstrak ulang menghapus hasil lama
  await mulaiEkstraksi(admin, versi.id, { ulang: true });
  assert.equal(await prisma.butirPenilaian.count({ where: { versiId: versi.id } }), 0);
  assert.equal(await prosesEkstraksiInstrumen(versi.id), "selesai");
  assert.equal(await prisma.butirPenilaian.count({ where: { versiId: versi.id } }), 72);
});

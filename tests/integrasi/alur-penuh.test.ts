import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { simpanProdi } from "@/modules/bersama/data/organisasi";
import { buatProyek, simpanJawaban } from "@/modules/led/data/proyek";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import { unggahLkps } from "@/modules/led/data/lkps";
import { muatKriteria } from "@/modules/led/data/kriteria";
import { nilaiButirProyek, simpanNilaiManual } from "@/modules/led/data/nilai-butir";
import { drafBagian, mulaiGenerate, tandaiBagianSelesai } from "@/modules/led/data/generate";
import { berkasEkspor, mulaiEkspor, periksaEkspor, simpanTimPenyusun } from "@/modules/led/data/ekspor";
import {
  aktifkanVersiCek, buatVersiJenjang, dataCekInstrumen, konfirmasiButir, mulaiEkstraksi, unggahBerkasInstrumen,
} from "@/modules/led/data/unggah-instrumen";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesEkstraksiInstrumen } from "@/modules/led/proses/instrumen";
import { prosesTugasGenerate, susunKonteks, urutanSubBagian } from "@/modules/led/proses/generate";
import { prosesEkspor } from "@/modules/led/proses/ekspor";
import { pecahBody, teksElemen } from "@/modules/led/ekspor/xml";
import { bersihkanDb, buatSuperAdmin, siapkanPj } from "./bantu";

/**
 * Revisi 19 Okt 2026 tahap 6: alur penuh dari basis data kosong (tanpa instrumen bawaan):
 * tambah prodi → unggah instrumen S1 → cek dan aktifkan → buat LED → isi satu kriteria → generate → ekspor Word.
 */

process.env.GENERATE_JEDA_MAKS_MS = "0";

const fikstur = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur", n));
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json"), "utf8")) as {
  butir: { kode: string; no: number; sub: string | null; jenis: string; subBagian: string | string[]; deskriptorSkor4: string }[];
};
const RUMUS = new Set(["26", "28", "30", "41"]);
const JAWABAN_C1 = "Visi keilmuan program studi ditinjau setiap tahun dalam lokakarya kurikulum bersama 24 pemangku kepentingan.";

let pj: Pengguna;
let proyekId: string;

function teksPengguna(opsi: { prompt: { role: string; content: unknown }[] }) {
  return opsi.prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
    .map((c: { text?: string }) => c.text ?? "").join("\n");
}

/** Keluaran ekstraksi tiruan: butir per baris bobot, sub-bagian dan jenis seperti data instrumen bawaan. */
function ekstraksi(pengguna: string) {
  const bobot = [...pengguna.matchAll(/^- (\d+)(?:-([IVX]+))?: bobot /gm)].map((m) => ({ no: m[1], sub: m[2] ?? null }));
  const butir = [...pengguna.matchAll(/^### Baris No (\d+)/gm)].flatMap(([, no]) => {
    const seed = SEED.butir.filter((b) => String(b.no) === no);
    const subs = bobot.filter((b) => b.no === no);
    const daftar = seed.length > 1 && subs.length <= 1 ? seed.map((s) => ({ sub: s.sub })) : subs.length ? subs : [{ sub: null }];
    return daftar.map((x) => {
      const s = seed.find((b) => (b.sub ?? null) === x.sub) ?? seed[0];
      const kode = x.sub ? `${no}-${x.sub}` : no;
      // butir 27 sengaja tanpa rumus: nilainya diisi manual oleh PJ
      const jenis = s?.jenis === "angka" ? "angka" : "narasi";
      return {
        no, sub: x.sub, elemen: `Elemen ${kode}`, indikator: `Indikator ${kode}`, skor4: s?.deskriptorSkor4 ?? "Deskriptor", skor3: "", skor2: "", skor1: "", skor0: "",
        tabelLkps: [], jenis, kodeRumus: jenis === "angka" && RUMUS.has(kode) ? kode : null, subBagian: s ? [s.subBagian].flat() : [],
      };
    });
  });
  return { butir };
}

/** Narasi tiruan yang patuh: mengutip sumber yang ada di prompt dan melaporkan semua unsur. */
function narasi(pengguna: string) {
  const sumber = [...new Set([...pengguna.matchAll(/\[((?:D\d+)|(?:T-[\w.-]+)|(?:M-[\w-]+)|J)\]/g)].map((m) => m[1]))];
  const kutip = sumber.length ? sumber.slice(0, 2) : ["J"];
  const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((m) =>
    m[2].split(/; (?=\(\d+\))/).map((u) => ({ butir: m[1], unsur: u.trim(), status: "terpenuhi" as const, sumber: kutip })));
  const kalimat = pengguna.includes(JAWABAN_C1)
    ? "Visi keilmuan ditinjau setiap tahun dalam lokakarya kurikulum bersama pemangku kepentingan."
    : "Program studi menjalankan kebijakan secara terencana dan terdokumentasi.";
  return { paragraf: [{ teks: kalimat, sumber: kutip }, { teks: "Hasil pemantauan ditindaklanjuti dalam rapat program studi.", sumber: kutip }], unsur, dokumenKurang: [] };
}

before(async () => {
  await bersihkanDb();
  const admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => {
      const pengguna = teksPengguna(opsi as never);
      const keluaran = pengguna.includes("## BARIS MATRIKS") ? ekstraksi(pengguna) : narasi(pengguna);
      return {
        content: [{ type: "text", text: JSON.stringify(keluaran) }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 50, text: 50, reasoning: undefined } },
        warnings: [],
      };
    },
  }));
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: [], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false });
  await tambahKunci(pj, { label: "Kunci fakultas", kunci: "AIzaSyKunciAlurPenuh00000000000000000001" });
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("Alur penuh: tambah prodi → unggah instrumen S1 → buat LED → isi satu kriteria → generate → ekspor Word", async () => {
  // 1. prodi; LED belum bisa dibuat karena instrumen Sarjana belum ada
  const prodi = await simpanProdi(pj, {
    nama: "Teknik Elektro", jenjang: "S1", kodePddikti: "20201", akreditasiBerlakuSampai: "2027-03-31",
    identitas: { kota: "Bandar Lampung", peringkatAkreditasi: "Baik Sekali" },
  });
  await assert.rejects(buatProyek(pj, { prodiId: prodi.id, nama: "LED Elektro 2026", tahunPengajuan: 2026 }), /Instrumen jenjang Sarjana belum aktif/);

  // 2. unggah instrumen Sarjana, ekstraksi, cek, aktifkan
  const versi = await buatVersiJenjang(pj, { nama: "Instrumen LAM Teknik 2025 Sarjana", kode: "LAMTEKNIK-2025-S1", jenjang: "S1" });
  await unggahBerkasInstrumen(pj, versi.id, "template", { nama: "template.docx", isi: fikstur("instrumen/template-ledps-2025.docx") });
  await unggahBerkasInstrumen(pj, versi.id, "matriks", { nama: "matriks.pdf", isi: fikstur("instrumen/matriks-sarjana-2025.pdf") });
  await unggahBerkasInstrumen(pj, versi.id, "pedoman", { nama: "pedoman.pdf", isi: fikstur("instrumen/pedoman-penilaian-2025.pdf") });
  await mulaiEkstraksi(pj, versi.id);
  assert.equal(await prosesEkstraksiInstrumen(versi.id), "selesai");
  const cek = await dataCekInstrumen(pj, versi.id);
  assert.equal(cek.butir.length, 72);
  assert.ok(await prisma.tabelLkpsAcuan.count({ where: { versiId: versi.id } }) > 20, "tabel LKPS acuan dari kerangka bawaan");
  for (const b of cek.butir) await konfirmasiButir(pj, versi.id, b.id);
  await aktifkanVersiCek(pj, versi.id);

  // 3. LED baru otomatis memakai instrumen Sarjana yang baru diaktifkan; TS dari tahun pengajuan
  const led = await buatProyek(pj, { prodiId: prodi.id, nama: "LED Elektro 2026", tahunPengajuan: 2026 });
  proyekId = led.id;
  assert.equal(led.versiId, versi.id);
  assert.equal(led.tsTahunMulai, 2025);
  const lkps = await unggahLkps(pj, proyekId, { nama: "lkps.xlsx", isi: fikstur("lkps-contoh-s1.xlsx") });
  await prosesBerkasLkps(lkps.id);

  // 4. isi satu kriteria (C.1) halaman demi halaman
  const c1 = (await muatKriteria(pj, proyekId, "C.1"))!;
  for (const s of c1.subGenerate) await simpanJawaban(pj, { proyekId, subBagianKode: s.kode, isi: JAWABAN_C1 });
  assert.ok(Object.values((await muatKriteria(pj, proyekId, "C.1"))!.statusSub).every((x) => x === "ada_jawaban"));
  // butir angka: 26 berumus dihitung dari LKPS; 27 tanpa rumus diisi manual
  const nilai = await nilaiButirProyek(pj, proyekId);
  assert.equal(nilai.daftar.find((x) => x.butir === "26")?.sumber, "rumus");
  assert.equal(nilai.daftar.find((x) => x.butir === "27")?.perluManual, true);
  await simpanNilaiManual(pj, proyekId, { butirKode: "27", nilai: "37,5%", keterangan: "15 dari 40 DTPS bergelar doktor" });
  assert.ok((await susunKonteks(proyekId, "C.4-IKU-a.iii")).konteks.metrik.some((m) => m.id === "M-NILAI-27"));

  // 5. generate: kriteria dulu, lalu bagian ringkasan (kata pengantar, ringkasan, Bab III, Bab IV)
  const bagian: string[] = [];
  for (const b of await prisma.bagian.findMany({ where: { versiId: versi.id }, orderBy: { urutan: "asc" } })) {
    if ((await urutanSubBagian({ versiId: versi.id, jenjang: "S1" }, b.kode)).length) bagian.push(b.kode);
  }
  const akhir = ["AWAL", "III", "IV"];
  for (const k of [...bagian.filter((x) => !akhir.includes(x)), ...bagian.filter((x) => akhir.includes(x))]) {
    const t = await mulaiGenerate(pj, proyekId, k);
    assert.equal(await prosesTugasGenerate(t.id), "selesai", `generate ${k}`);
  }
  const drafC1 = await drafBagian(pj, proyekId, "C.1");
  assert.match(JSON.stringify(drafC1["C.1-IKU-a"].aktif!.isi), /lokakarya kurikulum/, "jawaban penyusun menjadi sumber narasi");
  await assert.rejects(mulaiEkspor(pj, proyekId), GalatPengguna, "belum ditandai selesai");
  await simpanTimPenyusun(pj, proyekId, { dosen: [{ nama: "Dr. Ani Lestari", nomorInduk: "0012345678", jabatan: "Ketua Tim", tugas: "Koordinator" }], tendik: [] });
  for (const k of bagian) await tandaiBagianSelesai(pj, proyekId, k);
  // ekspor final menunggu asesor menyatakan Layak diajukan (revisi 22 Okt 2026); di sini diatur langsung
  await prisma.proyekLED.update({ where: { id: proyekId }, data: { statusReview: "layak" } });
  assert.deepEqual((await periksaEkspor(pj, proyekId)).galat, []);

  // 6. ekspor Word memakai Template LED yang diunggah bersama instrumen
  const e = await mulaiEkspor(pj, proyekId);
  assert.equal(await prosesEkspor(e.id), "siap");
  const { isi } = await berkasEkspor(pj, e.id);
  const doc = await (await JSZip.loadAsync(isi)).file("word/document.xml")!.async("string");
  const teks = pecahBody(doc).elemen.map((el) => teksElemen(el.xml)).join("\n");
  assert.ok(!doc.includes("{{"), "tidak ada placeholder tersisa");
  assert.ok(!/disampaikan oleh pengusul/i.test(doc), "catatan biru template hilang");
  assert.ok(teks.includes("PROGRAM SARJANA TEKNIK ELEKTRO"));
  assert.ok(teks.includes("Visi keilmuan ditinjau setiap tahun dalam lokakarya kurikulum"), "narasi C.1 ada di berkas Word");
  assert.ok(teks.includes("Dr. Ani Lestari"));
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek, simpanJawaban } from "@/modules/led/data/proyek";
import { unggahLkps } from "@/modules/led/data/lkps";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import {
  bandingkanVersi, drafBagian, mulaiGenerate, pulihkanVersi, simpanSuntingan, tandaiBagianSelesai, tugasProyek,
} from "@/modules/led/data/generate";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { prosesTugasGenerate, susunKonteks } from "@/modules/led/proses/generate";
import { bacaDokumen, paragrafBersumber, teksDokumen } from "@/modules/led/domain/narasi";
import { muatKriteria } from "@/modules/led/data/kriteria";
import { nilaiButirProyek, simpanNilaiManual } from "@/modules/led/data/nilai-butir";
import { capaianButirProyek, simpanTarget } from "@/modules/led/data/target-butir";
import { hitungCapaian, teksCapaian } from "@/modules/led/domain/capaian";
import { susunSistem } from "@/modules/led/domain/prompt";
import { halamanBagian } from "@/modules/led/data/proyek";
import { peringatanSebelumGenerate, posisiSub, subLanjutkan } from "@/modules/led/domain/navigasi";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

process.env.GENERATE_JEDA_MAKS_MS = "0";

const XLSX = readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx"));
const KUNCI_A = "AIzaSyKunciUjiA0000000000000000000000001";
const KUNCI_B = "AIzaSyKunciUjiB0000000000000000000000002";
const URUTAN_C1 = ["C.1-IKU-a", "C.1-IKU-b", "C.1-IKU-c", "C.1-LB", "C.1-KEB", "C.1-AF", "C.1-SWOT"];

let pj: Pengguna;
let pjLain: Pengguna;
let adminUji: Pengguna;
let prodiId: string;
let proyekId: string;
let proyekLainId: string;

// ------------------------------------------------------------------ model LLM tiruan

interface Panggilan {
  apiKey: string;
  model: string;
  sistem: string;
  pengguna: string;
}

const tiruan = {
  panggilan: [] as Panggilan[],
  /** kunci yang kuota hariannya habis setelah n panggilan berhasil */
  kuotaKunci: new Map<string, number>(),
  berhasilPerKunci: new Map<string, number>(),
  /** jumlah galat batas per menit yang dikembalikan sebelum berhasil */
  batasPerMenit: 0,
  /** sisipkan angka karangan ke narasi */
  karang: false,
  versiTeks: 0,
};

function galat429(perHari: boolean): APICallError {
  const metrik = perHari ? "GenerateRequestsPerDayPerProjectPerModel-FreeTier" : "GenerateRequestsPerMinutePerProjectPerModel-FreeTier";
  return new APICallError({
    message: "Resource has been exhausted (e.g. check quota).",
    url: "https://generativelanguage.googleapis.com/v1beta/models/x:generateContent",
    requestBodyValues: {},
    statusCode: 429,
    responseBody: JSON.stringify({
      error: {
        code: 429, status: "RESOURCE_EXHAUSTED", message: "You exceeded your current quota.",
        details: [
          { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: metrik }] },
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "2s" },
        ],
      },
    }),
    isRetryable: true,
  });
}

/** Keluaran tiruan yang patuh: mengutip sumber yang ada di prompt dan melaporkan semua unsur. */
function keluaranTiruan(pengguna: string) {
  const sumber = [...new Set([...pengguna.matchAll(/\[((?:D\d+)|(?:T-[\w.-]+)|(?:M-[\w-]+)|J)\]/g)].map((m) => m[1]))];
  const kutip = sumber.length ? sumber.slice(0, 2) : ["J"];
  const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((m) =>
    m[2].split(/; (?=\(\d+\))/).map((u) => ({ butir: m[1], unsur: u.trim(), status: "sebagian" as const, sumber: kutip })));
  const metrik = /\[M-NDTPS\] [^=]+= ([\d.,]+)/.exec(pengguna)?.[1];
  tiruan.versiTeks += 1;
  return {
    paragraf: [
      { teks: `Program studi menjalankan kebijakan mutu secara konsisten (draf v${tiruan.versiTeks}).${metrik ? ` Jumlah dosen tetap yang dihitung sistem adalah ${metrik} orang.` : ""}`, sumber: kutip },
      { teks: tiruan.karang ? "Sebanyak 97,3% lulusan bekerja dan prodi memiliki 1.234 mitra industri." : "Pelaksanaan dipantau melalui *audit* mutu internal setiap tahun. [BELUM ADA BUKTI: laporan audit mutu internal]", sumber: kutip },
    ],
    unsur,
    dokumenKurang: ["Laporan audit mutu internal"],
    catatanUntukPenyusun: "Lengkapi bukti audit.",
  };
}

function modelTiruan(apiKey: string, kodeModel: string) {
  return new MockLanguageModelV4({
    modelId: kodeModel,
    doGenerate: async (opsi) => {
      const sistem = opsi.prompt.filter((m) => m.role === "system").map((m) => String(m.content)).join("\n");
      const pengguna = opsi.prompt.filter((m) => m.role === "user")
        .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .map((c) => ("text" in c ? c.text : "")).join("\n");
      tiruan.panggilan.push({ apiKey, model: kodeModel, sistem, pengguna });
      const kuota = tiruan.kuotaKunci.get(apiKey);
      const berhasil = tiruan.berhasilPerKunci.get(apiKey) ?? 0;
      if (kuota !== undefined && berhasil >= kuota) throw galat429(true);
      if (tiruan.batasPerMenit > 0) {
        tiruan.batasPerMenit -= 1;
        throw galat429(false);
      }
      tiruan.berhasilPerKunci.set(apiKey, berhasil + 1);
      return {
        content: [{ type: "text", text: JSON.stringify(keluaranTiruan(pengguna)) }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: {
          inputTokens: { total: 1200, noCache: 1200, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 300, text: 300, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
}

async function docxTeks(paragraf: string[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  aturModelUji(modelTiruan);
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  // revisi 31 Okt 2026: LED kedua milik prodi lain dengan Tim Prodi sendiri; Admin UPPS hanya membaca LED
  adminUji = admin;
  const { prodi, tim } = await siapkanProdi(admin, { nama: "Teknik Contoh", jenjang: "S1", kodePddikti: "11111", identitas: {} });
  ({ tim: pjLain } = await siapkanProdi(admin, { nama: "Teknik Lain", jenjang: "S1", kodePddikti: "22222", identitas: {} }));
  pj = tim;
  prodiId = prodi.id;
  proyekId = (await buatProyek(pj, { nama: "LED Uji", tahunPengajuan: 2026 })).id;
  proyekLainId = (await buatProyek(pjLain, { nama: "LED Lain", tahunPengajuan: 2026 })).id;
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: ["gemini-3.1-flash-lite"], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: true });

  const b = await unggahLkps(pj, proyekId, { nama: "lkps.xlsx", isi: XLSX });
  await prosesBerkasLkps(b.id);
  const d = await unggahDokumen(pj, proyekId, {
    nama: "kebijakan-mutu.docx",
    isi: await docxTeks([
      "Kebijakan mutu program studi ditetapkan dengan SK Rektor dan ditinjau setiap tahun melalui rapat tinjauan manajemen.",
      "Visi keilmuan program studi dirumuskan bersama pemangku kepentingan dan dosen tetap pada tahun 2022.",
      "Kontak dosen penanggung jawab: NIDN 0012345678.",
    ]),
    subBagianKode: "C.1-IKU-a",
  });
  await prosesDokumen(d.id);
  await tambahKunci(admin, { label: "Kunci A", kunci: KUNCI_A });
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("F-13 generate kriteria C.1 berurutan (IKU → LB, KEB → AF → SWOT); F-14, F-15, F-20; data pribadi disamarkan", async () => {
  await simpanJawaban(pj, { proyekId, subBagianKode: "C.1-IKU-a", isi: "Visi dirumuskan dalam 12 kegiatan lokakarya. Koordinator NIP 198501012010121001." });
  for (const kode of URUTAN_C1.slice(1)) {
    await simpanJawaban(pj, { proyekId, subBagianKode: kode, isi: `Catatan penyusun untuk ${kode}: kebijakan ditinjau dalam rapat tinjauan manajemen.` });
  }
  const tugas = await mulaiGenerate(pj, proyekId, "C.1");
  assert.equal(tugas.status, "antre");
  assert.deepEqual(tugas.subBagianKode, URUTAN_C1);
  await assert.rejects(mulaiGenerate(pj, proyekId, "C.2"), GalatPengguna, "satu tugas aktif per proyek");
  assert.equal(await prosesTugasGenerate(tugas.id), "selesai");
  assert.equal(await prosesTugasGenerate(tugas.id), "dilewati", "tugas selesai tidak diproses ulang");

  const c1 = tiruan.panggilan.slice(-7);
  assert.equal(c1.length, 7);
  const judul = await prisma.subBagian.findMany({ where: { kode: { in: URUTAN_C1 }, bagian: { versi: { aktif: true } } } });
  URUTAN_C1.forEach((kode, i) => {
    const s = judul.find((x) => x.kode === kode)!;
    assert.ok(c1[i].pengguna.includes(`${s.label} ${s.judul}`.trim()), `urutan ke-${i + 1} menyusun ${kode}`);
  });
  assert.ok(c1[5].pengguna.includes("RINGKASAN INDIKATOR KINERJA"), "analisis faktor memakai ringkasan IKU");
  assert.ok(c1[6].pengguna.includes("RINGKASAN INDIKATOR KINERJA"), "SWOT memakai ringkasan IKU");
  assert.ok(!c1[0].pengguna.includes("RINGKASAN INDIKATOR KINERJA"));
  for (const c of c1) {
    assert.ok(!/0012345678|198501012010121001/.test(c.pengguna), "NIDN/NIP tidak dikirim ke LLM");
    assert.equal(c.model, "gemini-3-flash-preview");
  }
  assert.ok(c1[0].pengguna.includes("[ID disamarkan]"));
  assert.ok(c1[0].pengguna.includes("[J]") && c1[0].pengguna.includes("[D1]"), "jawaban penyusun dan potongan dokumen masuk konteks");

  const draf = await drafBagian(pj, proyekId, "C.1");
  assert.deepEqual(Object.keys(draf).sort(), [...URUTAN_C1].sort());
  for (const kode of URUTAN_C1) {
    const d = draf[kode];
    assert.equal(d.status, "draf");
    assert.ok(d.aktif);
    const par = paragrafBersumber(d.aktif.isi);
    assert.equal(par.length, 2);
    assert.ok(par.every((x) => x.sumber.length > 0), "setiap paragraf membawa sumber (F-15)");
    assert.ok(par.every((x) => x.sumber.every((s) => s in d.aktif!.legenda)), "legenda sumber tersedia");
    assert.deepEqual(d.aktif.pemeriksaan?.angkaTidakBerdasar, [], `tidak ada angka karangan di ${kode}`);
    assert.deepEqual(d.aktif.pemeriksaan?.belumAdaBukti, ["laporan audit mutu internal"]);
    assert.ok(d.aktif.pemeriksaan?.target && d.aktif.pemeriksaan.target > 0, "target kata dari anggaran (F-18)");
    assert.equal(d.aktif.pemeriksaan?.panjang, "kurang");
    assert.deepEqual(d.aktif.dokumenKurang, ["Laporan audit mutu internal"]);
    assert.deepEqual(d.aktif.pemakaian, { tokenMasuk: 1200, tokenKeluar: 300, durasiMs: d.aktif.pemakaian!.durasiMs });
  }
  // F-14: status unsur skor 4 per butir
  const butir1 = await prisma.butirPenilaian.findFirstOrThrow({ where: { kode: "1", jenjang: "S1" } });
  assert.equal(draf["C.1-IKU-a"].aktif!.unsur.filter((u) => u.butir === "1").length, butir1.unsurSkor4.length);
  assert.ok(!draf["C.1-IKU-a"].aktif!.pemeriksaan!.masalahSumber.some((m) => m.jenis === "unsur_hilang"));
  // istilah asing miring
  assert.ok(JSON.stringify(draf["C.1-LB"].aktif!.isi).includes('"marks":[{"type":"italic"}]'));
  // F-21 status kriteria
  assert.equal((await prisma.statusKriteria.findFirstOrThrow({ where: { proyekId, bagianKode: "C.1" } })).status, "draf");
  // F-20 log pemakaian per generate
  const log = await prisma.logPemakaian.findMany({ where: { tugasId: tugas.id } });
  assert.equal(log.length, 7);
  assert.ok(log.every((l) => l.berhasil && l.tokenMasuk === 1200 && l.tokenKeluar === 300 && l.prodiId === prodiId));
});

test("F-16/F-17 sunting tersimpan otomatis, generate ulang satu butir, bandingkan versi, pulihkan; F-21 tandai selesai", async () => {
  const awal = (await drafBagian(pj, proyekId, "C.1"))["C.1-IKU-a"].aktif!;
  const isi = structuredClone(awal.isi);
  const p = isi.content.find((n) => n.type === "paragraph")!;
  p.content = [{ type: "text", text: "Program studi menjalankan kebijakan mutu secara konsisten melalui 12 kegiatan lokakarya bersama pemangku kepentingan." }];

  const s1 = await simpanSuntingan(pj, proyekId, "C.1-IKU-a", isi);
  assert.equal(s1.nomor, 2);
  assert.equal(s1.baru, true);
  assert.deepEqual(s1.pemeriksaan.angkaTidakBerdasar, [], "angka dari jawaban penyusun sah");
  p.content = [{ type: "text", text: "Program studi menjalankan kebijakan mutu melalui 15 kegiatan lokakarya." }];
  const s2 = await simpanSuntingan(pj, proyekId, "C.1-IKU-a", isi);
  assert.equal(s2.nomor, 2, "suntingan beruntun memperbarui versi yang sama");
  assert.equal(s2.baru, false);
  assert.deepEqual(s2.pemeriksaan.angkaTidakBerdasar, ["15"], "angka di luar data ditandai setelah disunting");
  let d = (await drafBagian(pj, proyekId, "C.1"))["C.1-IKU-a"];
  assert.equal(d.status, "disunting");
  assert.equal((await prisma.statusKriteria.findFirstOrThrow({ where: { proyekId, bagianKode: "C.1" } })).status, "disunting");

  const ulang = await mulaiGenerate(pj, proyekId, "C.1", "C.1-IKU-a");
  assert.deepEqual(ulang.subBagianKode, ["C.1-IKU-a"]);
  assert.equal(await prosesTugasGenerate(ulang.id), "selesai");
  d = (await drafBagian(pj, proyekId, "C.1"))["C.1-IKU-a"];
  assert.deepEqual(d.versi.map((v) => `${v.nomor}:${v.asal}`), ["3:generate", "2:sunting", "1:generate"]);
  assert.equal(d.aktif!.nomor, 3);
  assert.equal(d.status, "draf");
  assert.equal((await drafBagian(pj, proyekId, "C.1"))["C.1-IKU-b"].versi.length, 1, "butir lain tidak ikut di-generate ulang");

  const v2 = d.versi.find((v) => v.nomor === 2)!;
  const v3 = d.versi.find((v) => v.nomor === 3)!;
  const beda = await bandingkanVersi(pj, v2.id, v3.id);
  assert.ok(beda.potongan.some((x) => x.jenis === "hapus" && x.teks.includes("15")));
  assert.ok(beda.potongan.some((x) => x.jenis === "tambah"));
  assert.ok(beda.potongan.some((x) => x.jenis === "sama"));

  const pulih = await pulihkanVersi(pj, v2.id);
  assert.equal(pulih.nomor, 4);
  d = (await drafBagian(pj, proyekId, "C.1"))["C.1-IKU-a"];
  assert.equal(d.aktif!.asal, "pulihkan");
  assert.equal(teksDokumen(d.aktif!.isi), teksDokumen(bacaDokumen(isi)), "isi versi 2 dipulihkan sebagai versi 4");
  assert.equal(d.status, "disunting");

  assert.equal(await tandaiBagianSelesai(pj, proyekId, "C.1"), "selesai");
  assert.equal((await prisma.statusKriteria.findFirstOrThrow({ where: { proyekId, bagianKode: "C.1" } })).status, "selesai");
  await assert.rejects(tandaiBagianSelesai(pj, proyekId, "C.2"), GalatPengguna, "kriteria tanpa draf tidak bisa ditandai selesai");

  // akses lintas prodi ditolak; Admin UPPS hanya membaca (revisi 31 Okt 2026)
  await assert.rejects(drafBagian(pjLain, proyekId, "C.1"), GalatAkses);
  await drafBagian(adminUji, proyekId, "C.1");
  await assert.rejects(pulihkanVersi(adminUji, v2.id), GalatAkses);
  await assert.rejects(pulihkanVersi(pjLain, v2.id), GalatAkses);
  await assert.rejects(simpanSuntingan(adminUji, proyekId, "C.1-IKU-a", isi), GalatAkses);
});

test("Revisi 19 Okt tahap 3: satu sub-bagian satu halaman: status, Lanjutkan, posisi, jawaban tetap tersimpan, peringatan AF/SWOT", async () => {
  // C.2 belum disentuh: semua belum, Lanjutkan membuka sub-bagian pertama yang di-generate
  let k = (await muatKriteria(pj, proyekId, "C.2"))!;
  const kodeC2 = k.bagian.subBagian.map((s) => s.kode);
  const generateC2 = k.subGenerate.map((s) => s.kode);
  assert.ok(generateC2.length >= 4);
  assert.ok(generateC2.every((kode) => k.statusSub[kode] === "belum"));
  assert.equal(subLanjutkan(kodeC2.map((kode) => ({ kode, status: k.statusSub[kode] }))), generateC2[0]);
  assert.equal(k.jumlahDrafIku, 0);
  const af = generateC2.find((x) => x.endsWith("-AF"))!;
  assert.match(peringatanSebelumGenerate(af, k.jumlahDrafIku) ?? "", /belum punya draf IKU/, "AF tanpa draf IKU diberi peringatan");
  const pos = posisiSub(kodeC2, generateC2[1])!;
  assert.equal(pos.nomor, kodeC2.indexOf(generateC2[1]) + 1);
  assert.equal(pos.total, kodeC2.length);
  assert.equal(k.urutanBagian.findIndex((b) => b.kode === "C.3"), k.urutanBagian.findIndex((b) => b.kode === "C.2") + 1);

  // jawaban yang disimpan sebelum pindah halaman tetap ada saat halaman dibuka lagi; menimpa tidak menggandakan
  await simpanJawaban(pj, { proyekId, subBagianKode: generateC2[0], isi: "Jawaban halaman pertama." });
  await simpanJawaban(pj, { proyekId, subBagianKode: generateC2[1], isi: "Draf awal." });
  await simpanJawaban(pj, { proyekId, subBagianKode: generateC2[1], isi: "Jawaban halaman kedua setelah diperbaiki." });
  const h = (await halamanBagian(pj, proyekId, "C.2"))!;
  assert.equal(h.jawaban[generateC2[0]], "Jawaban halaman pertama.");
  assert.equal(h.jawaban[generateC2[1]], "Jawaban halaman kedua setelah diperbaiki.");
  assert.equal(await prisma.jawabanForm.count({ where: { proyekId, subBagianKode: generateC2[1] } }), 1);
  k = (await muatKriteria(pj, proyekId, "C.2"))!;
  assert.equal(k.statusSub[generateC2[0]], "ada_jawaban");
  assert.equal(subLanjutkan(kodeC2.map((kode) => ({ kode, status: k.statusSub[kode] }))), generateC2[0], "ada jawaban belum berarti selesai");

  // generate satu halaman (sub-bagian IKU) lalu statusnya menjadi ada draf, dan AF tidak lagi diberi peringatan
  const ikuC2 = k.bagian.subBagian.find((s) => s.tipe === "iku")!.kode;
  const t = await mulaiGenerate(pj, proyekId, "C.2", ikuC2);
  assert.equal(await prosesTugasGenerate(t.id), "selesai");
  k = (await muatKriteria(pj, proyekId, "C.2"))!;
  assert.equal(k.statusSub[ikuC2], "ada_draf");
  assert.equal(k.jumlahDraf, 1);
  assert.equal(k.jumlahDrafIku, 1);
  assert.equal(peringatanSebelumGenerate(af, k.jumlahDrafIku), null);

  // C.1 sudah ditandai selesai di uji sebelumnya: semua sub-bagian selesai
  const c1 = (await muatKriteria(pj, proyekId, "C.1"))!;
  assert.ok(URUTAN_C1.every((kode) => c1.statusSub[kode] === "selesai"));
  assert.equal(c1.status, "selesai");
  await assert.rejects(muatKriteria(adminUji, proyekId, "C.1"), GalatAkses);
  assert.equal(await muatKriteria(pj, proyekId, "TIDAK-ADA"), null);
});

test("F-19 429 harian: generate berhenti rapi, meminta kunci baru, lalu lanjut dari butir tertunda", async () => {
  // kunci A sudah dipakai 9 kali; kuota hariannya habis setelah 2 panggilan berikutnya
  tiruan.kuotaKunci.set(KUNCI_A, (tiruan.berhasilPerKunci.get(KUNCI_A) ?? 0) + 2);
  tiruan.batasPerMenit = 1; // satu galat batas per menit: ditunggu lalu diulang
  const tugas = await mulaiGenerate(pj, proyekId, "C.4");
  const total = tugas.subBagianKode.length;
  assert.ok(total >= 10);
  assert.equal(await prosesTugasGenerate(tugas.id), "tertunda");

  let t = await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: tugas.id } });
  assert.equal(t.status, "tertunda");
  assert.equal(t.indeks, 2, "berhenti di sub-bagian ketiga");
  assert.match(t.pesan ?? "", /Kuota semua kunci API habis.*kunci baru/);
  const kA = await prisma.kunciAPI.findFirstOrThrow({ where: { label: "Kunci A" } });
  assert.equal(kA.status, "kuota_habis");
  assert.ok(kA.habisSampai && kA.habisSampai > new Date());
  const gagal = await prisma.logPemakaian.findMany({ where: { tugasId: tugas.id, berhasil: false } });
  assert.ok(gagal.some((l) => l.model === "gemini-3-flash-preview" && /kuota_harian/.test(l.galat ?? "")));
  assert.ok(gagal.some((l) => l.model === "gemini-3.1-flash-lite" && /kuota_harian/.test(l.galat ?? "")), "model cadangan dicoba sebelum kunci ditandai habis");
  assert.ok(gagal.some((l) => /batas_per_menit/.test(l.galat ?? "")), "batas per menit dicatat lalu diulang");
  const banner = (await tugasProyek(pj, proyekId)).find((x) => x.id === tugas.id)!;
  assert.equal(banner.status, "tertunda");
  assert.equal(banner.indeks, 2);
  assert.ok(banner.sedang);

  const tambah = await tambahKunci(adminUji, { label: "Kunci B", kunci: KUNCI_B });
  assert.equal(tambah.tugasDilanjutkan, 1);
  t = await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: tugas.id } });
  assert.equal(t.status, "antre");
  assert.equal(await prosesTugasGenerate(tugas.id), "selesai");
  t = await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: tugas.id } });
  assert.equal(t.indeks, total);

  const draf = await drafBagian(pj, proyekId, "C.4");
  assert.equal(Object.keys(draf).length, total);
  assert.ok(Object.values(draf).every((d) => d.versi.length === 1), "sub-bagian yang sudah jadi tidak diulang");
  const sisa = tiruan.panggilan.filter((x) => x.apiKey === KUNCI_B);
  assert.equal(sisa.length, total - 2, "kunci baru dipakai untuk sub-bagian tertunda");

  // butir angka: tabel metrik dibuat sistem, angka di narasi berasal dari metrik
  const ndtps = draf["C.4-IKU-a.i"].aktif!;
  assert.equal(ndtps.isi.content[1].type, "table");
  assert.ok(teksDokumen(ndtps.isi).includes("12"));
  assert.deepEqual(ndtps.pemeriksaan?.angkaTidakBerdasar, []);
  assert.ok(Object.keys(ndtps.legenda).some((k) => k.startsWith("M-")));
});

test("Pemeriksaan angka: narasi yang memuat angka di luar data (konteks fiktif) ditandai", async () => {
  tiruan.karang = true;
  try {
    const t = await mulaiGenerate(pj, proyekId, "C.2", "C.2-LB");
    assert.equal(await prosesTugasGenerate(t.id), "selesai");
  } finally {
    tiruan.karang = false;
  }
  const d = (await drafBagian(pj, proyekId, "C.2"))["C.2-LB"].aktif!;
  assert.deepEqual(d.pemeriksaan?.angkaTidakBerdasar, ["97,3%", "1.234"]);
});

test("Tanpa kunci: tugas dibuat tertunda dengan pesan, dan dimulai otomatis setelah kunci diisi", async () => {
  // kunci milik fakultas (revisi 19 Okt 2026): kosongkan semua kunci untuk mensimulasikan fakultas tanpa kunci
  await prisma.kunciAPI.deleteMany({});
  const t = await mulaiGenerate(pjLain, proyekLainId, "C.1", "C.1-LB");
  assert.equal(t.status, "tertunda");
  assert.match(t.pesan ?? "", /Belum ada kunci API Gemini/);
  assert.equal(await prosesTugasGenerate(t.id), "tertunda");
  assert.match((await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: t.id } })).pesan ?? "", /Belum ada kunci/);
  const k = await tambahKunci(adminUji, { label: "Kunci fakultas baru", kunci: "AIzaSyKunciUjiC0000000000000000000000003" });
  assert.equal(k.tugasDilanjutkan, 1);
  assert.equal(await prosesTugasGenerate(t.id), "selesai");
  assert.equal((await drafBagian(pjLain, proyekLainId, "C.1"))["C.1-LB"].status, "draf");
});

test("Revisi 19 Okt tahap 5: butir angka berumus dihitung otomatis; tanpa rumus atau rumus gagal → nilai manual menjadi sumber", async () => {
  // butir 26 punya rumus (kodeRumus) dan LKPS terbaca: metrik sistem masuk konteks
  let n = await nilaiButirProyek(pj, proyekId);
  const b26 = n.daftar.find((x) => x.butir === "26")!;
  assert.equal(b26.sumber, "rumus");
  const k26 = await susunKonteks(proyekId, "C.4-IKU-a.i");
  assert.ok(k26.konteks.metrik.some((m) => m.id === "M-NDTPS"), "metrik rumus masuk konteks");

  // butir 27 tanpa rumus (instrumen baru tanpa padanan rumus): PJ mengisi nilai hitung sendiri
  await prisma.butirPenilaian.updateMany({ where: { kode: "27", jenjang: "S1" }, data: { kodeRumus: null } });
  n = await nilaiButirProyek(pj, proyekId);
  assert.deepEqual(pick(n.daftar.find((x) => x.butir === "27")!), { sumber: "belum", perluManual: true });
  await assert.rejects(simpanNilaiManual(pj, proyekId, { butirKode: "1", nilai: "5" }), GalatPengguna, "hanya butir angka");
  await assert.rejects(simpanNilaiManual(adminUji, proyekId, { butirKode: "27", nilai: "5" }), GalatAkses);
  await simpanNilaiManual(pj, proyekId, { butirKode: "27", nilai: "37,5%", keterangan: "15 dari 40 DTPS bergelar doktor (Tabel 4.a)" });
  assert.equal((await nilaiButirProyek(pj, proyekId)).daftar.find((x) => x.butir === "27")?.sumber, "manual");
  const k27 = await susunKonteks(proyekId, "C.4-IKU-a.iii");
  const m27 = k27.konteks.metrik.find((m) => m.id === "M-NILAI-27");
  assert.equal(m27?.nilaiTeks, "37,5%");
  assert.match(k27.legenda["M-NILAI-27"], /diisi penyusun/);
  assert.ok(k27.rujukan.sumberSah.includes("M-NILAI-27"), "kode sumber nilai manual sah");
  assert.ok([37.5, 15, 40].every((a) => k27.rujukan.angkaSah.includes(a)), "angka dari nilai manual sah di narasi");
  assert.ok(k27.tabelSistem.some((t) => t.sumber.includes("M-NILAI-27")));

  // rumus gagal membaca LKPS (template LKPS berubah, tabel hilang) → otomatis beralih ke nilai manual
  const tabel28 = n.daftar.find((x) => x.butir === "28")!.hasil!.tabel;
  const berkas = await prisma.berkasLKPS.findFirstOrThrow({ where: { proyekId, aktif: true } });
  await prisma.tabelLKPS.deleteMany({ where: { berkasId: berkas.id, kode: { in: tabel28 } } });
  n = await nilaiButirProyek(pj, proyekId);
  const b28 = n.daftar.find((x) => x.butir === "28")!;
  assert.deepEqual(pick(b28), { sumber: "belum", perluManual: true });
  assert.match(b28.alasan ?? "", /tidak bisa membaca LKPS/);
  await simpanNilaiManual(pj, proyekId, { butirKode: "28", nilai: "10%" });
  assert.equal((await nilaiButirProyek(pj, proyekId)).daftar.find((x) => x.butir === "28")?.sumber, "manual");
  // nilai kosong menghapus isian manual
  await simpanNilaiManual(pj, proyekId, { butirKode: "28", nilai: "" });
  assert.equal(await prisma.nilaiManual.count({ where: { proyekId, butirKode: "28" } }), 0);
});

function pick(n: { sumber: string; perluManual: boolean }) {
  return { sumber: n.sumber, perluManual: n.perluManual };
}

test("Revisi 22 Okt tahap 4: target dan capaian, tren tiga tahun dihitung sistem dan menjadi angka sah narasi", async () => {
  // butir 41 (mahasiswa asing, Tabel 6.a): capaian = nilai utama rumus; target dari Renstra
  const awal = await capaianButirProyek(pj, proyekId);
  const c41 = awal.get("41")!;
  assert.ok(c41.capaian !== null, "capaian dari rumus");
  assert.ok(c41.tren.some((t) => /Mahasiswa/.test(t.judul)), "tren dari Tabel 6.a (TS-2, TS-1, TS)");
  await assert.rejects(simpanTarget(pj, proyekId, { butirKode: "1", target: "5" }), GalatPengguna, "hanya butir angka");
  await assert.rejects(simpanTarget(pj, proyekId, { butirKode: "41", target: "banyak" }), GalatPengguna);
  await assert.rejects(simpanTarget(adminUji, proyekId, { butirKode: "41", target: "5" }), GalatAkses);
  const target = Math.ceil(c41.capaian! * 1.25 * 100) / 100;
  await simpanTarget(pj, proyekId, { butirKode: "41", target: String(target).replace(".", ","), satuan: "", sumber: "Renstra FT 2021–2025" });
  const c = (await capaianButirProyek(pj, proyekId)).get("41")!;
  const harap = hitungCapaian(c41.capaian, target)!;
  assert.deepEqual(c.hasil, harap);
  assert.equal(c.hasil?.tercapai, false);

  const k = await susunKonteks(proyekId, "C.6-IKU-b");
  const m = k.konteks.metrik.find((x) => x.id === "M-CAPAIAN-41")!;
  assert.equal(m.nilaiTeks, teksCapaian(harap, c.satuanCapaian));
  assert.match(m.keterangan ?? "", /Renstra/);
  assert.ok(k.konteks.metrik.some((x) => x.id === "M-TREN-41"));
  assert.ok(k.rujukan.angkaSah.includes(harap.persen), "persen capaian hitungan sistem sah di narasi");
  assert.ok(!k.rujukan.angkaSah.includes(harap.persen + 7), "angka capaian lain tidak sah");
  assert.match(susunSistem(), /mengevaluasi capaian/);
  // target kosong menghapus
  await simpanTarget(pj, proyekId, { butirKode: "41", target: "" });
  assert.equal((await capaianButirProyek(pj, proyekId)).get("41")?.target, null);
});

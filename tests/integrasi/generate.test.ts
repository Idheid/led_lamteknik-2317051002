import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { simpanProdi } from "@/lib/data/organisasi";
import { buatProyek, simpanJawaban } from "@/lib/data/proyek";
import { unggahLkps } from "@/lib/data/lkps";
import { unggahDokumen } from "@/lib/data/dokumen";
import { tambahKunci } from "@/lib/data/kunci-api";
import { simpanPengaturan } from "@/lib/data/pengaturan";
import {
  bandingkanVersi, drafBagian, mulaiGenerate, pulihkanVersi, simpanSuntingan, tandaiBagianSelesai, tugasProyek,
} from "@/lib/data/generate";
import { aturModelUji } from "@/lib/llm/narasi";
import { prosesBerkasLkps } from "@/lib/proses/lkps";
import { prosesDokumen } from "@/lib/proses/dokumen";
import { prosesTugasGenerate } from "@/lib/proses/generate";
import { bacaDokumen, paragrafBersumber, teksDokumen } from "@/lib/domain/narasi";
import { bersihkanDb, buatSuperAdmin, imporSeed, siapkanPj } from "./bantu";

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
  const admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  // revisi 19 Okt 2026: satu PJ fakultas; LED kedua milik prodi lain, akses lintas peran diuji dengan admin
  pjLain = pj;
  adminUji = admin;
  const prodi = await simpanProdi(pj, { nama: "Teknik Contoh", jenjang: "S1", kodePddikti: "11111", identitas: {} });
  const lain = await simpanProdi(pj, { nama: "Teknik Lain", jenjang: "S1", kodePddikti: "22222", identitas: {} });
  prodiId = prodi.id;
  proyekId = (await buatProyek(pj, { prodiId: prodi.id, nama: "LED Uji", tahunPengajuan: 2026 })).id;
  proyekLainId = (await buatProyek(pj, { prodiId: lain.id, nama: "LED Lain", tahunPengajuan: 2026 })).id;
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
  await tambahKunci(pj, { label: "Kunci A", kunci: KUNCI_A });
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

  // akses lintas prodi ditolak
  // admin tidak mengurus penyusunan LED
  await assert.rejects(drafBagian(adminUji, proyekId, "C.1"), GalatAkses);
  await assert.rejects(pulihkanVersi(adminUji, v2.id), GalatAkses);
  await assert.rejects(simpanSuntingan(adminUji, proyekId, "C.1-IKU-a", isi), GalatAkses);
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

  const tambah = await tambahKunci(pj, { label: "Kunci B", kunci: KUNCI_B });
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
  const k = await tambahKunci(pjLain, { label: "Kunci fakultas baru", kunci: "AIzaSyKunciUjiC0000000000000000000000003" });
  assert.equal(k.tugasDilanjutkan, 1);
  assert.equal(await prosesTugasGenerate(t.id), "selesai");
  assert.equal((await drafBagian(pjLain, proyekLainId, "C.1"))["C.1-LB"].status, "draf");
});

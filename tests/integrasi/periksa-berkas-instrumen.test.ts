import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { ubahVersi } from "@/modules/led/data/instrumen";
import {
  bacaRiwayatPeriksa, bacaSidikJariVersi, buatVersiJenjang, GalatBerkasDitolak, konfirmasiBerkasInstrumen, konfirmasiVersi,
  mulaiEkstraksi, tandaiBerkasUsang, unggahBerkasInstrumen, type JenisBerkasInstrumen,
} from "@/modules/led/data/unggah-instrumen";
import { bersihkanDb, buatAdmin, imporSeed } from "./bantu";

/**
 * Perbaikan 2 Nov 2026 (I1): pemeriksaan berkas instrumen saat diunggah, berdasarkan isi berkas (tanpa metadata).
 * Matriks tahun lain dibuat sintetis dengan pdf-lib: judul halaman, kepala tabel, dan judul kriteria seperti Matriks resmi.
 */

const FIKSTUR = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur/instrumen", n));
const TEMPLATE = { nama: "Template LEDPS 2025.docx", isi: FIKSTUR("template-ledps-2025.docx") };
const MATRIKS = { nama: "Matriks Sarjana 2025.pdf", isi: FIKSTUR("matriks-sarjana-2025.pdf") };
const PEDOMAN = { nama: "Pedoman Penilaian 2025.pdf", isi: FIKSTUR("pedoman-penilaian-2025.pdf") };
const K2025 = [
  "Diferensiasi Misi (Visi, Misi, Tujuan, dan Strategi)", "Akuntabilitas", "Relevansi Pendidikan, Penelitian, dan PkM",
  "Sumber Daya Manusia", "Sarana, Prasarana, dan Keselamatan Kesehatan Kerja dan Lingkungan (K3L)",
  "Mahasiswa dan Luaran Mahasiswa", "Sistem Penjaminan Mutu",
];

/** Matriks sintetis: `tahun` null = tahun tidak tertulis (format masa depan yang berbeda). */
async function matriksSintetis(o: { tahun: number | null; jenjang?: string; kriteria?: string[] }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const judul = `MATRIKS PENILAIAN LAPORAN EVALUASI DIRI DAN LAPORAN KINERJA PROGRAM STUDI - PROGRAM ${o.jenjang ?? "SARJANA"} ${o.tahun ? `APS-AV ${o.tahun} 1.0` : "EDISI BARU"}`;
  const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  for (let h = 0; h < 2; h++) {
    const hal = doc.addPage([842, 595]);
    hal.drawText(judul, { x: 30, y: 560, size: 8, font });
    hal.drawText("No Kriteria Indikator 4 3 2 1 0", { x: 30, y: 530, size: 9, font });
    if (h === 0) {
      hal.drawText("A. KRITERIA", { x: 30, y: 505, size: 9, font });
      (o.kriteria ?? K2025).forEach((k, i) => hal.drawText(`${romawi[i]}. ${k}`, { x: 30, y: 485 - i * 40, size: 9, font }));
    }
  }
  return Buffer.from(await doc.save());
}

/** Template resmi dengan satu berkas tambahan di dalam zip: isi sama, SHA-256 berbeda (belum dikenal). */
async function templateTakDikenal(): Promise<Buffer> {
  const zip = await JSZip.loadAsync(TEMPLATE.isi);
  zip.file("customXml/catatan-uji.xml", "<catatan>salinan uji</catatan>");
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
});

after(async () => {
  await prisma.$disconnect();
});

async function versi(kode: string, tahunInstrumen: number, jenjang: "S1" | "D3" = "S1") {
  return buatVersiJenjang(admin, { nama: `Instrumen ${kode}`, kode, jenjang, tahunInstrumen });
}

async function ditolak(versiId: string, jenis: JenisBerkasInstrumen, berkas: { nama: string; isi: Buffer }) {
  try {
    await unggahBerkasInstrumen(admin, versiId, jenis, berkas);
  } catch (e) {
    assert.ok(e instanceof GalatBerkasDitolak, String(e));
    return e.hasil;
  }
  throw new Error(`${berkas.nama} seharusnya ditolak`);
}

test("I1: tahun instrumen wajib dan masuk akal; tidak boleh lebih lama dari instrumen aktif jenjang itu", async () => {
  await assert.rejects(versi("X-2019", 2019), /Tahun instrumen tidak masuk akal/);
  await assert.rejects(versi("X-2099", new Date().getFullYear() + 3), /Tahun instrumen tidak masuk akal/);
  // instrumen bawaan (2025) aktif untuk Sarjana
  await assert.rejects(versi("X-2024", 2024), /Sudah ada instrumen aktif tahun 2025 untuk Sarjana; tahun 2024 lebih lama\./);
  const v = await versi("LAMTEKNIK-2025-S1-A", 2025);
  assert.equal(v.tahunInstrumen, 2025);
  const lama = await prisma.versiInstrumen.findFirstOrThrow({ where: { kode: "LAMTEKNIK-2025-PASCA" } });
  assert.equal(lama.tahunInstrumen, 2025, "versi yang sudah ada berisi 2025");
});

test("I1: berkas yang salah ditolak saat diunggah, tidak disimpan, dan tercatat di riwayat (tiga terakhir)", async () => {
  const v = await versi("LAMTEKNIK-2025-S1-B", 2025);
  const ped = await ditolak(v.id, "matriks", PEDOMAN);
  assert.equal(ped.judul, "Berkas ditolak: jenis berkas salah");
  assert.equal(ped.alasan, "Berkas ini tampaknya Pedoman Penilaian, bukan Matriks Penilaian.");
  const tpl = await ditolak(v.id, "pedoman", TEMPLATE);
  assert.equal(tpl.alasan, "Berkas ini tampaknya Template LED, bukan Pedoman Penilaian.");
  const pdf = await ditolak(v.id, "template", MATRIKS);
  assert.match(pdf.alasan, /berkas rusak atau bukan dokumen Word, bukan Template LED/);
  await ditolak(v.id, "matriks", { nama: "a.pdf", isi: Buffer.from("bukan pdf") });
  const d3 = await ditolak(v.id, "matriks", { nama: "Matriks D3.pdf", isi: await matriksSintetis({ tahun: 2025, jenjang: "DIPLOMA TIGA" }) });
  assert.equal(d3.alasan, "Matriks ini untuk Diploma Tiga, sedangkan instrumen ini untuk Sarjana.");
  const t2030 = await ditolak(v.id, "matriks", { nama: "Matriks 2030.pdf", isi: await matriksSintetis({ tahun: 2030 }) });
  assert.equal(t2030.alasan, "Matriks Penilaian ini instrumen tahun 2030, sedangkan tahun instrumen yang diisi 2025.");

  const simpan = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } });
  assert.equal(simpan.matriksLokasi, null);
  assert.equal(simpan.pedomanLokasi, null);
  assert.equal(simpan.templateLedLokasi, null);
  const riwayat = bacaRiwayatPeriksa(simpan.riwayatPeriksa);
  assert.deepEqual(riwayat.map((h) => h.namaBerkas), ["Matriks 2030.pdf", "Matriks D3.pdf", "a.pdf"]);
  assert.ok(riwayat[0].terbaca.some((t) => t.label === "Jenjang di teks" && t.nilai === "Sarjana"));
  assert.equal(await prisma.logAktivitas.count({ where: { objekId: v.id, aksi: "tolak_berkas_instrumen" } }), 6);
});

test("I1: berkas resmi 2025 diterima; bacaan dan info sidik jari tersimpan", async () => {
  const v = await versi("LAMTEKNIK-2025-S1-C", 2025);
  const t = await unggahBerkasInstrumen(admin, v.id, "template", TEMPLATE);
  assert.deepEqual(t.info, ["Berkas dikenali: Template LEDPS LAM Teknik 2025 (Seluruh Jenjang)."]);
  const m = await unggahBerkasInstrumen(admin, v.id, "matriks", MATRIKS);
  assert.deepEqual(m.info, ["Kriteria Template LED cocok dengan Matriks (7 kriteria)."]);
  await unggahBerkasInstrumen(admin, v.id, "pedoman", PEDOMAN);
  const sj = bacaSidikJariVersi((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } })).sidikJari);
  assert.equal(sj.matriks?.tahun, 2025);
  assert.equal(sj.matriks?.jenjang, "S1");
  assert.deepEqual(sj.template?.kriteria, K2025);
  assert.equal(sj.pedoman?.tahun, 2025);
  await mulaiEkstraksi(admin, v.id);
});

test("I1: tahun baru yang cocok tidak pernah ditolak, walaupun template dan strukturnya belum dikenal", async () => {
  const v = await versi("LAMTEKNIK-2027-S1", 2027);
  // seolah-olah sudah tahun 2029: tahun 2030 lolos batas "tahun berjalan + 2"
  await prisma.versiInstrumen.update({ where: { id: v.id }, data: { tahunInstrumen: 2030 } });
  const kriteria = ["Misi Berdampak", "Tata Kelola Digital", "Kurikulum Adaptif", "Sumber Daya", "Luaran dan Dampak"];
  await unggahBerkasInstrumen(admin, v.id, "matriks", { nama: "Matriks 2030.pdf", isi: await matriksSintetis({ tahun: 2030, kriteria }) });
  // template 2025 (resmi) tidak cocok dengan kriteria matriks 2030
  const salah = await ditolak(v.id, "template", TEMPLATE);
  assert.match(salah.alasan, /tidak sama dengan kriteria di Matriks 2030 \(kolom Kriteria tidak terbaca\)\. Kemungkinan template dari tahun atau skema lain\. Tidak ada di Matriks: Diferensiasi Misi/);

  // template resmi 2025 dipakai lagi untuk 2030 dengan matriks 2030 berkriteria sama → diterima, dengan info
  const w = await versi("LAMTEKNIK-2027-S1-B", 2027);
  await prisma.versiInstrumen.update({ where: { id: w.id }, data: { tahunInstrumen: 2030 } });
  await unggahBerkasInstrumen(admin, w.id, "matriks", { nama: "Matriks 2030.pdf", isi: await matriksSintetis({ tahun: 2030 }) });
  const sama = await unggahBerkasInstrumen(admin, w.id, "template", TEMPLATE);
  assert.ok(sama.info.some((x) => x === "Template LED ini sama persis dengan Template LEDPS LAM Teknik 2025 (Seluruh Jenjang); dipakai untuk instrumen 2030 bila kriterianya cocok dengan Matriks 2030."));

  // template yang belum dikenal dengan kriteria sama → diterima
  const x = await versi("LAMTEKNIK-2027-S1-C", 2027);
  await prisma.versiInstrumen.update({ where: { id: x.id }, data: { tahunInstrumen: 2030 } });
  await unggahBerkasInstrumen(admin, x.id, "matriks", { nama: "Matriks 2030.pdf", isi: await matriksSintetis({ tahun: 2030 }) });
  const baru = await unggahBerkasInstrumen(admin, x.id, "template", { nama: "Template LEDPS 2030.docx", isi: await templateTakDikenal() });
  assert.ok(baru.info.includes("Kriteria Template LED cocok dengan Matriks (7 kriteria)."));
  await mulaiEkstraksi(admin, x.id);

  // tahun diubah setelah berkas diunggah → diperiksa sekali lagi sebelum ekstraksi
  const y = await versi("LAMTEKNIK-2027-S1-D", 2027);
  await unggahBerkasInstrumen(admin, y.id, "matriks", { nama: "Matriks 2027.pdf", isi: await matriksSintetis({ tahun: 2027 }) });
  await unggahBerkasInstrumen(admin, y.id, "template", TEMPLATE);
  await ubahVersi(admin, y.id, { nama: y.nama, kode: y.kode, catatan: "", tahunInstrumen: 2028 });
  await assert.rejects(mulaiEkstraksi(admin, y.id), /instrumen tahun 2027, sedangkan tahun instrumen yang diisi 2028/);
});

test("I1: tahun tidak tertulis di matriks → wajib dicentang sebelum ekstraksi, dan dicatat di log", async () => {
  const v = await versi("LAMTEKNIK-2026-S1", 2026);
  await unggahBerkasInstrumen(admin, v.id, "template", TEMPLATE);
  await unggahBerkasInstrumen(admin, v.id, "matriks", { nama: "Matriks tanpa tahun.pdf", isi: await matriksSintetis({ tahun: null }) });
  let baru = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } });
  assert.deepEqual(konfirmasiVersi(baru).map((k) => k.teks), ["Tahun tidak ditemukan di teks Matriks Penilaian. Saya sudah memastikan berkas ini instrumen tahun 2026."]);
  await assert.rejects(mulaiEkstraksi(admin, v.id), /Centang konfirmasi/);
  await assert.rejects(konfirmasiBerkasInstrumen(admin, v.id, "skema"), GalatPengguna);
  await konfirmasiBerkasInstrumen(admin, v.id, "tahun");
  baru = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } });
  assert.equal(konfirmasiVersi(baru).length, 0);
  assert.equal(await prisma.logAktivitas.count({ where: { objekId: v.id, aksi: "konfirmasi_tahun_instrumen" } }), 1);
  await mulaiEkstraksi(admin, v.id);
});

test("I1: berkas versi lama ditandai usang setelah versi tahun lebih baru aktif, lalu ditolak saat diunggah lagi", async () => {
  const lama = await versi("LAMTEKNIK-2025-D3", 2025, "D3");
  const matriksLama = { nama: "Matriks D3 2025.pdf", isi: await matriksSintetis({ tahun: 2025, jenjang: "DIPLOMA TIGA" }) };
  await unggahBerkasInstrumen(admin, lama.id, "matriks", matriksLama);
  await unggahBerkasInstrumen(admin, lama.id, "template", TEMPLATE);
  await assert.rejects(tandaiBerkasUsang(admin, lama.id), /setelah instrumen tahun yang lebih baru/);

  // versi D3 2027 aktif dan memakai template resmi yang sama
  const baru = await versi("LAMTEKNIK-2027-D3", 2027, "D3");
  await unggahBerkasInstrumen(admin, baru.id, "matriks", { nama: "Matriks D3 2027.pdf", isi: await matriksSintetis({ tahun: 2027, jenjang: "DIPLOMA TIGA" }) });
  await unggahBerkasInstrumen(admin, baru.id, "template", TEMPLATE);
  await prisma.versiInstrumen.update({ where: { id: baru.id }, data: { aktif: true, status: "aktif" } });

  const r = await tandaiBerkasUsang(admin, lama.id);
  assert.deepEqual(r, { ditandai: ["Matriks Penilaian"], dilewati: ["Template LED"] }, "template yang dipakai versi aktif tidak ditandai");
  // sidik jari usang diperiksa sebelum tahun dan jenjang: pesannya menyebut berkas yang dikenali
  const lagi = await versi("LAMTEKNIK-2025-S1-E", 2025);
  const h = await ditolak(lagi.id, "matriks", matriksLama);
  assert.equal(h.judul, "Berkas ditolak: berkas usang");
  assert.equal(h.alasan, "Berkas ini Matriks Penilaian instrumen 2025 (LAMTEKNIK-2025-D3) dan sudah ditandai usang.");
});

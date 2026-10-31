import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { simpanProdi } from "@/modules/bersama/data/organisasi";
import { buatProyek, ubahTsProyek } from "@/modules/led/data/proyek";
import { lkpsAktif, metrikProyek, simpanKoreksiTabel, unggahLkps } from "@/modules/led/data/lkps";
import { berkasDokumen, daftarDokumen, simpulGambar, ubahDokumen, unggahDokumen } from "@/modules/led/data/dokumen";
import { cariPotongan } from "@/modules/led/data/pencarian";
import { daftarKunci, tambahKunci } from "@/modules/bersama/data/kunci-api";
import { simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { hashBerkas } from "@/modules/bersama/penyimpanan";
import { bersihkanDb, buatSuperAdmin, imporSeed, siapkanPj } from "./bantu";

const XLSX = readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx"));
const PDF_LKPS = readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.pdf"));
// PNG 1×1 piksel (berkas gambar asli)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

let admin: Pengguna;
let pj: Pengguna;
let pjLain: Pengguna;
let proyekId: string;

async function pdfTeks(halaman: string[][]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const baris of halaman) {
    const h = doc.addPage([595, 842]);
    baris.forEach((t, i) => h.drawText(t, { x: 40, y: 800 - i * 14, size: 10, font }));
  }
  return Buffer.from(await doc.save());
}

async function docxTeks(paragraf: string[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

const kurikulum = (i: number) => `Kurikulum berbasis capaian pembelajaran ditinjau bersama mitra industri pada tahun ${2020 + (i % 6)} melalui lokakarya kurikulum.`;
const tracer = (i: number) => `Tracer study lulusan angkatan ${2018 + (i % 5)} menunjukkan waktu tunggu kerja pertama rata-rata ${3 + (i % 4)} bulan.`;
const renstra = (i: number) => `Rencana strategis fakultas menetapkan sasaran mutu ${i} untuk tata kelola dan keuangan yang akuntabel.`;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  // revisi 19 Okt 2026: tidak ada PJ per prodi; pembatasan akses diuji dengan akun admin
  pjLain = admin;
  const prodi = await simpanProdi(pj, { nama: "Teknik Contoh", jenjang: "S1", kodePddikti: "11111", identitas: {} });
  proyekId = (await buatProyek(pj, { prodiId: prodi.id, nama: "LED Uji", tahunPengajuan: 2026 })).id;
});
after(() => prisma.$disconnect());

test("F-08 unggah LKPS Excel: dibaca, disimpan per tabel, jadi sumber metrik", async () => {
  const b = await unggahLkps(pj, proyekId, { nama: "lkps-contoh.xlsx", isi: XLSX });
  assert.equal(b.status, "diunggah");
  await prosesBerkasLkps(b.id);
  const aktif = await lkpsAktif(pj, proyekId);
  assert.ok(aktif);
  assert.equal(aktif.berkas.id, b.id);
  assert.equal(aktif.berkas.status, "dibaca");
  assert.equal(aktif.tabel.length, 43);
  assert.ok(aktif.tabel.every((t) => !t.perluDicek));
  assert.ok(!aktif.berkas.masalah.some((m) => m.sheet === "Menu"), "TS cocok, tidak ada peringatan TS");

  const m = await metrikProyek(pj, proyekId);
  const nilai = (butir: string, kode: string) => m?.hasil.find((x) => x.butir === butir)?.metrik.find((x) => x.kode === kode)?.nilai;
  assert.equal(nilai("26", "M-NDTPS"), 12);
  assert.equal(nilai("9", "M-BOP"), 5_000_000);
  assert.equal(nilai("40", "M-NM"), 350);
  assert.equal(m?.perluDicek, false);
});

test("F-08 TS di LKPS berbeda dengan TS proyek menghasilkan peringatan", async () => {
  await ubahTsProyek(pj, proyekId, 2024);
  const b = await prisma.berkasLKPS.findFirstOrThrow({ where: { proyekId, aktif: true } });
  await prosesBerkasLkps(b.id);
  const aktif = await lkpsAktif(pj, proyekId);
  assert.ok(aktif?.berkas.masalah.some((x) => x.sheet === "Menu" && /berbeda/.test(x.pesan)));
  await ubahTsProyek(pj, proyekId, 2025);
  await prosesBerkasLkps(b.id);
});

test("F-09 unggah LKPS PDF: tabel ditandai perlu dicek, koreksi manual tersimpan dan mengubah metrik", async () => {
  const b = await unggahLkps(pj, proyekId, { nama: "lkps-cetak.pdf", isi: PDF_LKPS });
  await prosesBerkasLkps(b.id);
  const aktif = await lkpsAktif(pj, proyekId);
  assert.equal(aktif?.berkas.id, b.id, "berkas terbaru yang terbaca menjadi aktif");
  assert.equal(aktif?.berkas.jenis, "pdf");
  assert.ok(aktif?.tabel.every((t) => t.perluDicek));
  assert.equal((await metrikProyek(pj, proyekId))?.perluDicek, true);

  const t4a = aktif!.tabel.find((t) => t.sheet === "4a")!;
  const baris = t4a.baris.map((r, i) => (i === 9 ? { ...r, sel: { ...r.sel, K: "Lektor" } } : r)); // Asisten Ahli → Lektor
  await simpanKoreksiTabel(pj, t4a.id, baris, true);
  const sesudah = await lkpsAktif(pj, proyekId);
  const t = sesudah!.tabel.find((x) => x.sheet === "4a")!;
  assert.equal(t.perluDicek, false);
  assert.equal(t.dikoreksi, true);
  const pgblkl = (await metrikProyek(pj, proyekId))?.hasil.find((x) => x.butir === "28")?.metrik.find((x) => x.kode === "M-PGBLKL")?.nilai;
  assert.ok(Math.abs((pgblkl ?? 0) - 10 / 12) < 1e-9, "PGBLKL naik dari 9/12 menjadi 10/12");
  await assert.rejects(simpanKoreksiTabel(pjLain, t4a.id, baris, true), GalatAkses);
});

test("F-08/F-09 berkas yang tidak didukung ditolak; admin tidak bisa mengunggah", async () => {
  await assert.rejects(unggahLkps(pj, proyekId, { nama: "lkps.xls", isi: Buffer.from("xx") }), GalatPengguna);
  await assert.rejects(unggahLkps(pj, proyekId, { nama: "lkps.pdf", isi: Buffer.from("bukan pdf") }), GalatPengguna);
  await assert.rejects(unggahLkps(pjLain, proyekId, { nama: "lkps.xlsx", isi: XLSX }), GalatAkses);
});

test("F-10/F-11 dokumen PDF dan DOCX diproses, lalu bisa dicari (vektor + kata kunci) per proyek dan sub-bagian", async () => {
  const pdf = await unggahDokumen(pj, proyekId, {
    nama: "SK Kurikulum.pdf",
    isi: await pdfTeks([Array.from({ length: 40 }, (_, i) => kurikulum(i)), Array.from({ length: 40 }, (_, i) => kurikulum(i + 40))]),
    subBagianKode: "C.3-IKU-a.01",
    tautanBukti: "https://drive.contoh.ac.id/kurikulum",
  });
  const docx = await unggahDokumen(pj, proyekId, {
    nama: "Laporan Tracer Study.docx",
    isi: await docxTeks(Array.from({ length: 60 }, (_, i) => tracer(i))),
    subBagianKode: "C.6-LB",
  });
  const umum = await unggahDokumen(pj, proyekId, {
    nama: "Renstra Fakultas.pdf",
    isi: await pdfTeks([Array.from({ length: 30 }, (_, i) => renstra(i))]),
  });
  for (const d of [pdf, docx, umum]) await prosesDokumen(d.id);

  const daftar = await daftarDokumen(pj, proyekId);
  for (const d of daftar) {
    assert.equal(d.status, "siap", `${d.namaBerkas}: ${d.pesan}`);
    assert.ok(d.jumlahPotongan > 0);
  }
  assert.equal(daftar.find((d) => d.id === pdf.id)?.tautanBukti, "https://drive.contoh.ac.id/kurikulum");

  const pot = await prisma.potongan.findMany({ where: { dokumenId: pdf.id }, orderBy: { urutan: "asc" } });
  assert.ok(pot.length >= 4);
  assert.ok(pot.every((x) => x.teks.length <= 1200));
  assert.equal(pot[0].halaman, 1);
  assert.ok(pot.some((x) => x.halaman === 2));
  const [cek] = await prisma.$queryRaw<{ dim: number; tsv: boolean }[]>`
    SELECT vector_dims("embedding") AS dim, "teksTsv" IS NOT NULL AS tsv FROM "Potongan" WHERE "dokumenId" = ${pdf.id} LIMIT 1`;
  assert.equal(cek.dim, 768);
  assert.equal(cek.tsv, true);

  // tanpa saringan sub-bagian: kueri tracer menemukan DOCX lebih dulu dari dua jalur
  const tracerHasil = await cariPotongan(pj, proyekId, "tracer study waktu tunggu lulusan");
  assert.equal(tracerHasil.hasil[0].dokumenId, docx.id);
  assert.ok(tracerHasil.hasil[0].peringkatVektor !== null && tracerHasil.hasil[0].peringkatKataKunci !== null);
  assert.ok(tracerHasil.hasil.length <= 8);

  // saringan sub-bagian C.3: dokumen sub-bagian itu dan dokumen umum ikut, dokumen sub-bagian C.6 tidak
  const sub = { subBagianKode: "C.3-IKU-a.01" };
  assert.equal((await cariPotongan(pj, proyekId, "kurikulum mitra industri", sub)).hasil[0].dokumenId, pdf.id);
  assert.equal((await cariPotongan(pj, proyekId, "rencana strategis sasaran mutu", sub)).hasil[0].dokumenId, umum.id);
  const tracerC3 = await cariPotongan(pj, proyekId, "tracer study waktu tunggu lulusan", sub);
  assert.ok(!tracerC3.hasil.some((h) => h.dokumenId === docx.id), "dokumen C.6 tidak boleh muncul di C.3");

  // admin tidak bisa mencari di LED
  await assert.rejects(cariPotongan(pjLain, proyekId, "kurikulum"), GalatAkses);
});

test("F-10 berkas tidak didukung dan tautan bukti tidak sah ditolak", async () => {
  await assert.rejects(unggahDokumen(pj, proyekId, { nama: "virus.exe", isi: Buffer.from("MZ") }), GalatPengguna);
  await assert.rejects(unggahDokumen(pj, proyekId, { nama: "palsu.pdf", isi: Buffer.from("teks biasa") }), GalatPengguna);
  await assert.rejects(unggahDokumen(pj, proyekId, { nama: "a.png", isi: PNG, subBagianKode: "TIDAK-ADA" }), GalatPengguna);
  const d = (await daftarDokumen(pj, proyekId))[0];
  await assert.rejects(ubahDokumen(pj, d.id, { tautanBukti: "javascript:alert(1)" }));
});

test("F-12 gambar disimpan utuh dan siap disisipkan ke narasi beserta judulnya", async () => {
  const g = await unggahDokumen(pj, proyekId, { nama: "struktur-organisasi.png", isi: PNG, subBagianKode: "C.2-LB", judul: "Struktur organisasi UPPS" });
  await prosesDokumen(g.id);
  const { dokumen, isi } = await berkasDokumen(pj, g.id);
  assert.equal(dokumen.status, "siap");
  assert.equal(dokumen.mime, "image/png");
  assert.ok(isi.equals(PNG), "byte berkas sama persis dengan unggahan");
  assert.equal(dokumen.hash, hashBerkas(PNG));
  const simpul = simpulGambar(dokumen);
  assert.equal(simpul.type, "image");
  assert.equal(simpul.attrs.title, "Struktur organisasi UPPS");
  assert.equal(simpul.attrs.src, `/api/led/dokumen/${g.id}/berkas`);
  await assert.rejects(berkasDokumen(pjLain, g.id), GalatAkses);
});

test("F-11 tanpa kunci API dokumen menunggu kunci; kunci baru disimpan terenkripsi lalu dokumen diantre ulang", async () => {
  process.env.EMBEDDING_PENYEDIA = "";
  try {
    const d = await unggahDokumen(pj, proyekId, { nama: "Notulen.pdf", isi: await pdfTeks([["Notulen rapat kurikulum dan evaluasi pembelajaran."]]) });
    await prosesDokumen(d.id);
    let x = await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } });
    assert.equal(x.status, "menunggu_kunci");
    assert.match(x.pesan ?? "", /kunci API/i);

    const kunciAsli = "AIzaSyUJI_KUNCI_PALSU_1234567890abcd";
    const k = await tambahKunci(pj, { label: "Kunci uji", kunci: kunciAsli });
    assert.equal(k.akhiran, "abcd");
    assert.ok(k.diantre >= 1);
    x = await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } });
    assert.equal(x.status, "diunggah");
    const tersimpan = await prisma.kunciAPI.findUniqueOrThrow({ where: { id: k.id } });
    assert.ok(!tersimpan.kunciTerenkripsi.includes(kunciAsli), "kunci tidak tersimpan sebagai teks biasa");
    const daftar = await daftarKunci(pj);
    assert.equal(daftar.length, 1);
    assert.ok(!JSON.stringify(daftar).includes(kunciAsli), "daftar kunci tidak memuat isi kunci");
    assert.equal((await daftarKunci(pjLain)).length, 0, "kunci fakultas tidak tampil di daftar kunci cadangan admin");
  } finally {
    process.env.EMBEDDING_PENYEDIA = "uji";
  }
});

test("F-11 mengganti model embedding mengantre ulang semua dokumen teks", async () => {
  const n = await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: [], modelEmbedding: "gemini-embedding-002", pakaiCadanganAdmin: true });
  assert.ok(n >= 3, `diantre ${n}`);
  const teks = await prisma.dokumen.findMany({ where: { proyekId, jenis: { not: "gambar" } } });
  assert.ok(teks.every((d) => d.status === "diunggah"));
  const gambar = await prisma.dokumen.findFirstOrThrow({ where: { proyekId, jenis: "gambar" } });
  assert.equal(gambar.status, "siap", "gambar tidak perlu diproses ulang");
  await assert.rejects(simpanPengaturan(pj, { modelNarasi: "x-model", modelCadangan: [], modelEmbedding: "y-model", pakaiCadanganAdmin: true }), GalatAkses);
});

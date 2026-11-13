import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { simpanKoreksiOcr, teksOcrDokumen, unggahDokumen } from "@/modules/led/data/dokumen";
import { cariPotongan } from "@/modules/led/data/pencarian";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { tutupOcr } from "@/modules/led/ekstraksi/ocr";
import type { HalamanTeks } from "@/modules/led/domain/ocr";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Rencana 10 Nov T3: OCR lokal di pemrosesan dokumen Basis Pengetahuan, koreksi teks, dan ID potongan yang stabil. */

let pj: Pengguna;
let pjLain: Pengguna;
let proyekId: string;
const fikstur = (n: string) => readFileSync(`tests/fikstur/ocr/${n}.pdf`);

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  ({ tim: pjLain } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "2", identitas: {} }));
  proyekId = (await buatProyek(pj, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
});

after(async () => {
  await tutupOcr();
  await prisma.$disconnect();
});

test("PDF pindaian: dibaca OCR, potongan bertanda sumber OCR dan keyakinan, ditemukan pencarian", async () => {
  const d = await unggahDokumen(pj, proyekId, { nama: "sk-pengembangan-dosen.pdf", isi: fikstur("pindaian") });
  await prosesDokumen(d.id);
  const x = await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } });
  assert.equal(x.status, "siap", x.pesan ?? "");
  assert.match(x.versiOcr ?? "", /tesseract/);
  const pt = await prisma.potongan.findMany({ where: { dokumenId: d.id } });
  assert.ok(pt.length >= 1);
  assert.ok(pt.every((p) => p.sumberTeks === "ocr" && (p.keyakinanOcr ?? 0) >= 70));
  const r = await cariPotongan(pj, proyekId, "surat keputusan pengembangan dosen studi lanjut");
  assert.ok(r.hasil.some((h) => h.dokumenId === d.id), "teks OCR ikut dicari");
});

test("PDF campuran: halaman teks tetap dari lapisan teks, halaman gambar dari OCR", async () => {
  const d = await unggahDokumen(pj, proyekId, { nama: "laporan-campuran.pdf", isi: fikstur("campuran") });
  await prosesDokumen(d.id);
  const x = await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } });
  assert.equal(x.status, "siap");
  const hal = x.halamanTeks as unknown as HalamanTeks[];
  assert.deepEqual(hal.map((h) => h.sumber), ["teks", "ocr"]);
  assert.match(hal[1].teks, /NOTULEN RAPAT/);
  const semua = (await prisma.potongan.findMany({ where: { dokumenId: d.id } })).map((p) => p.teks).join(" ");
  assert.match(semua, /penjaminan mutu internal/);
  assert.match(semua, /pengguna lulusan/);
});

test("PDF tanpa teks dan tanpa gambar: gagal dengan pesan yang menyebut OCR", async () => {
  const d = await unggahDokumen(pj, proyekId, { nama: "kosong.pdf", isi: fikstur("kosong") });
  await prosesDokumen(d.id);
  const x = await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } });
  assert.equal(x.status, "gagal");
  assert.match(x.pesan ?? "", /termasuk dengan OCR/);
});

test("koreksi teks OCR: halaman dikoreksi tidak di-OCR ulang; potongan tak berubah mempertahankan ID", async () => {
  const d = await prisma.dokumen.findFirstOrThrow({ where: { namaBerkas: "laporan-campuran.pdf" } });
  const sebelum = await prisma.potongan.findMany({ where: { dokumenId: d.id }, orderBy: { urutan: "asc" } });

  // proses ulang tanpa perubahan: semua ID tetap
  await prosesDokumen(d.id);
  const ulang = await prisma.potongan.findMany({ where: { dokumenId: d.id }, orderBy: { urutan: "asc" } });
  assert.deepEqual(ulang.map((p) => p.id), sebelum.map((p) => p.id));

  const ocr = await teksOcrDokumen(pj, d.id);
  assert.deepEqual(ocr.halaman.map((h) => h.halaman), [2]);
  await assert.rejects(simpanKoreksiOcr(pjLain, d.id, [{ halaman: 2, teks: "x" }]), GalatAkses);
  await assert.rejects(simpanKoreksiOcr(pj, d.id, [{ halaman: 1, teks: "x" }]), /bukan halaman hasil OCR/);
  await simpanKoreksiOcr(pj, d.id, [{ halaman: 2, teks: "NOTULEN RAPAT TINJAUAN KURIKULUM. Dikoreksi: rapat dihadiri dosen dan mitra industri." }]);
  await prosesDokumen(d.id);
  const x = await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } });
  const hal = x.halamanTeks as unknown as HalamanTeks[];
  assert.ok(hal[1].dikoreksi && !hal[1].perluDicek);
  assert.match(hal[1].teks, /mitra industri/);
  const sesudah = await prisma.potongan.findMany({ where: { dokumenId: d.id } });
  assert.ok(sesudah.some((p) => /mitra industri/.test(p.teks)));
  const r = await cariPotongan(pj, proyekId, "mitra industri");
  assert.ok(r.hasil.some((h) => h.dokumenId === d.id), "teks koreksi dicari");
});

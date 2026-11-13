import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { halamanPindaian, ocrHalamanPdf, pnmDariPiksel, tutupOcr } from "../../src/modules/led/ekstraksi/ocr";
import { AMBANG_KEYAKINAN_OCR, gabungHalaman, keyakinanPotongan, teksPindaian } from "../../src/modules/led/domain/ocr";

/** Rencana 10 Nov T3: OCR lokal untuk PDF pindaian (fikstur dibuat scripts/buat-fikstur-ocr.ts). */

after(() => tutupOcr());

async function lapisanTeks(nama: string): Promise<string[]> {
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(readFileSync(`tests/fikstur/ocr/${nama}.pdf`))), { mergePages: false });
  return text as string[];
}

test("halaman dengan < 50 huruf/angka dianggap pindaian; tanda baca dan spasi tidak dihitung", () => {
  assert.ok(teksPindaian(""));
  assert.ok(teksPindaian("- - - 12 . . . \n\n ——"));
  assert.ok(!teksPindaian("Kegiatan penjaminan mutu internal dilaksanakan setiap semester oleh gugus mutu."));
});

test("PDF pindaian penuh: halaman gambar dibaca, kata kunci ditemukan, keyakinan tinggi", async () => {
  const hal = await lapisanTeks("pindaian");
  assert.deepEqual(halamanPindaian(hal), [1]);
  const [r] = await ocrHalamanPdf(readFileSync("tests/fikstur/ocr/pindaian.pdf"), [1]);
  assert.match(r.teks, /KEPUTUSAN DEKAN/);
  assert.match(r.teks, /Pengembangan Dosen/);
  assert.match(r.teks, /sertifikasi/);
  assert.ok(r.keyakinan >= AMBANG_KEYAKINAN_OCR, `keyakinan ${r.keyakinan}`);
});

test("PDF campuran: halaman berlapis teks tidak di-OCR, halaman gambar di-OCR", async () => {
  const hal = await lapisanTeks("campuran");
  assert.match(hal[0], /penjaminan mutu internal/);
  assert.deepEqual(halamanPindaian(hal), [2]);
  const [r] = await ocrHalamanPdf(readFileSync("tests/fikstur/ocr/campuran.pdf"), [2]);
  assert.equal(r.halaman, 2);
  assert.match(r.teks, /NOTULEN RAPAT/);
  assert.match(r.teks, /empat tahun/);
});

test("PDF tanpa teks dan tanpa gambar: tertangani, teks kosong", async () => {
  const hal = await lapisanTeks("kosong");
  const r = await ocrHalamanPdf(readFileSync("tests/fikstur/ocr/kosong.pdf"), halamanPindaian(hal));
  assert.deepEqual(r, [{ halaman: 1, teks: "", keyakinan: 0 }]);
});

test("gabung halaman: koreksi lama dipakai, OCR berkeyakinan rendah ditandai perlu dicek", () => {
  const g = gabungHalaman(["teks halaman satu yang panjang", "", ""], [{ halaman: 2, teks: "hasil ocr", keyakinan: 55 }, { halaman: 3, teks: "abaikan", keyakinan: 90 }], [
    { halaman: 3, teks: "koreksi manusia", sumber: "ocr", keyakinan: 40, perluDicek: false, dikoreksi: true },
  ]);
  assert.deepEqual(g.map((h) => [h.sumber, h.teks, h.perluDicek, h.dikoreksi]), [
    ["teks", "teks halaman satu yang panjang", false, false],
    ["ocr", "hasil ocr", true, false],
    ["ocr", "koreksi manusia", false, true],
  ]);
  assert.deepEqual(keyakinanPotongan(2, 3, g), { sumber: "ocr", keyakinan: 78 }, "rata-rata 55 dan 100 (dikoreksi)");
  assert.deepEqual(keyakinanPotongan(1, 1, g), { sumber: "teks", keyakinan: null });
  assert.deepEqual(keyakinanPotongan(null, null, g), { sumber: "teks", keyakinan: null });
});

test("halaman bertulisan pendek tanpa gambar: lapisan teks tidak tertimpa hasil OCR kosong", () => {
  const g = gabungHalaman(["Notulen rapat kurikulum."], [{ halaman: 1, teks: "", keyakinan: 0 }]);
  assert.deepEqual([g[0].sumber, g[0].teks], ["teks", "Notulen rapat kurikulum."]);
});

test("PNM dari piksel RGBA dan abu-abu", () => {
  const rgba = pnmDariPiksel(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]), 2, 1, 4);
  assert.equal(rgba.subarray(0, 11).toString("ascii"), "P6\n2 1\n255\n");
  assert.deepEqual([...rgba.subarray(11)], [255, 0, 0, 0, 255, 0]);
  const abu = pnmDariPiksel(new Uint8Array([7, 9]), 2, 1, 1);
  assert.equal(abu.subarray(0, 3).toString("ascii"), "P5\n");
  assert.deepEqual([...abu.subarray(-2)], [7, 9]);
});

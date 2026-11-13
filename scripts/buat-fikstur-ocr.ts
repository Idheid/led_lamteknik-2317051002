import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Rencana 10 Nov T3: fikstur PDF pindaian buatan untuk uji OCR (tests/fikstur/ocr/).
 * Teks ditulis ke DOCX, dirender LibreOffice menjadi PNG (halaman 1), lalu PNG itu dijadikan halaman PDF tanpa lapisan
 * teks (seperti hasil pindai). Butuh LibreOffice: SOFFICE=<jalur soffice> bila tidak di tempat bawaan.
 *   npx tsx scripts/buat-fikstur-ocr.ts
 */
const SOFFICE = process.env.SOFFICE ?? "C:/Program Files/LibreOffice/program/soffice.exe";
const keluar = resolve("tests/fikstur/ocr");
mkdirSync(keluar, { recursive: true });
const kerja = mkdtempSync(join(tmpdir(), "fikstur-ocr-"));

async function pngDariTeks(nama: string, baris: string[]): Promise<Uint8Array> {
  const doc = new Document({
    sections: [{
      children: baris.map((t, i) => new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: t, bold: i === 0, size: i === 0 ? 40 : 32, font: "Arial" })] })),
    }],
  });
  const docx = join(kerja, `${nama}.docx`);
  writeFileSync(docx, await Packer.toBuffer(doc));
  execFileSync(SOFFICE, ["--headless", "--convert-to", "png", "--outdir", kerja, docx], { stdio: "ignore", timeout: 120_000 });
  return readFileSync(join(kerja, `${nama}.png`));
}

async function halamanGambar(pdf: PDFDocument, png: Uint8Array) {
  const gambar = await pdf.embedPng(png);
  const lebar = 595;
  const tinggi = (gambar.height / gambar.width) * lebar;
  const hal = pdf.addPage([lebar, tinggi]);
  hal.drawImage(gambar, { x: 0, y: 0, width: lebar, height: tinggi });
}

async function utama() {
  const sk = await pngDariTeks("sk", [
    "SURAT KEPUTUSAN DEKAN FAKULTAS TEKNIK",
    "Nomor 123 Tahun 2025 tentang Pengembangan Dosen",
    "Menetapkan rencana pengembangan dosen tetap program studi untuk studi lanjut doktor dan sertifikasi kompetensi.",
  ]);
  const notulen = await pngDariTeks("notulen", [
    "NOTULEN RAPAT TINJAUAN KURIKULUM",
    "Rapat dihadiri dosen, alumni, dan pengguna lulusan.",
    "Kurikulum ditinjau setiap empat tahun dengan masukan pemangku kepentingan.",
  ]);

  // 1. pindaian penuh: satu halaman gambar tanpa lapisan teks
  const a = await PDFDocument.create();
  await halamanGambar(a, sk);
  writeFileSync(join(keluar, "pindaian.pdf"), await a.save());

  // 2. campuran: halaman 1 berlapis teks, halaman 2 gambar
  const b = await PDFDocument.create();
  const font = await b.embedFont(StandardFonts.Helvetica);
  const h1 = b.addPage([595, 842]);
  const teks = [
    "LAPORAN KEGIATAN PROGRAM STUDI",
    "Halaman ini berlapis teks sehingga tidak perlu dibaca dengan OCR.",
    "Kegiatan penjaminan mutu internal dilaksanakan setiap semester oleh gugus kendali mutu.",
  ];
  teks.forEach((t, i) => h1.drawText(t, { x: 50, y: 780 - i * 24, size: 12, font }));
  await halamanGambar(b, notulen);
  writeFileSync(join(keluar, "campuran.pdf"), await b.save());

  // 3. tanpa teks dan tanpa gambar
  const c = await PDFDocument.create();
  c.addPage([595, 842]);
  writeFileSync(join(keluar, "kosong.pdf"), await c.save());
  console.log(`Fikstur OCR ditulis ke ${keluar}`);
}

utama();

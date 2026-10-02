/**
 * Membuat fikstur uji tests/fikstur/lkps-contoh-s1.pdf: tabel LKPS contoh (fiktif) dicetak seperti hasil ekspor
 * Excel ke PDF: judul tabel template, baris judul kolom, baris nomor kolom, sel terbungkus beberapa baris,
 * dan pindah halaman. Sumber data: tests/fikstur/lkps-contoh-s1.xlsx.
 *   npx tsx scripts/buat-fikstur-lkps-pdf.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { bacaLkpsXlsx } from "../src/lib/lkps/baca-xlsx";
import type { TabelBaca } from "../src/lib/lkps/jenis";
import KOLOM_TEMPLATE from "../src/lib/lkps/kolom-template.json";
import { formatAngka } from "../src/lib/domain/teks";

export const FIKSTUR_PDF = resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.pdf");
const FIKSTUR_XLSX = resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx");

const LEBAR = 842;
const TINGGI = 595;
const TEPI = 30;
const UKURAN = 6;
const JARAK = 8.5;

/** Huruf di luar WinAnsi (font standar PDF) diganti padanannya. */
function aman(s: string): string {
  return s.replace(/\s+/g, " ").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/[√✓]/g, "V").replace(/[–—]/g, "-").replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function tampil(v: string | number | null): string {
  if (v === null) return "";
  if (typeof v === "number") return formatAngka(v, 2);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return aman(m ? `${m[3]}/${m[2]}/${m[1]}` : v);
}

function bungkus(teks: string, font: PDFFont, lebar: number): string[] {
  const hasil: string[] = [];
  let baris = "";
  for (const kata of teks.split(/\s+/).filter(Boolean)) {
    const coba = baris ? `${baris} ${kata}` : kata;
    if (font.widthOfTextAtSize(coba, UKURAN) <= lebar - 3 || !baris) baris = coba;
    else {
      hasil.push(baris);
      baris = kata;
    }
  }
  if (baris) hasil.push(baris);
  return hasil.length ? hasil : [""];
}

interface Kanvas {
  doc: PDFDocument;
  font: PDFFont;
  halaman: PDFPage;
  y: number;
}

function halamanBaru(k: Kanvas) {
  k.halaman = k.doc.addPage([LEBAR, TINGGI]);
  k.y = TINGGI - TEPI;
}

function tulis(k: Kanvas, teks: string, x: number, ukuran = UKURAN) {
  if (teks) k.halaman.drawText(teks, { x, y: k.y, size: ukuran, font: k.font });
}

function cetakTabel(k: Kanvas, t: TabelBaca, judul: string[], blokLain?: { label: string; baris: string[][] }) {
  halamanBaru(k);
  for (const j of judul) {
    tulis(k, aman(j), TEPI, 9);
    k.y -= 13;
  }
  // lebar kolom sebanding panjang isi terpanjang
  const panjang = t.kolom.map((c) => Math.max(4, ...t.baris.map((b) => Math.min(40, tampil(b.sel[c.kunci]).length))));
  const total = panjang.reduce((s, x) => s + x, 0);
  const lebar = panjang.map((p) => (p / total) * (LEBAR - 2 * TEPI));
  const xKolom = lebar.map((_, i) => TEPI + lebar.slice(0, i).reduce((s, x) => s + x, 0));

  const cetakKepala = (labelBlok: string | null) => {
    if (labelBlok) {
      tulis(k, aman(labelBlok), TEPI, 7);
      k.y -= 11;
    }
    t.kolom.forEach((c, i) => tulis(k, aman(c.label.split(" / ").pop() ?? "").slice(0, Math.max(3, Math.floor(lebar[i] / 3))), xKolom[i] + 1, 5));
    k.y -= JARAK;
    t.kolom.forEach((c, i) => tulis(k, c.nomor, xKolom[i] + lebar[i] / 2 - 2));
    k.y -= JARAK;
  };

  if (blokLain) {
    cetakKepala(blokLain.label);
    for (const r of blokLain.baris) {
      r.forEach((v, i) => tulis(k, v, xKolom[i] + 1));
      k.y -= JARAK;
    }
    k.y -= 6;
  }
  cetakKepala(t.blok);
  for (const b of t.baris) {
    const isi = t.kolom.map((c, i) => bungkus(tampil(b.sel[c.kunci]), k.font, lebar[i]));
    const tinggi = Math.max(...isi.map((x) => x.length));
    if (k.y - tinggi * JARAK < TEPI) {
      halamanBaru(k);
      t.kolom.forEach((c, i) => tulis(k, c.nomor, xKolom[i] + lebar[i] / 2 - 2)); // nomor kolom diulang
      k.y -= JARAK;
    }
    for (let baris = 0; baris < tinggi; baris++) {
      isi.forEach((x, i) => tulis(k, x[baris] ?? "", xKolom[i] + 1));
      k.y -= JARAK;
    }
  }
}

export async function buatFiksturPdf(): Promise<Uint8Array> {
  const h = await bacaLkpsXlsx(readFileSync(FIKSTUR_XLSX), "S1");
  const doc = await PDFDocument.create();
  const k: Kanvas = { doc, font: await doc.embedFont(StandardFonts.Helvetica), halaman: doc.addPage([LEBAR, TINGGI]), y: 0 };
  doc.removePage(0);
  const judul = (KOLOM_TEMPLATE as { judul: Record<string, string[]> }).judul;
  for (const t of h.tabel) {
    // 6.d: blok Diploma Tiga dicetak lebih dulu untuk menguji pemilihan blok per jenjang
    const blokLain = t.sheet === "6d"
      ? { label: "Diisi oleh pengusul dari Program Studi pada Program Diploma Tiga", baris: [["TS-2", "999", "999", "999", "999"]] }
      : undefined;
    cetakTabel(k, t, judul[t.sheet] ?? [t.judul], blokLain);
  }
  return doc.save();
}

async function main() {
  writeFileSync(FIKSTUR_PDF, await buatFiksturPdf());
  console.log(`Fikstur ditulis: ${FIKSTUR_PDF}`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/buat-fikstur-lkps-pdf.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

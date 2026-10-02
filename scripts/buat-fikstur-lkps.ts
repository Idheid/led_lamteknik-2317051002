/**
 * Membuat fikstur uji tests/fikstur/lkps-contoh-s1.xlsx: template LKPS LAM Teknik 2025 asli yang diisi data fiktif
 * dari tests/fikstur/data-lkps-contoh.ts. Jalankan ulang bila data contoh berubah:
 *   npx tsx scripts/buat-fikstur-lkps.ts
 * Template dibaca dari TEMPLATE_LKPS_PATH (bawaan: folder saudara "../Led Lamteknik/...").
 */
import "dotenv/config";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { barisNomor, labelBlok, lembarDariWorksheet } from "../src/lib/lkps/baca-xlsx";
import { pilihBlokJenjang } from "../src/lib/lkps/struktur";
import { BERLABEL, DAFTAR, MENU, type Nilai } from "../tests/fikstur/data-lkps-contoh";

export const TEMPLATE_LKPS_BAWAAN =
  "../Led Lamteknik/Instrumen_Akreditasi_LAM_Teknik_2025 (dari lamteknik.or.id)/01_Pasca Terakreditasi Pertama dan Unggul/" +
  "Template LKPS APS Vokasi dan Akademik Instrumen LAM Teknik 2025 Pasca Akreditasi Minimum dan Unggul (Seluruh Jenjang).xlsx";

export const FIKSTUR_LKPS = resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx");

function nilai(v: Nilai): ExcelJS.CellValue {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return v;
}

function teks(ws: ExcelJS.Worksheet, r: number, c: string): string {
  const v = ws.getCell(`${c}${r}`).value;
  return v === null || v === undefined ? "" : String(typeof v === "object" && "richText" in v ? v.richText.map((x) => x.text).join("") : v).trim();
}

/** Baris nomor blok Sarjana untuk sheet berblok, atau baris nomor pertama. */
function nomorBlok(ws: ExcelJS.Worksheet): number {
  const l = lembarDariWorksheet(ws);
  const nomor = barisNomor(l);
  const label = nomor.map((r, i) => labelBlok(l, r, i === 0 ? 1 : nomor[i - 1] + 1));
  if (label.filter(Boolean).length > 1) {
    const i = pilihBlokJenjang(label, "S1");
    if (i === null) throw new Error(`Blok Sarjana tidak ada di sheet ${ws.name}`);
    return nomor[i];
  }
  return nomor[0];
}

export async function buatFiksturLkps(template = process.env.TEMPLATE_LKPS_PATH || TEMPLATE_LKPS_BAWAAN): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(resolve(process.cwd(), template));

  const menu = wb.getWorksheet("Menu");
  if (!menu) throw new Error("Sheet Menu tidak ada di template");
  for (const [sel, v] of Object.entries(MENU)) menu.getCell(sel).value = nilai(v);

  for (const [sheet, daftar] of Object.entries(DAFTAR)) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) throw new Error(`Sheet ${sheet} tidak ada`);
    let r = nomorBlok(ws) + 1;
    while (/^[IVX]+$/.test(teks(ws, r, "A"))) r++; // lewati baris kategori 4.f / 6.e.3
    for (const isi of daftar) {
      for (const [kol, v] of Object.entries(isi)) if (v !== null) ws.getCell(`${kol}${r}`).value = nilai(v);
      r++;
    }
  }

  for (const [sheet, kolomLabel, pola, isi] of BERLABEL) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) throw new Error(`Sheet ${sheet} tidak ada`);
    const mulai = nomorBlok(ws) + 1;
    let r = mulai;
    while (r < mulai + 60 && !pola.test(teks(ws, r, kolomLabel))) r++;
    if (r >= mulai + 60) throw new Error(`Label ${pola} tidak ditemukan di sheet ${sheet}`);
    for (const [kol, v] of Object.entries(isi)) ws.getCell(`${kol}${r}`).value = nilai(v);
  }
  return wb;
}

async function main() {
  const wb = await buatFiksturLkps();
  await wb.xlsx.writeFile(FIKSTUR_LKPS);
  console.log(`Fikstur ditulis: ${FIKSTUR_LKPS}`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/buat-fikstur-lkps.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

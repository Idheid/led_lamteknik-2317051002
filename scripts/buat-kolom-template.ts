/**
 * Membuat src/lib/lkps/kolom-template.json: daftar kolom (huruf, nomor, judul) setiap sheet tabel template LKPS,
 * per blok jenjang. Dipakai pembaca PDF untuk memetakan kolom cetakan ke huruf kolom template.
 * Jalankan bila template LKPS berganti versi:  npx tsx scripts/buat-kolom-template.ts
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { barisNomor, bacaLembarXlsx, bacaLkpsDariLembar } from "../src/lib/lkps/baca-xlsx";
import { KECUALI_SHEET } from "../src/lib/lkps/struktur";
import type { DataTemplate, KolomTemplate } from "../src/lib/lkps/baca-pdf";
import { KODE_JENJANG } from "../src/lib/domain/instrumen";
import { TEMPLATE_LKPS_BAWAAN } from "./buat-fikstur-lkps";

export const BERKAS_KOLOM = resolve(process.cwd(), "src/lib/lkps/kolom-template.json");

/** Judul (baris berawalan "Tabel" di kolom A sebelum baris nomor) dan kolom per blok setiap sheet tabel. */
export async function hitungKolomTemplate(berkas: Buffer): Promise<DataTemplate> {
  const hasil: KolomTemplate = {};
  const judul: Record<string, string[]> = {};
  for (const l of await bacaLembarXlsx(berkas)) {
    if (KECUALI_SHEET.has(l.nama)) continue;
    const batas = barisNomor(l)[0] ?? 15;
    judul[l.nama] = [];
    for (let r = 1; r < batas; r++) {
      const v = l.sel.get(r)?.get(1)?.nilai;
      if (typeof v === "string" && /^tabel/i.test(v)) judul[l.nama].push(v.replace(/\s+/g, " "));
    }
    for (const jenjang of KODE_JENJANG) {
      const t = bacaLkpsDariLembar([l], jenjang).tabel[0];
      if (!t) continue;
      const daftar = (hasil[l.nama] ??= []);
      const ada = daftar.find((b) => b.blok === t.blok);
      if (ada) ada.jenjang.push(jenjang);
      else daftar.push({ blok: t.blok, jenjang: [jenjang], kolom: t.kolom });
    }
  }
  return { judul, kolom: hasil };
}

async function main() {
  const template = resolve(process.cwd(), process.env.TEMPLATE_LKPS_PATH || TEMPLATE_LKPS_BAWAAN);
  const hasil = await hitungKolomTemplate(readFileSync(template));
  writeFileSync(BERKAS_KOLOM, `${JSON.stringify(hasil, null, 1)}\n`);
  console.log(`Ditulis ${BERKAS_KOLOM}: ${Object.keys(hasil.kolom).length} sheet`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/buat-kolom-template.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

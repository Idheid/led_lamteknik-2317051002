/**
 * Rencana 10 Nov T10 (R2): snapshot hasil semua butir angka Sarjana dari fikstur LKPS S1, dibuat SEBELUM refaktor
 * metrik/skor. Uji tests/unit/regresi-rumus-sarjana.test.ts memastikan hasilnya identik sesudah refaktor.
 * Pakai: npx tsx scripts/snapshot-rumus-sarjana.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bacaLkpsXlsx } from "@/modules/led/data-lkps/baca-xlsx";
import { hitungSemua } from "@/modules/led/domain/metrik-lkps";

async function main() {
  const h = await bacaLkpsXlsx(readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")), "S1");
  const hasil = [2024, 2025].map((tsTahunMulai) => ({ tsTahunMulai, butir: hitungSemua(h.tabel, { tsTahunMulai }) }));
  writeFileSync(resolve(process.cwd(), "tests/fikstur/rumus/regresi-sarjana.json"), `${JSON.stringify(hasil, null, 1)}\n`, "utf8");
  console.log(`${hasil[0].butir.length} butir disimpan`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

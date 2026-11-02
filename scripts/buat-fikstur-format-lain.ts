import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { templateFormatLain } from "../tests/fikstur/instrumen/format-lain";

/**
 * Buat `tests/fikstur/instrumen/template-format-lain.docx` dari Template LEDPS 2025 resmi (perbaikan 2 Nov 2026):
 * judul hanya bergaya Heading 1/2/3. Aturan penggantian gaya ada di `tests/fikstur/instrumen/format-lain.ts`.
 *
 *   npx tsx scripts/buat-fikstur-format-lain.ts [keluaran.docx]
 */
async function main() {
  const asal = resolve(process.cwd(), "tests/fikstur/instrumen/template-ledps-2025.docx");
  const keluaran = resolve(process.cwd(), process.argv[2] ?? "tests/fikstur/instrumen/template-format-lain.docx");
  writeFileSync(keluaran, await templateFormatLain(readFileSync(asal)));
  console.log(`Ditulis: ${keluaran}`);
}

main();

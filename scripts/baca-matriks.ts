/**
 * Rencana 10 Nov T10 (R1): baca Matriks Penilaian LED dan LKPS (PDF resmi LAM Teknik 2025) menjadi baris butir
 * (No, kriteria, indikator, deskriptor skor 4–0) memakai `susunMatriks` (posisi teks, tanpa AI), untuk inventaris rumus
 * butir angka per jenjang. Keluaran Markdown ke stdout atau ke berkas.
 *
 * Pakai: npx tsx scripts/baca-matriks.ts "<berkas matriks.pdf>" [keluaran.md]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { bacaHalamanPdf } from "@/modules/led/instrumen/pdf";
import { susunMatriks } from "@/modules/led/domain/matriks";

async function main() {
  const [berkas, keluar] = process.argv.slice(2);
  if (!berkas) throw new Error("Berikan lokasi PDF matriks.");
  const { halaman } = await bacaHalamanPdf(readFileSync(berkas));
  const { baris } = susunMatriks(halaman);
  const md = baris.map((b) => [
    `## ${b.no} (hlm. ${b.halaman.join(", ")}) ${b.konteks.join(" › ")}`,
    `**Kriteria:** ${b.kriteria}`,
    `**Indikator:** ${b.indikator}`,
    ...b.skor.map((s, i) => `- **${4 - i}:** ${s}`),
  ].join("\n")).join("\n\n");
  if (keluar) writeFileSync(keluar, md, "utf8");
  else process.stdout.write(md);
  console.error(`${baris.length} baris dari ${halaman.length} halaman`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

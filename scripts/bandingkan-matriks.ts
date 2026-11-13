/**
 * Rencana 10 Nov T10 (R1): bandingkan matriks satu jenjang dengan matriks Sarjana. Setiap baris butir jenjang dicocokkan
 * ke baris Sarjana dengan indikator paling mirip (Jaccard kata), lalu deskriptor skor 4–0 dibandingkan setelah
 * dinormalkan. Keluaran JSON: no, halaman, indikator, butir Sarjana padanan, kemiripan, dan apakah deskriptor sama.
 * Dipakai untuk menyusun docs/rumus/RUMUS-<JENJANG>.md (deskriptor yang berbeda dibaca dan disalin manual).
 *
 * Pakai: npx tsx scripts/bandingkan-matriks.ts "<matriks Sarjana.pdf>" "<matriks jenjang.pdf>" [keluaran.json | keluaran.md "Nama jenjang"]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { bacaHalamanPdf } from "@/modules/led/instrumen/pdf";
import { susunMatriks, type BarisMatriks } from "@/modules/led/domain/matriks";

const normal = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[“”"']/g, "").trim();
const kata = (s: string) => new Set(normal(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));

function jaccard(a: Set<string>, b: Set<string>): number {
  const irisan = [...a].filter((x) => b.has(x)).length;
  return irisan / (a.size + b.size - irisan || 1);
}

async function baca(berkas: string): Promise<BarisMatriks[]> {
  const { halaman } = await bacaHalamanPdf(readFileSync(berkas));
  return susunMatriks(halaman).baris;
}

async function main() {
  const [sarjana, jenjang, keluar] = process.argv.slice(2);
  const s = await baca(sarjana);
  const j = await baca(jenjang);
  const hasil: Baris[] = j.map((b) => {
    const kb = kata(`${b.kriteria} ${b.indikator}`);
    let terbaik: { b: BarisMatriks; nilai: number } | null = null;
    for (const x of s) {
      const nilai = jaccard(kb, kata(`${x.kriteria} ${x.indikator}`));
      if (!terbaik || nilai > terbaik.nilai) terbaik = { b: x, nilai };
    }
    const skorSama = terbaik ? b.skor.map((d, i) => normal(d) === normal(terbaik!.b.skor[i])) : [];
    return {
      no: b.no,
      halaman: b.halaman,
      indikator: b.indikator.slice(0, 160),
      sarjana: terbaik?.b.no ?? null,
      mirip: Number((terbaik?.nilai ?? 0).toFixed(2)),
      skorSama,
      skor: b.skor,
      skorSarjana: terbaik?.b.skor ?? null,
    };
  });
  if (keluar?.endsWith(".md")) {
    writeFileSync(keluar, markdown(process.argv[5] ?? "", jenjang, hasil), "utf8");
    return;
  }
  const json = JSON.stringify(hasil, null, 1);
  if (keluar) writeFileSync(keluar, json, "utf8");
  else process.stdout.write(json);
}

type Baris = { no: string; halaman: number[]; indikator: string; sarjana: string | null; mirip: number; skorSama: boolean[]; skor: string[]; skorSarjana: string[] | null };

/** Butir angka Sarjana yang sudah punya rumus (metrik-lkps.ts), per nomor baris matriks. */
const KODE_SARJANA: Record<string, string[]> = {
  "6": ["6-I", "6-II"], "9": ["9"], "10": ["10"], "11": ["11"], "18": ["18"], "19": ["19"], "23": ["23"], "25": ["25"],
  "26": ["26"], "27": ["27"], "28": ["28"], "30": ["30"], "31": ["31"], "32": ["32"], "33": ["33"], "34": ["34"],
  "35": ["35"], "36": ["36"], "37": ["37"], "40": ["40"], "41": ["41"], "42": ["42"], "43": ["43-I", "43-II"], "44": ["44"],
  "45": ["45"], "46": ["46"], "47": ["47"], "49": ["49"], "50": ["50"], "51": ["51"], "52": ["52"],
};

const BERANGKA = /[≥≤<>]|\d+\s*%|NDT|Rasio|RI\s*=|=\s*\(/;

function tabelLkps(b: Baris): string[] {
  return [...new Set([...`${b.indikator} ${b.skor.join(" ")}`.matchAll(/Tabel\s+(\d+\.[a-z](?:\.\d)?)/gi)].map((m) => m[1].toLowerCase()))];
}

function rincian(b: Baris): string {
  return [
    `- Indikator (hlm. ${b.halaman.join(", ")}): ${b.indikator.replace(/\s+/g, " ").trim()}`,
    ...b.skor.map((s, i) => `- Skor ${4 - i}: ${s.replace(/\s+/g, " ").trim() || "(kosong di teks PDF)"}`),
  ].join("\n");
}

function markdown(namaJenjang: string, berkas: string, hasil: Baris[]): string {
  const angka = hasil.filter((b) => b.sarjana && KODE_SARJANA[b.sarjana] && b.mirip >= 0.35);
  const lain = hasil.filter((b) => !angka.includes(b) && BERANGKA.test(b.skor.join(" ")));
  const dipakai = new Set(angka.map((b) => b.sarjana));
  const hilang = Object.keys(KODE_SARJANA).filter((k) => !dipakai.has(k));
  const status = (b: Baris) => b.skorSama.every(Boolean) ? "sama dengan Sarjana" : b.skorSama.slice(0, 2).every(Boolean) ? "ambang 4/3 sama, skor rendah beda" : "beda: perlu rumus jenjang";
  return [
    `# Rumus butir angka ${namaJenjang} (R1, inventaris)`,
    "",
    `Sumber: \`${berkas.split(/[\\/]/).pop()}\` (folder Instrumen_Akreditasi_LAM_Teknik_2025, 01_Pasca Terakreditasi Pertama dan Unggul).`,
    "Dibuat dengan `scripts/bandingkan-matriks.ts` (Rencana 10 Nov T10 R1): baris matriks disusun dari posisi teks PDF",
    "(`susunMatriks`, tanpa AI), dicocokkan ke butir Sarjana dengan indikator paling mirip, lalu deskriptor skor 4–0",
    "dibandingkan. Deskriptor di bawah disalin dari teks PDF; sel yang kosong atau terpotong harus dicek ke PDF.",
    "Padanan dengan kemiripan < 0,6 perlu dicek manual.",
    "",
    "## Ringkasan",
    "",
    "| Butir | Padanan Sarjana | Kemiripan | Tabel LKPS | Hlm. | Deskriptor 4·3·2·1·0 | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...angka.map((b) => `| ${b.no} | ${KODE_SARJANA[b.sarjana!].join(", ")} | ${b.mirip.toFixed(2)} | ${tabelLkps(b).join(", ") || "-"} | ${b.halaman.join(", ")} | ${b.skorSama.map((x) => (x ? "=" : "≠")).join("")} | ${status(b)} |`),
    "",
    `Butir berangka tanpa padanan Sarjana: ${lain.length ? lain.map((b) => b.no).join(", ") : "tidak ada"}.`,
    `Butir angka Sarjana tanpa padanan di jenjang ini: ${hilang.length ? hilang.map((k) => KODE_SARJANA[k].join("/")).join(", ") : "tidak ada"}.`,
    "",
    "## Deskriptor butir berpadanan",
    "",
    ...angka.flatMap((b) => [`### Butir ${b.no} ↔ Sarjana ${KODE_SARJANA[b.sarjana!].join(", ")} (${status(b)})`, "", rincian(b), ""]),
    "## Butir berangka tanpa padanan Sarjana (cek: datanya ada di LKPS atau tetap manual dengan alasan)",
    "",
    ...lain.flatMap((b) => [`### Butir ${b.no}`, "", rincian(b), ""]),
  ].join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

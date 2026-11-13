/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Diploma Satu dan Diploma Dua, hitungan tangan di
 * docs/uji/hitungan-manual-d1d2.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungRumus, katalogRumusJenjang } from "../../src/modules/led/domain/rumus";
import type { TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

// 4 DTPS (1 doktor, 1 Lektor), 1 dosen tidak tetap (PDTT 20%)
const T4A = tabel("4a", [
  { A: 1, B: "Dosen 1", D: "Dosen Tetap", J: "V", G: "Doktor", K: "Lektor" },
  ...[2, 3, 4].map((i) => ({ A: i, B: `Dosen ${i}`, D: "Dosen Tetap", J: "V", K: "Asisten Ahli" })),
  { A: 5, B: "Dosen 5", D: "Dosen Tidak Tetap" },
]);
const T3A1 = tabel("3a1", [{ A: 1, B: "1", C: "MK-1", D: "Las", E: "V", F: 1, H: 3 }]);
const T6D = tabel("6d", [{ A: "TS", B: 20, C: 12, D: 4, E: 2 }, { A: "TS-1", B: 20, C: 10, D: 4, E: 2 }]);
const T6F1 = tabel("6f1", [{ A: "TS-1", B: 10, C: 6, D: 0, E: 2, F: 4, G: 0 }]);
const SEMUA = [T4A, T3A1, T6D, T6F1];
const skor = (kode: string) => hitungRumus(kode, SEMUA, k)!.skor!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("katalog D1 dan D2 sepanjang D3, kode berawalan jenjang", () => {
  for (const j of ["D1", "D2"]) {
    const kat = katalogRumusJenjang(j);
    assert.equal(kat.length, 30);
    assert.ok(kat.every((r) => r.kode.startsWith(`${j}-`)), j);
  }
});

test("aturan bersama D1/D2: praktik, NDS3, PGBLKL, waktu tunggu", () => {
  for (const j of ["D1", "D2"]) {
    assert.equal(skor(`${j}-18`), 4, `${j} PJP 75% ≥ 70%`);
    assert.equal(skor(`${j}-24`), 4, `${j} NDS3 = 1`);
    dekat(skor(`${j}-25`), 2 + (20 * 0.25) / 3, `${j} PGBLKL 25%`);
    // WT = (2 × 1,5 + 4 × 4,5)/6 = 3,5 → (24 − 14)/3
    dekat(skor(`${j}-45`), (24 - 4 * 3.5) / 3, `${j} WT 3,5`);
  }
});

test("kecukupan DTPS: D1 NDTPS ≥ 3 (interpolasi PDTT 10–40%), D2 NDTPS ≥ 6 dengan A = (NDTPS − 3)/3", () => {
  dekat(skor("D1-23"), 4 - (0.2 - 0.1) / 0.3, "D1 PDTT 20%");
  const A = (4 - 3) / 3;
  const B = (0.4 - 0.2) / 0.3;
  dekat(skor("D2-23"), 2 + 2 * A * B, "D2 NDTPS 4");
});

test("masa studi dan tepat waktu memakai kolom 6.d masing-masing jenjang", () => {
  // D1: MS = (2 × 0,5 + 12 × 1 + 4 × 1,75 + ... TS-1 ...)/n; tepat waktu TS: (12 + 2)/20 = 70%
  dekat(skor("D1-43"), 1 + (30 * 0.7) / 8, "D1 PTW 70%");
  // D2: tepat waktu TS-1: (10 + 2)/20 = 60%
  dekat(skor("D2-43"), 1 + (30 * 0.6) / 8, "D2 PTW 60%");
  const msD2 = (4 * 1.25 + 22 * 2 + 8 * 3.25) / 34;
  assert.equal(skor("D2-42"), msD2 <= 2.5 ? 4 : 9 - 2 * msD2);
});

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Program Profesi Insinyur, hitungan tangan di docs/uji/hitungan-manual-ppi.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { alasanTanpaRumus, hitungRumus, katalogRumusJenjang } from "../../src/modules/led/domain/rumus";
import type { TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

// 6 DTPS (3 ber-IPU dan STRI), 3 dosen industri, 30 mahasiswa
const T4A = tabel("4a", [
  ...[1, 2, 3, 4, 5, 6].map((i) => ({ A: i, B: `Dosen ${i}`, D: "Dosen Tetap", J: "V", K: "Lektor", O: i <= 3 ? "IPU-001" : null, P: i <= 3 ? "STRI-1" : null })),
  ...[7, 8, 9].map((i) => ({ A: i, B: `Praktisi ${i}`, D: "Dosen Industri/Praktisi" })),
]);
const T6A = tabel("6a", [{ A: 1, B: "PSPPI", C: "V", D: 25, E: 28, F: 30 }]);
const T3A2 = tabel("3a2", [{ A: 1, B: "Praktik keinsinyuran", C: 12, D: 200, E: 800 }, { A: 2, B: "Etika profesi", C: 2, D: 100, E: 0 }]);
const T4K = tabel("4k", [{ A: 1, B: "PL 1", K: 12 }, { A: 2, B: "PL 2", K: 8 }]);
const T6D = tabel("6d", [{ A: "TS-1", B: 20, C: 15, D: 3, E: 1 }]);
const T6F1 = tabel("6f1", [{ A: "TS-1", B: 10, C: 8, D: 2, E: 2, F: 4, G: 0 }]);
const SEMUA = [T4A, T6A, T3A2, T4K, T6D, T6F1];
const skor = (kode: string) => hitungRumus(kode, SEMUA, k)!.skor!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("katalog PPI dan butir 44 manual dengan alasan", () => {
  assert.equal(katalogRumusJenjang("PPI").length, 25);
  assert.match(alasanTanpaRumus("PPI", "44"), /6\.f\.2/);
});

test("dosen: rasio dosen PSPPI/industri, kualifikasi IPU, rasio mahasiswa per dosen", () => {
  dekat(skor("PPI-24"), 4, "RDTPSPPI = 9/3 = 3");
  dekat(skor("PPI-25"), 4, "PDIPU = 3/6 = 50%");
  dekat(skor("PPI-37"), 1 + (3 * (30 / 9)) / 4, "RMD < 4 → 1 + 3 × RMD / 4");
});

test("praktik di industri (3.a.2) dan pembimbing lapangan (4.k)", () => {
  // PJP = 800 / 1100 = 72,7% → 4; PPL = 20 / 2 = 10 → 1 + 0 = 1
  assert.equal(skor("PPI-18"), 4);
  assert.equal(skor("PPI-34"), 1);
});

test("lulusan PPI: masa studi semester, tepat waktu, keberhasilan studi, waktu tunggu", () => {
  const MS = (15 * 2.5 + 3 * 4.5 + 1 * 7) / 19;
  dekat(skor("PPI-39"), 7 - MS, "3 < MS ≤ 6");
  dekat(skor("PPI-40"), 1 + (10 * 0.75) / 3, "PTW 15/20");
  dekat(skor("PPI-41"), 4, "PPS 19/20 = 95%");
  // WT = (2 × 0 + 2 × 1,5 + 4 × 4,5) / 8 = 2,625 → 4
  assert.equal(skor("PPI-43"), 4);
});

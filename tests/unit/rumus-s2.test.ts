/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Magister (S2), hitungan tangan di docs/uji/hitungan-manual-s2.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungRumus, katalogRumusJenjang } from "../../src/modules/led/domain/rumus";
import { hitungButir, type TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

// 10 DTPS: 2 Guru Besar, 3 Lektor Kepala, 4 Lektor; 40 mahasiswa
const jab = ["Guru Besar", "Guru Besar", "Lektor Kepala", "Lektor Kepala", "Lektor Kepala", "Lektor", "Lektor", "Lektor", "Lektor", "Asisten Ahli"];
const T4A = tabel("4a", jab.map((j, i) => ({ A: i + 1, B: `Dosen ${i + 1}`, D: "Dosen Tetap", G: "Doktor", J: "V", K: j })));
const T6A = tabel("6a", [{ A: 1, B: "Magister Teknik", C: "V", D: 38, E: 40, F: 40 }]);
const T6B = tabel("6b", [{ A: 1, B: "TS", C: 10, D: 3.1, E: 3.4, F: 3.8 }]);
const T6D = tabel("6d", [{ A: "TS-2", B: 20, C: 10, D: 6, E: 1 }]);
const T6C1 = tabel("6c1", [
  { A: 1, B: "Lomba nasional", C: "2025-02-01", E: "V", G: "Juara 2" },
  { A: 2, B: "Lomba lama", C: "2022-01-10", E: "V", G: "Juara 1" },
]);
const SEMUA = [T4A, T6A, T6B, T6D, T6C1];
const skor = (kode: string) => hitungRumus(kode, SEMUA, k)!.skor!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("katalog S2 berisi 27 rumus berawalan S2-", () => {
  const kat = katalogRumusJenjang("S2");
  assert.equal(kat.length, 27);
  assert.ok(kat.every((r) => r.kode.startsWith("S2-")));
});

test("jabatan akademik Magister hanya Guru Besar dan Lektor Kepala", () => {
  // PGBLK = 5/10 = 50% → 2 + 20 × 0,5 / 7; Sarjana PGBLKL = 9/10 ≥ 70% → 4
  dekat(skor("S2-26"), 2 + 10 / 7, "S2-26");
  assert.equal(hitungButir("28", SEMUA, k)!.skor, 4);
});

test("IPK Magister: 3,00 ≤ RIPK < 3,50 → 4 × RIPK − 10", () => {
  dekat(skor("S2-39"), 4 * 3.4 - 10, "RIPK 3,4");
});

test("masa studi dan tepat waktu Magister dari kolom 6.d Magister", () => {
  const MS = (10 * 2 + 6 * 3 + 1 * 3.75) / 17;
  assert.ok(MS > 1.5 && MS <= 2.5);
  assert.equal(skor("S2-41"), 4, "1,5 < MS ≤ 2,5");
  dekat(skor("S2-42"), 1 + (30 * 0.5 - 6) / 4, "PTW 10/20");
});

test("prestasi akademik Magister hanya 3 tahun terakhir", () => {
  const h = hitungRumus("S2-40", SEMUA, k)!;
  assert.equal(h.metrik.find((x) => x.kode === "M-NN")!.nilai, 1, "prestasi 2022 di luar 3 tahun");
  dekat(h.skor!, 3.75 * (1 / 40 / 0.02 >= 1 ? 1 : 1 / 40 / 0.02), "RN 2,5% ≥ b → B = 1");
});

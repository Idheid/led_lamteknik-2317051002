/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Magister Terapan (S2Tr), hitungan tangan di docs/uji/hitungan-manual-s2tr.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungRumus } from "../../src/modules/led/domain/rumus";
import type { TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

const T4A = tabel("4a", [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ A: i, B: `Dosen ${i}`, D: "Dosen Tetap", G: "Doktor", J: "V", K: i <= 4 ? "Lektor Kepala" : "Lektor", M: i <= 2 ? "Sertifikat" : null })));
const T4C = tabel("4c", [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ A: i, B: `Dosen ${i}`, C: "V", D: 4, E: 4, F: 4, G: 4, H: 4, I: 4 })));
const T6A = tabel("6a", [{ A: 1, B: "Magister Terapan", C: "V", D: 30, E: 30, F: 30 }]);
const T6D = tabel("6d", [{ A: "TS-2", B: 10, C: 7, D: 2, E: 0 }]);
const T4G = tabel("4g", [{ A: 1, B: "Dosen 1", C: "Produk" }]);
const SEMUA = [T4A, T4C, T6A, T6D, T4G];
const hasil = (kode: string) => hitungRumus(kode, SEMUA, k)!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("butir yang sama dengan Magister memakai rumus S2 dengan nomor butir S2Tr", () => {
  for (const [b, s2] of [["29", "28"], ["26", "26"], ["45", "42"]]) {
    const h = hasil(`S2Tr-${b}`);
    assert.equal(h.butir, b);
    assert.equal(h.skor, hitungRumus(`S2-${s2}`, SEMUA, k)!.skor, `S2Tr-${b}`);
  }
  dekat(hasil("S2Tr-26").skor!, 2 + (20 * 0.5) / 7, "PGBLK 4/8 = 50%");
  assert.equal(hasil("S2Tr-45").skor, 4, "PTW 7/10 = 70% ≥ 60%");
});

test("aturan khusus Magister Terapan: sertifikasi DTPS, produk/jasa DTPS", () => {
  dekat(hasil("S2Tr-27").skor!, 1 + 6 * 0.25, "PDSK 2/8");
  assert.equal(hasil("S2Tr-34").skor, 2, "NAPJ 1 → 1 + 1");
});

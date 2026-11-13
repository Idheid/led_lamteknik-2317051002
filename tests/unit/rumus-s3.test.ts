/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Doktor dan Doktor Terapan, serta uji ketahanan semua rumus jenjang.
 * Hitungan tangan di docs/uji/hitungan-manual-s3.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RUMUS_JENJANG, hitungRumus } from "../../src/modules/led/domain/rumus";
import type { TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

// 8 DTPS: 3 Guru Besar, 3 Lektor Kepala, 2 Lektor; tanpa dosen tidak tetap
const jab = ["Guru Besar", "Guru Besar", "Guru Besar", "Lektor Kepala", "Lektor Kepala", "Lektor Kepala", "Lektor", "Lektor"];
const T4A = tabel("4a", jab.map((j, i) => ({ A: i + 1, B: `Dosen ${i + 1}`, D: "Dosen Tetap", G: "Doktor", J: "V", K: j })));
const T6D = tabel("6d", [{ A: "TS-2", B: 10, C: 4, D: 3, E: 1 }]);
const T4G = tabel("4g", [{ A: 1, B: "Dosen 1", C: "Produk A" }, { A: 2, B: "Dosen 2", C: "Produk B" }]);
const SEMUA = [T4A, T6D, T4G];
const skor = (kode: string) => hitungRumus(kode, SEMUA, k)!.skor!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("Doktor: kecukupan dan jabatan DTPS berbasis Guru Besar", () => {
  // NDTPS 8, PDTT 0% → 4; PGB = 3/8 = 37,5% < 50%, PGBLK = 6/8 = 75% ≥ 70% → 4 (asumsi)
  assert.equal(skor("S3-25"), 4);
  assert.equal(skor("S3-26"), 4);
});

test("Doktor: masa studi dan tepat waktu dari Tabel 6.d Doktor", () => {
  const MS = (4 * 3 + 3 * 4 + 1 * 5) / 8;
  dekat(skor("S3-41"), 1 + (36 - 6 * MS) / 5, "3,5 < MS ≤ 6");
  dekat(skor("S3-42"), 1 + (30 * 0.4 - 3) / 5, "PTW 4/10");
});

test("Doktor Terapan: rumus Doktor dengan nomor bergeser dan produk/jasa 4.g", () => {
  assert.equal(hitungRumus("S3Tr-44", SEMUA, k)!.skor, skor("S3-41"));
  assert.equal(hitungRumus("S3Tr-44", SEMUA, k)!.butir, "44");
  dekat(hitungRumus("S3Tr-34", SEMUA, k)!.skor!, 1 + (3 * 2) / 4, "NAPJ 2");
});

test("setiap rumus semua jenjang berjalan pada LKPS kosong dan pada data uji tanpa galat", () => {
  for (const [jenjang, daftar] of Object.entries(RUMUS_JENJANG)) {
    for (const r of daftar) {
      for (const t of [[], SEMUA]) {
        const h = r.hitung(new Map(t.map((x) => [x.sheet, x])), k);
        assert.equal(h.butir, r.butir, `${r.kode} nomor butir`);
        assert.ok(h.skor === null || (h.skor >= 0 && h.skor <= 4), `${jenjang} ${r.kode} skor ${h.skor}`);
        assert.ok(h.metrik.some((x) => x.kode === h.utama), `${r.kode} metrik utama ${h.utama}`);
      }
    }
  }
});

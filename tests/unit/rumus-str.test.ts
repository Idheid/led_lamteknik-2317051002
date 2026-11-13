/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Sarjana Terapan (STr), hitungan tangan di docs/uji/hitungan-manual-str.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungRumus, katalogRumusJenjang, kodeRumusButir } from "../../src/modules/led/domain/rumus";
import { hitungButir, type TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

// 6 DTPS, 5 dosen tidak tetap (PDTT 5/11 = 45,5%), 120 mahasiswa
const T4A = tabel("4a", [
  ...[1, 2, 3, 4, 5, 6].map((i) => ({ A: i, B: `Dosen ${i}`, D: "Dosen Tetap", J: "V", K: "Asisten Ahli" })),
  ...[7, 8, 9, 10, 11].map((i) => ({ A: i, B: `DTT ${i}`, D: "Dosen Tidak Tetap" })),
]);
const T6A = tabel("6a", [{ A: 1, B: "Teknologi Rekayasa", C: "V", D: 100, E: 110, F: 120 }]);
const T4G = tabel("4g", [{ A: 1, B: "Dosen 1", C: "Alat uji" }, { A: 2, B: "Dosen 2", C: "Modul" }]);
const T6E4 = tabel("6e4", [{ A: 1, B: "Mhs", C: "Aplikasi" }]);
// 6.e.2: baris ke-2 (NA2) 6 judul, baris ke-4 (NA4) 1 judul
const T6E2 = tabel("6e2", Array.from({ length: 10 }, (_, i) => ({ A: i + 1, B: `Jenis ${i + 1}`, C: 0, D: 0, E: i === 1 ? 6 : i === 3 ? 1 : 0 })));
const T6D = tabel("6d", [{ A: "TS-3", B: 40, C: 24, D: 6 }]);
const SEMUA = [T4A, T6A, T4G, T6E4, T6E2, T6D];
const skor = (kode: string) => hitungRumus(kode, SEMUA, k)!.skor!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("katalog STr: kode berawalan STr-, nomor butir STr", () => {
  assert.equal(katalogRumusJenjang("STr").length, 37);
  assert.equal(kodeRumusButir("STr").get("38"), "STr-38");
  assert.equal(hitungRumus("STr-43", SEMUA, k)!.butir, "43");
});

test("kecukupan DTPS: NDTPS ≥ 5 dan PDTT > 40% → 2 (Sarjana memberi 1)", () => {
  assert.equal(skor("STr-26"), 2);
  assert.equal(hitungButir("26", SEMUA, k)!.skor, 1);
});

test("rasio mahasiswa: 15–25 → 4, di bawah 15 → 4 × RMD / 15, tanpa syarat NDTPS", () => {
  // RMD = 120 / 6 = 20
  assert.equal(skor("STr-43"), 4);
});

test("produk/jasa diadopsi: DTPS (4.g) dan mahasiswa (6.e.4), NAPJ ≥ 3 → 4, selain itu 1 + NAPJ", () => {
  assert.equal(skor("STr-37"), 3);
  assert.equal(skor("STr-47"), 2);
});

test("publikasi + pagelaran mahasiswa (6.e.2): faktor 1%/10%/50% per NM", () => {
  // RI = 1/120 = 0,83% ≤ 1%; RN = 6/120 = 5% ≤ 10%; RW = 0 → A = 0,833; B = 0,5
  const A = 1 / 120 / 0.01;
  const B = 6 / 120 / 0.1;
  dekat(skor("STr-50"), 3.75 * (A + B - A * B), "STr-50");
});

test("kelulusan tepat waktu: ambang 80%, rumus 1 + 30 × PTW / 8", () => {
  dekat(skor("STr-49"), 1 + (30 * 0.6) / 8, "PTW 24/40");
  assert.equal(hitungButir("45", SEMUA, k)!.skor, 4, "Sarjana: PTW ≥ 50% → 4");
});

test("butir yang deskriptornya sama memakai skor Sarjana", () => {
  for (const [str, s1] of [["STr-9", "9"], ["STr-44", "41"], ["STr-48", "44"], ["STr-53", "49"], ["STr-56", "52"]]) {
    assert.equal(hitungRumus(str, SEMUA, k)!.skor, hitungButir(s1, SEMUA, k)!.skor, str);
  }
});

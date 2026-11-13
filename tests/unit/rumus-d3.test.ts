/**
 * Rencana 10 Nov T10 (R3): rumus butir angka D3, dengan hitungan tangan di docs/uji/hitungan-manual-d3.md.
 * Tabel LKPS fiktif kecil (tanpa basis data); kolom mengikuti template LKPS 2025 jenjang D3.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungRumus, katalogRumusJenjang, kodeRumusButir } from "../../src/modules/led/domain/rumus";
import { hitungButir, type TabelMetrik } from "../../src/modules/led/domain/metrik-lkps";

const k = { tsTahunMulai: 2025 };
type Sel = Record<string, string | number | null>;
const tabel = (sheet: string, baris: Sel[]): TabelMetrik => ({ sheet, baris: baris.map((sel, i) => ({ nomorBaris: i + 10, sel })) });

// 7 DTPS (1 doktor, 2 lektor, 2 bersertifikat kompetensi), 1 dosen tidak tetap, 1 dosen industri
const dosen = (i: number, x: Sel = {}): Sel => ({ A: i, B: `Dosen ${i}`, D: "Dosen Tetap", J: "V", K: "Asisten Ahli", ...x });
const T4A = tabel("4a", [
  dosen(1, { G: "Doktor Teknik Mesin", K: "Lektor", M: "Sertifikat Las" }),
  dosen(2, { K: "Lektor", M: "Sertifikat K3" }),
  dosen(3), dosen(4), dosen(5), dosen(6), dosen(7),
  { A: 8, B: "Dosen 8", D: "Dosen Tidak Tetap" },
  { A: 9, B: "Praktisi A", D: "Dosen Industri/Praktisi", Q: "Gambar Teknik, Bengkel Las" },
]);
const mk = (nama: string, x: Sel = {}): Sel => ({ A: 1, B: "1", C: `MK-${nama}`, D: nama, E: "V", F: 1, H: 3, ...x });
const T3A1 = tabel("3a1", [mk("Gambar Teknik"), mk("Bengkel Las"), mk("Fisika"), mk("Kimia")]);
const T6A = tabel("6a", [{ A: 1, B: "Teknik Mesin D3", C: "V", D: 90, E: 95, F: 100 }]);
const T4E = tabel("4e", Array.from({ length: 10 }, (_, i) => ({ A: i + 1, B: `Jenis ${i + 1}`, C: 0, D: 0, E: i === 3 ? 1 : i === 1 ? 4 : 0 })));
const T4G = tabel("4g", [1, 2, 3].map((i) => ({ A: i, B: "Dosen 1", C: `Produk ${i}` })));
const T6E4 = tabel("6e4", [{ A: 1, B: "Mhs", C: "Alat bantu" }]);
const T6D = tabel("6d", [{ A: "TS-2", B: 20, C: 10, D: 5, E: 2 }]);
const T6F1 = tabel("6f1", [{ A: "TS-1", B: 20, C: 10, D: 2, E: 4, F: 3, G: 1 }]);
const T6F2 = tabel("6f2", [{ A: "TS-1", B: 20, C: 10, D: 4, E: 4, F: 2 }]);
const T6C1 = tabel("6c1", [{ A: 1, B: "Lomba rancang", C: "2025-03-01", E: "V", G: "Juara 1" }]);
const SEMUA = [T4A, T3A1, T6A, T4E, T4G, T6E4, T6D, T6F1, T6F2, T6C1];

const skor = (kode: string) => hitungRumus(kode, SEMUA, k)!.skor!;
const dekat = (a: number, b: number, pesan: string) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} ≠ ${b}`);

test("katalog D3: kode berawalan D3-, butir sesuai nomor matriks D3", () => {
  const kat = katalogRumusJenjang("D3");
  assert.equal(kat.length, 30);
  assert.ok(kat.every((r) => r.kode.startsWith("D3-")));
  assert.equal(kodeRumusButir("D3").get("23"), "D3-23");
  assert.equal(hitungRumus("D3-23", SEMUA, k)!.butir, "23", "hasil memakai nomor butir D3");
});

test("dosen (4.a): kecukupan, kualifikasi, jabatan, sertifikasi, dosen industri", () => {
  dekat(skor("D3-23"), 2 + 2 * 0.5 * ((0.4 - 0.125) / 0.3), "D3-23 NDTPS 7, PDTT 12,5%");
  dekat(skor("D3-24"), 2 + 10 / 7, "D3-24 PDS3 1/7");
  dekat(skor("D3-25"), 2 + 8 / 7, "D3-25 PGBLKL 2/7");
  dekat(skor("D3-26"), 1 + 12 / 7, "D3-26 PDSK 2/7");
  assert.equal(skor("D3-27"), 4, "PMKI 2/4 = 50% ≥ 20%");
});

test("pembelajaran praktik (3.a.1): ambang D3 50–70% berbeda dari Sarjana", () => {
  dekat(skor("D3-18"), 4 - (40 * 0.75 - 28) / 3, "PJP 75%");
  dekat(hitungButir("18", SEMUA, k)!.skor!, 2, "Sarjana PJP 75% → 8 − 8 × 0,75");
});

test("publikasi 4.e, produk/jasa 4.g dan 6.e.4, rasio mahasiswa", () => {
  assert.equal(skor("D3-32"), 4, "RI 1/7 > 0,05 dan RN 4/7 > 0,5");
  dekat(skor("D3-34"), 2 + 6 / 7, "RS 3/7");
  assert.equal(skor("D3-41"), 3, "NAPJ 1 → 2 + 1");
  assert.equal(skor("D3-38"), 4, "RMD 100/7 = 14,3");
});

test("lulusan D3: masa studi, tepat waktu, waktu tunggu, kesesuaian bidang kerja", () => {
  // MS = (12 × 3 + 5 × 4,75 + 2 × 2,25 ... ) — baris TS-2: C=10 (3), D=5 (4,75), E=2 (2,25)
  const MS = (10 * 3 + 5 * 4.75 + 2 * 2.25) / 17;
  dekat(hitungRumus("D3-42", SEMUA, k)!.metrik.find((x) => x.kode === "M-MS")!.nilai!, MS, "MS");
  dekat(skor("D3-42"), 4, "MS 3,4 → 4");
  dekat(skor("D3-43"), 1 + (30 * 0.6) / 8, "PTW 12/20");
  assert.equal(skor("D3-45"), 4, "WT 2,85 bulan");
  dekat(skor("D3-46"), 3, "KBK 60% → 5 × 0,6");
});

test("prestasi akademik D3 memakai faktor 0,05%/1%/2%", () => {
  dekat(skor("D3-40-I"), 3.75, "RN 1% = b → B = 1");
  dekat(hitungButir("43-I", SEMUA, k)!.skor!, 1.875, "Sarjana b = 2% → B = 0,5");
});

test("butir dengan deskriptor sama memakai skor Sarjana", () => {
  for (const [d3, s1] of [["D3-9", "9"], ["D3-29", "30"], ["D3-39", "42"], ["D3-48", "52"]]) {
    assert.equal(hitungRumus(d3, SEMUA, k)!.skor, hitungButir(s1, SEMUA, k)!.skor, d3);
  }
});

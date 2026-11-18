# Hitungan manual mesin hitung LKPS gabungan (Gabung LKPS G4)

Mesin hitung `src/modules/lkps/domain/hitung.ts` dipindah tanpa perubahan rumus dari
`src/lib/computation-engine.ts` milik `Achmadghalib725/LKPS_LAM-TEKNIK@c718eff` (Achmad Ghalib). Hitungan di bawah dibuat
dengan tangan lalu dicocokkan dengan uji `src/modules/lkps/domain/__tests__/hitung.test.ts`.

Berkas ini berbeda dari `hitungan-manual-lkps.md`, yang berisi hitungan butir angka LED dari LKPS yang diunggah.

Aturan pembulatan kode asal: skor `toFixed(2)`; nilai tertimbang indikator = skor × bobot / 4, dibulatkan 2 desimal.

## 1. `hitungIndikatorRK(n1, n2, n3, ndtps)`: kuantitas kerja sama, bobot 5

Rumus: KK = (3·N1 + 2·N2 + 1·N3) / NDTPS, dengan NDTPS 0 dianggap 1. Skor = min(4, max(0, KK)).
Status: ≥ 3,5 Unggul; ≥ 3,0 Baik Sekali; ≥ 2,0 Baik; selainnya Perlu Perbaikan.

| Masukan | Langkah | KK | Skor | Tertimbang | Status |
|---|---|---|---|---|---|
| (2, 3, 4, 5) | (6 + 6 + 4) / 5 = 16/5 | 3,2 | 3,2 | 3,2 × 5 / 4 = 4,0 | Baik Sekali |
| (10, 0, 0, 5) | 30 / 5 | 6 | 4 | 5 | Unggul |
| (1, 0, 0, 0) | NDTPS 0 → 1; 3 / 1 | 3 | 3 | – | – |

## 2. `hitungIndikatorRMD(mahasiswa, ndtps)`: rasio mahasiswa–dosen, bobot 10

Rumus:
- RMD = mahasiswa / NDTPS.
- a = clamp((NDTPS − 5) / 7, 0, 1).
- b dihitung dari RMD:
  - RMD < 15 → b = RMD / 15;
  - 15 ≤ RMD ≤ 25 → b = 1;
  - 25 < RMD ≤ 35 → b = (35 − RMD) / 10;
  - RMD > 35 → b = 0.
- Skor:
  - RMD > 35 → 0;
  - NDTPS ≥ 12 → 4 bila 15 ≤ RMD ≤ 25, selainnya 1 + 3b;
  - 5 ≤ NDTPS < 12 → 1 + 3ab;
  - NDTPS < 5 → 0.

| Masukan | RMD | a | b | Skor | Tertimbang | Status |
|---|---|---|---|---|---|---|
| (200, 10) | 20 | 5/7 | 1 | 1 + 15/7 = 22/7 = 3,142… → 3,14 | 3,14 × 10 / 4 = 7,85 | Baik Sekali |
| (400, 12) | 33,33 | 1 | (35 − 33,33)/10 = 0,1667 | 1 + 0,5 = 1,5 | 3,75 | Perlu Perbaikan |
| (300, 12) | 25 | 1 | 1 | 4 | 10 | Unggul |
| (400, 10) | 40 | – | 0 | 0 | 0 | Perlu Perbaikan |

## 3. `hitungIndikatorPenelitian(jumlah3Tahun, ndtps)`: penelitian per dosen per tahun, bobot 10

Rumus: RPD = jumlah / 3 / NDTPS. RPD ≥ 1 → skor 4, selainnya skor = RPD × 4.

| Masukan | RPD | Skor | Tertimbang | Status |
|---|---|---|---|---|
| (18, 4) | 18 / 3 / 4 = 1,5 | 4 | 10 | Unggul |
| (6, 4) | 6 / 3 / 4 = 0,5 | 2,0 | 5 | Baik |

## 4. `hitungTotalAkreditasi(indikator)`

Rumus kode asal:
- Skor rata-rata kriteria adalah rata-rata skor indikatornya. Kriteria tanpa indikator memakai **3,0** (estimasi bawaan
  kode asal).
- Skor kriteria = (rata-rata / 4) × bobot × 4, yaitu rata-rata × bobot.
- Bobot kriteria 1–9: 5, 10, 25, 10, 15, 10, 5, 25, 5. **Jumlahnya 110**, sehingga skor maksimum 440, bukan 400 seperti
  komentar kode asal. Rumus tidak diubah; hal ini dicatat untuk Ghalib.
- Peringkat:
  - ≥ 361 → Unggul, bila syarat NDTPS ≥ 12 terpenuhi; bila tidak, Baik Sekali;
  - ≥ 301 → Baik Sekali;
  - ≥ 200 → Baik;
  - selainnya Tidak Terakreditasi.

| Kasus | Hitungan | Total | Peringkat |
|---|---|---|---|
| Tanpa indikator | 3 × 110 | 330 | Baik Sekali |
| Hanya K1 = RK(2,3,4,5) | K1: 3,2 × 5 = 16; lainnya 3 × 105 = 315 | 331 | Baik Sekali |
| Semua skor 4, NDTPS 12 | 4 × 110 | 440 | Unggul |
| Semua skor 4, NDTPS 10 | 4 × 110; syarat perlu gagal (1 catatan) | 440 | Baik Sekali |
| K2 berisi skor 2 dan 4 | rata-rata 3 → 3 × 10 = 30 | – | – |
| Semua skor 1 | 1 × 110 | 110 | Tidak Terakreditasi |

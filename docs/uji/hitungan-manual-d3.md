# Hitungan manual rumus butir angka D3 (Rencana 10 Nov T10 R3)

Sumber aturan: Matriks Penilaian LED dan LKPS Diploma III 2025 (`docs/rumus/RUMUS-D3.md`, halaman disebut per butir).
Data fiktif sama dengan `tests/unit/rumus-d3.test.ts`: 7 DTPS (1 doktor, 2 Lektor, 2 bersertifikat kompetensi),
1 dosen tidak tetap, 1 dosen industri; 4 mata kuliah kompetensi (sks kuliah 1, praktik 3); 100 mahasiswa saat TS.

| Butir D3 (hlm.) | Metrik | Hitungan | Skor |
| --- | --- | --- | --- |
| 23 (17) | NDTPS = 7, PDTT = 1/8 = 12,5% | A = (7 − 5)/4 = 0,5; B = (40% − 12,5%)/30% = 0,9167; 5 ≤ NDTPS < 9 → 2 + 2 × A × B | 2,917 |
| 24 (17–18) | PDS3 = 1/7 = 14,3% | < 20% → 2 + 10 × 0,143 | 3,429 |
| 25 (18) | PGBLKL = 2/7 = 28,6% | < 50% → 2 + 4 × 0,286 | 3,143 |
| 26 (18) | PDSK = 2/7 = 28,6% | < 50% → 1 + 6 × 0,286 | 2,714 |
| 27 (18) | PMKI = 2/4 = 50% | ≥ 20% | 4 |
| 18 (14) | PJP = 3/(1 + 3) = 75% | > 70% → 4 − (40 × 0,75 − 28)/3 | 3,333 |
| 32 (21) | RI = 1/7 = 0,143; RN = 4/7 = 0,571 | RI > 0,05 dan RN > 0,5 | 4 |
| 34 (22) | RS = 3/7 = 0,429 | < 1 → 2 + 2 × 0,429 | 2,857 |
| 41 (27) | NAPJ mahasiswa = 1 | < 2 → 2 + 1 | 3 |
| 38 (25) | RMD = 100/7 = 14,3 | 10 ≤ RMD ≤ 20 | 4 |
| 42 (27) | MS = (10 × 3 + 5 × 4,75 + 2 × 2,25)/17 = 3,43 | 3,0 < MS ≤ 3,5 | 4 |
| 43 (27) | PTW = (10 + 2)/20 = 60% | < 80% → 1 + 30 × 0,6/8 | 3,25 |
| 45 (28–29) | WT = (2 × 0 + 4 × 1,5 + 3 × 4,5 + 1 × 9)/10 = 2,85 bulan | WT < 3 | 4 |
| 46 (29) | KBK = (4 + 2)/(4 + 4 + 2) = 60% | < 80% → 5 × 0,6 | 3 |
| 40-I (26) | RN = 1/100 = 1% (a = 0,05%, b = 1%, c = 2%) | RN ≥ b → B = 1, A = C = 0 → 3,75 × 1 | 3,75 |

Butir 6-I, 9, 10, 11, 29, 30, 31, 39, 47, 48 memakai aturan yang sama dengan Sarjana (deskriptor dibandingkan dengan
kode Sarjana; uji membandingkan skornya).

## Asumsi perlu dikonfirmasi

| Butir | Asumsi | Alasan |
| --- | --- | --- |
| 18 | JP dan JB dari sks × 50 menit seperti Sarjana; kolom "Konversi Kredit ke Jam (Vokasi)" belum dipakai | matriks tidak menyebut kolom konversi |
| 23 | NDTPS < 5 → skor 1 | matriks: "tidak ada skor kurang dari 1" |
| 27 | dosen industri = baris 4.a berkategori industri/praktisi; MK dicocokkan dari kolom "Mata Kuliah yang Diampu" | 4.a tidak menandai MK kompetensi per dosen |
| 32 | urutan baris Tabel 4.e = NA1–NA4, NB1–NB3, NC1–NC3 | urutan definisi di matriks |
| 34, 41 | semua baris Tabel 4.g/6.e.4 dianggap 3 tahun terakhir | tabel tidak punya kolom tahun |
| 42 | titik tengah kelompok 6.d: 2,25; 3; 4,75 tahun; 2,5 ≤ MS ≤ 3,0 → skor 4 | matriks D3 tidak mengatur 2,5–3,0 |
| 43 | a = mahasiswa masuk TS-2; b = lulus MS ≤ 3,5 tahun | matriks D3 tidak mendefinisikan a dan b |
| 45 | dipesan sebelum lulus = WT 0; titik tengah 1,5 dan 4,5 bulan; WT > 6 bulan = 9 bulan | tabel 6.f.1 berkelompok |

Butir 17 dan 28 berdeskriptor kualitatif (bukan butir angka), jadi tidak diberi rumus.

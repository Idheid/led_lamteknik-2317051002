# Hitungan manual rumus butir angka Program Profesi Insinyur (Rencana 10 Nov T10 R3)

Sumber aturan: Matriks Penilaian LED dan LKPS PPI 2025 (`docs/rumus/RUMUS-PPI.md`). Data fiktif sama dengan
`tests/unit/rumus-ppi.test.ts`: 6 DTPS (3 bersertifikat IPU dan ber-STRI), 3 dosen industri, 30 mahasiswa saat TS.

| Butir PPI (hlm.) | Metrik | Hitungan | Skor |
| --- | --- | --- | --- |
| 24 (15) | RDTPSPPI = (6 + 3)/3 = 3 | ≤ 3 | 4 |
| 25 (15) | PDIPU = 3/6 = 50% | ≥ 50% | 4 |
| 37 (23) | RMD = 30/(6 + 3) = 3,33 | < 4 → 1 + 3 × 3,33/4 | 3,5 |
| 18 (12–13) | PJP = 800/(300 + 800) = 72,7% | 70% ≤ PJP ≤ 80% | 4 |
| 34 (21) | PPL = (12 + 8)/2 = 10 | 4 < PPL ≤ 10 → 1 + (10 − 10)/2 | 1 |
| 39 (23) | MS = (15 × 2,5 + 3 × 4,5 + 1 × 7)/19 = 3,05 semester | 3 < MS ≤ 6 → 7 − MS | 3,95 |
| 40 (23) | PTW = 15/20 = 75% | < 90% → 1 + 10 × 0,75/3 | 3,5 |
| 41 (24) | PPS = 19/20 = 95% | ≥ 85% | 4 |
| 43 (24–25) | WT = (2 × 0 + 2 × 1,5 + 4 × 4,5)/8 = 2,63 bulan | ≤ 3 | 4 |

Aturan lain: RK berbobot (3 × N1 + 2 × N2 + N3)/NDTPS, RLP ≥ 1 (2 + 2 × RLP). Sama dengan Sarjana: 6-II, 9, 10, 11,
27 (RBK), 28, 29, 30 (publikasi 0,5/1/2), 32 (rekognisi), 38 (RIPK), 45, 46.

## Asumsi perlu dikonfirmasi

| Butir | Asumsi | Alasan |
| --- | --- | --- |
| 18 | JB = jam teori + jam praktik dari kolom konversi Tabel 3.a.2 | matriks: "jam pembelajaran total" |
| 21, 23 | "1 + (3 × P)" dibaca dengan P dalam puluhan persen (1 + 30 × P) | supaya bersambung dengan ambang 10% |
| 25 | IPU = kolom Sertifikat Keinsinyuran/SKIP dan STRI terisi; masa berlaku tidak dicek | Tabel 4.a tidak memuat tanggal berlaku |
| 34 | NMRPL = jumlah kolom "Jumlah Bimbingan dalam 3 tahun" Tabel 4.k; PPL < 1 → 4 | matriks tidak mengatur PPL < 1 |
| 37 | NMT = mahasiswa saat TS dari Tabel 6.a | matriks menyebut Tabel 6.d tetapi 6.d berisi angkatan |
| 39 | titik tengah 2,5; 4,5; 7 semester; MS < 2 semester → 4 | tabel berkelompok |
| 40, 41 | angkatan TS-1 | matriks tidak mendefinisikan angkatan |
| 43 | dipesan sebelum lulus = WT 0; titik tengah 1,5 dan 4,5 bulan; > 6 bulan = 9 | tabel berkelompok |

Butir 44 tetap manual: matriks merujuk Tabel 6.f.2, tetapi template LKPS 2025 tidak memuat tabel itu untuk PPI. Butir
17 dan 26 berdeskriptor kualitatif.

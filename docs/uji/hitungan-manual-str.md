# Hitungan manual rumus butir angka Sarjana Terapan (Rencana 10 Nov T10 R3)

Sumber aturan: Matriks Penilaian LED dan LKPS Sarjana Terapan 2025 (`docs/rumus/RUMUS-STR.md`). Data fiktif sama dengan
`tests/unit/rumus-str.test.ts`: 6 DTPS, 5 dosen tidak tetap, 120 mahasiswa saat TS.

| Butir STr (hlm.) | Metrik | Hitungan | Skor |
| --- | --- | --- | --- |
| 26 (17) | NDTPS = 6, PDTT = 5/11 = 45,5% | NDTPS ≥ 5 dan PDTT > 40% → 2 (Sarjana: 1) | 2 |
| 43 (25) | RMD = 120/6 = 20 | 15 ≤ RMD ≤ 25 | 4 |
| 37 (23) | NAPJ DTPS (4.g) = 2 | < 3 → 1 + 2 | 3 |
| 47 (27) | NAPJ mahasiswa (6.e.4) = 1 | < 3 → 1 + 1 | 2 |
| 50 (28) | RI = 1/120 = 0,83%; RN = 6/120 = 5%; RW = 0 (a = 1%, b = 10%, c = 50%) | A = 0,833; B = 0,5 → 3,75 × (A + B − A × B) | 3,437 |
| 49 (27–28) | PTW = 24/40 = 60% | < 80% → 1 + 30 × 0,6/8 (Sarjana: ≥ 50% → 4) | 3,25 |

Sama dengan Sarjana (deskriptor dan tabel sama): 6-I, 6-II, 9, 10, 11, 32 (RBK), 33, 34, 36 (RLP), 40 (rekognisi),
44, 45, 46-I, 46-II, 48 (masa studi), 51, 53 (waktu tunggu), 54, 55, 56.

## Asumsi perlu dikonfirmasi

| Butir | Asumsi | Alasan |
| --- | --- | --- |
| 18 | JP dan JB dari sks × 50 menit | sama dengan D3 |
| 30 | dosen industri dicocokkan dari kolom "Mata Kuliah yang Diampu" Tabel 4.a | sama dengan D3 |
| 35, 50 | urutan baris Tabel 4.e/6.e.2 = NA1–NA4, NB1–NB3, NC1–NC3 | urutan definisi di matriks |
| 37, 47 | semua baris Tabel 4.g/6.e.4 dianggap 3 tahun terakhir | tabel tidak punya kolom tahun |
| 38 | PKDTPS di rumus skor dalam persen: 1 + 3 × PKDTPS(%)/10 | dengan pecahan, skor tidak mencapai 4 pada ambang 10% |

Butir 17 dan 31 berdeskriptor kualitatif (bukan butir angka).

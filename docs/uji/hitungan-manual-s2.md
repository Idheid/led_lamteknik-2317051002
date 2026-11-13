# Hitungan manual rumus butir angka Magister (Rencana 10 Nov T10 R3)

Sumber aturan: Matriks Penilaian LED dan LKPS Magister 2025 (`docs/rumus/RUMUS-S2.md`). Data fiktif sama dengan
`tests/unit/rumus-s2.test.ts`: 10 DTPS (2 Guru Besar, 3 Lektor Kepala, 4 Lektor), 40 mahasiswa saat TS.

| Butir S2 (hlm.) | Metrik | Hitungan | Skor |
| --- | --- | --- | --- |
| 26 (18) | PGBLK = (2 + 3)/10 = 50% (Lektor tidak dihitung) | < 70% → 2 + 20 × 0,5/7 | 3,429 |
| 39 (25) | RIPK = 3,40 | 3,00 ≤ RIPK < 3,50 → 4 × 3,4 − 10 | 3,6 |
| 41 (26) | MS = (10 × 2 + 6 × 3 + 1 × 3,75)/17 = 2,46 | 1,5 < MS ≤ 2,5 | 4 |
| 42 (26) | PTW = 10/20 = 50% | 20% ≤ PTW < 60% → 1 + (30 × 0,5 − 6)/4 | 3,25 |
| 40 (25) | NN = 1 (prestasi 2022 di luar 3 tahun), RN = 1/40 = 2,5% | RN ≥ b = 2% → B = 1 → 3,75 | 3,75 |

Aturan lain: BOP ≥ 28 juta (BOP/7 juta), DPD ≥ 20 juta (2 × DPD/10 juta), PPDMhs ≥ 75% (1 + 4P), PPTM ≥ 25%
(1 + 12P), kecukupan DTPS ≥ 8 (PDTT > 40% → 2), penelitian/PkM faktor 0,07/0,5/1,5, publikasi DTPS 0,5/4/4, PKIB ≥ 50%
(2 + 4P), PRDTPS ≥ 1 (2 + 2P), publikasi mahasiswa 0,1/30%/90%, NLP per mahasiswa ≥ 2 (2 + NLP). Sama dengan Sarjana:
6-I, 6-II, 11, 24 (PKDMhs), 28 (RBK), 32 (RLP), 33 (PKDTPS), 38 (PMA), 46 (KBK), 47 (kepuasan pengguna).

## Asumsi perlu dikonfirmasi

| Butir | Asumsi | Alasan |
| --- | --- | --- |
| 22 | NTM = tema penelitian berbeda di Tabel 6.h.2 dengan tahun dalam 3 tahun terakhir | tabel berisi tesis per mahasiswa |
| 25 | A = (NDTPS − 5)/7 walaupun ambang NDTPS ≥ 8 | sesuai teks matriks; mungkin salah ketik di matriks |
| 39 | RIPK < 3,00 → skor 2 | baris skor rendah kosong di teks PDF |
| 41 | titik tengah 6.d Magister: 2; 3; 3,75 tahun | tabel berkelompok |
| 42 | a = mahasiswa masuk TS-2, b = lulus 1,5 < MS ≤ 2,5 | matriks tidak mendefinisikan a dan b |

Butir 15 dan 27 berdeskriptor kualitatif (bukan butir angka).

# Hitungan manual rumus butir angka Diploma Satu dan Diploma Dua (Rencana 10 Nov T10 R3)

Sumber aturan: `docs/rumus/RUMUS-D1.md` dan `RUMUS-D2.md`. Penomoran butir dan sebagian besar aturan sama dengan D3
(`hitungan-manual-d3.md`). Data fiktif sama dengan `tests/unit/rumus-d1d2.test.ts`: 4 DTPS (1 doktor, 1 Lektor),
1 dosen tidak tetap (PDTT 20%).

| Butir | D1 | D2 |
| --- | --- | --- |
| 18 praktik | PJP ≥ 70% → 4; < 70% → 1 + 30 × PJP/7 (PJP 75% → 4) | sama |
| 23 kecukupan DTPS | NDTPS ≥ 3: PDTT ≤ 10% → 4, > 40% → 3, 10–40% interpolasi (20% → 3,667); NDTPS < 3 → 2 | NDTPS ≥ 6 → 4/2 + 2B; 3 ≤ NDTPS < 6 → 2 + 2AB, A = (NDTPS − 3)/3 (NDTPS 4, PDTT 20% → 2,444); PDTT > 40% → 1 |
| 24 doktor | NDS3 ≥ 1 → 4, selain itu 2 | sama |
| 25 jabatan | PGBLKL ≥ 30% → 4; 2 + 20 × PGBLKL/3 (25% → 3,667) | sama |
| 27 dosen industri | PMKI ≥ 30% → 4; 2 + 20 × PMKI/3 | sama |
| 42 masa studi | 6.d D1 (0,5 / 1 / 1,75 tahun): ≤ 1,5 → 4; 1,5–2 → 1 + 6 × (2 − MS); ≤ 0,5 → 0 | 6.d D2 (1,25 / 2 / 3,25): ≤ 2,5 → 4; 2,5–4 → 9 − 2 × MS; ≤ 1,5 → 0 |
| 43 tepat waktu | angkatan TS, b = C + E: (12 + 2)/20 = 70% → 1 + 30 × 0,7/8 = 3,625 | angkatan TS-1: (10 + 2)/20 = 60% → 3,25 |
| 45 waktu tunggu | WT 3,5 → (24 − 4 × 3,5)/3 = 3,333 | sama |
| 47 tempat kerja | faktor 2%/20%/90% | sama |

## Asumsi perlu dikonfirmasi

| Butir | Asumsi |
| --- | --- |
| D1-23 | 10% < PDTT ≤ 40% tidak diatur matriks D1; interpolasi linear 4 → 3 |
| D2-23 | NDTPS < 3 → 1 |
| 42 | titik tengah kelompok Tabel 6.d; rentang di bawah ambang skor 4 tetapi di atas ambang skor 0 diberi 4 |
| 43 | angkatan D1 = TS, D2 = TS-1 (sejalan dengan lama studi); b = kolom C + E |
| lainnya | sama dengan asumsi D3 |

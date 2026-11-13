# Hitungan manual rumus butir angka Doktor dan Doktor Terapan (Rencana 10 Nov T10 R3)

Sumber aturan: `docs/rumus/RUMUS-S3.md` dan `RUMUS-S3TR.md`. Data fiktif sama dengan `tests/unit/rumus-s3.test.ts`:
8 DTPS (3 Guru Besar, 3 Lektor Kepala, 2 Lektor), tanpa dosen tidak tetap; Tabel 6.d angkatan TS-2: 10 masuk, lulus
4 (2,5 < MS ≤ 3,5), 3 (3,5 < MS ≤ 4,5), 1 (4 < MS ≤ 6).

| Butir | Aturan | Data uji | Skor |
| --- | --- | --- | --- |
| S3-25 | NDGB < 2 → 0; NDTPS ≥ 8 dan PDTT ≤ 10% → 4 | NDGB 3, NDTPS 8, PDTT 0% | 4 |
| S3-26 | PGB ≥ 50% dan NDTPS ≥ 8 → 4; PGBLK ≥ 70% → 4 (asumsi); 2 + 20 × PGBLK/7 | PGB 37,5%, PGBLK 75% | 4 |
| S3-41 | 6.d Doktor (3; 4; 5 tahun): 2,5 < MS ≤ 3,5 → 4; ≤ 6 → 1 + (36 − 6 × MS)/5 | MS = 29/8 = 3,625 | 3,85 |
| S3-42 | PTW ≥ 60% → 4; 10–60% → 1 + (30 × PTW − 3)/5 | 4/10 = 40% | 2,8 |
| S3Tr-44 | = S3-41 | sama | 3,85 |
| S3Tr-34 | NAPJ DTPS (4.g) ≥ 4 → 4; 1 + 3 × NAPJ/4 | 2 | 2,5 |

Aturan Doktor lain: kerja sama faktor 3/8/10, BOP ≥ 40 juta (BOP/10 juta), DPD ≥ 30 juta (2 × DPD/15 juta), PPDMhs
≥ 100% (1 + 3P), PPTM ≥ 50% (1 + 6P), penelitian/PkM 0,1/1/2, publikasi DTPS 0,5/6/4, publikasi mahasiswa
0,25/0,3/0,9, NLP per mahasiswa ≥ 3 (2 + 2 × NLP/3). Doktor Terapan: 20 butir = rumus Doktor dengan nomor bergeser;
sertifikasi (1 + 30 × PDSK/5), publikasi + pagelaran 4.e (0,5/0,5/1) dan 6.e.2 (0,25/30%/90%), PKDTPS ≥ 40%
(1 + 30P/4), PKIB ≥ 40% (2 + 20P/4), PRDTPS ≥ 2 (2 + 4P), produk/jasa 4.g dan 6.e.4 (≥ 4; 1 + 3N/4).

## Asumsi perlu dikonfirmasi

| Butir | Asumsi |
| --- | --- |
| S3-25 / S3Tr-25 | deskriptor menggabungkan PDTT dan PGB (lihat catatan rumus); di luar kasus yang tertulis → 2 |
| S3-26 / S3Tr-26 | PGBLK ≥ 70% tanpa PGB ≥ 50% → 4 |
| S3-41 | titik tengah 6.d Doktor 3; 4; 5 tahun (kolom E "4 < MS ≤ 6" tumpang tindih dengan D) |
| S3-42 | a = masuk angkatan TS-2, b = lulus 2,5 < MS ≤ 3,5 |
| S3Tr-37 | ambang PRDTPS ≥ 2 disalin apa adanya dari matriks |
| S3Tr-46 | faktor a = 0,25 dibaca sebagai rasio (bukan persen) |

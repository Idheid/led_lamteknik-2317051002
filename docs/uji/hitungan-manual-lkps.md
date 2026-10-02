# Hitungan manual metrik butir angka — LKPS contoh (fiktif)

Dasar uji F-08. Berkas uji: `tests/fikstur/lkps-contoh-s1.xlsx`, yaitu template LKPS LAM Teknik 2025 asli yang diisi
data fiktif dari `tests/fikstur/data-lkps-contoh.ts` (dibuat ulang dengan `npx tsx scripts/buat-fikstur-lkps.ts`).
Program studi rekaan "Teknik Contoh" (Sarjana), TS = 2025/2026 (akhir TS 31/08/2026).

Rumus diambil dari **Matriks Penilaian LED dan LKPS Sarjana APS Akademik dan Vokasi Teknik 2025** (Pasca Akreditasi
Minimum dan Unggul). Cara menghitung variabel mengikuti panel INFO template LKPS 2025. Hitungan di bawah dikerjakan
manual (kalkulator), lalu dibandingkan dengan keluaran sistem di `tests/unit/lkps-contoh.test.ts` (toleransi 0,0001).

Skor tiga tingkat (dipakai butir 6-II, 31, 32, 33, 43, 46, 51), dari matriks:
skor 4 bila RI > a dan RN > b; selain itu Skor = 3,75 × ((A + B + C/2) − A×B − A×C/2 − B×C/2 + A×B×C/2),
A = RI/a, B = RN/b, C = RW/c, dengan penyesuaian RI ≥ a dan RN < b → RI = a; RI < a dan RN ≥ b → RN = b; RW ≥ c → RW = c.

## Variabel dasar

| Variabel | Sumber | Isi fiktif | Nilai |
| --- | --- | --- | --- |
| NDTPS | 4.a: kategori "Dosen Tetap" dan kolom J = V | 12 dosen | 12 |
| NDT | 4.a: kategori "Dosen Tetap" | 12 DTPS + 1 tidak sesuai kompetensi | 13 |
| NDTT | 4.a: kategori "Dosen Tidak Tetap" | 2 dosen tamu | 2 |
| NDS3 | 4.a: DTPS dengan kolom G (doktor) terisi | Dosen Contoh 1–5 | 5 |
| NDGB, NDLK, NDL | 4.a: jabatan DTPS | 1 GB, 3 LK, 5 L (3 AA) | 1, 3, 5 |
| NM | 6.a: baris prodi bertanda V, kolom TS | 350 | 350 |

## Hitungan per butir

| Butir | Data | Hitungan | Metrik | Skor perkiraan |
| --- | --- | --- | --- | --- |
| 6-I | Kerja sama sah: pendidikan 3 (1 baris 2015–2019 di luar rentang 31/08/2022–31/08/2026), penelitian 3, PkM 3 | RK = (3 + 3 + 3) / 12 | RK = 0,75 | RK < 4 → skor = RK = 0,75 |
| 6-II | NI = 1 + 1 + 0 = 2; NN = 1 + 2 + 1 = 4; NW = 1 + 0 + 2 = 3 | a = 2, b = 6, c = 8. RI = 2 ≥ a dan RN < b → RI = a: A = 1, B = 4/6 = 0,6667, C = 3/8 = 0,375 | NI 2, NN 4, NW 3 | 3,75 × (1,8542 − 0,6667 − 0,1875 − 0,125 + 0,125) = 3,75 |
| 9 | 2.b kolom Program Studi baris a–f: 1.500, 1.600, 1.750 juta; mahasiswa aktif 300, 320, 350 | 1.500 jt/300 = 5 jt; 1.600 jt/320 = 5 jt; 1.750 jt/350 = 5 jt; rata-rata | BOP = Rp5.000.000 | 5.000.000 / 5.000.000 = 1,0 |
| 10 | Biaya penelitian prodi 120, 150, 180 juta | rata-rata 150 jt / 12 DTPS | DPD = Rp12.500.000 | ≥ 10 jt → 4 |
| 11 | Biaya PkM prodi 30, 36, 42 juta | rata-rata 36 jt / 12 | DPkMD = Rp3.000.000 | 4 × 3 / 5 = 2,4 |
| 18 | 3.a.1: sks kuliah 100, seminar 4, praktik 40 | PJP = 40 × 50 / (144 × 50) | PJP = 27,78% | 20% ≤ PJP ≤ 50% → 4 |
| 19 | 3.a.4: 3 + 3 + 3 + 3 + 4 + 4 + 3 + 3 | jumlah sks | 26 sks | ≥ 25 sks → 4 |
| 23 | 6.h.1: 12 baris, 10 judul berbeda (tahun 2024–2026); 3.b: 24 + 12 + 2 = 38 judul | 10 / 38 | PPDMhs = 26,32% | 1 + 6 × 0,2632 = 2,5789 |
| 25 | 6.i: 9 baris, 8 judul berbeda; 3.c: 27 + 6 + 0 = 33 judul | 8 / 33 | PKDMhs = 24,24% | 1 + 6 × 0,2424 = 2,4545 |
| 26 | NDTPS 12, NDT 13, NDTT 2 | PDTT = 2 / (13 + 2) = 13,33%; B = (40% − 13,33%) / 30% = 0,8889 | PDTT = 13,33% | NDTPS ≥ 12 dan 10% < PDTT ≤ 40% → 2 + 2 × 0,8889 = 3,7778 |
| 27 | NDS3 5 | 5 / 12 | PDS3 = 41,67% | 2 + 4 × 0,4167 = 3,6667 |
| 28 | 1 + 3 + 5 = 9 | 9 / 12 | PGBLKL = 75% | ≥ 70% → 4 |
| 30 | 4.c DTPS: 6 dosen 28 sks/tahun, 4 dosen 32, 2 dosen 36 (dosen non-DTPS 20 sks tidak dihitung) | per semester 14, 16, 18; (6×14 + 4×16 + 2×18) / 12 = 184/12 | RBK = 15,33 sks | 12–16 → 4 |
| 31 | 3.b: NW 6+8+10 = 24, NN 3+4+5 = 12, NI 0+1+1 = 2 | RI = 2/3/12 = 0,0556; RN = 12/3/12 = 0,3333; RW = 24/3/12 = 0,6667 | a = 0,05; b = 0,3 | RI > a dan RN > b → 4 |
| 32 | 3.c: NW 27, NN 6, NI 0 | RI = 0; RN = 6/36 = 0,1667; RW = 27/36 = 0,75; A = 0, B = 0,5556, C = 0,75 | — | 3,75 × (0,5556 + 0,375 − 0,2083) = 2,7083 |
| 33 | 4.d (3 tahun): NA1 6, NA2 12, NA3 4, NA4 6, NB1 6, NB2 2, NB3 6 | RI = (6 + 6)/12 = 1; RN = (12 + 4 + 2)/12 = 1,5; RW = (6 + 6)/12 = 1 | a = 0,5; b = 1 | RI > a dan RN > b → 4 |
| 34 | 4.f dalam 3 tahun (1/9/2023–31/8/2026): paten 1, HKI 4, TTG 2, buku 3 (1 buku 2019 tidak dihitung) | RLP = (3×1 + 2×(2+3) + 4) / 12 = 17/12 | RLP = 1,4167 | 2 + 2 × 1,4167 / 3 = 2,9444 |
| 35 | 4.h: 7 DTPS dengan karya > 0 | 7 / 12 | PKDTPS = 58,33% | ≥ 50% → 4 |
| 36 | 4.i: 4 karya disitasi (1 karya sitasi 0 tidak dihitung) | 4 / 12 | PKIB = 0,3333 | ≥ 0,25 → 4 |
| 37 | 4.j: rekognisi 2023–2026 milik 4 dosen berbeda (1 rekognisi 2019 tidak dihitung) | 4 / 12 | PRDTPS = 0,3333 | 2 + 4 × 0,3333 = 3,3333 |
| 40 | NM 350, NDTPS 12 | RMD = 350/12 = 29,17; B = (35 − 29,17)/10 = 0,5833 | RMD = 29,17 | NDTPS ≥ 12 dan 25 < RMD ≤ 35 → 1 + 3 × 0,5833 = 2,75 |
| 41 | Asing TS: penuh waktu 2, paruh waktu 1 | 3 / 350 | PMA = 0,857% | 2 + 200 × 0,00857 = 3,7143 |
| 42 | 6.b: (80; 3,30), (90; 3,35), (100; 3,40) | (264 + 301,5 + 340) / 270 = 905,5/270 | RIPK = 3,3537 | ≥ 3,25 → 4 |
| 43-I | 6.c.1 (5 tahun, 1/9/2021–31/8/2026): internasional 1, nasional 5, wilayah 4 (1 lomba 2019 tidak dihitung) | RI = 1/350 = 0,286% ≥ a, RN = 1,43% < b → RI = a: A = 1, B = 0,7143, C = 0,2857 | a = 0,2%; b = 2%; c = 4% | 3,75 × 1 = 3,75 |
| 43-II | 6.c.2: internasional 0, nasional 3, wilayah 6 | RN = 3/350; RW = 6/350; A = 0, B = 0,4286, C = 0,4286 | — | 3,75 × (0,4286 + 0,2143 − 0,0918) = 2,0663 |
| 44 | 6.d blok Sarjana: lulus 3,5–4,5 th 105; 4,5–5,5 th 70; 5,5–6,5 th 20; 6,5–8 th 5 | (105×4 + 70×5 + 20×6 + 5×7,25)/200 = 926,25/200 | MS = 4,63 tahun | 4,5 < MS ≤ 8 → (55 − 6 × 4,63125)/7 = 3,8875 |
| 45 | 6.d TS-3: masuk (a) 100, lulus tepat waktu (b) 55 | 55 / 100 | PTW = 55% | ≥ 50% → 4 |
| 46 | 6.e.1: NA1 6, NA2 4, NA3 1, NA4 1, NB1 10, NB2 1, NB3 2 | RI = 3/350; RN = 6/350; RW = 16/350; A = 0,8571, B = 0,1714, C = 0,0914 | a = 0,01; b = 0,1; c = 0,5 | 3,75 × (1,0743 − 0,1469 − 0,0392 − 0,0078 + 0,0067) = 3,3264 |
| 47 | 6.e.3: paten 0, HKI 3, TTG 1, buku 1 | NLP = 0 + 2 × (1 + 1) + 3 | NLP = 7 | 2 + 0,2 × 7 = 3,4 |
| 49 | 6.f.1 blok Sarjana: lulusan 170, terlacak 85; WT < 3: 55, 3–18: 25, > 18: 5 | WT ≈ (55×1,5 + 25×10,5 + 5×18)/85 = 435/85 | WT = 5,12 bulan; responden 50% | (23 − 5,1176)/5 = 3,5765 |
| 50 | 6.f.2: rendah 9, sedang 31, tinggi 45 | (31 + 45) / 85 | KBK = 89,41% | ≥ 60% → 4 |
| 51 | 6.g.1: lulusan 170; internasional 10, nasional 36, lokal 39 | RI = 5,88% > 5%; RN = 21,18% > 20% | — | 4 |
| 52 | 6.g.2 (persen): TK = 3,5; 3,4; 2,7; 3,4; 3,2; 3,5; 3,3 | ΣTK = 23,0 | rata-rata 3,2857 | 23 / 7 = 3,2857 |

## Asumsi yang perlu dikonfirmasi pembimbing

Matriks tidak merinci atau teks PDF-nya terpotong pada bagian berikut; sistem menandainya di catatan metrik.

1. **BOP (butir 9)**: dihitung dari kolom *Program Studi* Tabel 2.b baris 1.a–1.f (tanpa biaya kemahasiswaan)
   dibagi mahasiswa aktif Tabel 6.a tahun yang sama, lalu dirata-rata tiga tahun.
2. **DPD dan DPkMD (butir 10, 11)**: rata-rata dana per tahun dibagi NDTPS (per dosen).
3. **Variabel dosen (26–28)**: NDS3, NDGB, NDLK, NDL dihitung hanya untuk DTPS (Dosen Tetap dan kolom J = V),
   sesuai definisi matriks; panel INFO template tidak mensyaratkan "Dosen Tetap".
4. **Butir 26** saat 5 ≤ NDTPS < 12 dan PDTT ≤ 10%: B = (40% − PDTT)/40% (dibaca harfiah dari matriks);
   NDTPS ≥ 5 dan PDTT > 40% diberi skor 1.
5. **RIPK (42)**: rata-rata tertimbang jumlah lulusan.
6. **MS (44)**: masa studi tiap kelompok diwakili titik tengah 4; 5; 6; 7,25 tahun.
7. **WT (49)**: titik tengah 1,5 dan 10,5 bulan, dan 18 bulan untuk kelompok > 18 bulan.
8. **KBK (50)**: (sedang + tinggi) / (rendah + sedang + tinggi).
9. **PMA (41)**: mahasiswa asing penuh waktu + paruh waktu saat TS pada baris prodi yang diakreditasi.
10. **Rentang waktu**: "3 tahun terakhir" = 1 September tahun mulai TS-2 sampai 31 Agustus akhir TS; "5 tahun" mulai
    TS-4. Kolom tahun (YYYY) diterima bila berada di antara tahun mulai TS-2 dan tahun akhir TS.
11. Skor perkiraan dibatasi 0–4; butir yang matriksnya menulis "tidak ada skor kurang dari 2" (atau 1) diberi batas bawah itu.

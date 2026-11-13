# Rumus butir angka Sarjana Terapan (R1, inventaris)

Sumber: `Matrik Penilaian LED dan LKPS Sarjana Terapan APS Akademik dan Vokasi Teknik 2025 Pasca Akreditasi Minimum dan Unggul.pdf` (folder Instrumen_Akreditasi_LAM_Teknik_2025, 01_Pasca Terakreditasi Pertama dan Unggul).
Dibuat dengan `scripts/bandingkan-matriks.ts` (Rencana 10 Nov T10 R1): baris matriks disusun dari posisi teks PDF
(`susunMatriks`, tanpa AI), dicocokkan ke butir Sarjana dengan indikator paling mirip, lalu deskriptor skor 4–0
dibandingkan. Deskriptor di bawah disalin dari teks PDF; sel yang kosong atau terpotong harus dicek ke PDF.
Padanan dengan kemiripan < 0,6 perlu dicek manual.

## Ringkasan

| Butir | Padanan Sarjana | Kemiripan | Tabel LKPS | Hlm. | Deskriptor 4·3·2·1·0 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 6-I, 6-II | 1.00 | 2.a | 5, 6 | ≠≠≠== | beda: perlu rumus jenjang |
| 9 | 9 | 1.00 | 2.b | 7 | =≠≠== | beda: perlu rumus jenjang |
| 10 | 10 | 1.00 | 2.b | 7 | =≠≠== | beda: perlu rumus jenjang |
| 11 | 11 | 1.00 | 2.b | 7 | =≠≠== | beda: perlu rumus jenjang |
| 18 | 18 | 1.00 | 3.a.1 | 13 | ≠≠≠== | beda: perlu rumus jenjang |
| 19 | 19 | 1.00 | 3.a.4 | 13 | ≠≠≠≠≠ | beda: perlu rumus jenjang |
| 23 | 23 | 1.00 | 6.h.1 | 15 | ≠≠=≠≠ | beda: perlu rumus jenjang |
| 25 | 25 | 1.00 | 6.i | 16 | ≠≠=≠≠ | beda: perlu rumus jenjang |
| 26 | 26 | 0.71 | 4.a | 17 | ≠=≠≠≠ | beda: perlu rumus jenjang |
| 27 | 27 | 1.00 | 4.a | 17 | ≠≠=== | beda: perlu rumus jenjang |
| 28 | 28 | 1.00 | 4.a | 17 | ≠≠=== | beda: perlu rumus jenjang |
| 32 | 30 | 1.00 | 4.c | 19 | =≠=== | beda: perlu rumus jenjang |
| 33 | 31 | 1.00 | 3.b, 4.a | 19 | ≠≠=== | beda: perlu rumus jenjang |
| 34 | 32 | 1.00 | 3.c, 4.a | 20 | ≠≠=== | beda: perlu rumus jenjang |
| 35 | 33 | 0.74 | 4.e | 20, 21 | ≠≠=== | beda: perlu rumus jenjang |
| 36 | 34 | 1.00 | 4.f, 4.a | 21, 22 | =≠=== | beda: perlu rumus jenjang |
| 38 | 35 | 1.00 | - | 22 | ≠≠≠== | beda: perlu rumus jenjang |
| 39 | 36 | 0.92 | - | 22, 23 | ≠≠=≠= | beda: perlu rumus jenjang |
| 40 | 37 | 1.00 | - | 23 | =≠=== | beda: perlu rumus jenjang |
| 43 | 40 | 1.00 | 6.a, 4.a | 25 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 44 | 41 | 1.00 | 6.a | 25 | ===== | sama dengan Sarjana |
| 45 | 42 | 1.00 | 6.b | 25 | ≠≠=== | beda: perlu rumus jenjang |
| 46 | 43-I, 43-II | 1.00 | 6.c.1 | 25, 26, 27 | =≠≠== | beda: perlu rumus jenjang |
| 47 | 46 | 0.46 | 6.e.4 | 27 | ≠≠==≠ | beda: perlu rumus jenjang |
| 48 | 44 | 1.00 | 6.d | 27 | =≠≠== | beda: perlu rumus jenjang |
| 49 | 45 | 1.00 | 6.d | 27, 28 | ≠≠==≠ | beda: perlu rumus jenjang |
| 50 | 46 | 0.63 | 6.e.2 | 28 | ≠≠=== | beda: perlu rumus jenjang |
| 51 | 47 | 1.00 | - | 29 | =≠=== | beda: perlu rumus jenjang |
| 53 | 49 | 1.00 | 6.f.1 | 29, 30 | =≠≠== | beda: perlu rumus jenjang |
| 54 | 50 | 1.00 | 6.f.2 | 30 | =≠≠== | beda: perlu rumus jenjang |
| 55 | 51 | 1.00 | 6.g.1 | 30, 31 | ≠==== | beda: perlu rumus jenjang |
| 56 | 52 | 1.00 | 6.g.2 | 31 | ≠=≠== | beda: perlu rumus jenjang |

Butir berangka tanpa padanan Sarjana: 17, 29, 30, 31, 37.
Butir angka Sarjana tanpa padanan di jenjang ini: tidak ada.

## Deskriptor butir berpadanan

### Butir 6 ↔ Sarjana 6-I, 6-II (beda: perlu rumus jenjang)

- Indikator (hlm. 5, 6): I. Relevansi kerja sama pendidikan, penelitian, dan PkM dengan visi UPPS serta visi keilmuan program studi. Tabel 2.a. LKPS. II. Kerja sama tingkat internasiona
- Skor 4: Jika RK ≥ 4, maka skor 4 RK = ( N1+ N2 + N3) / NDTPS. N1 = Jumlah kerja sama pendidikan. N2 = Jumlah kerja sama penelitian. N3 = Jumlah kerja sama PkM. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. Jika NI > a dan NN > b, aka Skor = 4 Faktor: a = 2, b = 6, c = 8. NI = Jumlah kerja sama tingkat internasional. NN = Jumlah kerja sama tingkat nasional. NW = Jumlah kerja sama tingkat wilayah/lokal. A = NI/a; B = NN/b; C = NW/c. Jika NI ≥ a dan NN < b, maka NI = a. Jika NI < a dan NN ≥ b, maka NN = b. Jika NW ≥ c , maka NW = c.
- Skor 3: Skor = RK Jika 0 < NI ≤ a atau 0 < NN ≤ b atau 0 < NW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 9 ↔ Sarjana 9 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Biaya operasional pendidikan (BOP). Tabel 2.b. LKPS.
- Skor 4: Jika BOP ≥ 20.000.000, maka Skor 4 BOP = Rata-rata dana operasional pendidikan/mahasiswa/ tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika BOP < 20.000.000 , maka Skor = BOP / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 10 ↔ Sarjana 10 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Dana Penelitian DTPS (DPD). Tabel 2.b. LKPS.
- Skor 4: Jika DPD ≥ 10.000.000 , maka skor 4 DPD = Rata-rata dana penelitian DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika DPD < 10.000.000 , maka Skor = (2 x DPD) / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 11 ↔ Sarjana 11 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Dana PkM (DPkMD). Tabel 2.b. LKPS.
- Skor 4: Jika DPkMD ≥ 5.000.000 , maka Skor 4 DPkMD = Rata-rata dana PkM DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika DPkMD < 5.000.000 , maka Skor = (4 x DPkMD) / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 18 ↔ Sarjana 18 (beda: perlu rumus jenjang)

- Indikator (hlm. 13): Pembelajaran yang dilaksanakan dalam bentuk penugasan, praktikum, praktik bengkel, atau praktik lapangan. Tabel 3.a.1. LKPS.
- Skor 4: Jika 50% ≤ PJP ≤ 70%, maka Skor = 4. JP = Jam pembelajaran penugasan, praktikum, praktik bengkel, atau praktik lapangan (termasuk KKN). JB = Jam pembelajaran total selama masa pendidikan. PJP = (JP / JB) x 100%.
- Skor 3: Jika PJP < 50%, maka Skor = 1 + (6 x PJP). Jika PJP > 70%, maka Skor = 4 - (((40 x PJP) - 28) / 3).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 19 ↔ Sarjana 19 (beda: perlu rumus jenjang)

- Indikator (hlm. 13): Ketersediaan mata kuliah basic sciences dan matematika. Tabel 3.a.4. LKPS.
- Skor 4: PS menyediakan mata kuliah basic sciences dan matematika ≥ 4 SKS
- Skor 3: PS menyediakan mata kuliah basic sciences dan matematika 3 SKS
- Skor 2: PS menyediakan mata kuliah basic sciences dan matematika 2 SKS
- Skor 1: PS menyediakan mata kuliah basic sciences dan matematika < 2 SKS
- Skor 0: Tidak ada kurang dari 1

### Butir 23 ↔ Sarjana 23 (beda: perlu rumus jenjang)

- Indikator (hlm. 15): Penelitian DTPS yang sesuai dengan peta jalan penelitian dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 6.h.1 LKPS.
- Skor 4: Jika PPDMhs ≥ 25%, maka Skor = 4 NPMhs = Jumlah judul penelitian DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPD = Jumlah judul penelitian DTPS dalam 3 tahun terakhir. PPDMhs = (NPMhs / NPD) x 100%
- Skor 3: Jika PPDMhs < 25% , maka Skor = 2 + (8 x PPDMhs).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 25 ↔ Sarjana 25 (beda: perlu rumus jenjang)

- Indikator (hlm. 16): PkM DTPS yang sesuai dengan peta jalan PkM dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 6.i. LKPS.
- Skor 4: Jika PKDMhs ≥ 25%, maka Skor = 4 NPKMhs = Jumlah judul PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPKD = Jumlah judul PkM DTPS dalam 3 tahun terakhir. PKDMhs = (NPKMhs / NPKD) x 100%
- Skor 3: Jika PKDMhs < 25% , maka Skor = 2 + (8 x PKDMhs)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 26 ↔ Sarjana 26 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Kecukupan Jumlah DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika NDTPS ≥ 12 dan PDTT ≤ 10%, maka Skor = 4 NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. NDTT = Jumlah dosen tidak tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. NDT = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. PDTT = (NDTT / (NDT + NDTT)) x 100%. A= ((NDTPS – 5) / 7). B = (40%-PDTT)/40%, Jika PDTT ≤ 40%. B = (40%-PDTT)/30%, Jika 10% < PDTT ≤ 40%.
- Skor 3: Jika 5 ≤ NDTPS < 12 dan PDTT ≤ 40% , maka Skor = 2 + 2 (A x B) jika NDTPS ≥ 12 dan 10% < PDTT ≤ 40% , Maka Skor = 2 + (2 x B)
- Skor 2: (kosong di teks PDF)
- Skor 1: Jika NDTPS ≥ 5 dan PDTT > 40%, maka skor =2
- Skor 0: Jika NDTPS < 5, maka Skor = 0

### Butir 27 ↔ Sarjana 27 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Kualifikasi akademik DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PDS3 ≥ 20%, maka Skor = 4. NDS3 = Jumlah DTPS yang berpendidikan tertinggi Doktor/Doktor Terapan. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PDS3 = (NDS3 / NDTPS) x 100%
- Skor 3: Jika PDS3 < 20%, maka Skor = 2 + (PDS3 x 10).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 28 ↔ Sarjana 28 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Jabatan akademik DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PGBLKL ≥ 50%, maka Skor = 4. NDGB = Jumlah DTPS yang memiliki jabatan akademik Guru Besar. NDLK = Jumlah DTPS yang memiliki jabatan akademik Lektor Kepala. NDL = Jumlah DTPS yang memiliki jabatan akademik Lektor. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata ku liah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PGBLKL = ((NDGB + NDLK + NDL) / NDTPS) x 100%.
- Skor 3: Jika PGBLKL < 50%, maka Skor = 2 + (PGBLKL x 4)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 32 ↔ Sarjana 30 (beda: perlu rumus jenjang)

- Indikator (hlm. 19): Rerata Beban Kerja (RBK) DTPS. Tabel 4.c. LKPS.
- Skor 4: Jika RBK = 12 - 16 SKS, maka Skor 4.
- Skor 3: Jika RBK = 16 - 20 SKS, maka skor = (64 - (3 x RBK)) / 4
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 33 ↔ Sarjana 31 (beda: perlu rumus jenjang)

- Indikator (hlm. 19): Kegiatan penelitian DTPS yang mendukung visi UPPS dan visi keilmuan program studi dalam 3 tahun terakhir. Tabel 3.b. LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4. Faktor: a = 0,05 , b = 0,3 , c = 1. RI = NI / 3 / NDTPS. RN = NN / 3 / NDTPS. RW = NW / 3 / NDTPS. NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a; B = RN/b; C = RW/c Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2)).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 34 ↔ Sarjana 32 (beda: perlu rumus jenjang)

- Indikator (hlm. 20): Kegiatan PkM DTPS yang mendukung visi UPPS dan visi keilmuan program studi dalam 3 tahun terakhir. Tabel 3.c. LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4. Faktor: a = 0,05 , b = 0,3 , c = 1. RI = NI / 3 / NDTPS. RN = NN / 3 / NDTPS. RW = NW / 3 / NDTPS. NI = Jumlah PkM dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah PkM dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah PkM dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c. maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2)).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 35 ↔ Sarjana 33 (beda: perlu rumus jenjang)

- Indikator (hlm. 20, 21): Pagelaran/pameran/pres entasi/publikasi ilmiah dengan tema yang mendukung visi keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.e. LK
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,5, b = 0,5 , c = 1 RI = (NA4 + NB3 + NC3) / NDTPS, RN = (NA2 + NA3 + NB2 + NC2) / NDTPS, RW = (NA1 + NB1 + NC1) / NDTPS, NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi di jurnal nasional terakreditasi. NA3 = Jumlah publikasi di jurnal internasional. NA4 = Jumlah publikasi di jurnal internasional bereputasi. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional. NC1 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat wilayah. NC2 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat nasional. NC3 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat internasional. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A=RI/a; B=RN/b; C=RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 36 ↔ Sarjana 34 (beda: perlu rumus jenjang)

- Indikator (hlm. 21, 22): Luaran penelitian dan PkM yang mendukung visi UPPS dan visi keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.f. LKPS. Tabel 4.a. LKPS
- Skor 4: Jika RLP ≥ 3, maka Skor 4 . RLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI)) / NDTPS. NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan). NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika RLP < 3, maka Skor = 2 + ((2 x RLP) / 3)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 38 ↔ Sarjana 35 (beda: perlu rumus jenjang)

- Indikator (hlm. 22): Persentase DTPS yang memiliki karya ilmiah sebagai penulis pertama dan/atau penulis korespondensi dalam mendukung keunggulan kompetitif UPPS dan Program studi.
- Skor 4: Jika PKDTPS ≥ 10 %, maka Skor = 4 . PKDTPS = Persentase jumlah dosen yang memiliki karya ilmiah sebagai penulis pertama dan atau penulis korespondensi di jurnal internasional bereputasi, hasil penelitian yang dipublikasikan dalam prosiding internasional ber-ISSN/ISBN terindeks Scopus/IEEE Explore/SPIE, paten dalam tiga tahun terakhir.
- Skor 3: Jika PKDTPS < 10%, maka Skor = 1 + (3 x PKDTPS) / 10
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 39 ↔ Sarjana 36 (beda: perlu rumus jenjang)

- Indikator (hlm. 22, 23): Persentase Karya ilmiah Bereputasi (PKIB) DTPS pada jurnal bereputasi atau publikasi dalam prosiding internasional ber-ISSN/ISBN terindeks PKIB = KIB / NDTPS Sc
- Skor 4: Jika PKIB ≥ 15%, maka Skor = 4.
- Skor 3: Jika PKIB < 15% maka Skor = 2 + (40 x PKIB) / 3
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 40 ↔ Sarjana 37 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Persentase DTPS yang Jika PRDTPS ≥ 50% memiliki , pengakuan/rekognisi maka Skor = 4 . sesuai bidang ilmu. Pengakuan/rekognisi atas kepakaran/prestasi/kinerja DT
- Skor 4: visiting lecturer keynote speaker
- Skor 3: Jika PRDTPS < 50%, maka Skor = 2 + (4 x RRD). / visiting scholar di program studi/perguruan tinggi terakreditasi A/Unggul atau / invited speaker pada pertemuan ilmiah tingkat nasional/ internasional.
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 43 ↔ Sarjana 40 (beda: perlu rumus jenjang)

- Indikator (hlm. 25): Rasio jumlah mahasiswa program studi terhadap jumlah DTPS. Tabel 6.a. LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika 15 ≤ RMD ≤ 25 , maka Skor = 4 NM = Jumlah mahasiswa pada saat TS. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. RMD = NM / NDTPS
- Skor 3: Jika RMD < 15 , maka Skor = (4 x RMD) / 15 Jika 25 < RMD < 35 , maka Skor = (70 - (2 x RMD)) / 5
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika RMD ≥ 35 , maka Skor = 0

### Butir 44 ↔ Sarjana 41 (sama dengan Sarjana)

- Indikator (hlm. 25): Persentase Mahasiswa Asing (PMA). Tabel 6.a. LKPS.
- Skor 4: Jika PMA ≥ 1%, maka Skor = 4
- Skor 3: Jika PMA < 1% , maka Skor = 2 + (200 x PMA)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 45 ↔ Sarjana 42 (beda: perlu rumus jenjang)

- Indikator (hlm. 25): IPK lulusan. RIPK = Rata-rata IPK lulusan dalam 3 tahun terakhir. Tabel 6.b. LKPS.
- Skor 4: Jika RIPK ≥ 3,25, maka Skor = 4
- Skor 3: Jika 2,00 ≤ RIPK < 3,25, maka Skor = ((8 x RIPK) - 6) / 5
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 46 ↔ Sarjana 43-I, 43-II (beda: perlu rumus jenjang)

- Indikator (hlm. 25, 26, 27): I. Prestasi mahasiswa di bidang akademik dalam 5 tahun terakhir. Tabel 6.c.1. LKPS. II. Prestasi mahasiswa di bidang non akademik dalam 5 tahun terakhir. Tabel
- Skor 4: Jika RI > a dan RN > b maka Skor = 4 Faktor: a = 0,2% , b = 2% , c = 4%. RI = NI / NM. RN = NN / NM. RW = NW / NM. NI = Jumlah prestasi akademik internasional. NN = Jumlah prestasi akademik nasional. NW = Jumlah prestasi akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS. A = RI/a; B = RN/b; C = RW/c Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c. Jika RI > a dan RN > b maka Skor = 4 Faktor: a = 0,2% , b = 2% , c = 4%. RI = NI / NM , RN = NN / NM , RW = NW / NM NI = Jumlah prestasi non akademik internasional. NN = Jumlah prestasi non akademik nasional. NW = Jumlah prestasi non akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS. A = RI/a; B = RN/b; C = RW/c Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2)) Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 47 ↔ Sarjana 46 (beda: perlu rumus jenjang)

- Indikator (hlm. 27): Produk/jasa karya mahasiswa, yang dihasilkan secara mandiri atau bersama DTPS, yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir. Tabel 6.e.4. LKPS.
- Skor 4: Jika NAPJ ≥ 3, maka Skor = 4 . NAPJ = Jumlah produk/jasa karya mahasiswa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir.
- Skor 3: Jika NAPJ < 3 , maka Skor = 1 + NAJP
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor kurang dari 1.

### Butir 48 ↔ Sarjana 44 (beda: perlu rumus jenjang)

- Indikator (hlm. 27): Masa studi. MS = Rata-rata masa studi lulusan (tahun). Tabel 6.d. LKPS.
- Skor 4: Jika 3,5 < MS ≤ 4,5 , maka Skor = 4
- Skor 3: Jika 4,5 < MS ≤ 8 , maka Skor = (55 - (6 x MS)) / 7
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika MS ≤ 3 , maka Skor = 0

### Butir 49 ↔ Sarjana 45 (beda: perlu rumus jenjang)

- Indikator (hlm. 27, 28): Persentase kelulusan tepat waktu (PTW) Rumus perhitungan: PTW = ((f/d) x 100%) Tabel 6.d. LKPS.
- Skor 4: Jika PTW ≥ 80%, maka skor = 4.
- Skor 3: Jika 0% < PTW < 80%, maka skor = 1 + (30 x PTW) / 8
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 50 ↔ Sarjana 46 (beda: perlu rumus jenjang)

- Indikator (hlm. 28): Pagelaran / pameran / presentasi / publikasi ilmiah mahasiswa, yang dihasilkan secara mandiri atau bersama DTPS dalam 3 tahun terakhir. Tabel 6.e.2. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4. Faktor: a = 1% , b = 10% , c = 50%. RI = ((NA4 + NB3 + NC3) / NM) x 100% RN = ((NA2 + NA3 + NB2 + NC2) / NM) x 100% , RW = ((NA1 + NB1 + NC1) / NM) x 100% , NA1 = Jumlah publikasi mahasiswa di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi mahasiswa di jurnal nasional terakreditasi. NA3 = Jumlah publikasi mahasiswa di jurnal internasional. NA4 = Jumlah publikasi mahasiswa di jurnal internasional bereputasi. NB1 =Jumlah publikasi mahasiswa di prosiding di seminar nasional/wilayah. NB2 = Jumlah publikasi mahasiswa di prosiding tidak terindeks di seminar internasional. NB3 =Jumlah publikasi mahasiswa di prosiding terindeks Scopus / WoS di seminar internasional. NC1 = Jumlah pagelaran/pameran/presentasi mahasiswa dalam forum di tingkat wilayah. NC2 = Jumlah pagelaran/pameran/presentasi mahasiswa dalam forum di tingkat nasional. NC3 = Jumlah pagelaran/pameran/presentasi mahasiswa dalam forum di tingkat internasional. NM = Jumlah mahasiswa pada saat TS. A = RI/a; B = RN/b; C = RL/c. Jika RI ≥ a dan RN < b, maka RI = a Jika RI < a dan RN ≥ b, maka RN = b Jika RL ≥ c, maka RL = c
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 51 ↔ Sarjana 47 (beda: perlu rumus jenjang)

- Indikator (hlm. 29): 
- Skor 4: Jika NLP ≥ 10, maka Skor 4 . NLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI)) NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk. NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan).
- Skor 3: Jika NLP < 10 , maka Skor = 2 + (0,2 x NLP).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada Skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 53 ↔ Sarjana 49 (beda: perlu rumus jenjang)

- Indikator (hlm. 29, 30): lulusan untuk mendapatkan pekerjaan atau berkarya pertama dalam 2 tahun, mulai TS- 2 s/d TS-1. Tabel 6.f.1. LKPS.
- Skor 4: Jika WT ≤ 3 bulan, maka Skor = 4. Persentase responden lulusan minimal 30%
- Skor 3: Jika 3 < WT ≤ 18, maka Skor = (23 – WT) / 5.
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 54 ↔ Sarjana 50 (beda: perlu rumus jenjang)

- Indikator (hlm. 30): Kesesuaian bidang kerja. KBK = Kesesuaian bidang kerja lulusan saat mendapatkan pekerjaan pertama dalam 2 tahun, mulai TS-2 s.d. TS-1. Tabel 6.f.2. LKPS.
- Skor 4: Jika KBK ≥ 60% , maka Skor = 4 Persentase responden lulusan minimal 30%
- Skor 3: Jika KBK < 60%, maka Skor = (20 x KBK) / 3.
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 55 ↔ Sarjana 51 (beda: perlu rumus jenjang)

- Indikator (hlm. 30, 31): Tingkat dan ukuran tempat kerja lulusan di tingkat internasional, nasional, dan wilayah/lokal. Tabel 6.g.1. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 5% , b = 20% , c = 90%. RI = (NI / NL) x 100%, RN = (NN / NL) x 100%, RW = (NW / NL) x 100%. NI = Jumlah lulusan yang bekerja di badan usaha tingkat multi nasional/internasional. NN = Jumlah lulusan yang bekerja di badan usaha tingkat nasional atau berwirausaha yang berizin. NW = Jumlah lulusan yang bekerja di badan usaha tingkat wilayah/lokal atau berwirausaha tidak berizin. NL = Jumlah lulusan. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c. Persentase responden lulusan minimal 30%
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 56 ↔ Sarjana 52 (beda: perlu rumus jenjang)

- Indikator (hlm. 31): Tingkat kepuasan pengguna lulusan. Tabel 6.g.2. LKPS.
- Skor 4: Skor = ƩTKi / 7 Tingkat kepuasan aspek ke-i dihitung dengan rumus sebagai berikut: TKi = (4 x ai) + (3 x bi) + (2 x ci) + di i = 1, 2, 3, 4, 5, 6, 7 ai = persentase “sangat baik”. bi = persentase “baik”. ci = persentase “cukup”. di = persentase “kurang”. Persentase responden 50% dari Persentase responden lulusan minimal 30%
- Skor 3: (kosong di teks PDF)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

## Butir berangka tanpa padanan Sarjana (cek: datanya ada di LKPS atau tetap manual dengan alasan)

### Butir 17

- Indikator (hlm. 12, 13): Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar minimal 10% dari mata kuliah inti Program Studi. Tabel 3.a.3. LKPS
- Skor 4: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi; (3) Mengandung kebaruan ilmiah; dan (4) Mengandung dampak sosial yang positif.
- Skor 3: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi; (3) Mengandung kebaruan ilmiah.
- Skor 2: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi.
- Skor 1: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar yang hanya menyesuaikan relevansi dengan CPL.
- Skor 0: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) kurang dari 10% yang dijadikan sebagai bahan ajar.

### Butir 29

- Indikator (hlm. 18): Sertifikasi kompetensi/profesi/indust ri DTPS Tabel 4.a. LKPS.
- Skor 4: Jika PDSK ≥ 50%, maka Skor = 4 NDSK = Jumlah DTPS yang memiliki sertifikat kompetensi/profesi/industri. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PDSK = (NDSK / NDTPS) x 100%
- Skor 3: Jika PDSK < 50%, maka Skor = 1 + (6 x PDSK)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 30

- Indikator (hlm. 18): Keterlibatan dosen industri/praktisi. Tabel 4.a. LKPS.
- Skor 4: Jika PMKI ≥ 20%, maka Skor = 4. MKKI = Jumlah mata kuliah kompetensi yang diampu oleh dosen industri/praktisi. MKK = Jumlah mata kuliah kompetensi PMKI = (MKKI / MKK) x 100%
- Skor 3: Jika PMKI < 20%, maka Skor = 2 + (10 x PMKI).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor di bawah 2.
- Skor 0: (kosong di teks PDF)

### Butir 31

- Indikator (hlm. 18): Kualifikasi dan kecukupan laboran/teknisi/administra tor sistem untuk mendukung proses pembelajaran sesuai dengan kebutuhan program studi. Tabel 4.b. LKPS.
- Skor 4: UPPS memiliki jumlah laboran/teknisi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan > 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 3: UPPS memiliki jumlah laboran/teknisi/admi nistrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 10% - 39% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 2: UPPS memiliki jumlah laboran/teknsi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi.
- Skor 1: UPPS tidak memiliki laboran/teknisi/ad ministrator sistem/dll.
- Skor 0: UPPS tidak memiliki laboran/teknisi/dll

### Butir 37

- Indikator (hlm. 22): Produk/jasa yang diadopsi oleh industri/masyarakat terhadap jumlah dosen tetap dalam 3 tahun terakhir. Tabel 4.g. LKPS.
- Skor 4: Jika NAPJ ≥ 3, maka Skor = 4 . NAPJ = Jumlah produk/jasa karya dosen tetap yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir.
- Skor 3: Jika NAPJ < 3 , maka Skor = 1 + NAPJ
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

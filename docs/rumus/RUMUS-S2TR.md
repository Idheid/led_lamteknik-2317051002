# Rumus butir angka Magister Terapan (R1, inventaris)

Sumber: `Matrik Penilaian LED dan LKPS Magister Terapan APS Akademik dan Vokasi Teknik 2025 Pasca Akreditasi Minimum dan Unggul.pdf` (folder Instrumen_Akreditasi_LAM_Teknik_2025, 01_Pasca Terakreditasi Pertama dan Unggul).
Dibuat dengan `scripts/bandingkan-matriks.ts` (Rencana 10 Nov T10 R1): baris matriks disusun dari posisi teks PDF
(`susunMatriks`, tanpa AI), dicocokkan ke butir Sarjana dengan indikator paling mirip, lalu deskriptor skor 4–0
dibandingkan. Deskriptor di bawah disalin dari teks PDF; sel yang kosong atau terpotong harus dicek ke PDF.
Padanan dengan kemiripan < 0,6 perlu dicek manual.

## Ringkasan

| Butir | Padanan Sarjana | Kemiripan | Tabel LKPS | Hlm. | Deskriptor 4·3·2·1·0 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 6-I, 6-II | 1.00 | 2.a | 6, 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 9 | 9 | 1.00 | 2.b | 8 | ≠≠≠== | beda: perlu rumus jenjang |
| 10 | 10 | 1.00 | 2.b | 8 | ≠≠≠== | beda: perlu rumus jenjang |
| 11 | 11 | 1.00 | 2.b | 8 | ≠≠≠== | beda: perlu rumus jenjang |
| 21 | 23 | 1.00 | 3.b, 6.h | 17 | ≠≠=== | beda: perlu rumus jenjang |
| 22 | 23 | 0.48 | 3.b, 6.h.2 | 18 | ≠≠=== | beda: perlu rumus jenjang |
| 24 | 25 | 1.00 | 3.c, 6.i | 19 | ≠≠=== | beda: perlu rumus jenjang |
| 25 | 26 | 0.71 | 4.a | 19 | ≠≠≠≠= | beda: perlu rumus jenjang |
| 26 | 28 | 1.00 | 4.a | 19, 20 | ≠≠=== | beda: perlu rumus jenjang |
| 29 | 30 | 1.00 | 4.c | 21 | =≠=== | beda: perlu rumus jenjang |
| 30 | 31 | 1.00 | 3.b, 4.a | 21 | ≠==== | beda: perlu rumus jenjang |
| 31 | 32 | 1.00 | 3.c, 4.a | 21, 22 | ≠≠=== | beda: perlu rumus jenjang |
| 32 | 33 | 0.77 | 4.a | 22, 23 | ≠≠=== | beda: perlu rumus jenjang |
| 33 | 34 | 1.00 | 4.a, 4.f | 23 | =≠=== | beda: perlu rumus jenjang |
| 35 | 35 | 1.00 | - | 24 | ≠≠≠== | beda: perlu rumus jenjang |
| 36 | 36 | 0.60 | - | 24 | ≠≠=== | beda: perlu rumus jenjang |
| 40 | 41 | 1.00 | 6.a | 28 | ===== | sama dengan Sarjana |
| 41 | 42 | 1.00 | 6.b | 28 | ≠≠=== | beda: perlu rumus jenjang |
| 42 | 43-I, 43-II | 0.69 | 6.a, 6.c.1 | 28 | ≠≠≠== | beda: perlu rumus jenjang |
| 43 | 46 | 0.46 | 6.e.4 | 29 | ≠≠==≠ | beda: perlu rumus jenjang |
| 44 | 44 | 1.00 | 6.d | 29 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 45 | 46 | 0.45 | 6.d | 29 | ≠≠==≠ | beda: perlu rumus jenjang |
| 47 | 47 | 0.72 | 6.a, 6.e.3 | 30 | ≠≠=== | beda: perlu rumus jenjang |
| 49 | 50 | 1.00 | - | 31 | ≠≠≠== | beda: perlu rumus jenjang |
| 50 | 52 | 1.00 | 6.g.2 | 32 | ≠=≠== | beda: perlu rumus jenjang |

Butir berangka tanpa padanan Sarjana: 15, 27, 28, 34, 37, 46.
Butir angka Sarjana tanpa padanan di jenjang ini: 18, 19, 27, 37, 40, 45, 49, 51.

## Deskriptor butir berpadanan

### Butir 6 ↔ Sarjana 6-I, 6-II (beda: perlu rumus jenjang)

- Indikator (hlm. 6, 7): I. Relevansi kerja sama pendidikan, penelitian, dan PkM dengan Visi UPPS serta Visi Keilmuan Program Studi. Tabel 2.a. LKPS. II. Kerja sama tingkat internasiona
- Skor 4: Jika RK ≥ 4, maka skor 4 RK = ( N1+ N2+ N3) / NDTPS N1 = Jumlah kerja sama pendidikan. N2 = Jumlah kerja sama penelitian. N3 = Jumlah kerja sama PkM. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. Jika NI > a dan NN > b, maka skor = 4 Faktor: a = 2 , b = 6 , c = 8. NI = Jumlah kerja sama tingkat internasional. NN = Jumlah kerja sama tingkat nasional. NW = Jumlah kerja sama tingkat wilayah/lokal. A = NI/a; B = NN/b; C = NW/c. Jika NI ≥ a dan NN < b, maka NI = a. Jika NI < a dan NN ≥ b, maka NN = b. Jika NW ≥ c , maka NW = c.
- Skor 3: Skor = RK Jika 0 < NI ≤ a atau 0 < NN ≤ b atau 0 < NW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 9 ↔ Sarjana 9 (beda: perlu rumus jenjang)

- Indikator (hlm. 8): Biaya operasional pendidikan (BOP). Tabel 2.b. LKPS.
- Skor 4: Jika BOP ≥ 28.000.000, maka Skor 4 BOP = Rata-rata dana operasional pendidikan/mahasiswa/tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika BOP < 28.000.000, maka Skor = BOP / 7.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 10 ↔ Sarjana 10 (beda: perlu rumus jenjang)

- Indikator (hlm. 8): Dana Penelitian DTPS (DPD). Tabel 2.b. LKPS.
- Skor 4: Jika DPD ≥ 20.000.000, maka skor 4 DPD = Rata-rata dana penelitian DTPS/tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika DPD < 20.000.000, maka Skor = (2 x DPD) / 10.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 11 ↔ Sarjana 11 (beda: perlu rumus jenjang)

- Indikator (hlm. 8): Dana PkM (DPkMD). Tabel 2.b. LKPS.
- Skor 4: Jika DPkMD ≥ 5.000.000, maka Skor 4 DPkMD = Rata-rata dana PkM DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika DPkMD < 5.000.000, maka Skor = (4 x DPkMD) / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 21 ↔ Sarjana 23 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Penelitian DTPS yang sesuai dengan peta jalan penelitian dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.b LKPS. Tabel 6.h
- Skor 4: Jika PPDMhs ≥ 75%, maka Skor = 4 NPMhs = Jumlah judul penelitian DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPD = Jumlah judul penelitian DTPS dalam 3 tahun terakhir. PPDMhs = (NPMhs / NPD) x 100%
- Skor 3: Jika PPDMhs < 75%, maka Skor = 1 + (6 x PPDMhs)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 22 ↔ Sarjana 23 (beda: perlu rumus jenjang)

- Indikator (hlm. 18): Penelitian DTPS yang menjadi rujukan tema tesis/disertasi mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.b LKPS. Tabel 6.h.2. LKPS.
- Skor 4: Jika PPTM ≥ 25%, maka Skor = 4. NTM = Jumlah judul penelitian DTPS yang menjadi rujukan tema tesis/disertasi mahasiswa program studi dalam 3 tahun terakhir. NPD = Jumlah judul penelitian DTPS dalam 3 tahun terakhir. dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PPTM = (NTM / NPD) x 100%.
- Skor 3: Jika PPTM < 25%, maka Skor = 1 + (12 x PPTM).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor kurang dari 1.

### Butir 24 ↔ Sarjana 25 (beda: perlu rumus jenjang)

- Indikator (hlm. 19): PkM DTPS yang sesuai dengan peta jalan PkM dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.c LKPS. Tabel 6.i. LKPS.
- Skor 4: Jika PKDMhs ≥ 0,5; maka Skor = 4. NPKMhs = Jumlah judul PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPKD = Jumlah judul PkM DTPS dalam 3 tahun terakhir. PKDMhs = (NPKMhs / NPKD) x 100%
- Skor 3: Jika PKDMhs < 0,5; maka Skor = 1 + (6 x PKDMhs)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 25 ↔ Sarjana 26 (beda: perlu rumus jenjang)

- Indikator (hlm. 19): Kecukupan Jumlah DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika NDTPS ≥ 8 dan PDTT ≤ 10% , Maka Skor = 4 NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. NDTT = Jumlah dosen tidak tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. NDT = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. PDTT = (NDTT / (NDT + NDTT)) x 100%. A= ((NDTPS – 5)/7). B = (40%-PDTT)/40%, Jika PDTT ≤ 40%. B = (40%-PDTT)/30%, Jika 10% < PDTT ≤ 40%.
- Skor 3: Jika 5 ≤ NDTPS < 8 dan PDTT ≤ 40% , maka Skor = 2 + 2 (A x B) jika NDTPS ≥ 8 dan 10% < PDTT ≤ 40% , maka Skor = 2 + (2 x B)
- Skor 2: (kosong di teks PDF)
- Skor 1: Jika DTPS ≥ 5 dan PDTT > 40%, Maka skor = 2
- Skor 0: Jika NDTPS < 5 , Maka Skor = 0

### Butir 26 ↔ Sarjana 28 (beda: perlu rumus jenjang)

- Indikator (hlm. 19, 20): Jabatan akademik DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PGBLK ≥ 70% , maka Skor = 4 NDGB = Jumlah DTPS yang memiliki jabatan akademik Guru Besar. NDLK = Jumlah DTPS yang memiliki jabatan akademik Lektor Kepala. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PGBLK = ((NDGB + NDLK) / NDTPS) x 100%.
- Skor 3: Jika PGBLK < 70% , maka Skor = 2 + ((20 x PGBLK) /7)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 29 ↔ Sarjana 30 (beda: perlu rumus jenjang)

- Indikator (hlm. 21): Rerata Beban Kerja (RBK) DTPS. Tabel 4.c. LKPS.
- Skor 4: Jika RBK = 12 - 16 SKS, maka Skor 4.
- Skor 3: Jika RBK = 16 - 20 SKS, maka skor = (64 - (3 x RBK)) / 4
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 30 ↔ Sarjana 31 (beda: perlu rumus jenjang)

- Indikator (hlm. 21): Kegiatan penelitian DTPS yang mendukung Visi UPPS dan Visi Keilmuan program studi dalam 3 tahun terakhir. Tabel 3.b. LKPS. Tabel 4.a LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,07 , b = 0,5 , c = 1,5 RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RW = NW / 3 / NDTPS. NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 31 ↔ Sarjana 32 (beda: perlu rumus jenjang)

- Indikator (hlm. 21, 22): Kegiatan PkM DTPS yang mendukung Visi UPPS dan Visi Keilmuan program studi dalam 3 tahun terakhir. Tabel 3.c. LKPS. Tabel 4.a LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,07 , b = 0,5 , c = 1,5 RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RW = NW / 3 / NDTPS , NI = Jumlah PkM dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah PkM dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah PkM dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a; B = RN/b; C = RW/c, Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 32 ↔ Sarjana 33 (beda: perlu rumus jenjang)

- Indikator (hlm. 22, 23): Pagelaran/pameran/pr esentasi/publikasi ilmiah dengan tema yang mendukung visi keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.a LKP
- Skor 4: Jika RI > a dan RN > b maka Skor = 4 Faktor: a = 0,5 ,b = 0,5 , c = 1 RW = (NA1 + NB1 + NC1) / NDTPS , RN = (NA2 + NA3 + NB2 + NC2) / NDTPS , RI = (NA4 + NB3 + NC3) / NDTPS NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi di jurnal nasional terakreditasi. NA3 = Jumlah publikasi di jurnal internasional. NA4 = Jumlah publikasi di jurnal internasional bereputasi. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional. NC1 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat wilayah. NC2 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat nasional. NC3 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat internasional. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A=RI/a; B=RN/b; C=RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 33 ↔ Sarjana 34 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Luaran penelitian dan PkM yang mendukung Visi UPPS dan Visi Keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.a LKPS. Tabel 4.f. LKPS.
- Skor 4: Jika RLP ≥ 3, maka Skor 4 . RLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI)) / NDTPS. NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan). NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika RLP < 3, maka Skor = 2 + ((2 x RLP) / 3)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 35 ↔ Sarjana 35 (beda: perlu rumus jenjang)

- Indikator (hlm. 24): Persentase DTPS yang memiliki karya ilmiah sebagai penulis pertama dan/atau penulis korespondensi dalam mendukung keunggulan kompetitif UPPS dan Program studi.
- Skor 4: Jika PKDTPS ≥ 30%, maka Skor = 4 . PKDTPS = Persentase jumlah dosen yang memiliki karya ilmiah sebagai penulis pertama dan atau penulis korespondensi di jurnal internasional bereputasi, hasil penelitian yang dipublikasikan dalam prosiding internasional ber-ISSN/ISBN terindeks Scopus/IEEE Explore/SPIE, paten dalam tiga tahun terakhir.
- Skor 3: Jika PKDTPS < 30%, maka Skor = 1 + (PKDTPS x 10)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 36 ↔ Sarjana 36 (beda: perlu rumus jenjang)

- Indikator (hlm. 24): Persentase Karya ilmiah Bereputasi (PKIB) DTPS pada jurnal bereputasi atau publikasi dalam prosiding internasional ber-ISSN/ISBN terindeks Scopus/IEEE Explore/S
- Skor 4: Jika PKIB ≥ 30% , maka Skor = 4. PKIB = KIB / NDTPS KIB = Jumlah karya ilmiah DTPS pada jurnal bereputasi atau hasil penelitian yang dipublikasikan dalam prosiding internasional ber-ISSN/ISBN terindeks Scopus/IEEE Explore/SPIE yang disitasi dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika PKIB < 30% maka Skor = 2 + (2 x PKIB) / 30
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 40 ↔ Sarjana 41 (sama dengan Sarjana)

- Indikator (hlm. 28): Persentase Mahasiswa Asing (PMA). Tabel 6.a. LKPS.
- Skor 4: Jika PMA ≥ 1%, maka Skor = 4
- Skor 3: Jika PMA < 1% , maka Skor = 2 + (200 x PMA)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 41 ↔ Sarjana 42 (beda: perlu rumus jenjang)

- Indikator (hlm. 28): IPK lulusan. RIPK = Rata-rata IPK lulusan dalam 3 tahun terakhir. Tabel 6.b. LKPS.
- Skor 4: Jika RIPK ≥ 3,5, maka Skor = 4
- Skor 3: Jika 3,00 ≤ RIPK < 3,5, maka Skor = (4 x RIPK) - 10
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 42 ↔ Sarjana 43-I, 43-II (beda: perlu rumus jenjang)

- Indikator (hlm. 28): Prestasi mahasiswa di bidang akademik dalam 3 tahun terakhir. Tabel 6.a LKPS. Tabel 6.c.1. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,2% , b = 2% , c = 4%. RI = RI = NI / NM, RN = NN / NM, RW = NW / NM. NI = Jumlah prestasi akademik internasional. NN = Jumlah prestasi akademik nasional. NW = Jumlah prestasi akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3.75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 43 ↔ Sarjana 46 (beda: perlu rumus jenjang)

- Indikator (hlm. 29): Produk/jasa karya mahasiswa, yang dihasilkan secara mandiri atau bersama DTPS, yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir. Tabel 6.e.4. LKPS.
- Skor 4: Jika NAPJ ≥ 3, maka Skor = 4 . NAPJ = Jumlah produk/jasa karya mahasiswa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir.
- Skor 3: Jika NAPJ < 3 , maka Skor = 1 + NAJP
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor kurang dari 1.

### Butir 44 ↔ Sarjana 44 (beda: perlu rumus jenjang)

- Indikator (hlm. 29): Masa studi. MS = Rata-rata masa studi lulusan (tahun). Tabel 6.d. LKPS.
- Skor 4: Jika 1,5 < MS ≤ 2,5 , maka Skor = 4
- Skor 3: Jika 2,5 < MS ≤ 4 , maka Skor = (9 - (2 x MS))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika MS < 1,5 , maka Skor = 0

### Butir 45 ↔ Sarjana 46 (beda: perlu rumus jenjang)

- Indikator (hlm. 29): Persentase kelulusan tepat waktu (PTW) Rumus perhitungan: PTW = ((b/a) x 100%) Tabel 6.d. LKPS. Pagelaran / pameran / presentasi / publikasi ilmiah mahasiswa, y
- Skor 4: PTW ≥ 60% maka Skor = 4 Jika RI > a dan RN > b, maka Skor = 4.
- Skor 3: 20% ≤ PTW < 60% maka Skor = 1 + (30 x PTW - 6) / 4 Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RL ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor dibawah 1

### Butir 47 ↔ Sarjana 47 (beda: perlu rumus jenjang)

- Indikator (hlm. 30): Luaran penelitian dan PkM yang dihasilkan mahasiswa, baik secara mandiri atau bersama DTPS dalam 3 tahun terakhir. Tabel 6.a LKPS. Tabel 6.e.3. LKPS.
- Skor 4: Jika NLP ≥ 2, maka Skor 4 . NLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI) / NM. NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan). NM = Jumlah mahasiswa pada saat TS.
- Skor 3: Jika NLP < 2, maka Skor = (2 + NLP).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 49 ↔ Sarjana 50 (beda: perlu rumus jenjang)

- Indikator (hlm. 31): 
- Skor 4: Jika KBK ≥ 60% , maka Skor = 4 Persentase responden lulusan minimal 30%.
- Skor 3: Jika KBK < 60%, maka Skor = (20 x KBK) / 3.
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 50 ↔ Sarjana 52 (beda: perlu rumus jenjang)

- Indikator (hlm. 32): Tingkat kepuasan pengguna lulusan. Tabel 6.g.2. LKPS.
- Skor 4: Skor = ƩTKi / 7 Tingkat kepuasan aspek ke-i dihitung dengan rumus sebagai berikut: TKi = (4 x ai) + (3 x bi) + (2 x ci) + di i = 1, 2, 3, 4, 5, 6, 7 ai = persentase “sangat baik”. bi = persentase “baik”. ci = persentase “cukup”. di = persentase “kurang”. Persentase responden 50% dari Persentase responden lulusan minimal 30%
- Skor 3: (kosong di teks PDF)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

## Butir berangka tanpa padanan Sarjana (cek: datanya ada di LKPS atau tetap manual dengan alasan)

### Butir 15

- Indikator (hlm. 11, 12): I. Metode rekrutmen dan sistem seleksi. II. Kriteria penerimaan mahasiswa. III. Proses seleksi.
- Skor 4: UPPS memiliki dokumen tentang sistem penerimaan mahasiswa baru yang lengkap, mencakup: kebijakan seleksi, kriteria seleksi, sistem pengambilan keputusan, dan prosedur penerimaan, yang dilaksanakan secara konsisten. Persyaratan penerimaan mahasiswa sangat tinggi, ditunjukkan oleh syarat: IPK ≥ 3,00 , TPA ≥ 475 (skala 1 - 700) , dan TOEFL ≥ 475 (skala 1 - 677) . Proses seleksi menggunakan ujian tertulis dan wawancara untuk mengetahui kemampuan intelektual dan motivasi calon mahasiswa.
- Skor 3: Tidak ada Skor antara 2 dan 4. Persyaratan penerimaan mahasiswa tinggi, ditunjukkan oleh syarat: 2,75 < IPK < 3,00, 450 <TPA < 475 (skala 1 -700) , dan 450 < TOEFL < 475 (skala 1 - 677) . Tidak ada Skor antara 2 dan 4.
- Skor 2: UPPS memiliki dokumen tentang sistem penerimaan mahasiswa baru yang lengkap, mencakup: kebijakan seleksi, kriteria seleksi, sistem pengambilan keputusan, dan prosedur penerimaan. Persyaratan penerimaan mahasiswa ditunjukkan oleh syarat: 2,50 < IPK < 2,75 , 425 < TPA < 450 (skala 1 -700) , dan 425 < TOEFL < 450 (skala 1- 677) . Proses seleksi menggunakan ujian tertulis atau wawancara untuk mengetahui kemampuan intelektual dan motivasi calon mahasiswa.
- Skor 1: UPPS memiliki dokumen tentang sistem penerimaan mahasiswa baru yang kurang lengkap. Persyaratan penerimaan mahasiswa ditunjukkan hanya oleh syarat IPK ≥ 2,00 . Proses seleksi tidak digunakan untuk mengetahui kemampuan intelektual dan motivasi calon mahasiswa.
- Skor 0: UPPS tidak memiliki dokumen tentang sistem penerimaan mahasiswa baru. Persyaratan penerimaan mahasiswa tidak jelas, yang memungkinkan penerimaan mahasiswa tanpa syarat. Tidak ada Skor kurang dari 1.

### Butir 27

- Indikator (hlm. 20): Sertifikasi kompetensi/profesi/ind ustri DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PDSK ≥ 50% , maka Skor = 4 NDSK = Jumlah DTPS yang memiliki sertifikat kompetensi/profesi/industri. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PDSK = (NDSK / NDTPS) x 100%
- Skor 3: Jika PDSK < 50% , maka Skor = 1 + (6 x PDSK)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor di bawah 1

### Butir 28

- Indikator (hlm. 20): Kualifikasi dan kecukupan laboran/teknisi/adminis trator sistem untuk mendukung proses pembelajaran sesuai dengan kebutuhan program studi. Tabel 4.b. LKPS.
- Skor 4: UPPS memiliki jumlah laboran/teknisi/admi nistrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan > 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 3: UPPS memiliki jumlah laboran/teknisi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 40% - 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 2: UPPS memiliki jumlah laboran/teknisi/admi nistrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 10% - 39% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 1: UPPS memiliki jumlah laboran/teknsi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi.
- Skor 0: UPPS tidak memiliki laboran/teknisi/adm inistrator sistem/dll.

### Butir 34

- Indikator (hlm. 24): Produk/jasa yang diadopsi oleh industri/masyarakat terhadap jumlah dosen tetap dalam 3 tahun terakhir. Tabel 4.g. LKPS.
- Skor 4: Jika NAPJ ≥ 3, maka Skor = 4. NAPJ = Jumlah produk/jasa karya dosen tetap yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir.
- Skor 3: Jika NAPJ < 3 , maka Skor = 1 + NAPJ
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor kurang dari 1.

### Butir 37

- Indikator (hlm. 25): Persentase DTPS yang memiliki pengakuan/rekognisi sesuai bidang ilmu. Tabel 4.j. LKPS.
- Skor 4: Jika PRDTPS ≥ 1 , maka Skor = 4. Pengakuan/rekognisi atas kepakaran/prestasi/kinerja DTPS dapat berupa: a) Menjadi visiting lecturer program studi/perguruan tinggi internasional bereputasi. b) Menjadi keynote speaker c) Menjadi editor atau mitra bestari pada jurnal nasional terakreditasi/jurnal internasional bereputasi di bidang yang sesuai dengan bidang program studi. d) Menjadi staf ahli/narasumber di lembaga tingkat wilayah/nasional/internasional pada bidang yang sesuai dengan bidang program studi. e) Mendapat penghargaan atas prestasi dan kinerja di tingkat wilayah/nasional/internasional. PRDTPS = NRDTPS / NDTPS. NRDTPS = Jumlah DTPS yang memiliki pengakuan atas prestasi/kinerja yang relevan dengan bidang keahlian dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika PRDTPS < 1 , maka Skor = 2 + (2 x PRDTPS). atau visiting scholar / invited speaker pada pertemuan ilmiah tingkat nasional/ internasional.
- Skor 2: di program studi/perguruan tinggi terakreditasi A/Unggul atau
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 46

- Indikator (hlm. 30): 
- Skor 4: Faktor: a = 0,1 , b = 20% , c = 70%. RI = ((NA4 + NB3 + NC3) / NM) x 100% RN = ((NA2 + NA3 + NB2 + NC2) / NM) x 100% , RW = ((NA1 + NB1 + NC1) / NM) x 100% , NA1 = Jumlah publikasi mahasiswa di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi mahasiswa di jurnal nasional terakreditasi. NA3 = Jumlah publikasi mahasiswa di jurnal internasional. NA4 = Jumlah publikasi mahasiswa di jurnal internasional bereputasi. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional. NC1 = Jumlah pagelaran/pameran/presentasi mahasiswa dalam forum di tingkat wilayah. NC2 = Jumlah pagelaran/pameran/presentasi mahasiswa dalam forum di tingkat nasional. NC3 = Jumlah pagelaran/pameran/presentasi mahasiswa dalam forum di tingkat internasional. NM = Jumlah mahasiswa pada saat TS. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a Jika RI < a dan RN ≥ b, maka RN = b Jika RW ≥ c, maka RW = c
- Skor 3: (kosong di teks PDF)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

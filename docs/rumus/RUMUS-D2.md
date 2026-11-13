# Rumus butir angka Diploma II (R1, inventaris)

Sumber: `Matrik Penilaian LED dan LKPS Diploma II APS Akademik dan Vokasi Teknik 2025 Pasca Akreditasi Minimum dan Unggul.pdf` (folder Instrumen_Akreditasi_LAM_Teknik_2025, 01_Pasca Terakreditasi Pertama dan Unggul).
Dibuat dengan `scripts/bandingkan-matriks.ts` (Rencana 10 Nov T10 R1): baris matriks disusun dari posisi teks PDF
(`susunMatriks`, tanpa AI), dicocokkan ke butir Sarjana dengan indikator paling mirip, lalu deskriptor skor 4–0
dibandingkan. Deskriptor di bawah disalin dari teks PDF; sel yang kosong atau terpotong harus dicek ke PDF.
Padanan dengan kemiripan < 0,6 perlu dicek manual.

## Ringkasan

| Butir | Padanan Sarjana | Kemiripan | Tabel LKPS | Hlm. | Deskriptor 4·3·2·1·0 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 6-I, 6-II | 1.00 | 2.a | 6, 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 9 | 9 | 0.90 | 2.b | 8 | ≠≠≠== | beda: perlu rumus jenjang |
| 10 | 10 | 1.00 | 2.b | 8 | ≠≠≠== | beda: perlu rumus jenjang |
| 11 | 11 | 1.00 | 2.b | 8 | ≠≠≠== | beda: perlu rumus jenjang |
| 18 | 18 | 1.00 | 3.a.1 | 14 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 22 | 25 | 1.00 | 3.c, 6.i | 16 | ≠≠=≠≠ | beda: perlu rumus jenjang |
| 23 | 26 | 0.71 | 4.a | 17 | ≠≠≠≠≠ | beda: perlu rumus jenjang |
| 24 | 27 | 1.00 | 4.a | 17 | ≠≠≠≠= | beda: perlu rumus jenjang |
| 25 | 28 | 1.00 | 4.a | 17, 18 | ≠≠=≠= | beda: perlu rumus jenjang |
| 29 | 30 | 1.00 | 4.c | 19 | ≠≠=== | beda: perlu rumus jenjang |
| 30 | 31 | 1.00 | 3.b, 4.a | 19, 20 | ≠==== | beda: perlu rumus jenjang |
| 31 | 32 | 1.00 | 3.c, 4.a | 20, 21 | ≠≠=== | beda: perlu rumus jenjang |
| 32 | 33 | 0.74 | 4.a | 21, 22 | ≠≠=== | beda: perlu rumus jenjang |
| 33 | 34 | 1.00 | 4.a, 4.f | 22, 23 | ≠≠=≠= | beda: perlu rumus jenjang |
| 35 | 37 | 0.96 | 4.a, 4.j | 23, 24 | ≠≠≠≠= | beda: perlu rumus jenjang |
| 38 | 40 | 1.00 | 4.a, 6.a | 26 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 39 | 42 | 0.80 | 6.b | 26 | ≠≠=≠= | beda: perlu rumus jenjang |
| 40 | 43-I, 43-II | 1.00 | 6.a, 6.c.1 | 27, 28 | ≠≠≠== | beda: perlu rumus jenjang |
| 41 | 46 | 0.46 | 6.e.4 | 28 | ≠≠=≠= | beda: perlu rumus jenjang |
| 42 | 44 | 0.75 | 6.d | 28 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 43 | 45 | 0.91 | - | 29 | ≠≠==≠ | beda: perlu rumus jenjang |
| 45 | 49 | 1.00 | 6.f.1 | 30 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 46 | 50 | 1.00 | 6.f.2 | 30 | ≠≠≠== | beda: perlu rumus jenjang |
| 47 | 51 | 1.00 | 6.g.1 | 30, 31 | ≠≠=== | beda: perlu rumus jenjang |
| 48 | 52 | 1.00 | 6.g.2 | 31 | ≠=≠== | beda: perlu rumus jenjang |

Butir berangka tanpa padanan Sarjana: 17, 26, 27, 28, 34.
Butir angka Sarjana tanpa padanan di jenjang ini: 19, 23, 35, 36, 41, 47.

## Deskriptor butir berpadanan

### Butir 6 ↔ Sarjana 6-I, 6-II (beda: perlu rumus jenjang)

- Indikator (hlm. 6, 7): I. Relevansi kerja sama pendidikan, penelitian, dan PkM dengan visi UPPS serta visi keilmuan program studi. Tabel 2.a. LKPS. II. Kerja sama tingkat internasiona
- Skor 4: Jika RK ≥ 4, maka skor 4 RK = ( N1 + N2 + N3) / NDTPS. N1 = Jumlah kerja sama pendidikan. N2 = Jumlah kerja sama penelitian. N3 = Jumlah kerja sama PkM. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. Jika NI > a dan NN > b, maka Skor = 4. Faktor: a = 1 , b = 4 , c = 6 . NI = Jumlah kerja sama tingkat internasional. NN = Jumlah kerja sama tingkat nasional. NW = Jumlah kerja sama tingkat wilayah/lokal. A=NI/a; B=NN/b; C=NW/c. Jika NI ≥ a dan NN < b, maka NI = a Jika NI < a dan NN ≥ b, maka NN = b Jika NW ≥ c , maka NW = c
- Skor 3: Skor = RK Jika 0 < NI ≤ a atau 0 < NN ≤ b atau 0 < NW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 9 ↔ Sarjana 9 (beda: perlu rumus jenjang)

- Indikator (hlm. 8): Biaya operasional pendidikan (BOP). Tabel 2.b. LKPS.
- Skor 4: Jika BOP ≥ 20.000.000, maka Skor = 4. BOP = Rerata dana operasional pendidikan/mahasiswa/ tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika BOP < 20.000.000 , maka Skor = BOP / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 10 ↔ Sarjana 10 (beda: perlu rumus jenjang)

- Indikator (hlm. 8): Dana Penelitian DTPS (DPD). Tabel 2.b. LKPS.
- Skor 4: Jika DPD ≥ 10.000.000, maka Skor = 4. DPD = Rerata dana penelitian DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika DPD < 10.000.000 , maka Skor = (2 x DPD) / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 11 ↔ Sarjana 11 (beda: perlu rumus jenjang)

- Indikator (hlm. 8): Dana PkM (DPkMD). Tabel 2.b. LKPS.
- Skor 4: Jika DPkMD ≥ 5.000.000, maka Skor = 4. DPkMD = Rerata dana PkM DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: Jika DPkMD < 5.000.000 , maka Skor = (4 x DPkMD) / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 18 ↔ Sarjana 18 (beda: perlu rumus jenjang)

- Indikator (hlm. 14): Pembelajaran yang dilaksanakan dalam bentuk penugasan, praktikum, praktik bengkel, atau praktik lapangan. Tabel 3.a.1. LKPS.
- Skor 4: Jika > 70%, maka Skor = 4 JP = Jam pembelajaran praktikum, praktik studio, praktik bengkel, atau praktik lapangan JB = Jam pembelajaran total selama masa pendidikan. PJP = (JP / JB) x 100%
- Skor 3: Jika PJP < 70%, maka Skor = 1 + ((30 x PJP)/7)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor di bawah 1

### Butir 22 ↔ Sarjana 25 (beda: perlu rumus jenjang)

- Indikator (hlm. 16): PkM DTPS yang sesuai dengan peta jalan PkM dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.c LKPS. Tabel 6.i. LKPS.
- Skor 4: Jika PKDMhs ≥ 25%, maka Skor = 4 NPKMhs = Jumlah judul PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPKD = Jumlah judul PkM DTPS dalam 3 tahun terakhir. PKDMhs = (NPKMhs / NPKD) x 100%
- Skor 3: Jika PKDMhs < 25% , maka Skor = 2 + (8 x PKDMhs)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 23 ↔ Sarjana 26 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Kecukupan Jumlah DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika NDTPS ≥ 6 dan PDTT ≤ 10% , Maka Skor = 4 NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. NDTT = Jumlah dosen tidak tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. NDT = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. PDTT = (NDTT / (NDT + NDTT)) x 100% A= ((NDTPS – 3)/3). B = (40%-PDTT)/40%, Jika PDTT ≤ 40%. B = (40%-PDTT)/30%, Jika 10% < PDTT ≤ 40%.
- Skor 3: Jika 3 ≤ NDTPS < 6 dan PDTT ≤ 40% , maka Skor = 2 + 2 (A x B) jika NDTPS ≥ 6 dan 10% < PDTT ≤ 40% , Maka Skor = 2 + (2 x B)
- Skor 2: (kosong di teks PDF)
- Skor 1: Jika NDTPS ≥ 3 dan PDTT > 40%, Maka skor = 1
- Skor 0: Tidak ada skor dibawah 1.

### Butir 24 ↔ Sarjana 27 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Kualifikasi akademik DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika NDS3 ≥ 1, maka Skor = 4 NDS3 = Jumlah DTPS yang berpendidikan tertinggi Doktor/Doktor Terapan.
- Skor 3: Tidak ada skor sama dengan 3.
- Skor 2: Jika NDS3 < 1 DTPS , maka Skor = 2.
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 25 ↔ Sarjana 28 (beda: perlu rumus jenjang)

- Indikator (hlm. 17, 18): Jabatan akademik DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PGBLKL ≥ 30% , maka Skor = 4 NDGB = Jumlah DTPS yang memiliki jabatan akademik Guru Besar. NDLK = Jumlah DTPS yang memiliki jabatan akademik Lektor Kepala. NDL = Jumlah DTPS yang memiliki jabatan akademik Lektor. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata ku liah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PGBLKL = ((NDGB + NDLK + NDL) / NDTPS) x 100%.
- Skor 3: Jika PGBLKL < 30% , maka Skor = 2 + ((20 x PGBLKL) /3)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 29 ↔ Sarjana 30 (beda: perlu rumus jenjang)

- Indikator (hlm. 19): Rerata Beban Kerja (RBK) DTPS. Tabel 4.c. LKPS.
- Skor 4: Jika RBK = 12 - 16 SKS, maka Skor = 4
- Skor 3: Jika RBK = 16 - 20 SKS, maka skor = (64 - (3 x RBK)) / 4
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 30 ↔ Sarjana 31 (beda: perlu rumus jenjang)

- Indikator (hlm. 19, 20): Kegiatan penelitian DTPS yang mendukung visi UPPS dan visi keilmuan program studi dalam 3 tahun terakhir. Tabel 3.b. LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,05 , b = 0,3 , c = 1. RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RW = NW / 3 / NDTPS. NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A=RI/a; B=RN/b; C=RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 31 ↔ Sarjana 32 (beda: perlu rumus jenjang)

- Indikator (hlm. 20, 21): Kegiatan PkM DTPS yang mendukung visi UPPS dan visi keilmuan program studi dalam 3 tahun terakhir. Tabel 3.c. LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4. Faktor: a = 0,05 , b = 0,3 , c = 1. RI = NI / 3 / NDTPS , RN = NN / 3 / NDTPS , RW = NW / 3 / NDTPS NI = Jumlah PkM dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah PkM dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah PkM dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A=RI/a; B=RN/b; C=RW/c Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 32 ↔ Sarjana 33 (beda: perlu rumus jenjang)

- Indikator (hlm. 21, 22): Pagelaran/pameran/pres entasi/publikasi ilmiah dengan tema yang mendukung visi keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.a. LK
- Skor 4: Jika RI > a dan RN > b maka Skor = 4 RW = (NA1 + NB1 + NC1) / NDTPS , RN = (NA2 + NA3 + NB2 + NC2) / NDTPS , RW = (NA4 + NB3 + NC3) / NDTPS. Faktor: a = 0,05,b = 0,5 , c = 1 NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi di jurnal nasional terakreditasi. NA3 = Jumlah publikasi di jurnal internasional. NA4 = Jumlah publikasi di jurnal internasional bereputasi. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional. NC1 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat wilayah. NC2 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat nasional. NC3 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat internasional.NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A=RI/a; B=RN/b; C=RW/c Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 33 ↔ Sarjana 34 (beda: perlu rumus jenjang)

- Indikator (hlm. 22, 23): Luaran penelitian dan PkM yang mendukung visi UPPS dan visi keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.a. LKPS. Tabel 4.f. LKPS
- Skor 4: Jika RLP ≥ 1 , maka Skor 4 . RLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI)) / NDTPS NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan). NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika RLP < 1 , maka Skor = 2 + (2 x RLP)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 35 ↔ Sarjana 37 (beda: perlu rumus jenjang)

- Indikator (hlm. 23, 24): Persentase DTPS yang memiliki pengakuan/rekognisi sesuai bidang ilmu. Tabel 4.a. LKPS Tabel 4.j. LKPS. Pengakuan/rekognisi atas kepakaran/prestasi/kinerja DTPS
- Skor 4: Jika PRDTPS ≥ 0,25 , maka Skor = 4 . visiting lecturer keynote speaker
- Skor 3: Jika PRDTPS < 0,25 , maka Skor = 2 + (8 x PRDTPS) / visiting scholar di program studi/perguruan tinggi terakreditasi A/Unggul atau / invited speaker
- Skor 2: pada pertemuan ilmiah tingkat nasional/ internasional.
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 38 ↔ Sarjana 40 (beda: perlu rumus jenjang)

- Indikator (hlm. 26): Rasio jumlah mahasiswa program studi terhadap jumlah DTPS. Tabel 4.a. LKPS. Tabel 6.a. LKPS.
- Skor 4: Jika 10 ≤ RMD ≤ 20, maka Skor = 4
- Skor 3: Jika RMD < 10 , maka Skor = (2 x RMD) / 5 Jika 20 < RMD < 30 , maka Skor = (60 - (2 x RMD)) / 5
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika RMD ≥ 30 , maka Skor = 0

### Butir 39 ↔ Sarjana 42 (beda: perlu rumus jenjang)

- Indikator (hlm. 26): IPK lulusan. RIPK = Rerata IPK lulusan dalam 3 tahun terakhir. Tabel 6.b. LKPS.
- Skor 4: Jika RIPK ≥ 3,25, maka Skor = 4
- Skor 3: Jika 2,00 ≤ RIPK < 3,25, maka Skor = ((8 x RIPK) - 6) / 5.
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 40 ↔ Sarjana 43-I, 43-II (beda: perlu rumus jenjang)

- Indikator (hlm. 27, 28): I. Prestasi mahasiswa di bidang akademik dalam 5 tahun terakhir. Tabel 6.a LKPS. Tabel 6.c.1. LKPS. II. Prestasi mahasiswa di bidang non akademik dalam 5 tahun
- Skor 4: Jika RI > a dan RN > b maka Skor = 4 Faktor: a = 0,05% , b = 1% , c = 2%. RI = NI / NM , RN = NN / NM , RW = NW / NM NI = Jumlah prestasi akademik internasional. NN = Jumlah prestasi akademik nasional. NW = Jumlah prestasi akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS. A=RI/a; B=RN/b; C=RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c. Jika RI > a dan RN > b, maka Skor = 4. Faktor: a = 0,1% , b = 2% , c = 4%. RI = NI / NM , RN = NN / NM , RW = NW / NM. NI = Jumlah prestasi non akademik internasional. NN = Jumlah prestasi non akademik nasional. NW = Jumlah prestasi non akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS. A=RI/a; B=RN/b; C=RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2)) Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 41 ↔ Sarjana 46 (beda: perlu rumus jenjang)

- Indikator (hlm. 28): Produk/jasa karya mahasiswa, yang dihasilkan secara mandiri atau bersama DTPS, yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir. Tabel 6.e.4. LKPS.
- Skor 4: Jika NAPJ ≥ 2 , maka Skor = 4. NAPJ = Jumlah produk/jasa karya mahasiswa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir
- Skor 3: Jika NAPJ < 2, maka skor = 2 + NAPJ.
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 42 ↔ Sarjana 44 (beda: perlu rumus jenjang)

- Indikator (hlm. 28): Masa studi. MS = Rerata masa studi lulusan (tahun). Tabel 6.d. LKPS.
- Skor 4: Jika 2,0 < MS ≤ 2,5 , maka Skor = 4
- Skor 3: Jika 2,5 < MS ≤ 4 , maka Skor = 9 - (2 x MS).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika MS ≤ 1,5 maka Skor = 0

### Butir 43 ↔ Sarjana 45 (beda: perlu rumus jenjang)

- Indikator (hlm. 29): 
- Skor 4: Jika PTW ≥ 80%, maka skor = 4.
- Skor 3: Jika PTW < 80% , maka Skor = 1 + ((30 x PTW) / 8)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1

### Butir 45 ↔ Sarjana 49 (beda: perlu rumus jenjang)

- Indikator (hlm. 30): Waktu tunggu. WT = waktu tunggu lulusan untuk mendapatkan pekerjaan atau berkarya pertama dalam 2 tahun, mulai TS-2 s.d. TS-1. Tabel 6.f.1. LKPS.
- Skor 4: Jika WT < 3 bulan, maka Skor = 4. Persentase responden lulusan minimal 30%
- Skor 3: Jika 3 ≤ WT ≤ 6, maka Skor = (24 – (4 x WT)) / 3.
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: WT > 6 bulan, maka Skor = 0

### Butir 46 ↔ Sarjana 50 (beda: perlu rumus jenjang)

- Indikator (hlm. 30): Kesesuaian bidang kerja. KBK = Kesesuaian bidang kerja lulusan saat mendapatkan pekerjaan pertama dalam 2 tahun, mulai TS-2 s.d. TS-1. Tabel 6.f.2. LKPS.
- Skor 4: Jika KBK ≥ 80% , maka Skor = 4 Persentase responden lulusan minimal 30%
- Skor 3: Jika KBK < 80%, maka Skor = 5 x KBK.
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 47 ↔ Sarjana 51 (beda: perlu rumus jenjang)

- Indikator (hlm. 30, 31): Tingkat dan ukuran tempat kerja lulusan di tingkat internasional, nasional, dan wilayah/lokal. Tabel 6.g.1. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4. Faktor: a = 2% , b = 20% , c = 90%. RI = (NI / NL) x 100% , RN = (NN / NL) x 100% , RW = (NW / NL) x 100%. NI = Jumlah lulusan yang bekerja di badan usaha tingkat multi nasional/internasional. NN = Jumlah lulusan yang bekerja di badan usaha tingkat nasional atau berwirausaha yang berizin. NW = Jumlah lulusan yang bekerja di badan usaha tingkat wilayah/lokal atau berwirausaha tidak berizin. NL = Jumlah lulusan. A=RI/a; B=RN/b; C=RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c. Persentase responden lulusan minimal 30%
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c; maka skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 48 ↔ Sarjana 52 (beda: perlu rumus jenjang)

- Indikator (hlm. 31): Tingkat kepuasan pengguna lulusan. Tabel 6.g.2. LKPS.
- Skor 4: Skor = ƩTKi / 7 Tingkat kepuasan aspek ke-i dihitung dengan rumus sebagai berikut: TKi = (4 x ai) + (3 x bi) + (2 x ci) + di i = 1, 2, ..., 7 ai = persentase “sangat baik”. bi = persentase “baik”. ci = persentase “cukup”. di = persentase “kurang”.
- Skor 3: (kosong di teks PDF)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

## Butir berangka tanpa padanan Sarjana (cek: datanya ada di LKPS atau tetap manual dengan alasan)

### Butir 17

- Indikator (hlm. 13): Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar minimal 10% dari mata kuliah inti Program Studi. Tabel 3.a.3. LKPS
- Skor 4: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi; (3) Mengandung kebaruan ilmiah; dan (4) Mengandung dampak sosial yang positif.
- Skor 3: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi; (3) Mengandung kebaruan ilmiah.
- Skor 2: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi.
- Skor 1: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar yang hanya menyesuaikan relevansi dengan CPL.
- Skor 0: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) kurang dari 10% yang dijadikan sebagai bahan ajar.

### Butir 26

- Indikator (hlm. 18): Sertifikasi kompetensi/profesi/indus tri DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PDSK ≥ 50% , maka Skor = 4 NDSK = Jumlah DTPS yang memiliki sertifikat kompetensi/profesi/industri. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PDSK = (NDSK / NDTPS) x 100%
- Skor 3: Jika PDSK < 50% , maka Skor = 1 + (6 x PDSK)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1

### Butir 27

- Indikator (hlm. 18): Keterlibatan dosen industri/praktisi. Tabel 3.a.1 LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika PMKI ≥ 30% , maka Skor = 4 MKKI = Jumlah mata kuliah kompetensi yang diampu oleh dosen industri/praktisi. MKK = Jumlah mata kuliah kompetensi. PMKI = (MKKI / MKK) x 100%
- Skor 3: Jika PMKI < 30% , maka Skor = 2 + ((20 x PMKI)/3)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 28

- Indikator (hlm. 19): Kualifikasi dan kecukupan laboran/teknisi/administr ator sistem untuk mendukung proses pembelajaran sesuai dengan kebutuhan program studi. Tabel 4.b. LKPS.
- Skor 4: UPPS memiliki jumlah laboran/teknisi/admin istrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan > 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 3: UPPS memiliki jumlah laboran/teknisi/admi nistrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 40% - 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 2: UPPS memiliki jumlah laboran/teknisi/admi nistrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 10% - 39% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 1: UPPS memiliki jumlah laboran/teknsi/admi nistrator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi.
- Skor 0: UPPS tidak memiliki laboran/teknisi/admi nistrator sistem/dll.

### Butir 34

- Indikator (hlm. 23): Produk/jasa yang diadopsi oleh industri/masyarakat terhadap jumlah dosen tetap dalam 3 tahun terakhir. Tabel 4.a. LKPS. Tabel 4.g. LKPS.
- Skor 4: Jika RS ≥ 1 , maka Skor = 4 RS = NAPJ / NDTPS NAPJ = Jumlah produk/jasa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika RS < 1 , maka Skor = 2 + (2 x RS)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: Tidak ada skor kurang dari 1.

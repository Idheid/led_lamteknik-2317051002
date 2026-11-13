# Rumus butir angka Doktor (R1, inventaris)

Sumber: `Matrik Penilaian LED dan LKPS Doktor APS Akademik dan Vokasi Teknik 2025 Pasca Akreditasi Minimum dan Unggul.pdf` (folder Instrumen_Akreditasi_LAM_Teknik_2025, 01_Pasca Terakreditasi Pertama dan Unggul).
Dibuat dengan `scripts/bandingkan-matriks.ts` (Rencana 10 Nov T10 R1): baris matriks disusun dari posisi teks PDF
(`susunMatriks`, tanpa AI), dicocokkan ke butir Sarjana dengan indikator paling mirip, lalu deskriptor skor 4–0
dibandingkan. Deskriptor di bawah disalin dari teks PDF; sel yang kosong atau terpotong harus dicek ke PDF.
Padanan dengan kemiripan < 0,6 perlu dicek manual.

## Ringkasan

| Butir | Padanan Sarjana | Kemiripan | Tabel LKPS | Hlm. | Deskriptor 4·3·2·1·0 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 6-I, 6-II | 1.00 | 2.a | 5, 6 | ≠==== | beda: perlu rumus jenjang |
| 9 | 9 | 1.00 | 2.b | 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 10 | 10 | 1.00 | 2.b | 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 11 | 11 | 1.00 | 2.b | 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 21 | 23 | 1.00 | 3.b, 6.h | 14, 15 | ≠≠=== | beda: perlu rumus jenjang |
| 22 | 23 | 0.48 | 3.b, 6.h.2 | 15 | ≠≠≠== | beda: perlu rumus jenjang |
| 24 | 25 | 1.00 | 3.c, 6.i | 16 | ≠==== | beda: perlu rumus jenjang |
| 25 | 26 | 1.00 | 4.a | 17 | ≠≠≠≠≠ | beda: perlu rumus jenjang |
| 26 | 28 | 1.00 | 4.a | 17 | ≠≠=== | beda: perlu rumus jenjang |
| 28 | 30 | 1.00 | 4.c | 18 | ≠≠≠== | beda: perlu rumus jenjang |
| 29 | 31 | 1.00 | 3.b, 4.a | 18 | ≠≠≠== | beda: perlu rumus jenjang |
| 30 | 32 | 1.00 | 3.c, 4.a | 18, 19 | ≠≠≠== | beda: perlu rumus jenjang |
| 31 | 33 | 0.89 | 4.a, 4.d | 19 | ≠≠≠== | beda: perlu rumus jenjang |
| 32 | 34 | 0.45 | 4.a | 19, 20 | ≠≠=== | beda: perlu rumus jenjang |
| 33 | 36 | 0.65 | - | 20 | ≠≠≠≠≠ | beda: perlu rumus jenjang |
| 34 | 36 | 0.92 | - | 20 | ≠≠=== | beda: perlu rumus jenjang |
| 35 | 37 | 0.47 | - | 20, 21 | ≠≠≠== | beda: perlu rumus jenjang |
| 38 | 41 | 1.00 | 6.a | 22 | ≠≠=== | beda: perlu rumus jenjang |
| 39 | 42 | 1.00 | 6.b | 23 | ≠≠=== | beda: perlu rumus jenjang |
| 40 | 43-I, 43-II | 0.69 | 6.a, 6.c.1 | 23 | ≠≠≠== | beda: perlu rumus jenjang |
| 41 | 44 | 1.00 | 6.d | 23 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 42 | 45 | 1.00 | 6.d | 24 | ≠≠==≠ | beda: perlu rumus jenjang |
| 43 | 46 | 1.00 | - | 24 | ≠≠=== | beda: perlu rumus jenjang |
| 44 | 47 | 0.72 | - | 24, 25 | ≠≠=== | beda: perlu rumus jenjang |

Butir berangka tanpa padanan Sarjana: 15.
Butir angka Sarjana tanpa padanan di jenjang ini: 18, 19, 27, 35, 40, 49, 50, 51, 52.

## Deskriptor butir berpadanan

### Butir 6 ↔ Sarjana 6-I, 6-II (beda: perlu rumus jenjang)

- Indikator (hlm. 5, 6): I. Relevansi kerja sama pendidikan, penelitian, dan PkM dengan visi UPPS serta visi keilmuan program studi. Tabel 2.a. LKPS. II. Kerja sama tingkat internasiona
- Skor 4: Jika RK ≥ 4, maka skor 4 RK = ( N1 + N2 + N3) / NDTPS. N1 = Jumlah kerja sama pendidikan. N2 = Jumlah kerja sama penelitian. N3 = Jumlah kerja sama PkM. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. Jika NI > a dan NN > b, Maka Skor = 4 Faktor: a = 3 , b = 8 , c = 10. NI = Jumlah kerja sama tingkat internasionall. NN = Jumlah kerja sama tingkat nasional. NW = Jumlah kerja sama tingkat wilayah/lokal. A = NI/a; B = NN/b; C=NW/c. Jika NI ≥ a dan NN < b, maka NI = a. Jika NI < a dan NN ≥ b, maka NN = b. Jika NW ≥ c , m aka NW = c.
- Skor 3: Jika 0 < NI ≤ a atau 0 < NN ≤ b atau 0 < NW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: Skor = RK
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 9 ↔ Sarjana 9 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Biaya operasional pendidikan (BOP). Tabel 2.b. LKPS.
- Skor 4: Jika BOP ≥ 40.000.000, maka Skor 4 BOP = Rata-rata dana operasional pendidikan/mahasiswa/ tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: maka Skor = BOP / 10.000.000
- Skor 2: Jika BOP < 40.000.000 ,
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 10 ↔ Sarjana 10 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Dana Penelitian DTPS (DPD). Tabel 2.b. LKPS.
- Skor 4: Jika DPD ≥ 30.000.000 , maka skor 4 DPD = Rata-rata dana penelitian DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: maka Skor = (2 x DPD) / 15.000.000
- Skor 2: Jika DPD < 30.000.000 ,
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 11 ↔ Sarjana 11 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Dana PkM (DPkMD). Tabel 2.b. LKPS.
- Skor 4: Jika DPkMD ≥ 5.000.000, maka Skor 4 DPkMD = Rata-rata dana PkM DTPS / tahun dalam 3 tahun terakhir (dalam rupiah penuh).
- Skor 3: maka Skor = (4 x DPkMD) / 5.000.000
- Skor 2: Jika DPkMD < 5.000.000,
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 21 ↔ Sarjana 23 (beda: perlu rumus jenjang)

- Indikator (hlm. 14, 15): Penelitian DTPS yang sesuai dengan peta jalan penelitian dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.b LKPS. Tabel 6.h
- Skor 4: Jika PPDMhs ≥ 100%, maka Skor = 4 NPMhs = Jumlah judul penelitian DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPD = Jumlah judul penelitian DTPS dalam 3 tahun terakhir. PPDMhs = (NPMhs / NPD) x 100%.
- Skor 3: Jika PPDMhs < 100%, maka Skor = 1 + (3 x PPDMhs)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 22 ↔ Sarjana 23 (beda: perlu rumus jenjang)

- Indikator (hlm. 15): Penelitian DTPS yang menjadi rujukan tema tesis/disertasi mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.b LKPS. Tabel 6.h.2. LKPS.
- Skor 4: Jika PPTM ≥ 50%, maka Skor = 4. NTM = Jumlah judul penelitian DTPS yang menjadi rujukan tema tesis/disertasi mahasiswa program studi dalam 3 tahun terakhir. NPD = Jumlah judul penelitian DTPS dalam 3 tahun terakhir. dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PPTM = (NTM / NPD) x 100%.
- Skor 3: maka Skor = 1 + (6 x PPTM).
- Skor 2: Jika PPTM < 50%,
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor kurang dari 1.

### Butir 24 ↔ Sarjana 25 (beda: perlu rumus jenjang)

- Indikator (hlm. 16): PkM DTPS yang sesuai dengan peta jalan PkM dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. Tabel 3.c LKPS. Tabel 6.i. LKPS.
- Skor 4: Jika PKDMhs ≥ 50%, maka Skor = 4 NPKMhs = Jumlah judul PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPKD = Jumlah judul PkM DTPS dalam 3 tahun terakhir. PKDMhs = (NPKMhs / NPKD) x 100%
- Skor 3: Jika PKDMhs < 50%, maka Skor = 1 + (6 x PKDMhs)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 25 ↔ Sarjana 26 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Kecukupan Jumlah DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika NDTPS ≥ 8 dan PDTT ≤ 10% , Maka Skor = 4 NDGB = Jumlah DTPS yang memiliki jabatan akademik Guru Besar. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PGB = (NDGB / NDTPS) x 100%. A = ((NDTPS-3)/5). B = (PGB-40%)/10%.
- Skor 3: Jika 40 % ≤ PGB < 50% dan 5 < NDTPS < 8, maka Skor = 2 + 2 (AxB) Jika NDTPS > 8 dan 40% < PGB < 50%, maka Skor = 2 + (2xB)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor antara 0 dan 2
- Skor 0: Jika NDGB < 2 , maka Skor = 0

### Butir 26 ↔ Sarjana 28 (beda: perlu rumus jenjang)

- Indikator (hlm. 17): Jabatan akademik DTPS. Tabel 4.a. LKPS.
- Skor 4: Jika PGB ≥ 50% dan NDTPS ≥ 8, maka Skor = 4 NDGB = Jumlah DTPS yang memiliki jabatan akademik Guru Besar. NDLK = Jumlah DTPS yang memiliki jabatan akademik Lektor Kepala. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. PGBLK = ((NDGB + NDLK) / NDTPS) x 100%.
- Skor 3: Jika PGBLK < 70% , maka Skor = 2 + ((20 x PGBLK) /7)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 28 ↔ Sarjana 30 (beda: perlu rumus jenjang)

- Indikator (hlm. 18): Rerata Beban Kerja (RBK) DTPS. Tabel 4.c. LKPS.
- Skor 4: Jika RBK = 12 - 16 SKS, maka Skor 4
- Skor 3: maka skor = (64-(3 x RBK))/4
- Skor 2: Jika RBK = 16 - 20 SKS,
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 29 ↔ Sarjana 31 (beda: perlu rumus jenjang)

- Indikator (hlm. 18): Kegiatan penelitian DTPS yang mendukung visi UPPS dan visi keilmuan program studi dalam 3 tahun terakhir. Tabel 3.b. LKPS. Tabel 4.a LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,1 , b = 1 , c = 2 RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RW = NW / 3 / NDTPS. NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 30 ↔ Sarjana 32 (beda: perlu rumus jenjang)

- Indikator (hlm. 18, 19): Kegiatan PkM DTPS yang mendukung visi UPPS dan visi keilmuan program studi dalam 3 tahun terakhir. Tabel 3.c. LKPS. Tabel 4.a LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,1 , b = 1 , c = 2. RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RW = NW / 3 / NDTPS . NI = Jumlah PkM dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah PkM dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NW = Jumlah PkM dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 31 ↔ Sarjana 33 (beda: perlu rumus jenjang)

- Indikator (hlm. 19): Publikasi ilmiah dengan tema yang mendukung visi UPPS dan visi keilmuan yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.a LKPS. Tabel 4.d. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,5 ,b = 6 , c = 4. RI = (NA4 + NB3) / NDTPS, RN = (NA2 + NA3 + NB2) / NDTPS , RW = (NA1 + NB1) / NDTPS NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi di jurnal nasional terakreditasi. NA3 = Jumlah publikasi di jurnal internasional. NA4 = Jumlah publikasi di jurnal internasional bereputasi. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. A = RI/a. B = RN/b. C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 32 ↔ Sarjana 34 (beda: perlu rumus jenjang)

- Indikator (hlm. 19, 20): Luaran penelitian dan PkM yang mendukung visi UPPS dan visi keilmuan program studi yang dihasilkan DTPS dalam 3 tahun terakhir. Tabel 4.a LKPS. NHKI = Jumlah lu
- Skor 4: Jika RLP ≥ 3 , maka Skor 4 . RLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI)) / NDTPS. NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter.
- Skor 3: Jika RLP < 3 maka Skor = 2 + ((2 x RLP) / 3)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 33 ↔ Sarjana 36 (beda: perlu rumus jenjang)

- Indikator (hlm. 20): Kinerja DTPS (KDTPS) Jika PKDTPS ≥ 50%, dalam mendukung maka skor = 4 . keunggulan kompetitif PKDTPS = (NKDTPS / NDTPS) x 100% UPPS dan Program Studi. PKDTPS =
- Skor 4: (kosong di teks PDF)
- Skor 3: (kosong di teks PDF)
- Skor 2: Jika PKDTPS < 50%, maka Skor = 1 + (6 x PKDTPS)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 34 ↔ Sarjana 36 (beda: perlu rumus jenjang)

- Indikator (hlm. 20): Persentase Karya ilmiah Jika PKIB ≥ 50%, Bereputasi (PKIB) DTPS maka Skor = 4 . pada jurnal bereputasi atau publikasi dalam prosiding internasional ber-ISSN/ISB
- Skor 4: (kosong di teks PDF)
- Skor 3: Jika PKIB < 50%, maka Skor = 2 + (4 x PKIB).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 35 ↔ Sarjana 37 (beda: perlu rumus jenjang)

- Indikator (hlm. 20, 21): Rasio DTPS yang Jika PRDTPS = 1 , memiliki maka Skor = 4 pengakuan/rekognisi sesuai bidang ilmu dalam 3 tahun terakhir . Pengakuan/rekognisi atas kepakaran/pres
- Skor 4: . visiting lecturer keynote speaker sesuai dengan bidang program studi. d) Menjadi staf ahli/narasumber di lembaga tingkat wilayah/nasional/internasional pada bidang yang sesuai dengan bidang program studi. e) Mendapat penghargaan atas prestasi dan kinerja di tingkat wilayah/nasional/internasional. PRDTPS = NRDTPS / NDTPS. NRDTPS = Jumlah DTPS yang memiliki pengakuan atas prestasi/kinerja yang relevan dengan bidang keahlian dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.
- Skor 3: Jika PRDTPS < 1 , maka Skor = 2 + (2 x PRDTPS). atau visiting scholar / invited speaker pada pertemuan ilmiah tingkat nasional/ internasional.
- Skor 2: di program studi/perguruan tinggi terakreditasi A/Unggul atau program
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 38 ↔ Sarjana 41 (beda: perlu rumus jenjang)

- Indikator (hlm. 22): Persentase Mahasiswa Asing (PMA). Tabel 6.a. LKPS.
- Skor 4: Jika PMA ≥ 1%, maka B = 4
- Skor 3: Jika PMA < 1% , maka B = 2 + (200 x PMA)
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 39 ↔ Sarjana 42 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): IPK lulusan. RIPK = Rata-rata IPK lulusan dalam 3 tahun terakhir. Tabel 6.b. LKPS.
- Skor 4: Jika RIPK ≥ 3,50, maka Skor = 4
- Skor 3: Jika 3,00 ≤ RIPK < 3,50, maka Skor = (4 x RIPK) - 10
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 40 ↔ Sarjana 43-I, 43-II (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Prestasi mahasiswa di bidang akademik dalam 3 tahun terakhir. Tabel 6.a LKPS. Tabel 6.c.1. LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,2% , b = 2% , c = 4% RI = NI / NM, RN = NN / NM, RW = NW / NM. NI = Jumlah prestasi akademik internasional. NN = Jumlah prestasi akademik nasional. NW = Jumlah prestasi akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS. A = RI/a. B = RN/b. C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c, maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 41 ↔ Sarjana 44 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Masa studi. MS = Rata-rata masa studi lulusan (tahun). Tabel 6.d. LKPS.
- Skor 4: Jika 2,5 < MS ≤ 3,5 , maka Skor = 4.
- Skor 3: maka Skor = 1 + ((36 - (6 x MS)) / 5)
- Skor 2: Jika 3,5 < MS ≤ 6,
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika MS ≤ 2,5 , maka Skor = 0

### Butir 42 ↔ Sarjana 45 (beda: perlu rumus jenjang)

- Indikator (hlm. 24): Persentase kelulusan tepat waktu (PTW) Rumus perhitungan: PTW = ((b/a) x 100%) Tabel 6.d. LKPS.
- Skor 4: PTW ≥ 60%
- Skor 3: Jika 10% ≤ PTW < 60%, maka Skor = 1 + (((30 x PTW) - 3) / 5)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada Skor kurang dari 1.

### Butir 43 ↔ Sarjana 46 (beda: perlu rumus jenjang)

- Indikator (hlm. 24): Publikasi ilmiah mahasiswa, yang dihasilkan secara mandiri atau bersama DTPS, dengan judul yang relevan dengan bidang program studi dalam 3 tahun terakhir. Tabe
- Skor 4: Jika RI > a dan RN > b maka Skor = 4 Faktor: a = 0,25 ,b = 0,3 , c = 0,9. RI = (NA4 + NB3) / NM. RN = (NA2 + NA3 + NB2) / NM. RW = (NA1 + NB1) / NM. NA1 = Jumlah publikasi mahasiswa di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi mahasiswa di jurnal nasional terakreditasi. NA3 = Jumlah publikasi mahasiswa di jurnal internasional. NA4 = Jumlah publikasi mahasiswa di jurnal internasional bereputasi. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional. NM = Jumlah mahasiswa pada saat TS. A = RI/a. B = RN/b. C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a. Jika RI < a dan RN ≥ b, maka RN = b. Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a, atau 0 < RN ≤ b, atau 0 < RL ≤ c Skor = 3.75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 44 ↔ Sarjana 47 (beda: perlu rumus jenjang)

- Indikator (hlm. 24, 25): Luaran penelitian dan PkM yang dihasilkan
- Skor 4: Jika NLP ≥ 3 , maka Skor 4 . NLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI) / NM. NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan). NM = Jumlah mahasiswa pada saat TS.
- Skor 3: Jika NLP < 3 , maka Skor = 2 + ((2 x NLP)/3).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

## Butir berangka tanpa padanan Sarjana (cek: datanya ada di LKPS atau tetap manual dengan alasan)

### Butir 15

- Indikator (hlm. 9, 10): I. Metode rekrutmen dan sistem seleksi. II. Kriteria penerimaan mahasiswa. III. Proses seleksi.
- Skor 4: UPPS memiliki dokumen tentang sistem penerimaan mahasiswa baru yang lengkap, mencakup: kebijakan seleksi, kriteria seleksi, sistem pengambilan keputusan, dan prosedur penerimaan, yang dilaksanakan secara konsisten. Persyaratan penerimaan mahasiswa sangat tinggi, ditunjukkan oleh syarat: IPK ≥ 3,50 , TPA ≥ 475 (skala 1 - 700) , dan TOEFL ≥ 475 (skala 1 - 677) . Proses seleksi menggunakan ujian tertulis dan wawancara untuk mengetahui kemampuan intelektual dan motivasi calon mahasiswa.
- Skor 3: Tidak ada Skor antara 2 dan 4. Persyaratan penerimaan mahasiswa tinggi, ditunjukkan oleh syarat: 3,25 ≤ IPK < 3,50, 450 <TPA < 475 (skala 1 -700) , dan 450 < TOEFL < 475 (skala 1 - 677) . Tidak ada Skor antara 2 dan 4.
- Skor 2: UPPS memiliki dokumen tentang sistem penerimaan mahasiswa baru yang lengkap, mencakup: kebijakan seleksi, kriteria seleksi, sistem pengambilan keputusan, dan prosedur penerimaan. Persyaratan penerimaan mahasiswa ditunjukkan oleh syarat: 3,00 ≤ IPK < 3,25 , 425 < TPA < 450 (skala 1 -700) , dan 425 < TOEFL < 450 (skala 1- 677) . Proses seleksi menggunakan ujian tertulis atau wawancara untuk mengetahui kemampuan intelektual dan motivasi calon mahasiswa.
- Skor 1: UPPS memiliki dokumen tentang sistem penerimaan mahasiswa baru yang kurang lengkap. Persyaratan penerimaan mahasiswa ditunjukkan hanya oleh syarat IPK ≥ 3,00 . Proses seleksi tidak digunakan untuk mengetahui kemampuan intelektual dan motivasi calon mahasiswa.
- Skor 0: UPPS tidak memiliki dokumen tentang sistem penerimaan mahasiswa baru. Persyaratan penerimaan mahasiswa tidak jelas, yang memungkinkan penerimaan mahasiswa tanpa syarat. Tidak ada Skor kurang dari 1.

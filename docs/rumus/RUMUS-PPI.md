# Rumus butir angka Program Profesi Insinyur (R1, inventaris)

Sumber: `Matrik Penilaian LED dan LKPS Program Profesi Insinyur APS Akademik dan Vokasi Teknik 2025 Pasca Akreditasi Minimum dan Unggul.pdf` (folder Instrumen_Akreditasi_LAM_Teknik_2025, 01_Pasca Terakreditasi Pertama dan Unggul).
Dibuat dengan `scripts/bandingkan-matriks.ts` (Rencana 10 Nov T10 R1): baris matriks disusun dari posisi teks PDF
(`susunMatriks`, tanpa AI), dicocokkan ke butir Sarjana dengan indikator paling mirip, lalu deskriptor skor 4–0
dibandingkan. Deskriptor di bawah disalin dari teks PDF; sel yang kosong atau terpotong harus dicek ke PDF.
Padanan dengan kemiripan < 0,6 perlu dicek manual.

## Ringkasan

| Butir | Padanan Sarjana | Kemiripan | Tabel LKPS | Hlm. | Deskriptor 4·3·2·1·0 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 6-I, 6-II | 0.70 | - | 5, 6 | ≠≠≠== | beda: perlu rumus jenjang |
| 9 | 9 | 0.50 | 2.b | 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 10 | 10 | 0.71 | 2.b | 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 11 | 11 | 0.57 | 2.b | 7 | ≠≠≠== | beda: perlu rumus jenjang |
| 18 | 18 | 1.00 | 3.a.2 | 12, 13 | ≠≠≠== | beda: perlu rumus jenjang |
| 21 | 23 | 0.53 | - | 14 | ≠≠=≠≠ | beda: perlu rumus jenjang |
| 23 | 25 | 0.71 | - | 14, 15 | ≠≠==≠ | beda: perlu rumus jenjang |
| 25 | 27 | 0.43 | 4.a | 15 | ≠≠=== | beda: perlu rumus jenjang |
| 27 | 30 | 1.00 | 4.c | 16 | =≠=== | beda: perlu rumus jenjang |
| 28 | 31 | 0.43 | 3.b, 4.a | 16, 17 | ≠≠=== | beda: perlu rumus jenjang |
| 29 | 32 | 0.36 | 3.c, 4.a | 17, 18 | ≠==== | beda: perlu rumus jenjang |
| 30 | 33 | 0.43 | 4.a, 4.d | 18, 19 | ≠==== | beda: perlu rumus jenjang |
| 31 | 34 | 0.52 | 4.a, 4.f | 19, 20 | ≠≠=== | beda: perlu rumus jenjang |
| 34 | 26 | 0.44 | 4.k | 21 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 37 | 40 | 1.00 | 6.d, 4.a | 23 | ≠≠≠== | beda: perlu rumus jenjang |
| 38 | 42 | 1.00 | 6.b | 23 | ≠≠=== | beda: perlu rumus jenjang |
| 39 | 44 | 0.50 | 6.d | 23 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 40 | 45 | 0.50 | 6.d | 23 | ≠≠==≠ | beda: perlu rumus jenjang |
| 43 | 49 | 0.71 | 6.f.1 | 24, 25 | ≠≠≠=≠ | beda: perlu rumus jenjang |
| 44 | 50 | 0.74 | - | 25 | ≠=≠== | beda: perlu rumus jenjang |
| 45 | 51 | 1.00 | 6.g.1 | 26 | ≠≠=== | beda: perlu rumus jenjang |
| 46 | 52 | 1.00 | 6.g.2 | 26 | ≠=≠== | beda: perlu rumus jenjang |

Butir berangka tanpa padanan Sarjana: 17, 24, 26, 32, 41.
Butir angka Sarjana tanpa padanan di jenjang ini: 19, 28, 35, 36, 37, 41, 43-I/43-II, 46, 47.

## Deskriptor butir berpadanan

### Butir 6 ↔ Sarjana 6-I, 6-II (beda: perlu rumus jenjang)

- Indikator (hlm. 5, 6): I. Relevansi kerja sama pendidikan keinsinyuran, penelitian dan PkM kolaboratif industri yang relevan dengan PSPPI yang dikelola oleh UPPS dalam 3 tahun terakhi
- Skor 4: Jika RK ≥ 4, maka skor 4. RK = ((3 x N1) + (2 x N2) + (1 x N3)) / NDTPS. N1 = Jumlah kerja sama pendidikan. N2 = Jumlah kerja sama penelitian. N3 = Jumlah kerja sama PkM. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. Jika NI > a dan NN > b, Maka Skor = 4. Faktor: a = 2 , b = 6 , c = 8. NI = Jumlah kerja sama keinsinyuran tingkat Internasional. NN = Jumlah kerja sama keinsinyuran tingkat nasional. NW = Jumlah kerja sama keinsinyuran tingkat wilayah/lokal. A = NI/2 ; B = NN/6 ; C = NW/8. Jika NI ≥ a dan NN < b, maka NI = a. Jika NI < a dan NN ≥ b, maka NN = b. Jika NW ≥ c , maka NW = c.
- Skor 3: Jika 0 < NI ≤ a atau 0 < NN ≤ b atau 0 < NW ≤ c. maka Skor II = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2)).
- Skor 2: Jika RK < 4, maka Skor = RK.
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 9 ↔ Sarjana 9 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Biaya operasional pendidikan. Tabel 2.b. LKPS.
- Skor 4: Jika DOP ≥ 20.000.000 maka Skor = 4 DOP = Rata-rata dana operasional pendidikan/mahasiswa/ tahun dalam 3 tahun terakhir (dalam juta rupiah).
- Skor 3: maka Skor = BOP / 5.000.000
- Skor 2: Jika BOP < 20.000.000 ,
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 10 ↔ Sarjana 10 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Dana penelitian keinsinyuran DTPS. Tabel 2.b. LKPS.
- Skor 4: Jika DPD ≥ 10.000.000 maka Skor = 4 DPD = Rata-rata dana penelitian keinsinyuran DTPSPPI/ tahun dalam 3 tahun terakhir (dalam juta rupiah).
- Skor 3: maka Skor = (2 x DPD) / 5.000.000
- Skor 2: Jika DPD < 10.000.000 ,
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 11 ↔ Sarjana 11 (beda: perlu rumus jenjang)

- Indikator (hlm. 7): Dana PkM keinsinyuran DTPS. Tabel 2.b. LKPS.
- Skor 4: Jika DPkMD ≥ 5.000.000 maka Skor 4 DPkMD = Rata-rata dana PkM DTPS / tahun dalam 3 tahun terakhir (dalam juta rupiah).
- Skor 3: Jika DPkMD < 5.000.000 , maka Skor = (4 x DPkMD) / 5.000.000
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 18 ↔ Sarjana 18 (beda: perlu rumus jenjang)

- Indikator (hlm. 12, 13): Pembelajaran yang dilaksanakan dalam bentuk penugasan, praktikum, praktik bengkel, atau praktik lapangan. Tabel 3.a.2. LKPS.
- Skor 4: Jika 70% ≤ PJP ≤ 80%, maka Skor = 4. JP = Jam pembelajaran praktik di industri JB = Jam pembelajaran total selama masa pendidikan. PJP = (JP / JB) x 100%
- Skor 3: Jika 80% < PJP ≤ 100%, maka Skor = 20 - (20 x PJP).
- Skor 2: Jika PJP < 70%, maka Skor = 0.
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 21 ↔ Sarjana 23 (beda: perlu rumus jenjang)

- Indikator (hlm. 14): Penelitian kolaboratif industri DTPSPPI yang sesuai dengan peta jalan Jika PPDMhs ≥ 10%, penelitian dan pelaksanaannya melibatkan mahasiswa program studi dalam
- Skor 4: maka Skor = 4
- Skor 3: Jika PPDMhs < 10% , maka Skor = 1 + (3 x PPDMhs).
- Skor 2: (kosong di teks PDF)
- Skor 1: NPD =
- Skor 0: Tidak ada skor kurang dari 1

### Butir 23 ↔ Sarjana 25 (beda: perlu rumus jenjang)

- Indikator (hlm. 14, 15): Jumlah PkM kolaboratif Jika PKDMhs ≥ 10%, industri DPSPPI yang sesuai dengan peta jalan PkM dan pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun
- Skor 4: maka Skor = 4 NPKMhs = Jumlah judul PkM kolaboratif industri DTPSPPI yang melibatkan mahasiswa PSPPI moda pembelajaran reguler dalam 3 tahun terakhir. NPKD = Jumlah judul PkM kolaboratif industri DTPSPPI dalam 3 tahun terakhir. PKDMhs = (NPKMhs / NPKD) x 100%
- Skor 3: Jika PKDMhs < 10% , maka Skor = 1 + (3 x PKDMhs).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1

### Butir 25 ↔ Sarjana 27 (beda: perlu rumus jenjang)

- Indikator (hlm. 15): Kualifikasi keinsinyuran DTPSPPI. Tabel 4.a. LKPS.
- Skor 4: Jika PDIPU ≥ 50%, maka Skor = 4. NDIPU = Jumlah DTPSPPI yang memiliki sertifikat insinyur profesional IPU dan surat tanda registrasi insinyur Indonesia yang masih berlaku NDTPSPPI = Jumlah dosen tetap yang ditugaskan sebagai pengampu PSPPI PDIPU = (NDIPU / NDTPSPPI) x 100%
- Skor 3: Jika PDIPU < 50%, maka Skor = 2 + (4 x PDIPU).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada Skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 27 ↔ Sarjana 30 (beda: perlu rumus jenjang)

- Indikator (hlm. 16): Rerata Beban Kerja (RBK) DTPS. Tabel 4.c. LKPS.
- Skor 4: Jika RBK = 12 - 16 SKS, maka Skor 4.
- Skor 3: Jika RBK = 16 - 20 SKS, maka skor = (64 - (3 x RBK)) / 4.
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 28 ↔ Sarjana 31 (beda: perlu rumus jenjang)

- Indikator (hlm. 16, 17): Kegiatan penelitian kolaboratif industri DTPSPPI yang relevan dengan PSPPI dalam 3 tahun terakhir. Tabel 3.b. LKPS. Tabel 4.a LKPS.
- Skor 4: Jika RI ≥ a dan RN ≥ b, maka Skor = 4. Faktor: a = 0,05 , b = 0,3 , c = 1. RI = NI / 3 / NDTPSPPI RN = NN / 3 / NDTPSPPI RW = NW / 3 / NDTPSPPI NI = Jumlah penelitian dengan sumber pembiayaan industri dari luar negeri dalam 3 tahun terakhir. NN = Jumlah penelitian dengan sumber pembiayaan industri dari dalam negeri dalam 3 tahun terakhir NW = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPSPPI = Jumlah dosen tetap PSPPI. A = RI/a; B = RN/b; C = RW/c Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c. maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2)).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 29 ↔ Sarjana 32 (beda: perlu rumus jenjang)

- Indikator (hlm. 17, 18): Kegiatan PkM kolaboratif industri DTPSPPI yang relevan dengan PSPPI dalam 3 tahun terakhir. Tabel 3.c. LKPS. Tabel 4.a LKPS.
- Skor 4: Jika RI > a dan RN > b, maka Skor = 4 Faktor: a = 0,05 , b = 0,3 , c = 1. RI = NI / 3 / NDTPSPPI. RN = NN / 3 / NDTPSPPI. RW = NW / 3 / NDTPSPPI. NI = Jumlah PkM dengan sumber pembiayaan industri dari luar negeri dalam 3 tahun terakhir. NN = Jumlah PkM dengan sumber pembiayaan industri dari dalam negeri dalam 3 tahun terakhir. NW = Jumlah PkM dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPSPPI = Jumlah dosen tetap PSPPI A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c. maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 30 ↔ Sarjana 33 (beda: perlu rumus jenjang)

- Indikator (hlm. 18, 19): Publikasi keinsinyuran dengan tema yang relevan dengan PSPPI yang dihasilkan DTPSPPI dalam 3 tahun terakhir. Tabel 4.a LKPS. Tabel 4.d. LKPS.
- Skor 4: Jika RI > a dan RN > b maka Skor = 4 Faktor: a = 0,5 ,b = 1 , c = 2 RI = (NA4 + NB3) / NDTPSPPI. RN = (NA2 + NA3 + NB2) / NDTPSPPI. RW = (NA1 + NB1) / NDTPSPPI. NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi di jurnal nasional terakreditasi / Majalah Profesi Nasional. NA3 = Jumlah publikasi di jurnal internasional. NA4 = Jumlah publikasi di jurnal internasional bereputasi / Majalah Profesi Internasional. NB1 = Jumlah publikasi di prosiding di seminar nasional/wilayah. NB2 = Jumlah prosiding tidak terindeks di seminar internasional. NB3 = Jumlah prosiding terindeks Scopus / WoS di seminar internasional / Pertemuan Himpunan Profesi Internasional. NDTPSPPI = Jumlah dosen tetap PSPPI. A = RI/a; B = RN/b; C = RW/c. Jika RI ≥ a dan RN < b, maka RI = a; Jika RI < a dan RN ≥ b, maka RN = b; Jika RW ≥ c , maka RW = c.
- Skor 3: Jika 0 < RI ≤ a atau 0 < RN ≤ b atau 0 < RW ≤ c maka Skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 31 ↔ Sarjana 34 (beda: perlu rumus jenjang)

- Indikator (hlm. 19, 20): Luaran penelitian dan PkM kolaboratif industri yang dihasilkan DTPSPPI dalam 3 tahun terakhir. Tabel 4.a LKPS. Tabel 4.f. LKPS.
- Skor 4: Jika RLP ≥ 1, maka Skor 4 . RLP = ((3 x NPaten) + 2 x (NTTG + NBC) + NHKI)) / NDTPSPPI. NPaten = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NTTG = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk. NBC = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter. NHKI = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Pencatatan Ciptaan). NDTPS = Jumlah dosen tetap PSPPI.
- Skor 3: Jika RLP < 1 , maka Skor = 2 + (2 x RLP).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada Skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 34 ↔ Sarjana 26 (beda: perlu rumus jenjang)

- Indikator (hlm. 21): Kecukupan jumlah Pembimbing Lapangan. Tabel 4.k. LKPS.
- Skor 4: Jika 1 ≤ PPL ≤ 4, maka Skor = 4 NMRPL = Jumlah total mahasiswa moda pembelajaran reguler yang dibimbing PL dalam 3 tahun terakhir. NPL = Jumlah pembimbing lapangan (PL) yang relevan yang terlibat dalam PSPPI dalam 3 tahun terakhir. PPL = NMRPL/NPL.
- Skor 3: maka Skor = 1 + ((10 - PPL) / 2).
- Skor 2: 4 < Jika PPL ≤ 10,
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor dibawah 1

### Butir 37 ↔ Sarjana 40 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Rasio jumlah mahasiswa program studi terhadap jumlah DTPS Tabel 6.d. LKPS. Tabel 4.a. LKPS.
- Skor 4: Jika 4 ≤ RMD ≤ 10, maka Skor = 4. NMT = Jumlah total mahasiswa moda pembelajaran reguler dan RPL pada saat TS. NDTPSPPI = Jumlah dosen tetap yang mengampu PSPPI. NDI = Jumlah dosen industri. ND = NDTPSPPI + NDI. RMD = NMT / ND.
- Skor 3: Jika RMD < 4, maka Skor = 1 + (3 x RMD) / 4. Jika 10 < RMD ≤ 35, maka Skor = 4 - (((4 x RMD) - 40) / 25).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika RMD > 35 , maka Skor = 0

### Butir 38 ↔ Sarjana 42 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): IPK lulusan. RIPK = Rata-rata IPK lulusan dalam 3 tahun terakhir. Tabel 6.b. LKPS.
- Skor 4: Jika RIPK ≥ 3,25, maka Skor = 4
- Skor 3: Jika 2,00 ≤ RIPK < 3,25, maka Skor = ((8 x RIPK) - 6) / 5.
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada skor kurang dari 2
- Skor 0: (kosong di teks PDF)

### Butir 39 ↔ Sarjana 44 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Masa studi mahasiswa moda pembelajaran reguler. MS = Rata-rata masa studi lulusan (semester). Tabel 6.d. LKPS.
- Skor 4: Jika 2 ≤ MS ≤ 3, maka Skor = 4
- Skor 3: (kosong di teks PDF)
- Skor 2: Jika 3 < MS ≤ 6, maka Skor = 7 - MS
- Skor 1: (kosong di teks PDF)
- Skor 0: Jika MS > 6, maka Skor = 0.

### Butir 40 ↔ Sarjana 45 (beda: perlu rumus jenjang)

- Indikator (hlm. 23): Kelulusan tepat waktu moda pembelajaran reguler. PTW = Persentase kelulusan tepat waktu. Tabel 6.d. LKPS.
- Skor 4: Jika PTW ≥ 90%, maka Skor = 4.
- Skor 3: Jika PTW < 90%, maka Skor = 1 + ((10 x PTW) / 3).
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: Tidak ada skor kurang dari 1.

### Butir 43 ↔ Sarjana 49 (beda: perlu rumus jenjang)

- Indikator (hlm. 24, 25): Waktu tunggu lulusan moda pembelajaran reguler (WT) untuk mendapatkan pekerjaan pertama dalam 2 tahun, mulai TS-2 s.d. TS-1. Tabel 6.f.1. LKPS.
- Skor 4: Jika WT ≤ 3 bulan, maka Skor = 4 Ketentuan Persentase responden lulusan minimal 30% . Jika persentase responden memenuhi ketentuan diatas, maka Skor akhir = Skor. Jika persentase responden tidak memenuhi ketentuan diatas, maka berlaku penyesuaian sebagai berikut: Skor akhir = (PJ / Prmin) x Skor. NL = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1). NJ = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1) yang terlacak . PJ = Persentase lulusan yang terlacak = (NJ / NL) x 100%. Prmin = Persentase responden minimum WT = (1,5 x A + 4,5 x B + 6 x C) / (A + B + C) A = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1) dengan WT≤ 3 bulan. B = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1) dengan 3 < WT < 18 bulan. C = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1) dengan WT ≥ 18 bulan.
- Skor 3: maka Skor = (24 - (4 x WT)) / 3.
- Skor 2: Jika 3 < WT < 6 bulan,
- Skor 1: (kosong di teks PDF)
- Skor 0: WT ≥ 6 bulan, maka Skor = 0

### Butir 44 ↔ Sarjana 50 (beda: perlu rumus jenjang)

- Indikator (hlm. 25): Kesesuaian bidang kerja. KBK = Kesesuaian bidang kerja lulusan moda pembelajaran reguler dalam 2 tahun terakhir (mulai TS-2 sd TS-1) saat mendapatkan pekerjaan
- Skor 4: Jika PBS ≥ 60% , maka Skor = 4 Ketentuan persentase responden lulusan minimum 50%. Jika persentase responden memenuhi ketentuan diatas, maka Skor akhir = Skor. Jika persentase responden tidak memenuhi ketentuan diatas, maka berlaku penyesuaian sebagai berikut: Skor akhir = (PJ / Prmin) x Skor. NL = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1) NJ = Jumlah lulusan dalam 2 tahun (TS-2 s.d. TS-1) yang terlacak PJ = Persentase lulusan yang terlacak = (NJ / NL) x 100% Prmin = Persentase responden minimum PBS = (30% x KBR + 70% x KBS + 100% KBT) / (KBR + KBS + KBT) KBR = Jumlah lulusan terlacak dalam 2 tahun (TS-2 s.d. TS-1) yang kesesuaian bidang kerjanya rendah KBS = Jumlah lulusan terlacak dalam 2 tahun (TS-2 s.d. TS-1) yang kesesuaian bidang kerjanya sedang KBT = Jumlah lulusan terlacak dalam 2 tahun (TS-2 s.d. TS-1) yang kesesuaian bidang kerjanya tinggi
- Skor 3: (kosong di teks PDF)
- Skor 2: Jika PBS < 60%, maka Skor = (20 x PBS) / 3
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 45 ↔ Sarjana 51 (beda: perlu rumus jenjang)

- Indikator (hlm. 26): Tingkat dan ukuran tempat kerja lulusan di tingkat internasional, nasional, dan wilayah/lokal. Tabel 6.g.1. LKPS.
- Skor 4: Jika RI ≥ a dan RN ≥ b maka Skor = 4 Faktor: a = 5% , b = 20% , c = 90% . RI = (NI / NL) x 100% , RN = (NN / NL) x 100% , RW = (NW / NL) x 100% NI = Jumlah lulusan yang bekerja/berwirausaha di badan usaha tingkat multi nasional/internasional. NN = Jumlah lulusan yang bekerja/berwirausaha di badan usaha tingkat nasional. NW = Jumlah lulusan yang bekerja/berwirausaha di badan usaha tingkat wilayah/lokal. NL = Jumlah lulusan. A=RI/a; B=RN/b; C=RW/c Jika RI ≥ a dan RN < b, maka RI = a Jika RI < a dan RN ≥ b, maka RN = b Jika RW ≥ c, maka RW = c
- Skor 3: Jika 0 < RI < a, atau 0 < RN < b, atau 0 < RW ≤ c maka skor = 3,75 x ((A+B+(C/2))-(AxB)-((AxC)/2)-((BxC)/2)+((AxBxC)/2))
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

### Butir 46 ↔ Sarjana 52 (beda: perlu rumus jenjang)

- Indikator (hlm. 26): Tingkat kepuasan pengguna lulusan. Tabel 6.g.2. LKPS.
- Skor 4: Skor = ƩTKi / 7 Tingkat kepuasan aspek ke-i dihitung dengan rumus sebagai berikut: TKi = (4 x ai) + (3 x bi) + (2 x ci) + di i = 1, 2, ..., 7 ai = persentase “sangat baik”. bi = persentase “baik”. ci = persentase “cukup”. di = persentase “kurang”. Ketentuan persentase responden pengguna lulusan, Prmin = 50%.
- Skor 3: (kosong di teks PDF)
- Skor 2: (kosong di teks PDF)
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

## Butir berangka tanpa padanan Sarjana (cek: datanya ada di LKPS atau tetap manual dengan alasan)

### Butir 17

- Indikator (hlm. 12): Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar minimal 10% dari mata kuliah inti Program Studi. Tabel 3.a.3. LKPS
- Skor 4: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi; (3) Mengandung kebaruan ilmiah; dan (4) Mengandung dampak sosial yang positif.
- Skor 3: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi; (3) Mengandung kebaruan ilmiah.
- Skor 2: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar mencakup: (1) Memiliki relevansi dengan CPL; (2) Mendukung keunggulan kompetitif UPPS dan Program Studi.
- Skor 1: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) yang dijadikan sebagai bahan ajar yang hanya menyesuaikan relevansi dengan CPL.
- Skor 0: Hasil Penelitian dan Pengabdian kepada Masyarakat (PkM) kurang dari 10% yang dijadikan sebagai bahan ajar.

### Butir 24

- Indikator (hlm. 15): Rasio jumlah dosen tetap PSPPI terhadap dosen industri (Syarat minimal dosen NDI = 2 dan NDTPSPPI = 3). Tabel 4.a. LKPS.
- Skor 4: RDTPSPPI ≤ 3, maka Skor = 4. NDI = Jumlah dosen industri. NDTPS = Jumlah dosen tetap Perguruan Tinggi. NDTPSPPI = NDTPS + NDI. RDTPSPPI = Rasio jumlah dosen PSPPI = NDTPSPPI / NDI.
- Skor 3: Jika 3 < RDTPSPPI ≤ 5, maka Skor = 2 + (5 - RDTPSPPI).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada Skor di bawah 2.
- Skor 0: (kosong di teks PDF)

### Butir 26

- Indikator (hlm. 15, 16): Kualifikasi dan kecukupan laboran/teknisi/administra tor sistem untuk mendukung proses pembelajaran sesuai dengan kebutuhan program studi. Tabel 4.b. LKPS.
- Skor 4: UPPS memiliki jumlah laboran/teknisi/administ rator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan > 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 3: UPPS memiliki jumlah laboran/teknisi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 40% - 70% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 2: UPPS memiliki jumlah laboran/teknisi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi, kualifikasi sesuai dengan laboratorium yang menjadi tanggung jawabnya, dan 10% - 39% bersertifikat kompetensi tertentu sesuai bidang tugasnya.
- Skor 1: UPPS memiliki jumlah laboran/teknsi/admini strator sistem/dll yang cukup terhadap jumlah laboratorium yang digunakan program studi.
- Skor 0: UPPS tidak memiliki laboran/teknisi/ad ministrator sistem/dll.

### Butir 32

- Indikator (hlm. 20): Persentase DTPS yang memiliki pengakuan/rekognisi atas kompetensi keinsinyuran DTPSPPI dalam 3 tahun terakhir. Tabel 4.a LKPS. Tabel 4.j. LKPS.
- Skor 4: Jika PRDTPSPPI ≥ 0,5 , maka Skor = 4 Pengakuan / rekognisi atas kepakaran / prestasi / kinerja DTPSPPI berupa: a. Mewakili PT atas dasar kepakaran keinsinyuran, menjadi ketua atau anggota komisi / badan / panitia yang menangani masalah keinsinyuran yang dibentuk oleh pemerintah di tingkat nasional. b. Mewakili pemerintah, atas dasar kepakaran keinsinyuran, menjadi ketua atau anggota delegasi yang menangani masalah keinsinyuran di tingkat internasional, dan/atau c. Menjadi saksi ahli, atas dasar kepakaran keinsinyuran, dalam persidangan sengketa perdata atau pidana masalah praktik keinsinyuran yang sesuai bidangnya. PRDTPSPPI = NRDTPSPPI / NDTPSPPI NRDTPSPPI = Jumlah DTPSPPI yang memiliki pengakuan atas prestasi/kinerja yang relevan dengan bidang keinsinyuran dalam 3 tahun terakhir. NDTPSPPI = Jumlah dosen tetap PSPPI.
- Skor 3: jika PRDTPSPPI < 0,5 , maka Skor = 2 + (4 x PRDTPSPPI).
- Skor 2: (kosong di teks PDF)
- Skor 1: Tidak ada Skor kurang dari 2.
- Skor 0: (kosong di teks PDF)

### Butir 41

- Indikator (hlm. 24): PPS = Persentase keberhasilan studi moda pembelajaran reguler. Tabel 6.d. LKPS
- Skor 4: Jika PPS ≥ 85% , maka Skor = 4.
- Skor 3: Jika 30% < PPS < 85% , maka Skor = ((80 x PPS) - 24) / 11.
- Skor 2: Jika PPS ≤ 30%, maka Skor = 0.
- Skor 1: (kosong di teks PDF)
- Skor 0: (kosong di teks PDF)

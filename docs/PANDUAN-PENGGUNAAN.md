# Panduan penggunaan

Panduan singkat Sistem Penyusun LED LAM Teknik (setelah revisi 19 Okt 2026) untuk dua peran: **Admin** dan
**Penanggung jawab fakultas (PJ)**. Satu instalasi website dipakai satu fakultas. Setiap halaman juga punya kotak
**Petunjuk halaman ini** yang menjelaskan fungsi halaman dan langkah berikutnya; kotak itu bisa ditutup dan pilihannya
diingat di browser.

Semua akun dibuat admin; tidak ada pendaftaran mandiri. Akun baru dan akun yang kata sandinya diatur ulang **wajib
mengganti kata sandi** saat login pertama. Setiap pengguna bisa mengganti kata sandinya sendiri lewat menu akun (pojok
kiri bawah) → **Ganti kata sandi** (wajib mengisi kata sandi lama).

---

## A. Admin

Menu admin hanya dua: **Akun PJ** dan **Kunci API**. Admin tidak membuka LED, prodi, instrumen, atau dokumen.

### Akun PJ

- Buat satu akun **penanggung jawab fakultas** (atau akun admin lain) dan berikan kata sandi sementara.
- **Lupa kata sandi**: menu baris akun → **Atur ulang kata sandi**; pemilik akun wajib menggantinya saat login.
- **Pergantian PJ**: nonaktifkan akun lama, lalu buat akun baru. LED, kunci API, dan riwayat versi milik fakultas,
  jadi tidak ada yang hilang.
- Admin tidak bisa menonaktifkan atau menghapus akunnya sendiri, dan sistem selalu menyisakan minimal satu admin aktif.

### Kunci API (tiga tab)

- **Kunci**: kunci cadangan admin (opsional), dari project Google milik tim. Dipakai setelah kunci fakultas habis bila
  diizinkan.
- **Model Gemini**: klik **Muat ulang daftar** (perlu minimal satu kunci aktif), pilih model narasi, model cadangan, dan
  model embedding; klik **Uji model**. Mengganti model embedding membuat semua dokumen diindeks ulang.
- **Log pemakaian**: panggilan model, token masuk/keluar, dan galat. Galat `kuota_harian` (429) berarti kuota kunci
  habis; sistem otomatis mencoba model cadangan lalu kunci berikutnya.

---

## B. Penanggung jawab fakultas

Menu utama: **Semua LED**, **Program studi**, **Instrumen**, **Dokumen bersama fakultas**, **Kunci API fakultas**.
Di dalam satu LED: **Beranda**, **Data LKPS**, **Dokumen**, **Tim penyusun**, kriteria C.1–C.7 dan bab lain,
**Ekspor Word**.

### 1. Persiapan (sekali di awal)

1. Login, lalu ganti kata sandi sementara.
2. **Kunci API fakultas**: buat kunci di aistudio.google.com → *Get API key*, tempel, simpan, lalu **Uji koneksi**.
   Kunci berlaku untuk semua LED, disimpan terenkripsi, dan hanya 4 karakter terakhir yang ditampilkan.
3. **Program studi**: isi **identitas fakultas** sekali (nama fakultas, perguruan tinggi, alamat, kota; pengganti UPPS),
   lalu tambah program studi beserta jenjang, kode PDDikti, dan tanggal **akreditasi berlaku sampai**. Daftar prodi
   diurutkan dari akreditasi yang paling dekat berakhir.
4. **Dokumen bersama fakultas**: unggah sekali dokumen yang berlaku untuk semua prodi (VMTS dan Renstra fakultas,
   SK struktur organisasi, keuangan, sarana-prasarana dan K3L, SPMI dan audit mutu). Semua LED memakainya saat menyusun
   narasi (kode sumber U1, U2, …).

### 2. Instrumen per jenjang (± 5 tahun sekali)

Butir penilaian dan pertanyaan diambil dari berkas resmi LAM Teknik, tidak diketik ulang. Instrumen dibedakan per
jenjang (10 jenjang); LED baru otomatis memakai instrumen aktif jenjang prodinya.

1. Menu **Instrumen** → **Instrumen baru**: pilih jenjang; nama dan kode terisi otomatis.
2. Unggah tiga berkas jenjang itu (skema Pasca Terakreditasi Pertama dan Unggul):
   - **Template LED (.docx)**: dipakai juga untuk ekspor Word;
   - **Matriks Penilaian (.pdf)** jenjang tersebut;
   - **Pedoman Penilaian (.pdf)** beserta **halaman tabel bobot** jenjang itu (nomor halaman PDF, contoh Sarjana
     `223-227`). Letak tabel dideteksi otomatis setelah pedoman diunggah; periksa dan simpan.
3. Klik **Mulai ekstraksi**. Template diurai tanpa AI (bagian, sub-bagian, instruksi), tabel bobot dibaca tanpa AI,
   lalu tabel matriks dibaca Gemini sedikit demi sedikit (± 11 panggilan untuk Sarjana). Halaman boleh ditinggal.
   Bila kuota habis, ekstraksi **tertunda** dan dilanjutkan otomatis dari kelompok terakhir setelah kunci baru diisi
   atau kuota direset; **Ekstrak ulang** memulai dari awal.
4. Klik **Periksa hasil ekstraksi**. PDF asli tampil di kiri; klik butir di kanan untuk melompat ke halamannya.
   - Cocokkan elemen, indikator, bobot, dan deskriptor skor 4–0 dengan PDF.
   - Kolom bertanda **usulan AI** (sub-bagian template, jenis angka/narasi, rumus lama, dan kolom yang diragukan)
     wajib diperiksa. Butir angka tanpa rumus lama berarti nilainya nanti diisi penyusun.
   - Klik **Simpan dan tandai dicek** atau **Sudah benar, tandai dicek**; butir berikutnya terbuka otomatis.
5. **Pemeriksaan otomatis** harus lolos: total bobot 100 (100,01 diterima), nomor butir berurutan, setiap butir punya
   deskriptor skor 4 dan minimal satu sub-bagian, setiap sub-bagian punya instruksi, semua butir sudah dicek.
6. Klik **Sudah dicek, aktifkan**. Instrumen aktif sebelumnya untuk jenjang itu dinonaktifkan tetapi tetap tersimpan;
   LED lama tetap memakai versinya.

### 3. Membuat LED (per periode 5 tahun)

1. Menu **Semua LED** (dikelompokkan per prodi) → **LED baru**: pilih prodi, tahun pengajuan, dan nama. Instrumen
   dipilih otomatis menurut jenjang prodi. Prodi yang masih punya LED aktif, atau jenjangnya belum punya instrumen
   aktif, tidak bisa dipilih (alasannya tampil di daftar).
2. Label periode tampil sebagai "Periode 2026–2031". **Tahun data LKPS (TS)** dihitung dari tahun pengajuan
   (pengajuan 2026 → TS 2025/2026) dan bisa diubah di Beranda → **Pengaturan LED**. Label TS di LKPS dan instruksi
   diganti tahun akademik nyata di narasi.
3. LED periode lama cukup **diarsipkan** (tetap tersimpan, hanya baca). LED baru untuk prodi yang sama baru bisa dibuat
   setelah LED lama diarsipkan. **Hapus LED** hanya untuk LED yang salah dibuat (wajib mengetik ulang namanya).

### 4. Bahan penyusunan di dalam LED

1. **Data LKPS**: unggah LKPS dari template LAM Teknik 2025 (Excel). PDF bisa dipakai sebagai cadangan, tetapi
   tabelnya wajib dicek. Tabel **Metrik butir angka** menunjukkan sumber nilai tiap butir angka: dihitung rumus,
   diisi manual, atau belum ada.
2. **Dokumen**: unggah PDF/DOCX/gambar dan kaitkan ke sub-bagian. Dokumen berlencana **bersama fakultas** sudah
   tersedia untuk semua LED. Tunggu status **Siap dicari**.

### 5. Menyusun narasi: satu sub-bagian satu halaman

Buka kriteria di sidebar (C.1–C.7). **Ringkasan kriteria** menampilkan bobot, target halaman, daftar sub-bagian dengan
status (belum diisi, ada jawaban, ada draf, selesai) dan target kata, tombol **Lanjutkan** (membuka sub-bagian pertama
yang belum selesai), **Generate semua**, dan **Tandai selesai**.

Setiap **halaman sub-bagian** (judulnya misalnya "C.4 · 3 dari 14", dengan bilah kemajuan) berisi berurutan:

1. **Instruksi template** resmi (inilah pertanyaannya);
2. **Butir penilaian** dengan deskriptor skor 4 resmi dan **daftar cek unsur skor 4** (dipecah dari nomor (1), (2), …);
3. untuk butir angka: **Data LKPS** yang dihitung sistem, atau isian **Nilai hitung** bila butir tidak punya rumus atau
   rumus tidak bisa membaca LKPS (isi nilai dan cara menghitungnya; nilai ini menjadi sumber angka narasi);
4. **Jawaban penyusun** (tersimpan otomatis, sumber `[J]`);
5. **Dokumen pendukung** (unggah langsung ke sub-bagian ini);
6. **Hasil generate** dan **Riwayat versi**.

Langkah:

1. Isi jawaban dan nilai yang diperlukan, unggah dokumen, lalu klik **Generate** (satu sub-bagian) atau kembali ke
   ringkasan dan klik **Generate semua** (urutan: IKU, latar belakang dan kebijakan, analisis faktor, SWOT). Analisis
   faktor dan SWOT memberi peringatan bila belum ada draf IKU karena keduanya memakai ringkasan IKU.
2. Pindah dengan **Sebelumnya** dan **Berikutnya** atau daftar sub-bagian di samping; isian disimpan dulu sebelum
   pindah. Di sub-bagian terakhir, Berikutnya membuka ringkasan kriteria berikutnya.
3. Baca hasil: penanda **Sumber** di bawah setiap paragraf (D dokumen, U dokumen bersama, T tabel LKPS, M metrik atau
   nilai hitung, J jawaban), panel **Pemeriksaan otomatis** (panjang, angka tanpa dasar data, paragraf tanpa sumber,
   penanda `[BELUM ADA BUKTI: …]`), dan status unsur skor 4.
4. **Sunting langsung** di editor; perubahan tersimpan otomatis sebagai versi suntingan. Di **Riwayat versi**, bandingkan
   dua versi atau pulihkan versi lama.
5. Tandai **Selesai** per sub-bagian, atau **Tandai selesai** di ringkasan setelah semua sub-bagian punya draf.

### 6. Tim penyusun dan ekspor Word

1. Menu **Tim penyusun**: isi dosen (urutan pertama = ketua) dan tenaga kependidikan. Data ini mengisi halaman
   Identitas Tim Penyusun serta Tabel 2.1 dan 2.2, dan tidak dikirim ke Gemini.
2. Susun **Kata Pengantar dan Ringkasan Eksekutif**, **Bab III**, dan **Bab IV** paling akhir karena keempatnya
   merangkum seluruh kriteria.
3. Menu **Ekspor Word**: selesaikan daftar pemeriksaan (semua bagian selesai, tidak ada penanda `[BELUM ADA BUKTI: …]`,
   tabel dan gambar berjudul), lalu klik **Ekspor ke Word**. Berkas memakai Template LED instrumen LED itu.
4. Buka di Microsoft Word, pilih **Yes/Ya** saat diminta memperbarui field, ganti kotak **Logo Perguruan Tinggi**,
   periksa, lalu simpan. Berkas lebih dari 150 halaman **ditahan**: ringkas narasi lalu ekspor ulang.

### 7. Bila kuota kunci habis

Gemini versi gratis membatasi jumlah permintaan per hari per project Google. Saat kuota habis, penyusunan dan ekstraksi
instrumen **berhenti rapi** dan pemberitahuan meminta kunci baru. Tambahkan kunci dari **project/akun Google lain** di
menu Kunci API fakultas (proses lanjut otomatis dari bagian yang tertunda), atau tunggu reset kuota harian (sekitar
pukul 14.00–15.00 WIB).

### 8. Data pribadi

Sebelum konteks dikirim ke Gemini, NIDN/NIDK/NIP/NIM/NIK dan nama mahasiswa di tabel LKPS, jawaban penyusun, dan
potongan dokumen disamarkan otomatis. Tetap hindari menulis data pribadi yang tidak perlu di jawaban penyusun.
Berkas instrumen (template, matriks, pedoman) adalah dokumen publik LAM Teknik.

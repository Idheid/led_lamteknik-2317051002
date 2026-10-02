# Panduan penggunaan

Panduan singkat Sistem Penyusun LED LAM Teknik untuk dua peran: **super admin** (tim pengembang, lalu fakultas
setelah serah terima) dan **penanggung jawab prodi**. Setiap halaman juga punya kotak **Petunjuk halaman ini** yang
menjelaskan fungsi halaman dan langkah berikutnya; kotak itu bisa ditutup dan pilihan diingat di browser.

Semua akun dibuat oleh super admin; tidak ada pendaftaran mandiri. Akun baru dan akun yang kata sandinya diatur ulang
**wajib mengganti kata sandi** saat login pertama. Setiap pengguna bisa mengganti kata sandinya sendiri lewat menu
akun (pojok kiri bawah) → **Ganti kata sandi** (wajib mengisi kata sandi lama).

---

## A. Super admin

### 1. Menyiapkan sistem (sekali di awal)

1. **Instrumen**: periksa versi instrumen aktif (LAM Teknik 2025). Untuk peraturan baru, buka versi lalu **Salin
   versi**, sunting salinannya (bagian, sub-bagian, butir, bobot, unsur skor 4, dokumen yang diharapkan), lalu aktifkan.
   Versi yang sudah dipakai proyek terkunci supaya proyek lama tetap konsisten.
2. **Prodi dan UPPS**: tambah UPPS (misalnya fakultas), lalu program studi di bawahnya beserta identitasnya
   (kode PDDikti, akreditasi terakhir, SK). Identitas dipakai di halaman identitas LED dan di prompt.
3. **Akun**: buat satu akun **penanggung jawab** untuk setiap prodi dan berikan kata sandi sementara.
4. **Model LLM**: klik **Muat ulang daftar** (perlu minimal satu kunci API aktif). Pilih:
   - **Model narasi** (generateContent), misalnya Gemini 3 Flash; klik **Uji model**.
   - **Model cadangan**, dicoba berurutan bila kuota harian model narasi habis.
   - **Model embedding** (embedContent). Mengganti model embedding membuat semua dokumen diindeks ulang.
   - **Izinkan prodi memakai kunci cadangan super admin** setelah kunci prodi habis.
5. **Kunci API cadangan** (opsional): tambahkan kunci dari project Google milik tim; dipakai semua prodi bila diizinkan.

### 2. Pekerjaan rutin

- **Log pemakaian**: pantau panggilan model per prodi, token masuk/keluar, dan galat. Galat `kuota_harian` (429)
  berarti kuota kunci habis; sistem otomatis mencoba model cadangan lalu kunci berikutnya.
- **Lupa kata sandi**: Akun → menu baris akun → **Atur ulang kata sandi**. Pemilik akun wajib menggantinya saat login.
- **Pergantian penanggung jawab**: nonaktifkan akun lama, lalu buat akun baru untuk prodi yang sama. Satu prodi hanya
  boleh punya satu akun penanggung jawab **aktif**. Proyek, kunci API, dan riwayat versi milik prodi, jadi tidak hilang.
- **Serah terima ke fakultas**: buat akun **super admin** baru untuk fakultas. Super admin tidak bisa menonaktifkan
  atau menghapus akunnya sendiri, dan sistem selalu menyisakan minimal satu super admin aktif.

---

## B. Penanggung jawab prodi

### 1. Persiapan

1. Login, lalu ganti kata sandi sementara.
2. **Kunci API** (menu di daftar proyek maupun di dalam proyek): buat kunci di aistudio.google.com → *Get API key*,
   tempel, simpan, lalu **Uji koneksi**. Kunci berlaku untuk semua proyek prodi, disimpan terenkripsi, dan hanya
   4 karakter terakhir yang ditampilkan. Beranda proyek mengingatkan bila belum ada kunci yang bisa dipakai.
3. **Buat proyek LED**: pilih versi instrumen dan tahun TS (misalnya 2025/2026). Label TS di LKPS dan instruksi
   otomatis diganti tahun akademik nyata.

### 2. Bahan penyusunan

1. **Data LKPS**: unggah LKPS dari template LAM Teknik 2025 (Excel). PDF bisa dipakai sebagai cadangan, tetapi tabelnya
   wajib dicek. Periksa tabel dan peringatan; koreksi sel yang salah. Metrik butir angka dihitung sistem, bukan LLM.
2. **Dokumen**: unggah PDF/DOCX/gambar dan kaitkan ke kriteria/sub-bagian. Daftar cek menunjukkan dokumen yang
   diharapkan per butir. Tunggu status **Siap dicari**.

### 3. Menyusun narasi per kriteria

Buka kriteria di sidebar (C.1–C.7). Setiap kartu sub-bagian berisi, dari atas:

- **Instruksi template** dan **butir penilaian** beserta **Data LKPS** (metrik yang dihitung sistem);
- **Jawaban penyusun**: isi fakta yang belum ada di dokumen (tersimpan otomatis, menjadi sumber `[J]`);
- **Dokumen pendukung**: daftar cek dan tombol unggah;
- tab **Hasil generate** dan **Riwayat versi**.

Langkah:

1. Klik **Generate kriteria** di atas halaman. Urutan penyusunan: indikator kinerja (IKU), latar belakang dan kebijakan,
   analisis faktor (memakai ringkasan IKU), terakhir SWOT. Pemberitahuan antrean muncul di atas setiap halaman proyek;
   **halaman boleh ditinggal**, penyusunan berjalan di server.
2. Baca hasil di tab **Hasil generate**:
   - penanda **Sumber:** kecil di bawah setiap paragraf (D = dokumen, T = tabel LKPS, M = metrik sistem,
     J = jawaban penyusun; lihat **Keterangan kode sumber**). Penanda tidak ikut diekspor;
   - **Pemeriksaan otomatis**: panjang terhadap anggaran kata (±15%), angka tanpa dasar data, paragraf tanpa sumber,
     dan penanda `[BELUM ADA BUKTI: ...]`;
   - **Daftar cek unsur skor 4**: terpenuhi, sebagian, atau belum ada bukti, ditambah dokumen yang perlu diunggah.
3. **Sunting langsung** di editor (tebal, miring untuk istilah asing, daftar, tabel, gambar dari unggahan). Perubahan
   tersimpan otomatis sebagai versi suntingan dan pemeriksaan dijalankan ulang.
4. Bila satu sub-bagian kurang baik (misalnya setelah menambah dokumen), klik **Generate ulang butir** di kartunya.
5. Tab **Riwayat versi**: pilih dua versi lalu **Bandingkan** (teks dihapus dicoret, teks baru disorot), atau
   **Pulihkan** versi lama (disalin menjadi versi baru; tidak ada versi yang hilang).
6. Tandai **Selesai** per sub-bagian, atau **Tandai selesai** untuk seluruh kriteria setelah semua sub-bagian punya draf.
   Status kriteria (belum diisi, draf, disunting, selesai) tampil di sidebar dan Beranda.

### 4. Bila kuota kunci habis

Gemini versi gratis membatasi jumlah permintaan per hari per project Google. Saat kuota habis:

- penyusunan **berhenti rapi** di sub-bagian terakhir dan pemberitahuan antrean meminta kunci baru;
- tambahkan kunci dari **project/akun Google lain** di menu Kunci API, penyusunan **lanjut otomatis** dari sub-bagian
  yang tertunda; atau tunggu reset kuota harian (sekitar pukul 14.00–15.00 WIB), sistem mencoba lagi sendiri.

### 5. Data pribadi

Sebelum konteks dikirim ke Gemini, NIDN/NIDK/NIP/NIM/NIK dan nama mahasiswa di tabel LKPS, jawaban penyusun, dan
potongan dokumen disamarkan otomatis. Tetap hindari menulis data pribadi yang tidak perlu di jawaban penyusun.

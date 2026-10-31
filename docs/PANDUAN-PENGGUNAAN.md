# Panduan penggunaan

Panduan singkat website Akreditasi LAM Teknik (setelah revisi 22 Okt 2026 dan penggabungan modul 31 Okt 2026) untuk
tiga peran: **Admin**, **Penanggung jawab fakultas (PJ)**, dan **Asesor**. Satu instalasi website dipakai satu fakultas.

**Satu website, dua modul (31 Okt 2026).** Setelah login, PJ dan asesor masuk ke halaman awal **Pilih modul** dengan
dua kartu: **LKPS** (Laporan Kinerja Program Studi; modulnya masih disiapkan) dan **LED** (Laporan Evaluasi Diri). PJ
juga melihat **Data bersama LKPS & LED**: Program studi dan Kunci API fakultas, diisi sekali dan dipakai kedua modul.
Di dalam modul, tombol **LKPS | LED** di bagian atas halaman memindahkan modul; ikon kotak di sebelah kirinya kembali
ke halaman awal. Admin tetap langsung masuk ke menu admin. Alamat lama (`/proyek/...`, `/asesor/...`) otomatis
diarahkan ke alamat baru (`/led/...`, `/led/asesor/...`). Setiap halaman juga
punya kotak **Petunjuk halaman ini** yang menjelaskan fungsi halaman dan langkah berikutnya; kotak itu bisa ditutup dan
pilihannya diingat di browser.

**Pemasangan pertama**: selama website belum punya admin, halaman login menampilkan formulir **Buat akun admin
pertama** (tidak perlu mengisi berkas `.env`). Setelah itu semua akun dibuat admin; tidak ada pendaftaran mandiri. Akun baru dan akun yang kata sandinya diatur ulang **wajib
mengganti kata sandi** saat login pertama. Setiap pengguna bisa mengganti kata sandinya sendiri lewat menu akun (pojok
kanan atas, di samping lonceng) → **Ganti kata sandi** (wajib mengisi kata sandi lama).

Ikon **lonceng** di kanan atas (PJ dan asesor) menampilkan pemberitahuan review: catatan revisi baru, catatan yang
sudah diperbaiki atau diterima, balasan, pengajuan review, dan keputusan asesor. Klik pemberitahuan untuk membuka
halamannya. Pemberitahuan diperbarui otomatis tanpa muat ulang.

| Aksi | Admin | PJ | Asesor |
|---|---|---|---|
| Membuat akun dan menugaskan asesor ke LED | Ya | – | – |
| Menyusun, generate, dan menyunting narasi | – | Ya | – |
| Membaca LED | – | Semua LED | Hanya LED yang ditugaskan |
| Memblok kalimat dan memberi catatan revisi | – | – | Ya |
| Menandai Sudah diperbaiki | – | Ya | – |
| Menerima perbaikan atau membuka lagi catatan | – | – | Ya |
| Memberi skor 0–4 per butir dan menyatakan Layak diajukan | – | – | Ya |
| Ekspor Word final | – | Ya, setelah Layak diajukan | – |

---

## A. Admin

Admin adalah **pengelola sistem**, bukan penyusun: membuat akun, menugaskan asesor, dan mengatur kunci API dan model AI.
Seluruh isi LED (prodi, LKPS, dokumen, narasi, ekspor) dikerjakan **PJ**. Menu admin: **Kelola akun**, **Penugasan
asesor**, dan **Kunci API**.

### Kelola akun

- Klik **Tambah akun**, pilih peran (**Penanggung jawab**, **Asesor**, atau **Admin**; setiap pilihan diberi penjelasan
  singkat), lalu isi nama, email, dan kata sandi awal.
- **Lupa kata sandi**: menu baris akun → **Atur ulang kata sandi**; pemilik akun wajib menggantinya saat login.
- **Pergantian PJ**: nonaktifkan akun lama, lalu buat akun baru. LED, kunci API, dan riwayat versi milik fakultas,
  jadi tidak ada yang hilang.
- Admin tidak bisa menonaktifkan atau menghapus akunnya sendiri, dan sistem selalu menyisakan minimal satu admin aktif.
- Kotak **Cadangan otomatis** menampilkan cadangan terakhir (tanggal, berhasil atau gagal, ukuran). Kotak berwarna
  kuning bila cadangan berhasil terakhir lebih dari dua hari lalu. Lihat docs/PANDUAN-SERVER.md.

### Penugasan asesor

Satu LED dinilai satu asesor; satu asesor boleh menilai beberapa LED. Pilih asesor di kolom **Asesor** setiap LED.
Asesor langsung diberi tahu. Asesor hanya bisa membuka LED yang ditugaskan kepadanya.

### Kunci API (tiga tab)

- **Kunci**: kunci cadangan admin (opsional), dari project Google milik tim. Dipakai setelah kunci fakultas habis bila
  diizinkan.
- **Model Gemini**: klik **Muat ulang daftar** (perlu minimal satu kunci aktif), pilih model narasi, model cadangan, dan
  model embedding; klik **Uji model**. Mengganti model embedding membuat semua dokumen diindeks ulang.
- **Log pemakaian**: panggilan model, token masuk/keluar, durasi, dan galat. Galat `kuota_harian` (429) berarti kuota
  kunci habis; `batas_waktu` berarti satu panggilan lebih dari 90 detik. Sistem otomatis mencoba lagi, lalu model
  cadangan, lalu kunci berikutnya.

---

## B. Penanggung jawab fakultas

Setelah login PJ masuk ke halaman awal **Pilih modul**, lalu klik **LED**. Sidebar modul LED berisi **Menu LED**
(Semua LED, Instrumen, Basis Pengetahuan fakultas) dan **Data bersama LKPS & LED** (Program studi, Kunci API fakultas).
Klik sebuah LED: sidebar berganti menjadi menu **LED ini** (Beranda LED, Data LKPS, Basis Pengetahuan, Tim penyusun,
Ekspor Word), kriteria C.1–C.7, dan bab lain. Di paling atas ada kotak **LED yang dibuka** (klik untuk pindah ke LED
lain), lalu menu **Menu LED** di bawah judul *Kembali ke Menu LED*.

Menambah data selalu lewat tombol biru di kanan atas (**Buat LED baru**, **Tambah data LKPS**, **Tambah dokumen**,
**Tambah kunci**) yang membuka halaman tersendiri; setelah berhasil, sistem kembali ke daftar.

### 1. Persiapan (sekali di awal)

1. Login, lalu ganti kata sandi sementara.
2. **Kunci API fakultas**: buat kunci di aistudio.google.com → *Get API key*, tempel, simpan, lalu **Uji koneksi**.
   Kunci berlaku untuk semua LED, disimpan terenkripsi, dan hanya 4 karakter terakhir yang ditampilkan.
3. **Program studi**: isi **identitas fakultas** sekali (nama fakultas, perguruan tinggi, alamat, kota; pengganti UPPS),
   lalu tambah program studi beserta jenjang, kode PDDikti, dan tanggal **akreditasi berlaku sampai**. Daftar prodi
   diurutkan dari akreditasi yang paling dekat berakhir dan menampilkan kolom **Kesiapan**. Prodi yang tinggal
   ≤ 12 bulan dan belum punya LED mendapat tombol **Buat LED**.
4. **Basis Pengetahuan fakultas**: unggah sekali dokumen yang berlaku untuk semua prodi (VMTS dan Renstra fakultas,
   SK struktur organisasi, keuangan, sarana-prasarana dan K3L, SPMI dan audit mutu). Semua LED memakainya saat menyusun
   narasi (kode sumber U1, U2, …).

### 2. Instrumen per jenjang (± 5 tahun sekali)

Butir penilaian dan pertanyaan diambil dari berkas resmi LAM Teknik, tidak diketik ulang. Instrumen dibedakan per
jenjang (10 jenjang); LED baru otomatis memakai instrumen aktif jenjang prodinya.

1. Menu **Instrumen** → **Instrumen baru**: pilih jenjang; nama dan kode terisi otomatis.
2. Unggah tiga berkas jenjang itu (skema Pasca Terakreditasi Pertama dan Unggul):
   - **Template LED (.docx)**: dipakai juga untuk ekspor Word;
   - **Matriks Penilaian (.pdf)** jenjang tersebut (sumber deskriptor skor 0–4 yang dipakai asesor);
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

### 3. Membuat LED, kesiapan, dan jadwal kerja

1. Menu **Semua LED** → tombol **Buat LED baru**: pilih prodi, tahun pengajuan, dan nama. Instrumen dipilih otomatis menurut
   jenjang prodi. Prodi yang masih punya LED aktif, atau jenjangnya belum punya instrumen aktif, tidak bisa dipilih.
2. **Semua LED** menampilkan kartu besar per LED, diurutkan menurut tanggal akreditasi berakhir (paling dekat di atas);
   LED yang diarsipkan di bawah. Kartu berisi persentase LKPS terisi, sub-bagian berdraf/selesai, catatan asesor, dan
   status review. **Seluruh kartu merah** bila ada jadwal kerja yang terlewat (atau akreditasi berakhir ≤ 6 bulan dan
   belum Layak diajukan); kuning bila ≤ 12 bulan.
3. Beranda LED menampilkan dua kotak utama di atas: **Review asesor** (tahap review, jumlah catatan, tombol **Ajukan
   review**) dan **Jadwal kerja** (pita merah bila ada jadwal terlewat). Jadwal kerja: batas pengajuan (usulan 6 bulan sebelum akreditasi berakhir) dan
   tonggak yang dihitung mundur (LKPS lengkap, semua kriteria selesai, bab lain selesai, review asesor, ekspor final).
   Tanggal tonggak bisa diubah; tonggak yang terlewat dan belum tercapai ditandai merah.
4. Label periode tampil sebagai "Periode 2026–2031". **Tahun data LKPS (TS)** dihitung dari tahun pengajuan
   (pengajuan 2026 → TS 2025/2026) dan bisa diubah di Beranda → **Pengaturan LED**.
5. LED periode lama cukup **diarsipkan** (tetap tersimpan, hanya baca). LED baru untuk prodi yang sama baru bisa dibuat
   setelah LED lama diarsipkan. **Hapus LED** hanya untuk LED yang salah dibuat (wajib mengetik ulang namanya).

### 4. Bahan penyusunan di dalam LED

1. **Data LKPS**: unggah LKPS dari template LAM Teknik 2025 (Excel). PDF bisa dipakai sebagai cadangan, tetapi
   tabelnya wajib dicek. Tabel **Metrik butir angka** menunjukkan sumber nilai tiap butir angka: dihitung rumus,
   diisi manual, atau belum ada.
2. **Basis Pengetahuan** (dua tab: **Dokumen LED ini** dan **Dokumen bersama fakultas**): klik **Tambah dokumen**,
   unggah PDF/DOCX/gambar dan kaitkan ke sub-bagian. Setiap dokumen menampilkan status, **jumlah potongan** (klik untuk melihat teks setiap
   potongan), **tahun** terbit (untuk rujukan Word; kosong = "t.t."), dan tautan bukti.
3. **Uji cari**: ketik pertanyaan, atau pilih sub-bagian lalu **Pakai kueri generate**. Hasilnya adalah 8 potongan yang
   akan diberikan ke AI saat generate, dengan skor gabungan (RRF) dan peringkat vektor/kata kunci. Pakai untuk mengecek
   apakah buktinya sudah terbaca sebelum generate.

### 5. Menyusun narasi: satu sub-bagian satu halaman

Buka kriteria di sidebar (C.1–C.7). **Ringkasan kriteria** menampilkan bobot, target halaman, daftar sub-bagian dengan
status dan jumlah catatan asesor yang belum selesai, tombol **Lanjutkan**, **Generate semua**, dan **Tandai selesai**.

Setiap **halaman sub-bagian** berisi berurutan:

1. **Instruksi template** resmi (inilah pertanyaannya);
2. **Butir penilaian** dengan deskriptor skor 4 resmi dan **daftar cek unsur skor 4**;
3. untuk butir angka: **Data LKPS** yang dihitung sistem atau isian **Nilai hitung**, ditambah **Target dan capaian**:
   isian target opsional (angka, satuan, sumber seperti Renstra); sistem menghitung persen capaian dan tren TS-2, TS-1,
   TS dari LKPS;
4. **Jawaban penyusun** (tersimpan otomatis, sumber `[J]`);
5. **Dokumen dari Basis Pengetahuan** yang dikaitkan ke sub-bagian ini; tombol **Tambah ke Basis Pengetahuan** membuka
   halaman tambah dokumen dengan sub-bagian ini sudah terpilih, lalu kembali ke sini;
6. **Hasil generate**, **Riwayat versi**, dan (bila LED punya asesor) **Catatan asesor**.

Langkah:

1. Isi jawaban dan nilai yang diperlukan, unggah dokumen, lalu klik **Generate** (satu sub-bagian) atau **Generate
   semua** di ringkasan. Teks tampil bertahap di kotak **Sedang ditulis**; dua sub-bagian indikator dikerjakan
   bersamaan.
2. Pindah dengan **Sebelumnya** dan **Berikutnya**; isian disimpan dulu sebelum pindah.
3. Baca hasil: penanda **Sumber** di bawah setiap paragraf (D dokumen, U dokumen bersama, T tabel LKPS, M metrik atau
   nilai hitung, J jawaban), panel **Pemeriksaan otomatis**, dan status unsur skor 4.
4. **Verifikasi per kalimat**: setiap kalimat diberi garis bawah hijau (sesuai sumber), kuning (sebagian), atau merah
   bergelombang (tidak didukung sumber). Panel **Verifikasi per kalimat** menampilkan ringkasan dan saringan
   **Hanya kalimat bermasalah**. **Periksa dengan AI** memeriksa ulang kalimat memakai Gemini (satu panggilan).
5. **Sunting langsung** di editor; perubahan tersimpan otomatis sebagai versi suntingan dan diperiksa ulang. Di
   **Riwayat versi**, bandingkan dua versi atau pulihkan versi lama.
6. Tandai **Selesai** per sub-bagian, atau **Tandai selesai** di ringkasan setelah semua sub-bagian punya draf.

### 6. Review asesor

1. Setelah narasi siap, buka Beranda LED → kotak **Review asesor** → **Ajukan review** (perlu asesor yang sudah
   ditugaskan admin). Status berubah dari Draf menjadi **Direview** dan asesor diberi tahu.
2. Di Beranda LED, kotak **Review asesor** menampilkan **Bagian yang perlu ditinjau**: klik **Buka** pada sebuah bagian
   (atau klik angka *catatan perlu diperbaiki*) untuk langsung membuka sub-bagian itu tepat di catatannya; catatan dan
   kalimatnya langsung disorot.
3. Catatan asesor muncul langsung di halaman sub-bagian tanpa muat ulang: kalimatnya disorot biru di editor dan
   catatannya tampil di panel **Catatan asesor**. Klik sorotan atau catatan untuk saling melompat.
4. Perbaiki narasinya (tersimpan otomatis), lalu klik **Sudah diperbaiki** pada catatan itu; sorotan berubah kuning.
   Bila kalimat yang diblok sudah diubah total, catatan tetap ada dengan tanda **Teks asli sudah berubah**.
5. Asesor membandingkan versi sebelum dan sesudah, lalu **Terima** (sorotan hijau) atau **Buka lagi** dengan balasan.
   PJ dan asesor bisa saling **Balas** di setiap catatan.
6. Bila asesor menyatakan **Perlu revisi**, perbaiki lalu klik **Ajukan review ulang**. Bila **Layak diajukan**,
   ekspor Word final terbuka.

### 7. Tim penyusun dan ekspor Word

1. Menu **Tim penyusun**: isi dosen (urutan pertama = ketua) dan tenaga kependidikan. Data ini mengisi halaman
   Identitas Tim Penyusun serta Tabel 2.1 dan 2.2. Nama dan nomor induk tidak dikirim ke Gemini; Bab II.A hanya memakai
   jabatan, tugas, dan jumlah anggota.
2. Susun **Kata Pengantar dan Ringkasan Eksekutif**, **Bab III**, dan **Bab IV** paling akhir karena keempatnya
   merangkum seluruh kriteria.
3. Menu **Ekspor Word** punya dua tombol:
   - **Ekspor DRAF**: kapan saja, misalnya untuk sosialisasi. Setiap halaman bertanda DRAF; pemeriksaan hanya
     memberi peringatan.
   - **Ekspor final**: terbuka setelah asesor menyatakan **Layak diajukan**, semua bagian selesai, tidak ada penanda
     `[BELUM ADA BUKTI: …]`, setiap dokumen yang dirujuk punya **tautan bukti** (bisa diisi langsung dari daftar), dan
     setiap **perbedaan angka antar kriteria** sudah diperbaiki atau diberi alasan.
4. Di Word, paragraf yang bersumber dokumen atau LKPS diberi rujukan singkat di akhir, misalnya "(LKPS Tabel 4.a; Renstra
   FT Unila 2021–2025, 2021)", dan **Daftar Rujukan** ditambahkan di Lampiran. Paragraf yang hanya bersumber jawaban tim
   penyusun tidak diberi rujukan. Halaman Lampiran tidak dihitung dalam batas 150 halaman; daftar ekspor
   menampilkan halaman sebelum Lampiran dan total halaman.
5. Buka di Microsoft Word, pilih **Yes/Ya** saat diminta memperbarui field, ganti kotak **Logo Perguruan Tinggi**,
   periksa, lalu simpan. Berkas final lebih dari 150 halaman (sebelum Lampiran) **ditahan**: ringkas narasi lalu ekspor
   ulang.

### 8. Bila kuota kunci habis

Gemini versi gratis membatasi jumlah permintaan per hari per project Google. Saat kuota habis, penyusunan dan ekstraksi
instrumen **berhenti rapi** dan pemberitahuan meminta kunci baru. Tambahkan kunci dari **project/akun Google lain** di
menu Kunci API fakultas (proses lanjut otomatis dari bagian yang tertunda), atau tunggu reset kuota harian (sekitar
pukul 14.00–15.00 WIB).

Kuota gratis sangat kecil (pada Oktober 2026 model gemini-3-flash hanya 5 permintaan per menit dan 20 per hari per
project Google), sedangkan satu LED butuh puluhan generate. Admin sebaiknya mengisi **model cadangan** di Kunci API →
Model Gemini (misalnya gemini-2.5-flash dan gemini-2.5-flash-lite): kuota dihitung per model, jadi model cadangan
menambah kuota harian. Bila Gemini sesekali mengirim jawaban yang tidak terbaca, sistem memperbaikinya otomatis atau
mengulang lalu pindah ke model cadangan; bila tetap gagal, pesannya meminta Generate diulang.

### 9. Data pribadi

Sebelum konteks dikirim ke Gemini, NIDN/NIDK/NIP/NIM/NIK dan nama mahasiswa di tabel LKPS, jawaban penyusun, dan
potongan dokumen disamarkan otomatis. Tetap hindari menulis data pribadi yang tidak perlu di jawaban penyusun.
Berkas instrumen (template, matriks, pedoman) adalah dokumen publik LAM Teknik.

---

## C. Asesor

Setelah login asesor masuk ke halaman awal **Pilih modul**, lalu klik **LED**. Menu asesor: **LED ditugaskan**. Di dalam satu LED: **Ringkasan review**, **Penilaian akhir**, lalu daftar kriteria dan
bab. Asesor hanya membaca: tidak bisa menyunting narasi, menjalankan generate, atau mengekspor.

1. **LED ditugaskan** menampilkan LED dari admin beserta status review dan jumlah catatan. Catatan dan skor bisa
   diberikan setelah PJ menekan **Ajukan review** (status **Direview**).
2. Buka sub-bagian: instruksi template dan butir beserta deskriptor skor 4 bisa dibuka di atas narasi.
3. **Blok (sorot) kalimat** di narasi, tulis catatan revisi, lalu **Kirim catatan**. Catatan langsung muncul di layar
   PJ. Catatan yang masih Terbuka bisa dihapus bila salah blok.
4. Saat PJ menandai **Sudah diperbaiki**, pemberitahuan masuk ke lonceng dan **Ringkasan review** menampilkannya di
   bagian *Menunggu Anda*. Bila PJ menyimpan versi baru, muncul tombol **Tampilkan versi terbaru**. Klik **Bandingkan**
   untuk melihat versi saat catatan dibuat dan saat ditandai diperbaiki, lalu **Terima** atau **Balas** → **Buka lagi**.
5. **Penilaian akhir**: pilih skor 0–4 per butir; setiap pilihan menampilkan deskriptor matriks untuk skor itu (bila
   instrumen jenjang diekstrak dari Matriks Penilaian). Untuk butir angka, skor hitungan sistem dari LKPS menjadi
   acuan; skor yang berbeda wajib diberi alasan. Sistem menjumlahkan bobot × skor (maksimal 400) dan menampilkan
   perkiraan status menurut ambang Pedoman Penilaian. Ini simulasi internal, bukan keputusan LAM.
6. **Layak diajukan** bisa dipilih setelah semua catatan diterima dan semua butir diberi skor; ekspor final PJ lalu
   terbuka. **Perlu revisi** mengembalikan LED ke PJ (tulis catatan umum bila tidak ada catatan yang masih terbuka).

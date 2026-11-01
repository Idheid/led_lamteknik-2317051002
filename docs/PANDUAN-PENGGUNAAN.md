# Panduan penggunaan

Panduan singkat website Akreditasi LAM Teknik (setelah revisi 31 Okt 2026) untuk tiga peran: **Admin UPPS**, **Tim
Prodi**, dan **Asesor (reviewer)**. Satu instalasi website dipakai satu fakultas (UPPS).

**Satu aplikasi LED dan LKPS LAM Teknik** (desain form 2, 2 Nov 2026). Setelah login, setiap peran langsung masuk ke
berandanya: Admin UPPS ke **Dashboard akreditasi**, Tim Prodi ke **LED prodi**, reviewer LPMPP ke **LED ditugaskan**.

- Tombol **LKPS | LED** di bagian atas halaman memindahkan antara fitur khusus LKPS dan fitur khusus LED.
- Fitur yang sama untuk keduanya ada di grup sidebar **Bersama (LED & LKPS)** dan selalu tampil, disertai fitur modul
  yang sedang dibuka saja (LED atau LKPS, tidak pernah keduanya). Saat membuka halaman bersama, misalnya Dashboard,
  sidebar tetap menampilkan modul terakhir yang Anda pilih dan keterangan di atas berbunyi "Fitur bersama LED dan LKPS".
- Selama modul LKPS masih disiapkan, LKPS diunggah sekali sebagai berkas ke LED aktif prodi (menu Data LKPS, tombol
  LKPS menyala) dan langsung dipakai LED.
- Peran "Asesor" di aplikasi ini adalah **Reviewer LPMPP** (reviewer internal).
- Membuka alamat milik peran lain diarahkan ke beranda peran sendiri. Setiap halaman punya kotak **Petunjuk halaman ini** yang bisa
ditutup.

**Pemasangan pertama**: selama website belum punya admin, halaman login menampilkan formulir **Buat akun admin
pertama**. 16 program studi FT Unila langsung terisi. Setelah itu semua akun dibuat Admin UPPS; tidak ada pendaftaran
mandiri. Akun baru dan akun yang kata sandinya diatur ulang **wajib mengganti kata sandi** saat login pertama. Setiap
pengguna bisa mengganti kata sandinya sendiri lewat menu akun (pojok kanan atas) → **Ganti kata sandi**.

Ikon **lonceng** (Tim Prodi dan asesor) menampilkan pemberitahuan review: catatan revisi baru, catatan yang sudah
diperbaiki atau diterima, balasan, pengajuan review, dan keputusan asesor. Pemberitahuan untuk sebuah LED sampai ke
semua akun Tim Prodi prodi itu.

| Aksi | Admin UPPS | Tim Prodi | Asesor |
|---|---|---|---|
| Membuat akun, mengelola prodi dan identitas fakultas | Ya | – | – |
| Instrumen, Basis Pengetahuan fakultas, kunci API dan model | Ya | Melihat Basis Pengetahuan fakultas dan status kunci | – |
| Menugaskan asesor ke LED | Ya | – | – |
| Membuat LED, menyusun, generate, dan menyunting narasi | – | LED prodinya | – |
| Mengisi identitas prodi (SK, alamat, kontak) | Ya | Prodinya | – |
| Membaca LED | Semua LED (hanya baca) | LED prodinya | LED yang ditugaskan |
| Memblok kalimat dan memberi catatan revisi; menerima perbaikan | – | – | Ya |
| Menandai Sudah diperbaiki | – | Ya | – |
| Memberi skor 0–4 per butir dan menyatakan Layak diajukan | – | Melihat Perkiraan nilai | Ya |
| Ekspor Word final | – | Ya, setelah Layak diajukan | – |

---

## A. Admin UPPS

Admin UPPS menyiapkan semua yang dipakai bersama: akun, program studi, instrumen, Basis Pengetahuan fakultas, kunci API,
dan penugasan reviewer LPMPP, lalu memantau kesiapan akreditasi semua prodi. Admin tidak menyusun LED. Sidebar Admin
UPPS:

- **Bersama (LED & LKPS)**: Dashboard akreditasi, Program studi, Instrumen LAM Teknik, Penugasan reviewer LPMPP, Kelola
  akun, Kunci API dan model AI.
- **LED** (tombol LED): **Pantau LED prodi** (beranda LED: satu kartu per prodi berisi progres narasi, jadwal, status
  review, dan reviewer LPMPP; klik kartu untuk membaca LED prodi hanya baca, atau Penilaian, Tugaskan reviewer, Catat
  hasil), Basis Pengetahuan fakultas.
- **LKPS** (tombol LKPS): Kelengkapan LKPS prodi.

### 1. Program studi dan identitas fakultas

Menu **Program studi**. Identitas fakultas (nama fakultas, perguruan tinggi, alamat, kota) diisi sekali. 16 prodi FT
Unila sudah terisi beserta tanggal akreditasi berakhir dan peringkat terakhir; lengkapi **kode PDDikti**, dan tambah prodi
bila perlu. Daftar diurutkan dari akreditasi yang paling dekat berakhir dan menampilkan kesiapan LED serta jumlah akun
Tim Prodi. Prodi yang masih punya LED atau akun Tim Prodi tidak bisa dihapus.

**Catat hasil akreditasi** (setelah SK akreditasi keluar). Tanggal akreditasi berakhir, peringkat, dan nomor SK prodi
diambil dari **Riwayat akreditasi** di halaman prodi, jadi jangan diketik ulang di formulir.

1. Buka prodi lalu klik **Catat hasil akreditasi**, atau klik **Catat hasil** di Dashboard akreditasi pada LED yang sudah Layak
   diajukan atau diekspor final.
2. Pilih LED yang diajukan (atau "Tanpa LED" untuk SK dari luar sistem) dan PDF SK, lalu klik **Isi dari PDF SK**.
   Tanggal berlaku, nomor SK, dan peringkat diisi dari teks SK tanpa AI dan ditandai "dari SK"; periksa semuanya.
3. Bila polanya tidak dikenali, isi manual atau klik **Baca dengan AI**. Perkiraan token dan modelnya tampil dulu, dan
   angka panjang seperti NIP disamarkan.
4. **Simpan**: langsung berlaku. Data prodi diperbarui, LED yang diajukan diarsipkan berlabel "Diajukan {tahun} ·
   {peringkat}", dan Tim Prodi diberi tahu.

Hasil yang dicatat Tim Prodi tampil di Riwayat akreditasi dengan status "Menunggu konfirmasi" dan Anda diberi tahu
lewat lonceng; klik **Konfirmasi**, atau **Tolak** dengan alasan. Bila tanggal akreditasi perlu dikoreksi langsung di
formulir prodi, isi **Alasan koreksi**; koreksi itu tercatat sebagai riwayat "Koreksi manual".

### 2. Kelola akun

- Klik **Tambah akun** (halaman sendiri), pilih peran (**Tim Prodi**, **Asesor (reviewer)**, atau **Admin UPPS**), lalu
  isi nama, email, dan kata sandi awal, lalu **Buat akun**; Anda kembali ke Kelola akun dengan pesan berhasil. Akun **Tim
  Prodi wajib memilih program studi**; satu prodi boleh punya beberapa akun (setiap anggota tim login sendiri dan
  menyusun LED yang sama).
- Menu baris akun → **Ubah nama** atau **Ubah peran**. Pilihan peran sama dengan Tambah akun; Tim Prodi wajib memilih
  prodi, dan prodi dikosongkan bila peran bukan Tim Prodi. Akun yang diubah keluar dari semua perangkat dan perubahan
  tercatat di Log aktivitas. Contoh: akun lama yang tampil sebagai Admin UPPS tetapi sebenarnya anggota tim prodi diubah
  menjadi Tim Prodi lewat **Ubah peran**.
- Kolom **Program studi** menunjukkan prodi setiap akun Tim Prodi. Anggota yang pindah prodi: menu baris → **Pindah
  program studi** (akun itu keluar dari semua perangkat).
- **Lupa kata sandi**: menu baris akun → **Atur ulang kata sandi**; pemilik akun wajib menggantinya saat login.
- **Pergantian anggota tim**: buat akun Tim Prodi baru, lalu nonaktifkan akun lama. LED dan riwayat versi milik prodi,
  jadi tidak ada yang hilang.
- Admin tidak bisa menonaktifkan, menghapus, atau mengubah peran akunnya sendiri; minimal ada satu Admin UPPS aktif.
- Kotak **Cadangan otomatis** menampilkan cadangan terakhir (lihat docs/PANDUAN-SERVER.md).

### 3. Kunci API (tab Kunci, Model Gemini, Log)

- **Kunci**: satu halaman dengan dua daftar. **Kunci utama fakultas** dipakai semua LED dan dicoba lebih dulu; **kunci
  cadangan** dipakai setelah semua kunci utama habis (bila diizinkan di tab Model Gemini). Buat kunci di
  aistudio.google.com → *Get API key*, klik **Tambah kunci** pada daftar yang sesuai, lalu **Uji koneksi**. Kunci
  disimpan terenkripsi; hanya 4 karakter terakhir yang ditampilkan. Judul halaman menyebut model yang sedang dipakai.
- **Model Gemini**: **Muat ulang daftar**, pilih model narasi, model cadangan, dan model embedding; **Uji model**.
  Nama model yang dipilih langsung tampil di tombol Generate, banner penyusunan, dan halaman awal.
- **Log**: panggilan model, token, durasi, dan galat (`kuota_harian` = kuota kunci habis).
- Tim Prodi tidak bisa mengelola kunci; saat kuota habis mereka melihat pesan "Hubungi Admin UPPS".

### 4. Instrumen per jenjang (± 5 tahun sekali)

Butir penilaian dan pertanyaan diambil dari berkas resmi LAM Teknik. LED baru otomatis memakai instrumen aktif jenjang
prodinya.

1. Menu **Instrumen** → **Instrumen baru**: pilih jenjang dan isi **Tahun instrumen** (tahun yang tertulis di Matriks
   Penilaian, misalnya 2025). Nama dan kode mengikuti jenjang dan tahun.
2. Unggah **Template LED (.docx)**, **Matriks Penilaian (.pdf)**, dan **Pedoman Penilaian (.pdf)** beserta halaman tabel
   bobot jenjang itu. Isi setiap berkas langsung diperiksa (lihat *Berkas yang benar* dan *Bila berkas ditolak* di
   bawah). Di bawah nama berkas tampil apa yang terbaca, misalnya "Terbaca: tahun 2025 · Sarjana · 7 kriteria".
3. Bila diminta, centang konfirmasi (misalnya "Saya sudah memastikan berkas ini instrumen tahun …" bila tahun tidak
   tertulis di Matriks), lalu **Mulai ekstraksi**: template dan tabel bobot dibaca tanpa AI, tabel matriks dibaca
   Gemini sedikit demi sedikit. Bila kuota habis, ekstraksi tertunda dan dilanjutkan otomatis setelah kunci baru diisi.
4. **Periksa hasil ekstraksi**: PDF asli di kiri, butir di kanan; kolom bertanda **usulan AI** wajib diperiksa.
5. Pemeriksaan otomatis harus lolos (total bobot 100, nomor berurutan, deskriptor skor 4, sub-bagian, instruksi).
6. **Sudah dicek, aktifkan**. Instrumen lama tetap tersimpan; LED lama tetap memakai versinya. Berkas versi yang
   diaktifkan dikenali sistem saat diunggah lagi. Di halaman versi lama, tombol **Tandai berkas usang** membuat
   berkasnya ditolak bila diunggah lagi; berkas yang juga dipakai versi aktif tidak ditandai.

**Berkas yang benar per jenjang** (unduh dari lamteknik.or.id, folder instrumen tahun itu):

| Berkas | Isi yang diperiksa | Contoh berkas 2025 |
| --- | --- | --- |
| Template LED (.docx) | "LAPORAN EVALUASI DIRI" di halaman awal; kriteria sama dengan Matriks | *Template LEDPS LAM Teknik … (Seluruh Jenjang).docx*, berlaku untuk semua jenjang |
| Matriks Penilaian (.pdf) | judul "MATRIKS PENILAIAN … PROGRAM {jenjang} IAPS-AV {tahun}" dan tabel No/Kriteria/Indikator/4–0 | *Matrik Penilaian LED dan LKPS {Jenjang} APS Akademik dan Vokasi Teknik 2025 ….pdf*, satu per jenjang |
| Pedoman Penilaian (.pdf) | "PEDOMAN PENILAIAN" dan tahunnya | *Pedoman Penilaian Instrumen LAM Teknik 2025.pdf*, satu untuk semua jenjang |

Template LED dari folder LPMPP ("Template Laporan Evaluasi Diri Program Studi APS … (LED Word).docx") adalah struktur
lama (2022, 9 kriteria) dan selalu ditolak. Template PJJ atau Unggul Internasional untuk instrumen reguler harus
dikonfirmasi lebih dulu.

**Bila berkas ditolak**: kotak merah di halaman versi menjelaskan alasannya, apa yang terbaca dari isi berkas (jenis,
tahun, jenjang, kriteria, berkas yang dikenali), dan langkah berikutnya. Berkas yang ditolak tidak disimpan.

- *Jenis berkas salah*: unggah berkas di baris yang sesuai (misalnya Pedoman di baris Matriks).
- *Tahun tidak sesuai*: periksa berkasnya, atau ubah **Tahun instrumen** di Identitas versi bila isiannya yang keliru.
- *Jenjang tidak sesuai*: unggah Matriks jenjang instrumen ini, atau buat instrumen baru untuk jenjang Matriks itu.
- *Kriteria template tidak cocok dengan Matriks*: template dan Matriks berasal dari tahun atau skema berbeda; ganti
  salah satunya.
- *Berkas usang / struktur LED lama*: pakai Template LEDPS LAM Teknik tahun itu dari lamteknik.or.id.
- *Format judul tidak dikenali* (kotak kuning, berkas tetap disimpan): template baru yang judulnya berbeda dari template
  yang dikenal. Buka **Pemetaan judul**, pilih peran setiap gaya paragraf (BAB, bagian Bab II, kriteria, judul
  sub-bagian, instruksi, abaikan), lalu lihat pratinjau: jumlah kriteria harus sama dengan Matriks. Usulan awal sudah
  diisi tanpa AI. Bila belum tepat, **Minta usulan AI** (memakai token): perkiraan token dan model tampil dulu, yang
  dikirim hanya kerangka judul, dan hasilnya hanya mengisi usulan yang ditandai "usulan AI". Simpan pemetaan, lalu
  lanjutkan ekstraksi dan periksa hasilnya di halaman Cek.

### 5. Basis Pengetahuan fakultas

Unggah sekali dokumen yang berlaku untuk semua prodi (VMTS dan Renstra fakultas, SK struktur organisasi, keuangan,
sarana-prasarana dan K3L, SPMI dan audit mutu). Semua LED memakainya saat menyusun narasi (kode sumber U1, U2, …). Tim
Prodi melihatnya di tab **Dokumen bersama fakultas** tanpa bisa mengubah.

### 6. Penugasan reviewer LPMPP dan Dashboard akreditasi

- **Penugasan asesor**: pilih asesor di kolom **Asesor** setiap LED; satu LED satu asesor. Asesor langsung diberi tahu.
- **Dashboard akreditasi** (`/dashboard`, fitur bersama; pemantauan khusus LED ada di **Pantau LED prodi**): matriks kinerja dan kesiapan semua prodi, urut
  akreditasi berakhir. Tab **Semua Prodi**, **Prioritas Re-akreditasi** (berakhir ≤ 18 bulan, sudah lewat, atau perlu
  LED baru), **Sudah Unggul**, dan **Dalam Review LPMPP**, masing-masing dengan jumlahnya. Kolom:
  - program studi dan jenjang (kode PDDikti, tanda Perlu LED baru dan status akun);
  - lembaga akreditasi dan peringkat (dari riwayat akreditasi);
  - masa berlaku dengan hitung mundur (Kritis ≤ 6 bulan, Perhatian ≤ 18 bulan);
  - kelengkapan LKPS (dari berkas LKPS LED) dan kelengkapan LED (sub-bagian berdraf, selesai dihitung penuh);
  - simulasi asesor (Σ bobot × skor dan proyeksi peringkat; bukan nilai resmi LAM);
  - status LPMPP (Belum ada LED, Penyusunan, Direview LPMPP, Revisi dari LPMPP, Layak diajukan, Siap diajukan ke LAM,
    Hasil menunggu konfirmasi, Hasil akreditasi dicatat) dan nama reviewernya;
  - aksi: **Detail** (halaman prodi dan riwayat akreditasi), **Lihat LED** (hanya baca: Penilaian, Ringkasan, narasi
    dan catatan reviewer), **Catat hasil**, dan **Ingatkan**.
- **Pengingat LED periode berikutnya**: setiap hari pukul 07.00 sistem mengirim pemberitahuan lonceng 18, 12, dan 6
  bulan sebelum akreditasi prodi berakhir (sekali per ambang) ke Tim Prodi prodi itu dan ke Admin UPPS, selama prodi
  belum memulai LED periode berikutnya. Di Dashboard akreditasi prodi itu bertanda **Perlu LED baru**; tombol **Ingatkan Tim
  Prodi** mengirim pengingat saat itu juga.
- **Akun Tim Prodi sebelum periode baru**: Dashboard akreditasi menandai jumlah akun Tim Prodi setiap prodi, dan Kelola
  akun menampilkan login terakhir setiap akun.
  Prodi bertanda **Belum ada akun Tim Prodi** atau **Periksa akun Tim Prodi** (semua akun tidak login lebih dari 12
  bulan) perlu diurus dulu: **Tambah akun** (prodi sudah terpilih) atau **Kelola akun** (tersaring prodi itu). Pastikan
  juga instrumen terbaru jenjang itu sudah aktif.

---

## B. Tim Prodi

Setelah login Tim Prodi langsung masuk ke **LED prodi**. Sidebar: grup **Bersama** (Identitas prodi), grup **LED** (LED
prodi), dan grup **LKPS** (Data LKPS), sesuai tombol LKPS | LED yang dipilih. Data LKPS diunggah sekali (Excel template LKPS LAM Teknik 2025 atau PDF per tabel) ke LED aktif dan
dipakai langsung untuk menyusun LED; menu Data LKPS membuka halaman yang sama dengan menu Data LKPS di dalam LED.
Klik LED: sidebar berganti menjadi menu **LED ini** (Beranda LED, Perkiraan nilai, Data LKPS, Basis Pengetahuan, Tim
penyusun, Ekspor Word), kriteria C.1–C.7, dan bab lain. Semua akun Tim Prodi satu prodi melihat dan menyusun LED yang
sama; riwayat versi mencatat siapa yang menyunting.

### 1. Persiapan

1. Login, lalu ganti kata sandi sementara.
2. **Identitas prodi**: lengkapi SK pendirian dan pembukaan, alamat, dan kontak. Nama prodi, jenjang, dan kode PDDikti
   diatur Admin UPPS; peringkat, nomor SK, dan tanggal akreditasi diambil dari riwayat akreditasi (Catat hasil
   akreditasi).

### 2. Membuat LED

1. **LED prodi**: bila prodi belum punya LED aktif, langsung tampil kartu **Mulai LED {prodi}**.
2. Program studi diambil dari akun. Isi **Tahun pengajuan**, lalu pilih **TS (tahun data LKPS)** dari dua pilihan, misalnya
   untuk pengajuan 2027:
   - **TS 2026/2027**: pakai bila data tahun akademik 2026/2027 sudah lengkap;
   - **TS 2025/2026**: pakai bila pengajuan sebelum tahun akademik 2026/2027 selesai.
   Pilihan bawaan dihitung dari usulan batas pengajuan (6 bulan sebelum akreditasi berakhir) dan dipilih ulang setiap
   kali tahun pengajuan diganti.
3. Klik **Mulai LED**. Nama LED dibuat otomatis, misalnya "LED Teknik Sipil 2027 (TS 2026/2027)", dan bisa diubah di
   **Pengaturan LED** (Beranda LED, paling bawah). Instrumen dipilih otomatis menurut jenjang prodi. Kartu LED menampilkan "TS 2026/2027 · pengajuan 2027"; label periode 5 tahun tampil kecil di
   Pengaturan LED.
4. **LED periode berikutnya**: bila akreditasi berakhir 18 bulan lagi atau kurang, LED aktif sudah Layak diajukan atau
   diekspor final, atau hasil akreditasinya sudah dicatat, kartu **Mulai LED periode berikutnya** tampil di LED prodi.
   Di keadaan lain, kartu itu dibuka dari Pengaturan LED dengan peringatan bahwa LED aktif belum selesai.
   1. Isi tahun pengajuan dan TS, seperti kartu Mulai LED.
   2. Pilih bahan yang disalin: tim penyusun (ditandai periksa ulang), bahan dari prodi (diberi awalan "[dari LED
      tahun]"), dan dokumen prodi satu per satu. Dokumen lebih tua dari 5 tahun tidak dicentang; berkasnya disalin lalu
      diproses ulang. Narasi lama tidak disalin, dan data LKPS juga tidak; unggah LKPS baru.
   3. Konfirmasi: LED lama diarsipkan (tetap bisa dibuka dan diekspor) dan LED baru memakai instrumen aktif jenjang
      prodi. Bila ada penyusunan berjalan atau instrumen belum aktif, tidak ada yang berubah.

   Di LED baru, narasi sub-bagian yang sama dari LED lama bisa dibaca di panel lipat **Narasi LED periode lalu** (tab
   Bahan). Bahan yang tidak punya padanan karena instrumen berganti tampil di Beranda LED sebagai **Bahan lama yang
   belum dipindah**.
5. **Catat hasil akreditasi**: setelah SK keluar, klik tombolnya di Beranda LED (LED yang Layak diajukan atau sudah
   diekspor final), pilih PDF SK, klik **Isi dari PDF SK**, periksa, lalu simpan. Catatan Anda berlaku setelah
   dikonfirmasi Admin UPPS.

### 3. Beranda LED

Dari atas: **Susun seluruh LED**, kartu **Perkiraan nilai** (total, perkiraan status, "Perkiraan, bukan nilai resmi LAM
Teknik"), **Review asesor**, dan **Jadwal kerja**. Jadwal kerja **hanya pengingat**: unggah dan penyusunan tetap bisa
dilakukan kapan saja walau tonggaknya terlewat. Kartu **Halaman otomatis dari data** menandai halaman muka, identitas
pengusul, dan tim penyusun "otomatis dari data" dan menyebut data yang masih kosong beserta tautan pengisiannya. Kartu
kunci API hanya menampilkan status; bila kunci habis, hubungi Admin UPPS.

### 4. Bahan penyusunan

1. **Data LKPS** → **Tambah data LKPS**: unggah Excel dari template LKPS LAM Teknik 2025, atau **banyak PDF sekaligus**
   (misalnya satu tabel per PDF, dicetak dari modul LKPS). Tabel dari semua PDF digabung; tabel yang sama memakai berkas
   terbaru. Excel lengkap menggantikan semua sumber lama. Kartu **Tabel LKPS** menunjukkan tabel yang sudah terbaca dan
   yang belum ada. Tabel dari PDF wajib dicek. Tabel **Metrik butir angka** menunjukkan sumber nilai tiap butir angka.
2. **Basis Pengetahuan**: tab **Dokumen LED ini** (Tambah dokumen, kaitkan ke sub-bagian, tahun terbit, tautan bukti)
   dan **Dokumen bersama fakultas** (hanya baca). **Uji cari** memeriksa apakah bukti sudah terbaca sebelum generate.
3. **Tim penyusun**: dosen (urutan pertama = ketua) dan tenaga kependidikan; mengisi halaman identitas tim dan Tabel 2.1
   dan 2.2. Nama dan nomor induk tidak dikirim ke Gemini.

### 5. Menyusun narasi

- **Susun seluruh LED** (Beranda): menyusun semua bagian berurutan, C.1–C.7, Bab II.A, II.B, III, I, IV, lalu kata
  pengantar dan ringkasan eksekutif paling akhir. Sub-bagian yang sudah ditandai **selesai** dilewati. Konfirmasi
  menyebut jumlah sub-bagian. Banner di atas halaman menampilkan "Bagian 3 dari 12" dan model yang dipakai
  ("Disusun dengan Google Gemini ..."). Bila kuota habis, penyusunan berhenti rapi dan lanjut setelah Admin UPPS menambah
  kunci atau kuota direset. **Batalkan** menghentikan seluruh rangkaian; draf yang sudah jadi tetap tersimpan.
- Per kriteria: ringkasan kriteria → **Generate semua**, **Lanjutkan**, **Tandai selesai**.
- Per sub-bagian: di atas ada kode, "3 dari 7", judul, status, dan **Generate**; **Sebelumnya**, pemilih sub-bagian
  (dropdown "3 dari 7"), dan **Berikutnya** menyimpan isian dulu sebelum pindah. Halaman punya dua tab:
  - **1. Bahan untuk AI**: instruksi template, butir dan daftar cek skor 4 (bisa dilipat; terbuka bila belum ada narasi),
    Data LKPS atau Nilai hitung dan target, **Bahan dari prodi (untuk AI)**, dokumen, lalu tombol **Generate narasi**.
    Bahan dari prodi diisi fakta yang belum ada di dokumen (kegiatan, nomor dan tanggal SK, angka, rencana); AI
    memakainya saat menyusun narasi (sumber J). Isian ini tidak ikut diekspor; yang diekspor adalah Narasi.
  - **2. Narasi (masuk ke Word)**: editor selebar halaman, info versi dan model AI, sakelar **Selesai**, keterangan kode
    sumber, dan **Riwayat versi**. Tab ini terbuka lebih dulu bila sudah ada draf.
- Baris **Periksa** di atas editor: **Catatan asesor (n)**, **Pemeriksaan (n)**, **Verifikasi (n)**. Klik untuk membuka
  panel samping; panel bisa ditutup dan tidak terbuka sendiri. Bila ada catatan asesor yang belum diperbaiki, pita kuning
  dengan tombol **Lihat catatan** tampil di atas editor.
- Baca hasil: penanda sumber (D dokumen, U dokumen bersama, T tabel LKPS, M metrik, J = Bahan dari prodi), pemeriksaan
  otomatis, verifikasi per kalimat (hijau/kuning/merah), **Periksa dengan AI**. Sunting langsung; setiap suntingan
  tersimpan sebagai versi dan bisa dibandingkan atau dipulihkan.

### 6. Perkiraan nilai

Menu **Perkiraan nilai** (atau klik kartu di Beranda). Ringkasan di atas: total nilai, persentase dari 400, perkiraan
status menurut Pedoman Penilaian, jumlah butir yang punya skor, dan batang nilai per kriteria. Tabel per kriteria:
Butir, Bobot, **Skor otomatis** (AI untuk butir narasi, sistem dari LKPS untuk butir angka), **Skor asesor**, Nilai
(bobot × skor), dan Persentase. Klik baris butir untuk membaca narasi sub-bagian terkait, deskriptor skor terpilih, dan
alasan serta **unsur skor 4 yang kurang** menurut AI.

Klik **Hitung usulan skor** setelah narasi tersusun (berjalan di latar). Butir yang narasinya tidak berubah tidak dihitung
ulang; butir yang narasinya berubah ditandai "narasi berubah". Skor resmi tetap diberikan asesor; Tim Prodi tidak bisa
mengubah skor.

### 7. Review asesor

1. Beranda → **Review asesor** → **Ajukan review** (perlu asesor yang ditugaskan Admin UPPS).
2. Catatan asesor muncul di halaman sub-bagian: kalimatnya disorot dan pita kuning menampilkan **Lihat catatan** (panel
   **Catatan asesor**). Perbaiki narasi, lalu **Sudah diperbaiki**;
   saling **Balas** bila perlu. Kotak Review asesor di Beranda menautkan langsung ke bagian yang perlu ditinjau.
3. **Perlu revisi**: perbaiki lalu **Ajukan review ulang**. **Layak diajukan**: ekspor Word final terbuka.

### 8. Ekspor Word

- **Ekspor DRAF** kapan saja (setiap halaman bertanda DRAF).
- **Ekspor final** setelah Layak diajukan, semua bagian selesai, tanpa penanda `[BELUM ADA BUKTI: …]`, setiap dokumen
  yang dirujuk punya tautan bukti, dan perbedaan angka antar kriteria sudah diperbaiki atau diberi alasan.
- Buka di Microsoft Word, pilih **Yes/Ya** untuk memperbarui field, ganti kotak logo, lalu simpan. Berkas final lebih dari
  150 halaman (sebelum Lampiran) ditahan.

### 9. Kuota dan data pribadi

Kuota Gemini gratis kecil dan dihitung per project Google dan per model. Saat kuota habis penyusunan berhenti rapi;
hubungi Admin UPPS untuk menambah kunci atau model cadangan, atau tunggu reset harian (sekitar 14.00–15.00 WIB). Sebelum
dikirim ke Gemini, NIDN/NIDK/NIP/NIM/NIK dan nama mahasiswa disamarkan otomatis; tetap hindari menulis data pribadi yang
tidak perlu.

---

## C. Asesor

Peran ini tampil sebagai **Reviewer LPMPP**. Setelah login langsung masuk ke **LED ditugaskan**. Di dalam satu LED:
**Penilaian** (paling atas), **Ringkasan review**, lalu daftar kriteria dan bab. Asesor tidak bisa menyunting narasi,
menjalankan generate, atau mengekspor.

1. **LED ditugaskan** menampilkan LED dari Admin UPPS beserta status review dan jumlah catatan. Catatan dan skor bisa
   diberikan setelah Tim Prodi menekan **Ajukan review** (status **Direview**).
2. Buka sub-bagian, **blok (sorot) kalimat**, tulis catatan revisi, lalu **Kirim catatan**. Catatan langsung muncul di
   layar Tim Prodi; catatan Terbuka bisa dihapus bila salah blok. Daftar catatan ada di panel samping **Catatan asesor**
   (tombol di baris Periksa, atau klik kalimat yang disorot).
3. Saat Tim Prodi menandai **Sudah diperbaiki**, pemberitahuan masuk ke lonceng, pita kuning tampil di halaman
   sub-bagian, dan Ringkasan review menampilkannya di *Menunggu Anda*. **Bandingkan** versi saat catatan dibuat dan saat ditandai diperbaiki, lalu **Terima** atau **Balas**
   → **Buka lagi**.
4. **Penilaian**: ringkasan di atas (total, persentase, perkiraan status, batang per kriteria) berubah **langsung** saat
   skor dipilih. Tabel per kriteria memuat skor otomatis (usulan AI atau skor sistem LKPS) sebagai acuan; klik baris butir
   untuk membaca **narasinya di halaman yang sama**, deskriptor skor, dan alasan AI. Pilih skor 0–4 di kolom **Skor
   asesor**; skor butir angka yang berbeda dari hitungan sistem wajib diberi alasan.
5. Di bagian bawah halaman Penilaian: **Layak diajukan** bisa dipilih setelah semua catatan diterima dan semua butir
   diberi skor asesor; ekspor final Tim Prodi lalu terbuka. **Perlu revisi** mengembalikan LED ke Tim Prodi (tulis catatan
   umum bila tidak ada catatan yang masih terbuka). Nilai ini simulasi internal, bukan keputusan LAM Teknik.

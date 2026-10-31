# Rencana revisi 31 Oktober 2026: peran Pak Tris dan masukan pertemuan 6

Dokumen kerja untuk Claude Code. Sumbernya masukan Pak Tris pada pertemuan 6 (presentasi progres ±27 Okt 2026; transkrip
`../Led Lamteknik/Audio Text/Pa tris 6 full transkrip.txt`) dan keputusan Adrianne pada 31 Okt 2026. Ringkasan Pak Tris:
"Kalau ini sih tadi yang masalah user, ya. User, terus bagian penilaian ininya digede-gedein terus. Yang lainnya udah
bagus, kok."

Kerjakan **tahap demi tahap sesuai urutan**. Setiap tahap punya kriteria selesai. Jangan lanjut ke tahap berikutnya
sebelum kriteria tahap berjalan terpenuhi dan perubahannya di-commit.

## Aturan kerja

1. Baca `CLAUDE.md`, `src/modules/README.md`, dan dokumen ini sampai habis sebelum menulis kode.
2. Kerjakan di branch `revisi-31okt`, jangan langsung di `main`. Buat satu commit atau lebih per tahap, dengan pesan
   berbahasa Indonesia, misalnya `Revisi 31 Okt tahap 1: peran Admin UPPS, Tim Prodi, Asesor`.
3. Setelah setiap tahap jalankan `npm run lint`, `npm run typecheck`, `npm run test:unit`, dan `npm run test:integrasi`.
   Semuanya harus lulus. Uji domain tidak boleh dihapus atau dilemahkan.
4. Untuk migrasi Prisma, ikuti cara di `CLAUDE.md` bagian Perintah (`--to-schema prisma/schema`, lalu hapus baris
   `DROP INDEX "Potongan_embedding_hnsw_idx"`).
5. Jaga batas modul: `tests/unit/batas-modul.test.ts` harus tetap lulus. Kode LKPS tidak memakai kode LED.
6. Teks antarmuka berbahasa Indonesia, singkat, ramah, dan konsisten dengan istilah di dokumen ini.
7. Bila menemui hal yang bertentangan dengan dokumen ini atau dengan `CLAUDE.md`, berhenti dan tanyakan ke Adrianne.
   Jangan menebak.
8. Di akhir setiap tahap tambahkan catatan ke `docs/CATATAN-PENGEMBANGAN.md` di bagian
   "Revisi 31 Oktober 2026 (peran dan masukan Pak Tris 6)": apa yang dibuat, keputusan teknis, dan hasil uji.
   Catatan ini menjadi bahan Bab 3 skripsi.

## Keputusan Adrianne (31 Okt 2026)

- Peran mengikuti Pak Tris dan **hanya tiga**: **Admin UPPS**, **Tim Prodi**, dan **Asesor (reviewer internal)**
  ("Tim Prodi, Asesor, Admin", transkrip ±39:00). Peran "Penanggung jawab fakultas" dan "Super admin" dihapus,
  tidak ada peran keempat. Di antarmuka, kata "PJ"/"penanggung jawab" diganti "Tim Prodi" atau "Admin UPPS".
- Cakupan: peran ditambah semua masukan Pak Tris pertemuan 6.
- **Tim Prodi membuat LED** untuk prodinya sendiri. Prodi terisi otomatis dari akunnya.
- **Satu prodi boleh punya beberapa akun Tim Prodi.** Setiap anggota punya login sendiri, dan semua akun satu prodi
  melihat dan mengisi LED prodi itu.

## Keputusan bawaan (berlaku bila Adrianne tidak mengubahnya sebelum dieksekusi)

| No | Hal | Keputusan bawaan | Alasan |
| --- | --- | --- | --- |
| B1 | Nama peran di kode | Enum `Peran`: `SUPER_ADMIN` → `ADMIN`, `PENANGGUNG_JAWAB` → `TIM_PRODI`, `ASESOR` tetap. Label: "Admin UPPS", "Tim Prodi", "Asesor (reviewer)" | Sama dengan istilah Pak Tris dan rekan LKPS |
| B2 | Akun PJ fakultas yang sudah ada | Dimigrasi menjadi `ADMIN`, karena tugas PJ lama (prodi, instrumen, dokumen fakultas, kunci) kini milik Admin UPPS. Akun Tim Prodi dibuat baru oleh admin | Tidak ada fungsi yang hilang |
| B3 | Kunci API | Hanya Admin UPPS yang mengelola: kunci utama fakultas dan kunci cadangan di satu halaman. Tim Prodi melihat status kunci dan pesan "Hubungi Admin UPPS" saat kuota habis | "Admin = yang nyetting-nyetting" |
| B4 | Identitas prodi (SK, alamat, kontak) | Admin mengelola daftar prodi. Tim Prodi boleh mengubah **identitas** prodinya sendiri, tetapi tidak nama dan jenjang | Data identitas paling dikuasai prodi |
| B5 | Admin dan LED | Admin melihat **semua LED** (kemajuan, kesiapan, status review) dan bisa membukanya **hanya baca**. Admin tidak menyusun, generate, atau ekspor | UPPS memantau semua prodi |
| B6 | Basis Pengetahuan fakultas | Diunggah Admin UPPS. Tim Prodi melihat dan memakainya (tab "Dokumen bersama fakultas"). Dokumen prodi diunggah Tim Prodi di dalam LED | Pak Tris: data fakultas dan prodi dipisah |
| B7 | Penugasan asesor | Tetap oleh Admin UPPS, satu asesor per LED | Sudah berjalan |

---

## Tahap 0: Simpan struktur satu website dua modul

Perubahan 31 Okt (satu website, modul `bersama`/`led`/`lkps`, rute `/led`, `/lkps`, `/pengaturan`) sudah ada di folder
kerja tetapi belum di-commit.

1. Buat branch `revisi-31okt` dari `main`.
2. Folder rute lama yang sudah kosong (`src/app/proyek`, `src/app/asesor`, `src/app/api/{proyek,dokumen,ekspor,instrumen}`)
   boleh dihapus bila memang tidak berisi berkas.
3. Jalankan semua pemeriksaan, lalu commit dengan pesan
   `Struktur satu website dua modul: halaman awal pilih LKPS/LED, src/modules/{bersama,led,lkps}, skema Prisma per modul`.
   Git akan mendeteksi pemindahan berkas sebagai rename.

**Kriteria selesai:** `git status` bersih dan semua pemeriksaan lulus.

## Tahap 1: Peran Admin UPPS, Tim Prodi, Asesor

### Data

- Migrasi enum `Peran` dengan `ALTER TYPE "Peran" RENAME VALUE`, sesuai B1. Akun `PENANGGUNG_JAWAB` lama menjadi
  `ADMIN` (B2), jadi migrasinya: ubah nilai enum, lalu `UPDATE "user" SET role = 'ADMIN' WHERE role = 'TIM_PRODI'` di
  migrasi yang sama, karena saat itu belum ada Tim Prodi.
- `User.prodiId String?`, berelasi ke `Prodi` dengan `onDelete: Restrict`. Wajib diisi untuk `TIM_PRODI` dan kosong
  untuk peran lain. Tambahkan juga relasi balik `Prodi.anggota User[]`.
- Better Auth (`src/modules/bersama/auth.ts`): `adminRoles: ["ADMIN"]`, `defaultRole: "TIM_PRODI"`, dan tambahkan
  `prodiId` di `user.additionalFields` (`input: false`). Ganti `appName` menjadi "Akreditasi LAM Teknik".
- `src/modules/bersama/peran.ts`: daftar `PERAN`, `LABEL_PERAN`, `peranAkses`, dan `berandaPeran`. Semua peran kini
  masuk ke halaman awal `/`.

### Akses (`src/modules/bersama/akses.ts`, `sesi.ts`)

- `Pengguna` mendapat `prodiId: string | null`. Isinya dibaca di `ambilPengguna`.
- Ganti `pastikanSuperAdmin`/`pastikanPenanggungJawab` dengan `pastikanAdmin`, `pastikanTimProdi`, dan
  `pastikanProdiSendiri(p, prodiId)`. Untuk Tim Prodi, aturannya `p.prodiId === prodiId`; selain itu `GalatAkses`.
- Ganti juga `wajibSuperAdmin`/`wajibPenanggungJawab` dengan `wajibAdmin`, `wajibTimProdi`, dan `wajibPeran(...peran)`.
- `ambilProyek(p, id, { baca })` di `src/modules/led/data/proyek.ts`:
  - Tim Prodi hanya untuk LED prodinya.
  - Admin hanya bila `baca: true` (B5).
  - Asesor seperti sekarang.
- `ambilProyekUbah`: hanya Tim Prodi untuk prodinya sendiri.
- `daftarProyek`: Tim Prodi mendapat LED prodinya, Admin mendapat semua LED.
- `buatProyek`: hanya Tim Prodi, dan `prodiId` diambil dari akun, bukan dari masukan.
- Periksa **setiap** fungsi di `src/modules/*/data/` yang memanggil fungsi pemeriksa lama, lalu tetapkan peran
  barunya mengikuti tabel di bawah.

| Fitur | Admin UPPS | Tim Prodi | Asesor |
| --- | --- | --- | --- |
| Kelola akun (Admin, Tim Prodi + prodi, Asesor), atur ulang sandi, nonaktifkan | Ya | – | – |
| Program studi dan identitas fakultas | Ya | Identitas prodi sendiri (B4) | – |
| Instrumen per jenjang (unggah, cek, aktifkan, tambah kriteria) | Ya | – | – |
| Basis Pengetahuan fakultas | Unggah dan hapus | Lihat | – |
| Kunci API, model Gemini, log pemakaian, status cadangan | Ya | Lihat status kunci | – |
| Penugasan asesor | Ya | – | – |
| Semua LED dan kemajuannya | Semua prodi, hanya baca | Prodi sendiri | LED yang ditugaskan |
| Buat LED, Data LKPS, dokumen prodi, tim penyusun, jawaban, generate, sunting, ekspor | – | Ya (prodi sendiri) | – |
| Ajukan review, tandai catatan sudah diperbaiki | – | Ya | – |
| Catatan revisi, terima/buka lagi, skor, keputusan | – | – | Ya |

- Pemberitahuan (`src/modules/led/data/review.ts`): `idPjAktif()` diganti `idTimProdiAktif(prodiId)`, yaitu semua akun
  Tim Prodi aktif di prodi LED itu.
- `KunciAPI.pemilik` boleh tetap memakai nilai lama di basis data. Labelnya di antarmuka menjadi "Kunci utama fakultas"
  dan "Kunci cadangan", dan keduanya dikelola Admin (B3).

### Akun (`src/modules/bersama/data/organisasi.ts`, `src/app/admin/akun`)

- "Tambah akun" menampilkan pilihan peran beserta penjelasan singkat. Bila memilih Tim Prodi, wajib memilih program
  studi.
- Daftar akun menampilkan kolom Prodi. Admin bisa memindahkan akun Tim Prodi ke prodi lain.
- Prodi yang masih punya akun Tim Prodi atau LED tidak bisa dihapus. Tampilkan pesan yang jelas.
- Aturan lama tetap berlaku: wajib ganti sandi, minimal satu admin aktif, admin tidak bisa menonaktifkan dirinya
  sendiri.

### Uji

- Perbarui uji integrasi yang memakai PJ: `akses`, `akun`, `review`, `alur-penuh`, dan uji lain yang memanggil
  `buatAkunPenanggungJawab`.
- Tambah uji baru:
  - Tim Prodi A tidak bisa membaca atau mengubah LED prodi B.
  - Tim Prodi tidak bisa membuat LED untuk prodi lain.
  - Admin bisa membaca semua LED tetapi tidak bisa mengubahnya.
  - Dua akun Tim Prodi di prodi yang sama sama-sama bisa menyunting LED, dan riwayat versi mencatat penyuntingnya.
  - Pemberitahuan review sampai ke semua Tim Prodi di prodi itu, dan tidak sampai ke prodi lain.

**Kriteria selesai:** semua uji lulus; uji akses baru lulus; tidak ada lagi `PENANGGUNG_JAWAB` atau `SUPER_ADMIN` di
`src/` dan `tests/` kecuali di migrasi.

## Tahap 2: Menu dan halaman per peran

- **Halaman awal `/`:**
  - Ketiga peran memilih modul.
  - Admin UPPS melihat kartu LKPS dan LED, serta bagian **Pengaturan UPPS** berisi Kelola akun, Program studi, Kunci API
    dan model, Penugasan asesor, dan Instrumen.
  - Tim Prodi melihat kartu LKPS dan LED dengan nama prodinya di bawah sapaan.
  - Asesor tetap seperti sekarang.
- **Sidebar Admin UPPS:**
  - Grup "Pengaturan UPPS": Kelola akun, Program studi, Kunci API (tab Kunci, Model Gemini, Log), Penugasan asesor.
  - Grup "LED": Pantau LED, Instrumen, Basis Pengetahuan fakultas.
  - Grup "LKPS": kosong dulu.
  - Halaman `/pengaturan/prodi` dan `/pengaturan/kunci-api` menjadi milik admin. Gabungkan halaman kunci admin dan kunci
    fakultas menjadi satu halaman: `/admin/kunci-api` dengan dua daftar, lalu arahkan `/pengaturan/kunci-api` ke sana.
- **Rute LED** dipisah dengan grup rute:
  - `src/app/led/(tim-prodi)/`: `/led`, `/led/baru`, `/led/[proyekId]/*`.
  - `src/app/led/(admin)/`: `/led/instrumen`, `/led/dokumen-bersama`, `/led/pantau`.
  - `src/app/led/asesor/` tetap.
  - Halaman baca LED untuk admin: pakai ulang tampilan hanya-baca asesor (`/led/asesor/[proyekId]/...`), dengan
    pemeriksaan peran yang mengizinkan Admin tanpa alat catatan dan skor. Bisa juga dipindah ke `/led/baca/[proyekId]`
    yang dipakai Admin dan Asesor; pilih yang lebih sedikit duplikasinya.
- **`/led/pantau` (Admin):** semua LED per prodi, urut menurut akreditasi berakhir, dengan kesiapan, jadwal, status
  review, asesor, dan tombol "Lihat". Pakai ulang `KartuLed`/`kesiapanSemua`.
- **Tim Prodi:**
  - `/led` berisi LED prodinya (aktif dan arsip). Bila belum ada LED aktif, tampilkan tombol besar "Buat LED".
  - Sidebar LED Tim Prodi tidak lagi berisi Program studi, Instrumen, atau Kunci API.
  - Basis Pengetahuan fakultas tetap terlihat lewat tab di dalam LED.
- **Tombol pindah modul LKPS | LED** tetap ada. Untuk admin, "LED" membuka `/led/pantau`.
- `src/app/lkps/layout.tsx`: izinkan ketiga peran. Perbarui menu LKPS sesuai peran, walau isinya masih kerangka.
- Perbarui `src/components/shell/menu-peran.ts`, `shell-bersama.tsx`, `shell-peran.tsx`,
  `src/modules/led/komponen/shell-led.tsx`, `src/modules/lkps/komponen/shell-lkps.tsx`, dan `src/app/page.tsx`.

**Kriteria selesai:**
- Uji browser dengan tiga akun uji (Admin, Tim Prodi, Asesor): setiap peran hanya melihat menu miliknya.
- Membuka alamat milik peran lain diarahkan ke halaman awal.
- Pengalihan alamat lama di `next.config.ts` tetap berfungsi.

## Tahap 3: Program studi FT sudah terisi

Pak Tris: daftar prodi sebaiknya sudah terisi semua, dan tetap bisa ditambah.

- Buat berkas data `data/prodi/ft-unila.json` dan seed idempoten berdasarkan kombinasi `nama` + `jenjang`. Jalankan dari
  `prisma/seed.ts` dan dari pemasangan pertama (`src/modules/bersama/data/pemasangan.ts`).
- Isi 16 prodi LAM Teknik FT Unila (sumber: SAKTI LAM Teknik dan unila.ac.id, diakses 3 Okt 2026). Kode jenjang
  mengikuti `src/modules/bersama/domain/jenjang.ts`.

| Jenjang | Program studi | Akreditasi berlaku sampai |
| --- | --- | --- |
| D3 | Teknik Mesin | 2027-12-20 |
| D3 | Teknik Sipil | 2029-12-20 |
| D3 | Teknik Survey dan Pemetaan | 2027-12-20 |
| STr | Teknologi Rekayasa Otomotif | 2030-08-20 |
| S1 | Teknik Elektro | 2030-08-20 |
| S1 | Teknik Geodesi | 2029-04-20 |
| S1 | Teknik Geofisika | 2027-12-20 |
| S1 | Teknik Kimia | 2030-08-20 |
| S1 | Teknik Lingkungan | 2029-12-20 |
| S1 | Teknik Mesin | 2030-08-20 |
| S1 | Teknik Sipil | 2026-12-20 |
| S1 | Teknik Geologi | 2030-12-20 |
| S2 | Teknik Elektro | 2029-08-20 |
| S2 | Teknik Mesin | 2027-12-20 |
| S2 | Teknik Sipil | 2029-08-20 |
| PPI | Program Profesi Insinyur | 2031-08-20 |

- Peringkat terakhir ikut diisi di `identitas.peringkatAkreditasi`: D3 Mesin, D3 Sipil, D3 Survey dan Pemetaan,
  S1 Geodesi, dan ketiga S2 = Baik Sekali; STr Otomotif dan S1 Lingkungan = Baik; S1 Elektro, Geofisika, Kimia, dan
  Mesin = Unggul; S1 Sipil = A; S1 Geologi = Terakreditasi; PPI = Terakreditasi Unggul.
- Seed tidak menimpa prodi yang sudah ada dan tidak menghapus apa pun. Kode PDDikti dikosongkan untuk diisi admin.
- Identitas fakultas bawaan: "Fakultas Teknik", "Universitas Lampung", kota "Bandar Lampung". Hanya diisi bila masih
  kosong.

**Kriteria selesai:** basis data kosong berisi 16 prodi setelah `npm run db:seed`. Menjalankan seed dua kali tidak
membuat data ganda. Ada uji integrasi untuk seed prodi.

## Tahap 4: LED baru berfokus pada TS

Pak Tris: "Fokusnya adalah kalau saya maju tahun 2027, saya pakai TS-nya kapan? Kalau 2027 kan bisa pakai TS 2026 atau
2027." Label "Periode 2027–2032" bukan hal utama.

- Formulir LED baru (`src/app/led/(tim-prodi)/form-proyek-baru.tsx`, `src/modules/led/validasi.ts`, `buatProyek`):
  - Prodi tidak dipilih lagi; diambil dari akun Tim Prodi dan ditampilkan sebagai teks.
  - Isian **Tahun pengajuan**.
  - **TS (tahun data LKPS)** berupa dua pilihan radio: TS = (P−1)/P dan TS = (P−2)/(P−1), dengan P = tahun pengajuan.
    Setiap pilihan diberi keterangan singkat: "pakai bila data tahun akademik (P−1)/P sudah lengkap" dan "pakai bila
    pengajuan sebelum tahun akademik itu selesai".
  - Pilihan bawaan dihitung dengan `tsDariTanggalPengajuan(batasPengajuan ?? hari ini)`.
  - Nama LED otomatis "LED {prodi} TS {tahun akademik}" dan masih bisa diubah.
- `skemaProyek` menerima `tsTahunMulai`. Nilainya harus salah satu dari dua pilihan; selain itu ditolak.
- Label periode 5 tahun hanya tampil kecil di Pengaturan LED. Di kartu LED dan judul, ganti dengan "TS 2026/2027 ·
  pengajuan 2027".
- Tambahkan fungsi murni `pilihanTs(tahunPengajuan)` di `src/modules/bersama/domain/tahun-akademik.ts` beserta ujinya.

**Kriteria selesai:** uji domain `pilihanTs` lulus; uji integrasi membuat LED dengan masing-masing pilihan TS lulus;
TS di luar pilihan ditolak.

## Tahap 5: Penilaian di depan dan menonjol

Pak Tris:
- Penilaian "di depan", dengan dua cara: skor otomatis dari rubrik (sistem mencocokkan isi narasi dengan rubrik) dan
  reviewer mengisi manual.
- Isi narasi harus tampil di form penilaian, tidak perlu diunduh.
- Tampilkan skala atau persentase (bobot × skor) dan totalnya.

### Usulan skor otomatis (AI) untuk butir narasi

- Model baru `UsulanSkor` di `prisma/schema/led.prisma`:
  `{ id, proyekId, butirKode, skor Float, alasan String, unsurTerpenuhi Json, unsurKurang Json, model String,
  versiDrafIds Json, dibuatPada }`, dengan `@@unique([proyekId, butirKode])`.
- Antrean LED baru `skor-rubrik` di `ANTREAN` (`src/modules/bersama/antrean.ts`), pengerja di `src/worker/led.ts`, dan
  proses di `src/modules/led/proses/skor-rubrik.ts`.
- Untuk setiap butir narasi:
  - Ambil narasi versi aktif dari sub-bagian terkait (relasi `ButirSubBagian`). Samarkan dulu dengan `samarkanTeks`.
  - Panggil LLM lewat `panggilTerstruktur` dengan masukan indikator, deskriptor skor 0–4 dari matriks, unsur skor 4,
    dan narasi.
  - Keluaran skema Zod: `{ skor: 0..4, alasan, unsurTerpenuhi[], unsurKurang[] }`.
- Butir angka tidak memakai AI: skornya tetap `skorSistem` dari LKPS (sudah ada di `nilai-butir.ts`).
- Saat kunci habis, berhenti rapi seperti generate, lalu lanjut setelah kunci baru ditambahkan.
- Logika murni (bobot × skor, persentase, total, perkiraan status, butir mana yang perlu dinilai ulang karena narasinya
  berubah sejak usulan dibuat) ditaruh di `src/modules/led/domain/review.ts` dan diberi uji.

### Halaman Penilaian

- **Asesor:** "Penilaian" menjadi item **pertama** di menu LED asesor, sebelum Ringkasan review.
- **Tim Prodi:** halaman baru `/led/[proyekId]/penilaian` ("Perkiraan nilai"), ditautkan dari kartu paling atas di
  Beranda LED.
  - Berisi usulan skor AI, skor sistem, skor asesor (bila sudah ada), unsur yang kurang, dan tombol "Hitung usulan skor"
    yang menjalankan antrean.
  - Tim Prodi tidak bisa mengubah skor.
- **Isi halaman** (dipakai bersama asesor dan Tim Prodi):
  1. Ringkasan besar di atas: **total nilai**, persentase dari nilai maksimum, perkiraan status (aturan
     `statusAkreditasi` versi instrumen), jumlah butir yang sudah dinilai, dan grafik batang nilai per kriteria.
  2. Tabel per kriteria dengan kolom: Butir, Bobot, Skor otomatis (AI atau sistem), Skor asesor, Nilai (bobot × skor),
     dan Persentase.
  3. Setiap baris bisa dibuka dan menampilkan **narasi sub-bagian terkait apa adanya** (hanya baca), deskriptor skor
     terpilih, serta alasan dan unsur kurang dari AI.
  4. Bagi asesor: pilih skor, isi alasan bila berbeda dari skor sistem (aturan lama tetap berlaku), lalu keputusan
     Layak diajukan atau Perlu revisi di bagian bawah.
- Kartu Beranda LED untuk Tim Prodi menampilkan total dan perkiraan status, dengan label "perkiraan, bukan nilai resmi
  LAM Teknik".

**Kriteria selesai:**
- Uji domain nilai (bobot × skor, persentase, total) lulus.
- Uji integrasi usulan skor memakai `LLM_NARASI=uji`.
- Uji browser: asesor menilai sambil membaca narasi di halaman yang sama, dan total berubah langsung.

## Tahap 6: Susun otomatis dari depan sampai belakang

Pak Tris: otomatis sampai kata pengantar dan sampul, karena "kecenderungan orang itu malas ... lebih mudah ngedit
dibandingkan create".

- Tombol **"Susun seluruh LED"** di Beranda LED (Tim Prodi) membuat satu rangkaian tugas generate untuk semua bagian
  dengan urutan:
  1. C.1–C.7, dengan urutan IKU → LB/KEB → AF → SWOT seperti sekarang;
  2. II.B, lalu III, lalu I, lalu IV;
  3. terakhir AWAL-PENGANTAR dan AWAL-RINGKASAN, karena isinya merangkum bagian lain.
- Sub-bagian yang sudah ditandai **selesai** dilewati. Konfirmasi dulu sebelum mulai, dan sebutkan jumlah sub-bagian
  yang akan disusun.
- Implementasi: tambahkan kolom `bagianBerikutnya String[]` di `TugasGenerate` (atau model rangkaian sendiri). Setelah
  satu bagian selesai, worker membuat tugas bagian berikutnya. Banner antrean menampilkan "Bagian 3 dari 12".
  - Bila kunci habis, berhenti rapi lalu lanjut.
  - Tombol Batalkan menghentikan seluruh rangkaian.
- Halaman muka (sampul), identitas, dan tabel tim sudah diisi dari data saat ekspor. Pastikan pratinjau di Beranda
  menandai bagian ini "otomatis dari data", dan tunjukkan data apa yang masih kosong (misalnya SK pendirian belum diisi).

**Kriteria selesai:** uji integrasi rangkaian dengan `LLM_NARASI=uji` lulus (urutan benar, sub-bagian selesai dilewati,
berhenti dan lanjut saat kunci habis, batal menghentikan semuanya).

## Tahap 7: Jadwal kerja hanya pengingat, dan model AI disebut jelas

- **Jadwal kerja:**
  - Pastikan tidak ada aksi yang ditolak karena jadwal terlewat (unggah, generate, ekspor, ajukan review). Saat ini
    jadwal memang hanya peringatan; tambahkan uji yang memastikan hal itu.
  - Ubah teks kartu Jadwal kerja: "Jadwal ini hanya pengingat. Unggah dan penyusunan tetap bisa dilakukan kapan saja."
- **Model AI:**
  - Tampilkan model yang dipakai di tempat yang terlihat: tombol/banner generate ("Disusun dengan Google Gemini
    {model narasi}") dan halaman Kunci API admin.
  - Halaman awal mendapat keterangan kecil di bawah kartu LED: "AI: Google Gemini ({model}); pencarian dokumen:
    {model embedding}".
  - Ambil nama model dari `PengaturanLLM`, jangan ditulis tetap di kode.

**Kriteria selesai:** uji integrasi unggah/generate setelah tonggak terlewat tetap berhasil, dan nama model tampil
sesuai pengaturan.

## Tahap 8: Data LKPS berupa PDF per tabel

Pak Tris: LKPS dicetak PDF per tabel lalu diunggah ke LED sebagai sumber, tanpa menunggu LKPS selesai.

- Halaman Tambah data LKPS menerima **banyak berkas PDF sekaligus**. Setiap berkas dibaca (`src/modules/led/data-lkps/baca-pdf.ts`)
  dan tabel hasilnya digabung ke data LKPS LED itu.
  - Bila tabel yang sama datang dari dua berkas, yang terbaru dipakai.
  - Tampilkan daftar tabel yang terbaca dan tabel yang belum ada.
- Uji dengan fikstur: pecah `tests/fikstur/lkps-contoh-s1.pdf` menjadi beberapa PDF per tabel memakai `pdf-lib`
  (devDependency yang sudah ada), lalu pastikan hasilnya sama dengan membaca PDF utuh.
- Aturan cetak tabel LKPS dari Pak Tris (satu tabel satu halaman, boleh bersambung dengan judul kolom berulang, kolom
  tidak dipindah ke bawah, lanskap bila lebar) adalah urusan ekspor PDF di modul LKPS (Ghalib). Catat aturan ini di
  `src/modules/lkps/README.md` bila belum ada.

**Kriteria selesai:** uji unit dan uji integrasi unggah PDF per tabel lulus.

## Tahap 9: Dokumen dan pemeriksaan akhir

- `CLAUDE.md`:
  - Perbarui "Keputusan yang sudah dikunci" butir 1 (instrumen diunggah Admin UPPS), butir 2 (tiga peran baru dan
    tabel akses ringkas), butir 8 (kunci dikelola Admin UPPS), dan bagian Konvensi tentang hak akses.
  - Tambahkan bagian "Struktur kode (revisi 31 Okt 2026)".
- Perbarui `docs/SPESIFIKASI.md` (tabel menu per peran) dan `docs/PANDUAN-PENGGUNAAN.md`, dengan bagian A Admin UPPS,
  B Tim Prodi, dan C Asesor.
- Jalankan `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build`. Lakukan uji browser dengan tiga akun uji:
  - Tim Prodi membuat LED → unggah LKPS dan dokumen → Susun seluruh LED → Perkiraan nilai → Ajukan review.
  - Asesor memberi catatan → Tim Prodi memperbaiki → Asesor menilai di halaman Penilaian → Layak diajukan.
  - Tim Prodi mengekspor final.
  - Admin memantau.
- Tulis hasilnya di `docs/CATATAN-PENGEMBANGAN.md` dalam bentuk tabel seperti revisi sebelumnya.

**Kriteria selesai:** semua pemeriksaan lulus, alur browser di atas berhasil, dan dokumen diperbarui.

## Di luar cakupan (jangan dikerjakan sekarang)

- Sinkron One Data dan ID sinkron. Menunggu akses API (teknisnya ke Pak Iksan); unggah Excel/PDF dan isian manual tetap
  menjadi jalur utama.
- Isi modul LKPS (dikerjakan Ghalib). Penyamaan desain dengan LKPS dibicarakan bersama Ghalib.
- Fitur unggah ke LAM Teknik dan pembagian kriteria ke anggota (tetap dilarang di `CLAUDE.md`).

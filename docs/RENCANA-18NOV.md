# Rencana 18 November 2026: peran Tamu dan login SSO Unila

Disusun 17 November 2026 dari arahan bimbingan ke-8 (transkrip "Pa tris 8") dan keputusan Adrianne pada hari yang
sama. Rencana ini dijalankan Claude Code setelah `docs/RENCANA-10NOV.md` (selesai sampai T11, commit `607251a`).

> **Catatan 18 November 2026:**
> - Jalankan rencana ini **setelah** `docs/RENCANA-GABUNG-LKPS.md`.
> - S1 dan S2 dikerjakan di sana sebagai G1 dan G2.
> - Rencana ini dilanjutkan **mulai S3**, di branch `tamu-sso` yang dibuat dari `gabung-lkps` (bukan dari
>   `revisi-31okt`).
> - Audit S1 juga mencakup halaman dan API modul LKPS hasil penggabungan.

## Keputusan Adrianne (17 Nov 2026)

- Cakupan rencana ini hanya **peran Tamu** dan **login SSO Unila**.
- **Tidak termasuk:** penarikan data WS API MyUnila (35 endpoint pada Laporan Otorisasi 3 Nov 2026). Data itu untuk
  LKPS dan dikerjakan setelah website LED (Adrianne) dan LKPS (Ghalib) digabung. `docs/ONE-DATA-KEBUTUHAN.md` tetap
  menjadi acuan untuk tahap itu.
- Use case terbaru (draw.io, 17 Nov) memuat 4 aktor manusia: Admin UPPS, Reviewer LPMPP, Tim Prodi, dan Tamu. Tamu
  hanya melihat dashboard akreditasi. Ia tidak bisa menambah, mengubah, menghapus, atau membuka fitur lain.
- Tampilan halaman login mengikuti desain Figma Adrianne: berkas desain form
  (`https://www.figma.com/design/Ucmof6K4BO5wZ9ylg1yDAw?node-id=44-4936`), halaman "2 · Desain form", bagian
  **"Revisi 18 Nov (Tamu + SSO)"**. Bagian itu berisi empat bingkai:
  - L1: halaman Masuk dengan login biasa dan tombol SSO;
  - L2: pesan galat SSO;
  - L3: terkunci setelah 3 kali gagal;
  - L4: alur SSO.
- Dashboard Tamu (S2) dan Kelola akun (S4) belum punya bingkai Figma. Keduanya mengikuti uraian di rencana ini dan
  komponen yang sudah ada di website.

## Arahan bimbingan ke-8 yang menjadi dasar

1. SSO hanya pintu autentikasi. Otorisasi (siapa boleh apa) diputuskan aplikasi.
2. Aplikasi non-PHP memakai **API Manajemen Akses** sebagai jembatan ke CAS:
   `https://akses.unila.ac.id/api/live/v1/auth/login/sso?app_key=…`. Alurnya aplikasi → Access → CAS
   (`login.unila.ac.id/cas/login`) → Access → aplikasi. `app_key` diberikan admin dan wajib dipasang di aplikasi.
3. Atribut dari SSO: `username`, `nm_pengguna`, `email`, `a_aktif`, dan status (dosen, karyawan, mahasiswa).
4. Mahasiswa ditolak, dikenali dari status atau dari email mahasiswa. Penolakannya dilakukan di aplikasi, bukan di SSO.
5. Pengguna yang lolos SSO tetapi belum terdaftar mendapat peran **Tamu** secara bawaan. Tamu hanya melihat dashboard;
   bila perlu menginput data, ia meminta peran ke admin.
6. Ada dua sesi: sesi SSO di browser (sekitar 15 menit) dan sesi aplikasi sendiri.
7. Saat keluar, sesi SSO di browser juga harus diakhiri. Kalau tidak, klik "Masuk dengan SSO" berikutnya otomatis
   masuk ke akun sebelumnya.
8. Login biasa tetap ada di samping tombol SSO, karena super admin tidak ada di SSO.
9. Urutan yang diminta dosen: login biasa dulu, SSO belakangan. Karena itu SSO dibangun di belakang saklar `SSO_AKTIF`
   (bawaan mati). Login biasa tetap berjalan sampai `app_key` dan dokumentasi Access tersedia.
10. Halaman SSO Unila menangani kata sandi dan kode 6 digit (MFA) sendiri. Website ini tidak pernah menerima kata sandi
    SSO atau kode OTP.

## Yang belum diketahui (dilengkapi sebelum S5 memakai penyedia Access)

| Hal | Sumber | Status |
|---|---|---|
| `app_key` Manajemen Akses untuk aplikasi ini; sama atau tidak dengan "ID Aplikasi" di Laporan Otorisasi WS API | admin UPA TIK / Pak Ihsan | belum |
| Alamat kembali (callback) yang didaftarkan dan nama parameternya | dokumentasi Access | belum |
| Isi kiriman Access ke alamat kembali (tiket CAS, token, atau data pengguna) dan cara memvalidasinya server-ke-server | dokumentasi Access | belum |
| Nama atribut status (dosen/karyawan/mahasiswa) dan domain email mahasiswa | dokumentasi Access | belum |
| URL keluar SSO: `login.unila.ac.id/cas/logout` atau endpoint Access | dokumentasi Access | belum |
| Apakah UNILA ID dosen sama dengan NIP | admin UPA TIK | belum |

Adrianne menyalin ringkasan dokumentasi `auth/login/sso` (dari `akses.unila.ac.id/api/live/v1` dan video
"walkthrough test") ke `docs/SSO-AKSES-CATATAN.md`. **Tanpa** `app_key`, ID Aplikasi, password, atau token.

Ada juga varian POST yang mengirim username dan password di body. Varian itu **tidak dipakai**: website jadi memegang
kata sandi SSO, dan penanganan MFA-nya tidak jelas.

## Aturan kerja

- Branch baru `tamu-sso` dari `gabung-lkps` (lihat catatan 18 November di awal).
- lint, typecheck, `test:unit`, dan `test:integrasi` lulus di setiap tahap.
- Migrasi dengan cara di `CLAUDE.md`: `prisma migrate diff`, lalu hapus baris `DROP INDEX "Potongan_embedding_hnsw_idx"`.
- Batas modul dijaga. Kode SSO ada di `src/modules/bersama/sso/`.
- Satu commit atau lebih per tahap, misalnya `Rencana 18 Nov S3: halaman login dua pilihan`.
- Catat di `docs/CATATAN-PENGEMBANGAN.md` bagian baru "Rencana 18 November 2026".
- Berhenti di setiap titik henti ⏸, tunjukkan ringkasan hasilnya, lalu tunggu Adrianne menulis "lanjut".
- **Rahasia:**
  - `app_key`, ID Aplikasi, password WS API, dan token tidak pernah dicetak, dicatat di log, atau di-commit. Semuanya
    hanya ada di `.env`.
  - `.env.example` hanya berisi nama variabel.
  - Laporan Otorisasi (PDF) tidak masuk repo.
  - Folder `postman/` dan `.postman/` tetap tidak di-commit.
- **Data pribadi dari SSO** (UNILA ID/NIP, email):
  - Hanya disimpan di tabel `User` dan `Account`.
  - Log aktivitas dan log login gagal tidak memuat email atau NIP utuh.
  - Kata sandi tidak pernah dicatat.
- Halaman SSO Unila **tidak ditiru** di website. Website hanya mengarahkan ke sana. Logo Unila dan logo LAM Teknik tidak
  dipakai di halaman login.

## Ringkasan tahap

| Tahap | Isi | ⏸ |
|---|---|---|
| S1 | Peran `TAMU`: enum, hak akses, beranda, menu, dan penjagaan semua halaman, aksi, dan API | ⏸ |
| S2 | Dashboard hanya-baca untuk Tamu (data peka tidak dikirim ke browser) | |
| S3 | Halaman login dua pilihan dan batas login gagal (3 kali, kunci 5 menit) | ⏸ |
| S4 | UNILA ID di akun; Kelola akun menampilkan Tamu baru | |
| S5 | SSO: penyedia tiruan dan Access, rute mulai dan kembali, aturan otorisasi, sesi aplikasi | ⏸ |
| S6 | Keluar dari aplikasi dan SSO | |
| S7 | Uji black-box, panduan, dan dokumentasi | ⏸ |

---

## S1. Peran `TAMU` ⏸

1. **Basis data:** di `prisma/schema/bersama.prisma`, tambahkan nilai `TAMU` ke `enum Peran`, lalu buat migrasinya.
2. **`src/modules/bersama/peran.ts`:**
   - `PERAN` mendapat `"TAMU"`, dan `LABEL_PERAN.TAMU = "Tamu"`.
   - `peranAkses.TAMU = ac.newRole({})`, tanpa satu pun hak plugin admin.
   - Plugin admin di `auth.ts` memakai `defaultRole: "TAMU"`. Akun yang dibuat tanpa peran mendapat hak paling kecil.
     Pembuatan akun oleh admin tetap selalu menyebut perannya.
3. **Beranda:** ada dua fungsi `berandaPeran`, di `src/modules/bersama/peran.ts` dan di
   `src/components/shell/menu-peran.ts`. Satukan bila mudah. Untuk `TAMU`, keduanya mengembalikan `/dashboard`.
4. **Menu:** di `menu-peran.ts`, buat `MENU_TAMU` yang isinya hanya "Dashboard akreditasi". `menuPeran("TAMU", …)`
   mengembalikan `[MENU_TAMU]` apa pun modulnya. Tombol LKPS | LED tidak tampil untuk Tamu.
5. **Penjagaan:** audit semua pintu masuk dan pastikan Tamu ditolak di mana pun selain dashboard.
   - Halaman yang sekarang memakai `wajibLogin()` (menerima peran apa pun):
     - `src/app/page.tsx`: Tamu dialihkan ke `/dashboard`.
     - `src/app/lkps/layout.tsx` dan `src/app/lkps/page.tsx`: ganti dengan `wajibPeran("ADMIN", "TIM_PRODI", "ASESOR")`.
     - `src/app/akun/ganti-sandi/page.tsx`: lihat S4.
   - Semua layout lain yang memakai `wajibAdmin`, `wajibTimProdi`, atau `wajibAsesor` sudah menolak Tamu. Pastikan tidak
     terjadi lingkar alih (Tamu → `/` → `/dashboard`).
   - Semua aksi server, termasuk `src/app/aksi-kunci.ts`, `src/app/aksi-pemberitahuan.ts`, dan aksi di setiap modul:
     fungsi lapisan data yang menerima `Pengguna` melempar `GalatAkses` untuk Tamu.
   - Semua rute di `src/app/api/`: Tamu mendapat 403.
   - Fungsi `pastikan…` di `src/modules/bersama/akses.ts` yang memeriksa peran secara eksplisit sudah menolak Tamu.
     Cari pemeriksaan yang memakai "selain X" (misalnya `peran !== "ASESOR"`), karena Tamu bisa lolos lewat celah itu.
6. **Uji:**
   - `tests/integrasi/akses.test.ts`: daftar aksi tulis dan rute API ditolak untuk Tamu.
   - Uji unit: `menuPeran("TAMU")` hanya berisi dashboard, dan `berandaPeran("TAMU") === "/dashboard"`.

⏸ Tunjukkan tabel audit: setiap halaman, layout, aksi server, dan rute API, beserta perilakunya untuk Tamu.

## S2. Dashboard hanya-baca untuk Tamu

1. `src/app/dashboard/layout.tsx` memakai `wajibPeran("ADMIN", "TAMU")`.
2. **Data peka tidak dikirim ke browser.** Jangan hanya menyembunyikannya di tampilan.
   - Buat varian data untuk Tamu, misalnya `dataDashboard(p)` yang memeriksa peran, atau fungsi
     `dataDashboardTamu()`.
   - Varian itu tidak memuat daftar akun Tim Prodi (`b.akun`: nama, email, login terakhir), status akun
     (`LABEL_STATUS_AKUN`), atau isian internal lain.
   - Yang tetap tampil: prodi, lembaga, peringkat, masa berlaku dan sisa waktu akreditasi, kelengkapan LKPS dan LED (%),
     serta simulasi nilai.
3. **Tampilan Tamu:**
   - Tombol "Ingatkan" (`TombolIngatkan`) dan tombol atau tautan ke halaman admin tidak dirender.
   - Di atas tabel ada keterangan: "Anda masuk sebagai Tamu. Untuk menyusun LKPS/LED atau mereview, minta Admin UPPS
     memberi peran."
4. `aksiIngatkanTimProdi` tetap memeriksa `pastikanAdmin` di server.
5. **Detail prodi** `/dashboard/prodi/[id]`: Tamu boleh membuka halaman ini dalam mode hanya-baca, dengan aturan data
   yang sama seperti poin 2. Bila Adrianne memutuskan Tamu cukup melihat tabel dashboard saja, alihkan Tamu ke
   `/dashboard`.
6. **Uji** di `tests/integrasi/dashboard.test.ts`: data untuk Tamu tidak memuat email atau nama akun, dan aksi
   "Ingatkan" ditolak untuk Tamu.

## S3. Halaman login dua pilihan dan batas login gagal ⏸

Tata letak sesuai Figma bingkai **L1–L3**.

1. **Kerangka halaman:**
   - Kartu dua kolom di layar lebar, satu kolom di ponsel.
   - Kolom kiri adalah panel identitas aplikasi: ikon aplikasi yang sudah ada, nama "Akreditasi LAM Teknik", dan
     keterangan singkat. Tanpa foto gedung, tanpa logo Unila atau LAM Teknik.
   - Kolom kanan berisi form.
2. **Form login biasa** tetap memakai email dan kata sandi (`authClient.signIn.email`).
3. **Tombol SSO:**
   - Di bawah pemisah "atau", ada tombol **"Masuk dengan SSO Unila"** yang menuju `/api/sso/mulai`.
   - Tombol hanya tampil bila `SSO_AKTIF=true`.
   - Keterangan di bawah tombol: "Untuk dosen dan tenaga kependidikan Unila. Akun yang belum terdaftar masuk sebagai
     Tamu."
4. **Pesan galat dari SSO** dibaca dari parameter `?galat=<kode>` dan dipetakan ke teks tetap. Isi parameter tidak
   pernah ditampilkan mentah.

   | Kode | Pesan |
   |---|---|
   | `sso_mahasiswa` | Akun mahasiswa tidak dapat masuk ke aplikasi ini. |
   | `sso_nonaktif` | Akun SSO Anda tidak aktif. Hubungi Helpdesk UPA TIK. |
   | `sso_dinonaktifkan` | Akun Anda dinonaktifkan. Hubungi Admin UPPS. |
   | `sso_gagal` | Masuk lewat SSO gagal. Coba lagi. |
   | `sso_mati` | Login SSO belum tersedia. Gunakan email dan kata sandi. |

5. **Batas login gagal**, meniru `LoginController` contoh Pak Ihsan (`MAX_LOGIN_ATTEMPTS = 3`,
   `LOCKOUT_SECONDS = 300`):
   - Model baru `LogLoginGagal` dengan kolom `id`, `kunci`, `ip`, `alasan`, dan `waktu`. `kunci` berisi hash SHA-256
     dari email yang dinormalisasi, bukan email asli.
   - Pakai hook Better Auth (`hooks.before` dan `hooks.after` untuk path `/sign-in/email`), sesuai dokumentasi versi
     terpasang.
   - Setelah 3 kali gagal dalam 300 detik untuk email yang sama, percobaan berikutnya ditolak dengan pesan "Terlalu
     banyak percobaan. Coba lagi dalam N menit."
   - Login berhasil menghapus hitungan gagal untuk email itu.
6. Form admin pertama (`FormAdminPertama`) tetap seperti sekarang.
7. **Uji:**
   - Tiga kali gagal membuat percobaan keempat ditolak.
   - Setelah 5 menit (waktu dipalsukan di uji), login kembali bisa.
   - Tombol SSO tidak dirender bila `SSO_AKTIF` tidak `true`.

⏸ Tunjukkan tangkapan layar halaman login (lebar 1440 dan 390 px), termasuk satu pesan galat.

## S4. UNILA ID di akun dan Tamu baru di Kelola akun

1. **Model `User`:** tambahkan `usernameSso String? @unique`, yaitu UNILA ID. Nilainya disimpan dalam huruf kecil,
   dipangkas.
2. **Kelola akun (tambah/ubah):**
   - Ada isian opsional **"UNILA ID (untuk login SSO)"** dengan validasi unik.
   - Daftar akun mendapat kolom "Cara masuk": Sandi, SSO, atau keduanya. SSO terhitung bila ada `Account` dengan
     `providerId = "sso-unila"`.
3. **Penyaring "Tamu baru":** akun ber-peran Tamu, urut dari yang terbaru. Admin bisa langsung memakai "Ubah peran"
   yang sudah ada. Tim Prodi tetap wajib memilih prodi.
4. **Ganti sandi:** akun tanpa kredensial sandi (Tamu dari SSO) tidak melihat menu "Ganti kata sandi". Halaman
   `/akun/ganti-sandi` mengalihkan akun seperti ini ke beranda.
5. **Uji:**
   - UNILA ID unik.
   - Tamu muncul di penyaring "Tamu baru".
   - Ubah peran Tamu menjadi Tim Prodi mewajibkan prodi.

## S5. Login SSO lewat API Access ⏸

### Variabel lingkungan

Nilai variabel tidak pernah dicetak. Nama dan contoh (tanpa nilai rahasia) ditulis di `.env.example` dan
`docs/PANDUAN-SERVER.md`.

| Nama | Isi |
|---|---|
| `SSO_AKTIF` | `true`/`false` (bawaan `false`) |
| `SSO_MODE` | `akses` atau `tiruan`; `tiruan` ditolak bila `NODE_ENV=production` |
| `SSO_APP_KEY` | `app_key` Manajemen Akses (rahasia) |
| `SSO_URL_MULAI` | bawaan `https://akses.unila.ac.id/api/live/v1/auth/login/sso` |
| `SSO_URL_KEMBALI` | URL absolut alamat kembali, misalnya `https://<domain>/api/sso/kembali` |
| `SSO_URL_KELUAR` | URL keluar SSO (lihat bagian "Yang belum diketahui") |
| `SSO_DOMAIN_EMAIL_DITOLAK` | daftar domain email mahasiswa, dipisah koma, dikonfirmasi dari dokumentasi |

### Modul `src/modules/bersama/sso/`

1. **`penyedia.ts`:** antarmuka penyedia.
   ```ts
   interface HasilSso { username: string; nama: string; email: string | null; aktif: boolean; status: string | null }
   interface PenyediaSso {
     urlMasuk(state: string): string;
     bacaHasil(permintaan: Request): Promise<HasilSso>; // memvalidasi kiriman Access server-ke-server, bukan sekadar membaca query
     urlKeluar(kembaliKe: string): string;
   }
   ```
2. **`tiruan.ts`:** penyedia untuk pengembangan dan uji. Halaman `/api/sso/tiruan` menampilkan pilihan pengguna palsu:
   dosen terdaftar, dosen belum terdaftar, mahasiswa, dan akun SSO nonaktif. Rute ini mati bila
   `NODE_ENV=production`.
3. **`akses.ts`:** penyedia Access.
   - Nama parameter, cara validasi, dan pemetaan atribut diambil dari `docs/SSO-AKSES-CATATAN.md`.
   - Bila berkas itu belum berisi jawaban untuk bagian "Yang belum diketahui", **berhenti di ⏸**. `akses.ts` melempar
     galat "Penyedia Access belum dikonfigurasi" dan semua pekerjaan lain diuji dengan penyedia tiruan.
   - Jangan menebak nama parameter.
4. **`aturan.ts`:** domain murni dengan uji unit, berisi
   `putuskan(hasil, akun, konfigurasi) → { jenis: "masuk", userId } | { jenis: "buatTamu" } | { jenis: "tolak", kode }`.
   Urutannya:
   1. `aktif` salah → `sso_nonaktif`.
   2. Status mahasiswa, atau domain email ada di `SSO_DOMAIN_EMAIL_DITOLAK` → `sso_mahasiswa`.
   3. Akun ditemukan dan `banned` → `sso_dinonaktifkan`.
   4. Akun ditemukan → `masuk`, dengan peran apa adanya. SSO tidak pernah mengubah peran.
   5. Akun tidak ditemukan → `buatTamu`.
5. **Pencocokan akun:**
   - Pertama `usernameSso` sama dengan `username` dari SSO.
   - Bila tidak ada, cocokkan email (huruf kecil) dengan akun yang belum punya `usernameSso`, lalu isi `usernameSso`
     akun itu. Pencocokan lewat email ini perlu dikonfirmasi Adrianne di ⏸; bila tidak disetujui, hapus langkah ini.

### Rute

1. **`GET /api/sso/mulai`:**
   - Bila `SSO_AKTIF` tidak `true`, alihkan ke `/login?galat=sso_mati`.
   - Buat `state` acak (`crypto.randomUUID()` atau 32 byte acak). Simpan di cookie `sso_state`: httpOnly, Secure di
     produksi, `SameSite=Lax`, berlaku 10 menit.
   - Simpan juga tujuan setelah login (`ke`), hanya path relatif yang diawali `/`.
   - Alihkan ke `penyedia.urlMasuk(state)`.
2. **Alamat kembali `/api/sso/kembali`:** metode GET atau POST, sesuai dokumentasi Access.
   - Periksa `state`. Bila Access tidak meneruskan `state`, catat keterbatasan itu di `CATATAN-PENGEMBANGAN.md`, lalu
     tetap validasi kiriman server-ke-server.
   - Panggil `penyedia.bacaHasil`, lalu `putuskan`.
   - Hasil `tolak`: alihkan ke `/login?galat=<kode>`. Tidak ada akun yang dibuat.
   - Hasil `buatTamu`: buat `User` dengan `name = nama`, `email` (bila kosong, pakai `<username>@sso.invalid`),
     `emailVerified = true`, `role = TAMU`, `usernameSso`, `wajibGantiSandi = false`. Buat juga `Account` dengan
     `providerId = "sso-unila"` dan `accountId = username`, tanpa sandi. Kirim pemberitahuan ke Admin UPPS: "Tamu baru
     masuk lewat SSO: <nama>." Lalu lanjutkan seperti `masuk`.
   - Hasil `masuk`: bila belum ada, tambahkan `Account` `sso-unila` untuk akun itu.
   - Buat sesi aplikasi, lalu alihkan ke tujuan (`ke`) atau ke beranda perannya.
3. **Pembuatan sesi:**
   - Buat plugin Better Auth kecil `ssoUnila()` (`createAuthEndpoint`, `ctx.context.internalAdapter.createSession`,
     dan `setSessionCookie`), sesuai dokumentasi Better Auth versi terpasang. **Jangan menulis cookie sesi secara
     manual.**
   - Tambahkan isian sesi `lewatSso: boolean` untuk S6.
   - Hook `session.create` yang mengisi `loginTerakhir` tetap berjalan.
4. **Lama sesi:** sesi aplikasi dari SSO sama dengan login biasa, yaitu 7 hari dengan pembaruan harian. Bila Adrianne
   ingin sesi SSO lebih pendek (misalnya 8 jam), tanyakan di ⏸.
5. **Log aktivitas:** catat "masuk lewat SSO" dan "SSO ditolak (<kode>)" tanpa email atau UNILA ID utuh.
6. **Uji:**
   - Unit `aturan.ts`: semua cabang.
   - Integrasi dengan penyedia tiruan:
     - dosen terdaftar masuk dengan perannya;
     - dosen belum terdaftar menjadi Tamu dan pemberitahuan admin terbuat;
     - mahasiswa ditolak dan tidak ada akun terbuat;
     - akun nonaktif ditolak;
     - akun `banned` ditolak;
     - `state` salah ditolak;
     - `SSO_AKTIF=false` dialihkan ke `sso_mati`.

⏸ Tunjukkan:
- demo dengan penyedia tiruan untuk keempat jenis pengguna;
- status `docs/SSO-AKSES-CATATAN.md`: apa yang sudah dan belum diketahui;
- keputusan yang ditunggu: pencocokan lewat email, dan lama sesi SSO.

Penyedia Access baru dinyalakan setelah Adrianne menulis "lanjut".

## S6. Keluar dari aplikasi dan SSO

1. Tombol "Keluar" di menu pengguna (`src/components/shell/menu-pengguna.tsx`):
   - Sesi `lewatSso = true`: hapus sesi Better Auth, lalu alihkan ke `penyedia.urlKeluar(<URL halaman login>)`. Ini
     setara `SSO::cookieClear()` pada contoh PHP.
   - Login biasa: hapus sesi, lalu ke `/login` seperti sekarang.
2. **Uji:** URL keluar untuk sesi SSO benar, dan sesi aplikasi terhapus pada kedua jenis login.
3. **Uji manual** dengan SSO asli, dicatat di `CATATAN-PENGEMBANGAN.md`: setelah keluar, klik "Masuk dengan SSO Unila"
   meminta UNILA ID lagi dan tidak langsung masuk ke akun sebelumnya.

## S7. Uji black-box, panduan, dan dokumentasi ⏸

1. **Skenario black-box** untuk Bab IV, ditulis di berkas baru `docs/uji/skenario-blackbox-tamu-sso.md`. Kolom
   tabelnya: kode, skenario, langkah, hasil yang diharapkan, hasil, dan status.
   1. login biasa berhasil;
   2. kata sandi salah;
   3. terkunci setelah 3 kali gagal;
   4. tombol SSO tersembunyi saat SSO mati;
   5. SSO dosen terdaftar;
   6. SSO pengguna belum terdaftar menjadi Tamu;
   7. SSO mahasiswa ditolak;
   8. SSO akun nonaktif ditolak;
   9. Tamu membuka `/led`, `/lkps`, `/admin/akun`, dan `/pengaturan/prodi` lalu dialihkan ke dashboard;
   10. Tamu tidak melihat tombol Ingatkan maupun email akun;
   11. admin mengubah Tamu menjadi Tim Prodi;
   12. keluar dari SSO.
2. **Panduan:**
   - `docs/PANDUAN-PENGGUNAAN.md`: masuk dengan SSO, arti peran Tamu, dan cara admin memberi peran.
   - `docs/PANDUAN-SERVER.md`: variabel `SSO_*` dan cara mendaftarkan alamat kembali ke UPA TIK.
3. **Spesifikasi:** `docs/SPESIFIKASI.md` diperbarui menjadi empat peran, kebutuhan fungsional login SSO dan dashboard
   Tamu.
4. `docs/CATATAN-PENGEMBANGAN.md`: ringkasan, keterbatasan, dan hal yang masih menunggu UPA TIK.

⏸ Tunjukkan ringkasan akhir dan hasil semua uji.

---

## Hal untuk Bab III (dikerjakan bersama Claude Cowork, bukan Claude Code)

- Tabel aktor: tambah **Tamu**.
- Kebutuhan fungsional baru: login SSO Unila, dan dashboard hanya-baca untuk Tamu.
- Use case "Melihat dashboard akreditasi" (Tamu).
- Activity diagram baru "Masuk ke sistem": login biasa atau SSO, dengan cabang tolak mahasiswa dan buat akun Tamu.
  Satu state akhir.
- Skenario black-box baru dari S7.

## Prompt untuk Claude Code

```
Baca docs/RENCANA-18NOV.md sampai habis. S1 dan S2 sudah dikerjakan di Gabung LKPS (G1, G2); periksa saja bahwa
hasilnya masih sesuai. Lalu kerjakan S3 sampai S7 berurutan di branch baru tamu-sso (dari gabung-lkps), mengikuti
"Aturan kerja" di rencana itu:
- lint, typecheck, test:unit, dan test:integrasi lulus di setiap tahap;
- satu commit atau lebih per tahap, misalnya "Rencana 18 Nov S3: halaman login dua pilihan";
- catat di docs/CATATAN-PENGEMBANGAN.md bagian baru "Rencana 18 November 2026";
- berhenti di setiap titik henti ⏸, tunjukkan ringkasannya, dan tunggu saya menulis "lanjut".
Di commit S3, ikutkan docs/RENCANA-18NOV.md bila belum ter-commit. Jangan commit postman/, .postman/, berkas .env, atau PDF Laporan
Otorisasi. Jangan mencetak atau mencatat app_key, ID Aplikasi, password, token, atau isi .env.
Tampilan halaman login mengikuti uraian S3 (desain Figma L1–L4 yang disebut di rencana). Dashboard Tamu dan Kelola
akun mengikuti uraian S2 dan S4. Bila ada yang berbeda dengan komponen shadcn/ui yang sudah dipakai, ikuti komponen
yang ada.
Untuk penyedia Access di S5: jangan menebak nama parameter atau cara validasi. Pakai hanya isi
docs/SSO-AKSES-CATATAN.md. Bila berkas itu belum ada atau belum lengkap, bangun dan uji semuanya dengan penyedia
tiruan, lalu berhenti di ⏸ S5 dan sebutkan apa yang masih kurang.
Bila sintaks Better Auth berbeda dari yang tertulis di rencana, ikuti dokumentasi resmi versi yang terpasang dan
catat perbedaannya.
```

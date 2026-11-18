# Rencana penggabungan modul LKPS (Ghalib) ke website led-lamteknik

Disusun 18 November 2026 untuk dijalankan Claude Code. Sumber kode LKPS: repo Ghalib
`https://github.com/Achmadghalib725/LKPS_LAM-TEKNIK`, **commit `c718eff`** (17 Nov 2026, "dropdown pemilihan prodi
admin upps").

## Keputusan Adrianne (18 Nov 2026)

1. Ghalib setuju kodenya dipindah. **Setelah penggabungan, Ghalib melanjutkan modul LKPS di repo led-lamteknik**
   (folder `src/modules/lkps`, halaman `src/app/lkps`), bukan di repo lamanya.
2. **Semua fitur LKPS Ghalib dipindah**, disesuaikan ke login, peran, dan program studi milik LED. Pengecualiannya:
   - sinkron One Data/MyUnila ikut dipindah, tetapi **mati** sampai kredensial diisi di `.env`;
   - jembatan `sync-led` dan halaman kelola akun milik Ghalib dibuang. Kelola akun memakai milik LED.
3. **Peran Tamu dikerjakan sekalian.** GUEST milik Ghalib disatukan menjadi `TAMU`. Tahap S1–S2
   `docs/RENCANA-18NOV.md` dikerjakan di sini sebagai G1–G2.
4. **Data lama di basis data Ghalib tidak dipindah.** Tabel LKPS mulai kosong, akun memakai akun LED, dan data contoh di
   `prisma/seed.ts` Ghalib tidak disalin.
5. **LED tetap membaca LKPS dari berkas Excel/PDF yang diunggah di LED** (template LKPS LAM Teknik 2025). LED tidak
   bergantung pada data modul LKPS. Sambungan modul LKPS ke LED menjadi rencana terpisah nanti.
6. Tampilan modul LKPS harus sama dengan website (arahan Pak Tris). Penyamaan tampilan penuh (G7) ditanyakan dulu
   sebelum dikerjakan.

## Gambaran kode Ghalib (commit c718eff)

- **Stack sama dengan LED:** Next.js 16.3, React 19.2.8, Prisma 7.10, Better Auth 1.7.7, PostgreSQL, dan Tailwind 4.
  Kodenya sekitar 15.500 baris tanpa Prisma generated, dan belum ada uji otomatis.
- **Halaman** (`src/app/(dashboard)/…`, semuanya komponen klien yang memanggil `fetch('/api/…')`):
  - beranda ringkasan: `dashboard`;
  - kriteria 1–9: `kerjasama`, `mahasiswa`, `sdm`, `keuangan`, `pendidikan`, `penelitian`, `pkm`, `luaran`,
    `penjaminan`;
  - kriteria dinamis `kriteria/[id]`;
  - lainnya: `identitas`, `import` (One Data), `export`, `konfigurasi` (struktur kriteria dan tabel), dan `admin`.
- **API:** `src/app/api/<modul>/route.ts`, ditambah `computation`, `ingestion` (impor Excel), `upload` (berkas bukti),
  `notifications`, `onedata/sync`, `prodi`, `admin/users`, dan `sync-led`.
- **Lib:**
  - `active-prodi.ts`: prodi aktif dari peran atau cookie `selected_prodi_id`;
  - `permissions.ts`: matriks hak tulis per modul;
  - `computation-engine.ts`: rumus indikator;
  - `templates/kriteria-1…9`;
  - `myunila-client.ts` dan `onedata-parser.ts`.
- **Prisma:**
  - model `User`, `Session`, `Account`, `Verification`, `IdentitasPT`, `Prodi`, dan `TimPenyusun`;
  - satu model per tabel LKPS (`Kerjasama`, `SeleksiMahasiswaBaru`, `MahasiswaAsing`, `DosenTetap`, `BimbinganTA`,
    `EWMP`, `LuaranDosen`, `TenagaKependidikan`, `PenggunaanDana`, `Laboratorium`, `MataKuliah`, `ProgramMBKM`,
    `PenelitianDosen`, `IpkLulusan`, `PrestasiMahasiswa`, `EfektivitasStudi`, `TracerStudy`, `LuaranMahasiswa`,
    `DokumenSpmi`);
  - konfigurasi: `RegulasiLKPS`, `KriteriaConfig`, dan `TabelConfig`.
- **Tampilan:** kelas CSS sendiri (`.card`, `.btn`, `.form-input`, `.badge`, dan sekitar 210 aturan lain) di
  `src/app/globals.css`, dengan variabel CSS yang sebagian bernama sama dengan token shadcn LED (misalnya `--primary`).
- **Masalah yang harus diperbaiki saat dipindah** (jangan ikut terbawa):
  1. **Kredensial MyUnila di kode.** `src/lib/myunila-client.ts` berisi nilai bawaan ID Aplikasi, username, dan
     password. **Jangan disalin, dan jangan dicetak di ringkasan.**
  2. **Cookie sesi admin.** Berkas `cookies_admin.txt` di akar repo. **Jangan disalin.**
  3. **Pendaftaran terbuka.** `auth.ts` Ghalib membuka pendaftaran dan membiarkan `role` diisi pengguna. Masalah ini
     hilang karena login memakai Better Auth milik LED.
  4. **Hapus data tanpa batas prodi.** Penyimpanan "ganti semua baris" memakai `deleteMany` dengan `where` yang bisa
     kosong (misalnya `api/kerjasama` POST) sehingga bisa menghapus data **semua prodi**. Semua penghapusan wajib
     dibatasi `prodiId`.
  5. **Berkas bukti terbuka untuk umum.** Unggahan bukti ditulis ke `public/uploads/bukti`, sehingga bisa diunduh siapa
     pun tanpa login.
  6. **Jalur template di laptop.** `api/export` membaca template dari jalur yang ditulis mati di laptop Ghalib
     (`D:/laragon/...`).
  7. **Pustaka `xlsx` 0.18.5 (SheetJS versi npm).** Sudah tidak dirawat dan punya kerentanan yang diketahui. Ganti dengan
     `exceljs` yang sudah dipakai LED.
  8. **Prodi aktif admin.** Bila belum dipilih, Admin UPPS jatuh ke "prodi pertama di basis data".
- **Struktur tabel.** Susunan tabel Ghalib (mis. ekspor sheet 2a1 = seleksi mahasiswa, 3a1 = dosen tetap, 4a =
  penggunaan dana) tampaknya mengikuti LKPS lama, bukan template LKPS LAM Teknik 2025 yang dibaca LED (2a1 = kerja sama
  pendidikan, 3a1 = kurikulum, 4a = profil dosen).
  - **Rencana ini tidak mengubah struktur tabel itu.** Itu keputusan Ghalib dan Pak Tris.
  - Catat perbedaannya di `src/modules/lkps/README.md` dan `docs/CATATAN-PENGEMBANGAN.md`.

## Aturan kerja

- **Branch dan commit:**
  - Branch baru `gabung-lkps` dari `revisi-31okt`.
  - Satu commit atau lebih per tahap, misalnya `Gabung LKPS G4: data dan API modul LKPS`.
  - Commit yang memuat kode asal Ghalib menulis di badan pesannya:
    `Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib)`.
- **Repo Ghalib** di-clone ke luar repo, misalnya `../lkps-ghalib-c718eff`, lalu `git checkout c718eff`. Folder itu
  **tidak pernah** di-commit ke led-lamteknik dan tidak dijalankan (`npm install`, skrip, dan seed-nya tidak dijalankan).
- **Yang tidak disalin dari repo Ghalib:**
  - `.git`, `node_modules`, `src/generated/`, `package-lock.json`, `.env*`, `cookies_admin.txt`, `public/` (ikon
    templat Next.js), `prisma/seed.ts`, `scripts/seed-*-users.ts`, dan `scripts/clear-all-criteria-data.ts`;
  - nilai bawaan kredensial di `myunila-client.ts`;
  - dependensi `xlsx`, `bcryptjs`, dan `@types/bcryptjs`.
- **Pemeriksaan tiap tahap:** lint, typecheck, `test:unit`, dan `test:integrasi` lulus di setiap tahap. `npm run build`
  lulus di G5 dan G8.
- **Batas modul tetap:**
  - `src/modules/lkps` tidak mengimpor `src/modules/led` (diperiksa `tests/unit/batas-modul.test.ts`);
  - model Prisma baru berawalan `Lkps`, dengan `@@map("lkps_…")`;
  - migrasi dengan cara di `CLAUDE.md`.
- **Pencatatan:** catat di `docs/CATATAN-PENGEMBANGAN.md` bagian baru "Gabung LKPS (18 November 2026)".
- **Rahasia:** kunci API, ID Aplikasi, password, token, dan isi `.env` tidak pernah dicetak, dicatat di log, atau
  di-commit.
- **Titik henti:** berhenti di setiap ⏸, tunjukkan ringkasannya, lalu tunggu Adrianne menulis "lanjut".

## Ringkasan tahap

| Tahap | Isi | ⏸ |
|---|---|---|
| G0 | Clone sumber, inventaris, dan peta penggabungan (`docs/GABUNG-LKPS-PETA.md`) | ⏸ |
| G1 | Peran `TAMU` dan peta peran Ghalib → LED (= RENCANA-18NOV S1) | ⏸ |
| G2 | Dashboard akreditasi hanya-baca untuk Tamu (= RENCANA-18NOV S2) | |
| G3 | Skema `prisma/schema/lkps.prisma` (model `Lkps*`, terikat ke `Prodi` LED) | |
| G4 | Domain, data, dan API modul LKPS dengan hak akses LED, batas prodi, penyimpanan berkas LED, dan `exceljs` | ⏸ |
| G5 | Halaman LKPS di dalam kerangka LED, menu sidebar, dan pemilih prodi | ⏸ |
| G6 | Impor One Data (MyUnila) dipindah dalam keadaan mati | |
| G7 | Penyamaan tampilan dengan komponen shadcn/ui LED (ditanyakan dulu) | ⏸ |
| G8 | Uji akhir, build, dan dokumentasi (termasuk panduan untuk Ghalib) | ⏸ |

---

## G0. Sumber, inventaris, dan peta penggabungan ⏸

1. Clone repo Ghalib ke `../lkps-ghalib-c718eff`, lalu checkout `c718eff`.
2. Buat `docs/GABUNG-LKPS-PETA.md` berisi lima tabel:
   - **Berkas:** asal → tujuan, atau "dibuang" beserta alasannya.
   - **Model:** asal → model baru, misalnya `Kerjasama` → `LkpsKerjasama`. Model yang tidak dipindah:
     - `User`, `Session`, `Account`, `Verification` → milik LED;
     - `IdentitasPT` → identitas institusi LED;
     - `Prodi` → `Prodi` LED.
   - **Rute:** halaman dan API asal → rute baru (lihat G4 dan G5).
   - **Peran:**
     - `SUPER_ADMIN`, `ADMIN_UPPS`, `PENANGGUNG_JAWAB` → `ADMIN` (Admin UPPS);
     - `OPERATOR_PRODI` → `TIM_PRODI`;
     - `ASESOR`/`REVIEWER` → `ASESOR` (Reviewer LPMPP);
     - `GUEST` → `TAMU`.
   - **Isian prodi Ghalib:** pemakaian `Prodi.peringkatAkreditasi`, `Prodi.jumlahMahasiswaAktif`, dan `IdentitasPT` di
     kode Ghalib, beserta penggantinya di LED:
     - `RiwayatAkreditasi` untuk peringkat;
     - `Prodi.identitas` dan identitas institusi;
     - nilai LKPS yang dihitung dari tabel LKPS.

     Bila tidak ada pengganti, usulkan kolom baru di model LKPS dan tandai untuk dikonfirmasi.
3. Daftar masalah dari bagian "Gambaran kode Ghalib", masing-masing dengan cara perbaikannya.

⏸ Tunjukkan kelima tabel peta dan daftar masalahnya.

## G1. Peran `TAMU` ⏸

Kerjakan **persis** `docs/RENCANA-18NOV.md` tahap S1 (enum, `peran.ts`, `defaultRole: "TAMU"`, beranda `/dashboard`,
`MENU_TAMU`, dan audit penjagaan), dengan tambahan berikut:

- **`src/app/lkps/layout.tsx`** sekarang memakai `wajibLogin()`. Ganti dengan `wajibPeran("ADMIN", "TIM_PRODI", "ASESOR")`
  supaya Tamu tidak bisa membuka modul LKPS.
- **Halaman dan API LKPS baru** di G4–G5 juga harus menolak Tamu. Tambahkan pemeriksaan itu ke uji akses.

⏸ Tunjukkan tabel audit seperti di RENCANA-18NOV S1.

## G2. Dashboard akreditasi hanya-baca untuk Tamu

Kerjakan **persis** `docs/RENCANA-18NOV.md` tahap S2. Halaman "Dashboard Ringkasan" untuk GUEST di aplikasi Ghalib
digantikan dashboard akreditasi ini; Tamu tidak mendapat beranda LKPS.

## G3. Skema LKPS

1. **Pindahkan model tabel LKPS** dan model konfigurasi Ghalib ke `prisma/schema/lkps.prisma`:
   - nama berawalan `Lkps` (misalnya `LkpsKerjasama`, `LkpsDosenTetap`, `LkpsEwmp`, `LkpsTimPenyusun`,
     `LkpsRegulasi`, `LkpsKriteriaConfig`, `LkpsTabelConfig`);
   - nama tabel `@@map("lkps_…")`;
   - isian lain sama dengan asal, supaya kode Ghalib berubah sesedikit mungkin.
2. **`prodiId` wajib** (`String`, bukan `String?`), berelasi ke `Prodi` LED dengan `onDelete: Restrict`, ditambah indeks
   `@@index([prodiId])`. Model yang memang berlaku untuk seluruh fakultas atau UPPS (misalnya `LkpsRegulasi` dan
   konfigurasi kriteria/tabel) tidak diberi `prodiId`. Catat model mana saja yang seperti ini di peta.
3. **Relasi balik** dari model LKPS ditambahkan di `model Prodi` (`prisma/schema/bersama.prisma`). Ini hanya relasi
   skema, bukan impor kode, jadi tidak melanggar batas modul.
4. **Berkas bukti:** kolom yang menyimpan jalur berkas (mis. `fileMou`, `fileName`) diganti atau ditambah kolom kunci
   penyimpanan LED (`berkasLokasi`, `berkasNama`), sesuai cara `RiwayatAkreditasi.berkasSkLokasi`/`berkasSkNama`.
5. **Migrasi** dibuat dengan cara di `CLAUDE.md`. Basis data uji ikut dimigrasi.
6. **Templat kriteria** (`src/lib/templates/kriteria-*.ts`) dipindah ke `src/modules/lkps/domain/templat/`. Bila
   konfigurasi kriteria/tabel perlu isi awal, buat seed idempoten modul LKPS yang dipanggil dari `npm run db:seed`.
   Seed ini hanya berisi konfigurasi, tanpa akun dan tanpa data contoh.

## G4. Domain, data, dan API modul LKPS ⏸

1. **Domain** (`src/modules/lkps/domain/`, logika murni dengan uji unit):
   - `akses.ts` memindahkan matriks `permissions.ts` ke peran LED:
     - isian kriteria 1–9: tulis **hanya `TIM_PRODI` untuk prodinya sendiri**; baca untuk `ADMIN` dan `ASESOR`;
     - identitas dan tim penyusun LKPS: tulis `ADMIN` dan `TIM_PRODI` (prodinya sendiri);
     - konfigurasi kriteria/tabel: tulis `ADMIN`;
     - ekspor: `ADMIN`, `TIM_PRODI`, `ASESOR`;
     - `TAMU`: tidak ada akses ke modul LKPS.
   - `hitung.ts` berisi isi `computation-engine.ts` tanpa perubahan rumus. Uji unit memakai hitungan tangan untuk
     minimal `hitungIndikatorRK`, `hitungIndikatorRMD`, `hitungIndikatorPenelitian`, dan `hitungTotalAkreditasi`;
     hitungannya dicatat di `docs/uji/hitungan-manual-lkps-gabung.md`.
   - Templat kriteria dari G3.
2. **Prodi aktif** (`src/modules/lkps/data/prodi-aktif.ts`), pengganti `active-prodi.ts`:
   - `TIM_PRODI` selalu memakai `pengguna.prodiId`.
   - `ADMIN` dan `ASESOR` memakai prodi yang dipilih (cookie `lkps_prodi` atau `?prodiId=`) setelah dicek prodi itu
     ada.
   - Bila belum memilih, **jangan** jatuh ke prodi pertama. Kembalikan `null` dan tampilkan "Pilih program studi".
   - `ASESOR` boleh membaca LKPS semua prodi, seperti rancangan Ghalib. Tanyakan di ⏸ bila Adrianne ingin dibatasi ke
     prodi yang LED-nya ditugaskan (itu butuh fungsi baru di modul bersama, karena LKPS tidak boleh mengimpor LED).
3. **Lapisan data** (`src/modules/lkps/data/<modul>.ts`):
   - fungsi menerima `Pengguna` dan memeriksa hak lewat `domain/akses.ts` (lempar `GalatAkses`);
   - validasi masukan memakai zod;
   - "ganti semua baris" dijalankan dalam transaksi dengan `where: { prodiId }` **wajib**;
   - tanggal kosong **tidak** diganti otomatis menjadi tanggal hari ini (kode Ghalib memakai `new Date()` sebagai
     cadangan). Kembalikan galat validasi.
4. **Route Handler** di `src/app/api/lkps/<modul>/route.ts` memakai `jalankanRute`. Bentuk JSON permintaan dan respons
   dipertahankan seperti API Ghalib, supaya halaman cukup mengganti alamat `fetch`. Pemetaannya:

   | Asal | Tujuan |
   |---|---|
   | `/api/kerjasama`, `/api/mahasiswa`, `/api/sdm`, `/api/keuangan`, `/api/pendidikan`, `/api/penelitian`, `/api/pkm`, `/api/luaran`, `/api/penjaminan`, `/api/identitas`, `/api/kriteria/[id]`, `/api/konfigurasi`, `/api/computation` | `/api/lkps/<nama yang sama>` |
   | `/api/ingestion` | `/api/lkps/impor` |
   | `/api/export` | `/api/lkps/ekspor` |
   | `/api/upload` | `/api/lkps/bukti` |
   | `/api/onedata/sync` | `/api/lkps/onedata/sinkron` (G6) |
   | `/api/prodi` | dibuang; pakai `daftarProdi` LED |
   | `/api/admin/users` | dibuang; pakai Kelola akun LED |
   | `/api/notifications` | dibuang; pakai lonceng pemberitahuan LED (`@/modules/bersama/data/pemberitahuan`) |
   | `/api/sync-led` | dibuang |

5. **Berkas bukti:**
   - unggah lewat penyimpanan LED (`@/modules/bersama/penyimpanan`), dengan batas jenis dan ukuran seperti unggahan
     LED;
   - unduh lewat rute yang memeriksa hak baca prodi;
   - tidak ada lagi berkas di `public/`.
6. **Impor dan ekspor Excel** memakai `exceljs`.
   - Jalur template ekspor diambil dari pengaturan (`LKPS_TEMPLAT_EKSPOR` di `.env`, berisi jalur berkas di server).
   - Bila tidak diisi, buat workbook baru seperti cadangan di kode Ghalib.
   - Struktur sheet tidak diubah (lihat catatan struktur tabel).
7. **Uji integrasi** `tests/integrasi/lkps-akses.test.ts`:
   - Tim Prodi A menyimpan dan membaca data prodi A;
   - Tim Prodi A tidak bisa membaca atau mengubah prodi B, dan penyimpanan "ganti semua" prodi A tidak menyentuh baris
     prodi B;
   - Admin membaca, dan menulis isian kriteria ditolak (403);
   - Asesor membaca dan tidak bisa menulis;
   - Tamu ditolak di semua rute LKPS;
   - unduh bukti tanpa login ditolak.

⏸ Tunjukkan tabel rute akhir, hasil uji akses, dan pertanyaan soal batas baca Asesor.

## G5. Halaman LKPS di dalam kerangka LED ⏸

1. **Pemetaan halaman.** Komponen klien halaman Ghalib dipindah ke `src/modules/lkps/komponen/<modul>/`. Halaman tipis
   di `src/app/lkps/` merender komponen itu. Alamat `fetch` diganti ke `/api/lkps/...`.

   | Asal | Tujuan |
   |---|---|
   | `/dashboard` | `/lkps` (beranda LKPS) |
   | `/kerjasama` … `/penjaminan` | `/lkps/kerjasama` … `/lkps/penjaminan` |
   | `/kriteria/[id]` | `/lkps/kriteria/[id]` |
   | `/identitas` | `/lkps/identitas` |
   | `/import` | `/lkps/impor` |
   | `/export` | `/lkps/ekspor` |
   | `/konfigurasi` | `/lkps/konfigurasi` (hanya Admin UPPS) |
   | `/admin` | dibuang; pakai `/admin/akun` |
   | `/login` | dibuang |

2. **Kerangka:**
   - Semua halaman memakai `ShellLkps` (sidebar dan kepala LED, tombol LKPS | LED).
   - `Header`, `Sidebar`, `Providers`, dan `RoleNotice` Ghalib tidak dipakai lagi. Pemberitahuan peran memakai
     `Petunjuk`, judul memakai `JudulHalaman`.
   - **Pemilih prodi** untuk Admin dan Asesor berupa komponen baru di kepala konten LKPS, mengisi cookie `lkps_prodi`
     dari `daftarProdi` LED. Sumbernya fitur dropdown Ghalib dari commit `c718eff`.
3. **Menu sidebar LKPS** di `src/components/shell/menu-peran.ts`, menggantikan "Data LKPS" dan "Kelengkapan LKPS prodi":
   - Beranda LKPS;
   - Identitas & tim;
   - Kriteria 1–9, plus kriteria dinamis dari konfigurasi aktif bila ada (seperti sidebar Ghalib);
   - Impor One Data;
   - Ekspor Excel;
   - Struktur kriteria & tabel (khusus Admin UPPS).

   Ikon memakai `lucide-react` yang sudah dipakai LED.
4. **Identitas:** `/lkps/identitas` menampilkan identitas institusi dan prodi dari data LED (hanya baca, dengan tautan
   ke halaman pengaturan untuk Admin atau identitas prodi untuk Tim Prodi). Tim penyusun LKPS (`LkpsTimPenyusun`) tetap
   bisa diubah di halaman ini.
5. **Gaya CSS Ghalib:**
   - Pindahkan ke `src/modules/lkps/komponen/gaya-lkps.css`.
   - Semua selektor dibungkus kelas `.lkps-klasik` dan semua variabel CSS diberi awalan `--lkps-` (mis. `--primary` →
     `--lkps-primary`).
   - `@import` Google Fonts dan `@import "tailwindcss"` dibuang, karena LED sudah memuat Geist dan Tailwind.
   - Berkas ini hanya diimpor di layout LKPS, dan konten halaman LKPS dibungkus `<div className="lkps-klasik">`.
   - Pastikan halaman LED tidak berubah: bandingkan tangkapan layar `/dashboard`, `/led`, dan `/admin/akun` sebelum dan
     sesudah.
6. **Beranda LKPS** memuat keterangan: "Data di modul LKPS belum dipakai LED. LED membaca LKPS dari berkas Excel/PDF
   yang diunggah di Data LKPS proyek LED." Sertakan tautan ke LED aktif prodi bila ada.
7. **Penanda modul:** `MODUL_LKPS.siap` di `src/modules/lkps/index.ts` menjadi `true`. Isi lama `src/app/lkps/page.tsx`
   (beranda sementara) diganti beranda LKPS.

⏸ Tunjukkan tangkapan layar setiap halaman LKPS sebagai Tim Prodi dan sebagai Admin UPPS, ditambah tiga halaman LED
pembanding.

## G6. Impor One Data (MyUnila) dalam keadaan mati

1. `myunila-client.ts`, `onedata-parser.ts`, dan isi `onedata/sync` dipindah ke `src/modules/lkps/data/onedata/`, dengan
   rute `/api/lkps/onedata/sinkron`.
2. **Konfigurasi hanya dari `.env`, tanpa nilai bawaan di kode:**
   - `LKPS_ONEDATA_AKTIF` (bawaan `false`);
   - `MYUNILA_API_URL`, `MYUNILA_APP_ID`, `MYUNILA_USERNAME`, `MYUNILA_PASSWORD`.

   Nama variabel (tanpa nilai) ditulis di `.env.example` dan `docs/PANDUAN-SERVER.md`.
3. **Bila mati atau ada variabel yang kosong:**
   - rute mengembalikan 503 dengan pesan "Sinkron One Data belum diaktifkan";
   - tombol di `/lkps/impor` nonaktif dengan keterangan yang sama.
4. **Token:**
   - hanya di memori server;
   - tidak pernah dikirim ke browser atau dicatat di log;
   - dicek ulang lewat `/v1/auth/check-token` sesuai arahan bimbingan ke-8.
5. **Uji:** tanpa jaringan (`fetch` dipalsukan):
   - mati → 503;
   - menyala → memanggil login sekali lalu memakai token tersimpan;
   - Tamu ditolak.
6. **Belum diputuskan:** kredensial siapa yang dipakai nanti (aplikasi Adrianne atau Ghalib). Catat sebagai hal terbuka
   di `CATATAN-PENGEMBANGAN.md`.

## G7. Penyamaan tampilan dengan LED ⏸ (tanya dulu)

Sebelum mulai, tanyakan ke Adrianne: dikerjakan sekarang, atau diserahkan ke Ghalib setelah penggabungan?

Bila dikerjakan:
- **Urutan per kelompok halaman,** dengan ⏸ di setiap kelompok:
  1. beranda dan identitas;
  2. kriteria 1–3;
  3. kriteria 4–6;
  4. kriteria 7–9;
  5. kriteria dinamis;
  6. impor dan ekspor;
  7. konfigurasi.
- **Cara:** ganti kelas `.card`, `.btn`, `.form-input`, `.badge`, dan sejenisnya dengan `Card`, `Button`, `Input`,
  `Select`, `Badge`, `Table`, `Dialog`, dan komponen lain di `src/components/ui`.
- **Batas perubahan:** perilaku dan rumus tidak berubah.
- **Penutup:** setelah semua kelompok selesai, `gaya-lkps.css` dihapus.

## G8. Uji akhir, build, dan dokumentasi ⏸

1. lint, typecheck, `test:unit`, `test:integrasi`, dan `npm run build` lulus.
2. **Uji jalan:** jalankan website, masuk sebagai keempat peran, lalu buka semua menu.
   - Tim Prodi: isi satu baris di tiga kriteria, unggah satu bukti, lalu ekspor.
   - Admin: ganti prodi lewat pemilih.
   - Asesor: hanya baca.
   - Tamu: hanya dashboard.
3. **Skenario black-box** gabungan dan Tamu ditulis di `docs/uji/skenario-blackbox-gabung-lkps.md`.
4. **Dokumentasi:**
   - **`src/modules/lkps/README.md`**, ditulis ulang sebagai **panduan untuk Ghalib**: cara menjalankan, letak folder,
     aturan batas modul, peran dan hak akses, cara menambah tabel atau model `Lkps*`, migrasi, uji, alur branch, dan
     catatan perbedaan struktur tabel dengan template LAM Teknik 2025.
   - **`CLAUDE.md`:** bagian struktur kode.
   - **`docs/SPESIFIKASI.md`:** empat peran dan modul LKPS.
   - **`docs/PANDUAN-PENGGUNAAN.md`:** modul LKPS.
   - **`docs/CATATAN-PENGEMBANGAN.md`.**
   - **`docs/GABUNG-LKPS-PETA.md`:** versi akhir.
5. **`docs/RENCANA-18NOV.md`:** tambahkan catatan di awal bahwa S1–S2 sudah dikerjakan di Gabung LKPS G1–G2, dan rencana
   itu dilanjutkan mulai S3 di branch `tamu-sso` yang dibuat dari `gabung-lkps`.

⏸ Tunjukkan ringkasan akhir, hasil semua uji, dan daftar hal terbuka.

## Hal terbuka (bukan tugas rencana ini)

- Struktur tabel LKPS modul Ghalib dibandingkan dengan template LKPS LAM Teknik 2025 (keputusan Ghalib dan Pak Tris).
- Sambungan data modul LKPS ke LED: adaptor opsional, sementara unggah Excel tetap jalur utama.
- Kredensial WS API MyUnila yang dipakai website gabungan.
- Keamanan repo lama Ghalib (ganti password MyUnila, hapus cookie), dikerjakan Ghalib di repo lamanya.

## Prompt untuk Claude Code

```
Baca docs/RENCANA-GABUNG-LKPS.md sampai habis, lalu kerjakan G0 sampai G8 berurutan di branch baru gabung-lkps
(dari revisi-31okt), mengikuti "Aturan kerja" di rencana itu:
- clone repo Ghalib (https://github.com/Achmadghalib725/LKPS_LAM-TEKNIK) ke ../lkps-ghalib-c718eff dan checkout
  c718eff; folder itu tidak pernah di-commit dan kodenya tidak dijalankan;
- jangan salin cookies_admin.txt, .env*, src/generated, node_modules, seed akun, atau nilai bawaan kredensial di
  src/lib/myunila-client.ts, dan jangan mencetak nilai-nilai itu di ringkasan;
- lint, typecheck, test:unit, dan test:integrasi lulus di setiap tahap; npm run build lulus di G5 dan G8;
- satu commit atau lebih per tahap, misalnya "Gabung LKPS G4: data dan API modul LKPS"; commit yang memuat kode asal
  Ghalib menulis "Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib)";
- catat di docs/CATATAN-PENGEMBANGAN.md bagian baru "Gabung LKPS (18 November 2026)";
- berhenti di setiap titik henti ⏸, tunjukkan ringkasannya, dan tunggu saya menulis "lanjut".
G1 dan G2 sama dengan S1 dan S2 di docs/RENCANA-18NOV.md; baca juga rencana itu.
Di commit G0, ikutkan docs/RENCANA-GABUNG-LKPS.md. Jangan commit postman/, .postman/, atau berkas .env.
Jangan mengubah struktur tabel LKPS Ghalib dan jangan mengubah alur LKPS di modul LED (LED tetap membaca LKPS dari
berkas yang diunggah). Bila sintaks Next.js, Prisma, atau Better Auth berbeda dari yang tertulis di rencana, ikuti
dokumentasi resmi versi yang terpasang dan catat perbedaannya.
```

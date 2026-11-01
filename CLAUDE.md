# CLAUDE.md — Website Akreditasi LAM Teknik (modul LED dan LKPS)

Panduan untuk Claude Code saat bekerja di repositori ini. Baca seluruhnya sebelum menulis kode.
Rincian ada di `docs/`; data instrumen ada di `data/instrumen/`.

## Ringkasan proyek

Skripsi Adrianne Julian (Ilmu Komputer, Universitas Lampung; pembimbing Pak Tris).
Website untuk membantu program studi menyusun **draf Laporan Evaluasi Diri (LED)** akreditasi **LAM Teknik**
memakai LLM dan RAG. Bahannya data LKPS (berkas Excel/PDF yang diunggah) dan dokumen pendukung yang diunggah.
Keluarannya **berkas Word (.docx) sesuai template LEDPS resmi**, diunduh, lalu diunggah prodi ke LAM Teknik
**secara manual**. Sistem ini tidak mengirim apa pun ke LAM Teknik.

Rekan: Ghalib membangun sistem LKPS dengan teknologi yang sama. Target akhir: satu instalasi per fakultas
berisi modul LKPS dan modul LED, hanya untuk LAM fakultas itu (Fakultas Teknik: LAM Teknik), satu login,
satu basis data. Jaga kode tetap mudah digabung (kode prodi/UPPS sama, skema Prisma rapi, modul terpisah).
**Sejak 31 Okt 2026 website ini sudah berbentuk satu website dua modul**: halaman awal `/` memilih LKPS atau LED, kode
dipisah di `src/modules/{bersama,led,lkps}` (lihat bagian "Struktur kode (31 Okt 2026)" dan `src/modules/README.md`).
Modul LKPS masih kerangka kosong untuk Ghalib.

Metode pengembangan: **prototyping**. Kerjakan per iterasi (lihat `docs/RENCANA-ITERASI.md`). Jangan melompat ke
iterasi berikutnya sebelum kriteria selesai iterasi berjalan terpenuhi. Keputusan Adrianne (2 Okt 2026): iterasi 3 dan 4
tidak menunggu demo/umpan balik pembimbing per iterasi; review bersama pembimbing dan pemangku kepentingan dilakukan
setelah website jadi.

Dokumen rencana lengkap (Claude Doc): https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

## Keputusan yang sudah dikunci (jangan diubah tanpa persetujuan Adrianne)

Revisi 19 Okt 2026 (dokumen "Rencana Revisi Website LED LAM Teknik", disetujui Adrianne) mengubah butir 1–4 dan 8;
rinciannya di `docs/CATATAN-PENGEMBANGAN.md` bagian Revisi 19 Okt 2026. Revisi 22 Okt 2026 (tab "Revisi 22 Oktober"
di dokumen yang sama) mengubah butir 2, 6, 9, dan 11; rinciannya di bagian Revisi 22 Okt 2026. Revisi 31 Okt 2026
(`docs/RENCANA-REVISI-31OKT.md`, masukan Pak Tris 6) mengubah butir 1, 2, dan 8; rinciannya di bagian "Revisi 31 Oktober
2026 (peran dan masukan Pak Tris 6)".

1. Lembaga: **LAM Teknik saja**, dibedakan per **jenjang** (10 jenjang), bukan per jurusan. Skema: Pasca Terakreditasi
   Pertama dan Unggul (Peraturan LAM Teknik No. 5 dan 6 Tahun 2025), 7 kriteria C.1–C.7. **Instrumen diunggah Admin UPPS
   per jenjang setiap ± 5 tahun** (Template LED .docx, Matriks Penilaian .pdf, Pedoman Penilaian .pdf + halaman tabel bobot):
   template diurai tanpa AI, tabel bobot dibaca tanpa AI, tabel matriks dibaca AI per kelompok kecil; hasil dicek Admin UPPS di
   halaman cek (PDF di samping tabel, usulan AI ditandai, pemeriksaan otomatis) lalu diaktifkan. Satu versi aktif per
   jenjang; versi lama tetap tersimpan dan LED lama tetap memakai versinya. Perbaikan 2 Nov 2026
   (`docs/PERBAIKAN-INSTRUMEN.md`):
   - **Tahun instrumen** wajib diisi (2020 sampai tahun berjalan + 2, dan tidak lebih lama dari versi aktif jenjang itu).
   - **Pemeriksaan berkas saat diunggah**, dari isi berkas saja (metadata dan nama berkas tidak dipakai):
     - jenis berkas;
     - tahun dan jenjang di teks Matriks/Pedoman harus sama dengan isian;
     - kriteria Template LED harus sama dengan kriteria Matriks (template tidak memuat tahun);
     - sidik jari SHA-256 berkas resmi/usang (`data/instrumen/sidik-jari.json` + tabel `SidikJariInstrumen` yang
       dipelajari saat versi diaktifkan).
     Berkas yang ditolak tidak disimpan dan tampil sebagai kotak di halaman versi. Tahun yang tidak tertulis di teks
     atau skema lain wajib dicentang Admin. Tahun baru yang cocok tidak pernah ditolak.
   - Template yang tidak terbaca mendapat **diagnosis** (rusak, bukan Template LED, struktur lama, format judul lain,
     jenjang tidak ada), bukan galat umum.
   - Format judul lain dipetakan Admin lewat **Pemetaan judul** (peran tiap gaya paragraf, tanpa AI). Ekstraksi dan
     ekspor memakai pemetaan yang sama.
   - **Usulan AI** untuk pemetaan bersifat opsional: hanya atas klik Admin setelah melihat perkiraan token, yang
     dikirim hanya kerangka judul, dan hasilnya hanya mengisi usulan.
2. **Tiga peran** (revisi 31 Okt 2026, Pak Tris; enum `Peran` = `ADMIN`, `TIM_PRODI`, `ASESOR`), semua lewat login:
   - **Admin UPPS**: Kelola akun (Admin UPPS, Tim Prodi beserta prodinya, Asesor), Program studi dan identitas
     fakultas, Instrumen, Basis Pengetahuan fakultas (unggah/hapus), Kunci API (kunci utama fakultas dan kunci
     cadangan), Model Gemini, Log, status cadangan, Penugasan reviewer LPMPP, dan Dashboard akreditasi. Melihat semua LED **hanya baca**
     (tidak membuat, menyusun, menilai, atau mengekspor LED).
   - **Tim Prodi**: akun terikat satu prodi (`User.prodiId`); satu prodi boleh beberapa akun dan semuanya menyusun LED
     yang sama. Membuat LED prodinya (prodi dari akun), mengisi identitas prodinya (bukan nama/jenjang), melihat Basis
     Pengetahuan fakultas dan status kunci API; di dalam LED: Data LKPS, dokumen, tim penyusun, jawaban, generate
     (termasuk Susun seluruh LED), suntingan, Perkiraan nilai, ekspor Word, ajukan review, tandai sudah diperbaiki.
   - **Asesor**: reviewer internal, satu asesor per LED (ditugaskan Admin UPPS). Hanya membaca LED yang ditugaskan,
     memblok teks dan memberi catatan revisi (real time di layar Tim Prodi), menerima/membuka lagi perbaikan, memberi skor
     0–4 per butir di halaman Penilaian (narasi tampil di baris butir), dan menyatakan Layak diajukan atau Perlu revisi.
     Tidak bisa menyunting, generate, atau ekspor. Ekspor final Tim Prodi terbuka setelah Layak diajukan; ekspor DRAF
     kapan saja.
   - Ringkas akses: akun/prodi/fakultas/instrumen/kunci/penugasan = Admin UPPS; LED prodi = Tim Prodi prodinya; LED yang
     ditugaskan = asesor (baca, catatan, skor); semua LED = Admin UPPS (baca).
   - Tidak ada pembagian kriteria ke anggota.
   - Aturan akun: semua pengguna bisa mengganti kata sandi sendiri (wajib kata sandi lama); akun baru dan akun yang
     sandinya diatur ulang wajib mengganti sandi saat login. Hanya Admin UPPS yang membuat akun, mengatur ulang sandi,
     memindahkan akun Tim Prodi ke prodi lain, mengubah nama dan peran akun (perbaikan 1 Nov 2026: Ubah nama/Ubah peran
     di halaman sendiri; Tim Prodi wajib prodi, prodi dikosongkan untuk peran lain; sesi akun dicabut; tercatat di log),
     menonaktifkan, dan menghapus akun; admin tidak bisa menonaktifkan/menghapus/mengubah peran diri sendiri dan minimal
     ada satu Admin UPPS aktif. Tambah akun juga halaman sendiri (`/admin/akun/tambah`). LED dan riwayat versi milik **prodi**, kunci API milik
     **fakultas**, bukan akun. Pergantian anggota tim: buat akun Tim Prodi baru, nonaktifkan akun lama.
   - **LED per periode** (2 Nov 2026, `docs/RENCANA-LED-PERIODE-BERIKUTNYA.md`):
     - Tanggal akreditasi berakhir, peringkat, dan nomor SK prodi diturunkan dari **riwayat akreditasi**
       (`RiwayatAkreditasi`). Sumbernya **Catat hasil akreditasi**: Admin UPPS langsung berlaku; Tim Prodi dari LED
       prodinya, menunggu konfirmasi Admin. LED yang diajukan lalu diarsipkan berlabel. Koreksi langsung di Ubah prodi
       wajib beralasan dan tercatat.
     - Pengingat lonceng **18, 12, dan 6 bulan** sebelum berakhir, sekali per ambang (pekerjaan harian
       `pengingat-akreditasi`), untuk Tim Prodi dan Admin UPPS, selama belum ada LED periode berikutnya.
     - Dashboard akreditasi menandai Perlu LED baru dan akun Tim Prodi yang belum ada atau tidak login > 12 bulan.
   - **Desain form 2** (2 Nov 2026, tugas dosen):
     - LED dan LKPS LAM Teknik **satu aplikasi** tanpa halaman Pilih modul. Tombol **LKPS | LED** di kepala halaman
       memindahkan antara fitur khusus tiap modul. Fitur yang sama atau harus selaras (Dashboard, Program studi,
       Instrumen, Penugasan reviewer, Kelola akun, Kunci API, Identitas prodi) ada di grup **Bersama (LED & LKPS)** yang
       tampil di kedua modul; pengaturan tidak berulang.
     - Selama modul LKPS Ghalib belum siap, LKPS diunggah sekali sebagai berkas ke LED aktif dan dipakai LED (menu Data
       LKPS Tim Prodi).
     - Peran `ASESOR` tampil sebagai **Reviewer LPMPP**.
     - **Dashboard akreditasi** `/dashboard` (bersama) memantau lintas modul; di modul LED Admin punya **Pantau LED
       prodi** `/led/pantau` (kartu per prodi, buka LED hanya baca) sebagai beranda tombol LED. Aksi Dashboard: Detail
       (`/dashboard/prodi/[id]`, ringkasan hanya baca lintas modul dan pintu ke LED/LKPS), Review LPMPP (Penilaian;
       padanan "Audit/Review" contoh dosen = review internal LPMPP, bukan modul audit terpisah), Catat hasil, Ingatkan.
     - Tim Prodi menekan **Mulai LED periode berikutnya**: LED lama diarsipkan (atau sudah diarsipkan karena hasilnya
       dicatat) dan LED baru dibuat dalam satu transaksi.
     - Bahan dari LED lama yang disalin bila dipilih: tim penyusun (periksa ulang), bahan dari prodi (per kode atau
       judul), dan dokumen prodi (disalin, diproses ulang).
     - Narasi lama tidak disalin: hanya panel baca, dan sumber P opsional untuk AF/SWOT. LKPS tidak disalin.
   - **LED satu pengajuan**: satu LED aktif per prodi; LED baru dari kartu "Mulai LED {prodi}" di `/led` (perbaikan 1 Nov
     2026; `/led/baru` diarahkan ke `/led`) = tahun pengajuan + TS (dua pilihan: (P−1)/P atau (P−2)/(P−1); TS bawaan
     dipilih ulang setiap tahun diganti), tanpa isian nama: nama otomatis "LED {prodi} {tahun} (TS {tahun akademik})",
     bisa diubah di Pengaturan LED; instrumen otomatis instrumen aktif jenjang prodi.
     Kartu dan judul memakai "TS 2026/2027 · pengajuan 2027"; label periode 5 tahun hanya kecil di Pengaturan LED.
3. **Satu sub-bagian satu halaman**: ringkasan kriteria (status sub-bagian, target kata, Lanjutkan, Generate semua,
   Tandai selesai), lalu halaman per sub-bagian berisi instruksi template, butir dan daftar cek skor 4 (dari deskriptor
   skor 4 resmi yang dipecah per nomor), data LKPS atau nilai manual, Bahan dari prodi (untuk AI; sumber J, tidak
   diekspor), dokumen, hasil generate dan riwayat versi; Sebelumnya/Berikutnya dan pemilih dropdown "n dari m" menyimpan
   isian dulu. Perbaikan 1 Nov 2026: dua tab "1. Bahan untuk AI" dan "2. Narasi (masuk ke Word)" (tab awal Narasi bila
   ada draf), baris Periksa (Catatan asesor, Pemeriksaan, Verifikasi) yang membuka panel samping, pita kuning bila ada
   catatan asesor terbuka; tampilan asesor bersusunan sama. Pertanyaan pemandu dan "dokumen yang diharapkan" buatan
   sendiri dihapus: pertanyaan = instruksi resmi template.
4. **Generate semua** (ringkasan kriteria) dan **generate satu sub-bagian**; AF/SWOT memberi peringatan bila belum ada draf
   IKU. Satu panggilan LLM = satu sub-bagian. Hasil bisa disunting; **setiap generate/suntingan disimpan sebagai versi**
   dan bisa dibandingkan/dipulihkan. Butir angka: rumus lama (`kodeRumus`) bila cocok; tanpa rumus atau rumus gagal
   membaca LKPS → nilai hitung diisi Tim Prodi (`NilaiManual`) dan menjadi sumber narasi.
5. Bagian di luar kriteria (kata pengantar, ringkasan eksekutif, Bab I, II.A, II.B, Bab III, Bab IV) **ikut di-generate**
   mengikuti instruksi template. Halaman muka, identitas, dan tabel tim diisi dari data.
6. **Maksimal 150 halaman termasuk cover dan kata pengantar** (arahan pembimbing, lebih ketat dari template);
   **halaman Lampiran tidak dihitung** (revisi 22 Okt 2026).
   Panjang narasi per butir mengikuti bobot; butir berjenis angka ditulis singkat. Lihat `src/modules/led/domain/anggaran.ts`.
7. **TS** = tahun akademik penuh terakhir saat pengajuan (Okt 2026 -> TS 2025/2026). Disimpan per proyek sebagai
   tahun mulai; label TS di LKPS diganti tahun nyata di narasi. Lihat `src/modules/bersama/domain/tahun-akademik.ts`.
8. **Kunci API**: dikelola **Admin UPPS saja** di satu halaman `/admin/kunci-api` (kunci utama fakultas dan kunci
   cadangan; nilai `KunciAPI.pemilik` tetap `penanggung_jawab` = utama, `super_admin` = cadangan). Tim Prodi hanya melihat
   status kunci dan pesan "Hubungi Admin UPPS". Urutan dicoba **kunci utama → kunci cadangan** (`pakaiCadanganAdmin`). Saat kuota habis
   generate dan ekstraksi instrumen berhenti rapi, sistem meminta kunci baru, lalu lanjut dari butir/kelompok itu.
   Kuota Gemini dihitung **per project Google**, bukan per kunci; reset tengah malam waktu Pasifik (14.00–15.00 WIB);
   galat 429 RESOURCE_EXHAUSTED. Lihat `src/modules/bersama/domain/kunci-api.ts`.
9. **Ekspor**: mengisi template LEDPS resmi (bukan dokumen baru). Huruf bawaan template (**Arial 11**, gaya Normal),
   spasi 1,15, paragraf rata kiri-kanan, judul memakai gaya template, gambar persis seperti diunggah, tebal hanya
   untuk judul. Narasi **menggantikan** isi template di bawah setiap judul sub-bagian: instruksi "Bagian ini ...",
   catatan biru "(Penjelasan ... disampaikan ...)", dan kotak isian kosong dihapus; judul bernomor template tetap.
   Spesifikasi lengkap di `docs/SPESIFIKASI.md`, contoh kerja di `docs/spike-ekspor/`. Revisi 22 Okt 2026: rujukan
   singkat di akhir paragraf, Daftar Rujukan di Lampiran, tautan bukti wajib dan perbedaan angka antar kriteria harus
   diperbaiki atau diberi alasan sebelum ekspor final, ekspor DRAF bertanda DRAF di setiap halaman.
10. **Tampilan**: sidebar (bisa diciutkan), modern, nyaman, mudah dipakai, berbahasa Indonesia. Menu per peran di
    `docs/SPESIFIKASI.md`.
11. **Data LKPS** masuk lewat unggah Excel (utama, template LKPS LAM Teknik 2025) atau PDF (cadangan, angka ditandai
    perlu dicek). Revisi 22 Okt 2026: sinkron One Data Unila direncanakan (ID sinkron di prodi dan setiap baris yang
    ditarik, tombol sinkron sekali sehari di worker, NIK tidak disimpan, kunci API One Data dikelola admin terenkripsi);
    dikerjakan setelah daftar kebutuhan data disetujui dan akses API didapat. Unggah Excel dan isian manual tetap ada.
12. Pengujian dijalankan setelah sistem jadi (rencana uji di dokumen rencana). Prodi uji belum ditetapkan.

## Teknologi

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Kerangka | Next.js 16 (App Router, `src/`), TypeScript strict | Sama dengan sistem LKPS. Server Actions untuk mutasi sederhana, Route Handlers untuk unggah/unduh |
| Basis data | PostgreSQL + Prisma ORM 7 | Prisma 7: `prisma.config.ts`, generator `prisma-client`, driver adapter `@prisma/adapter-pg` |
| Vektor | pgvector di PostgreSQL yang sama | `Unsupported("vector(768)")` + kueri `$queryRaw`/TypedSQL; indeks HNSW lewat migrasi SQL |
| Login | Better Auth (email + kata sandi, sesi di basis data, adaptor Prisma) | Auth.js sudah mode patch keamanan; jangan dipakai |
| UI | Tailwind CSS 4, shadcn/ui (Sidebar, Table, Form, Dialog, Sonner/Toast), ikon lucide-react | |
| Form | React Hook Form + Zod | Skema Zod dipakai di klien dan server |
| Editor | Tiptap | Simpan JSON Tiptap; dipetakan ke Word saat ekspor |
| LLM | AI SDK (`ai`) + `@ai-sdk/google` | `generateObject`/keluaran terstruktur dengan skema; embedding `embedMany` |
| Antrean | pg-boss | Generate, proses dokumen, ekspor berjalan di worker terpisah (`npm run worker`) |
| Baca berkas | ExcelJS atau SheetJS (LKPS), unpdf (PDF), mammoth (DOCX) | |
| Ekspor | `docx` (fitur `patchDocument`) + LibreOffice (`soffice`) untuk hitung halaman | docxtemplater gratis tidak bisa gambar/HTML (modul berbayar) |
| Pemasangan | Docker Compose: `docker-compose.yml` (DB pengembangan), `docker-compose.produksi.yml` (web, worker, DB, Caddy HTTPS) | Lihat `docs/PANDUAN-SERVER.md` |

Pasang versi terbaru yang stabil saat mulai, lalu kunci di `package.json`. Bila API pustaka berbeda dari catatan di
sini, ikuti dokumentasi resmi versi yang terpasang dan catat perbedaannya di `docs/CATATAN-PENGEMBANGAN.md`.

## Isi repositori (paket awal, sebelum iterasi 1)

```
CLAUDE.md                      <- berkas ini
README.md                      <- ringkasan untuk manusia
docs/
  PANDUAN-INSTALASI-WINDOWS.md <- pasang Node.js, Git, Docker, kunci Gemini, Claude Code
  RENCANA-ITERASI.md           <- tugas dan kriteria selesai per iterasi (ikuti ini)
  SPESIFIKASI.md               <- aturan domain: alur, RAG, anggaran, ekspor Word, UI, keamanan
  CATATAN-PENGEMBANGAN.md      <- log per iterasi (bahan Bab 3/4 skripsi); perbarui setiap iterasi
  rancangan/schema.prisma      <- draf model data (salin ke prisma/schema.prisma saat iterasi 1)
  spike-ekspor/                <- uji coba ekspor ke template LEDPS asli (berhasil): narasi menggantikan kotak isian
data/instrumen/
  lamteknik-2025-pasca.json    <- seed instrumen: 14 bagian, 125 sub-bagian (instruksi template), 72 butir Sarjana
  README.md                    <- format seed
src/lib/domain/                <- logika murni yang SUDAH DIUJI (sejak 31 Okt 2026: src/modules/{bersama,led}/domain/)
  tahun-akademik.ts  anggaran.ts  kunci-api.ts  teks.ts  prompt.ts
  __tests__/*.test.ts
docker-compose.yml  .env.example  .gitignore
```

Sumber instrumen asli (PDF/DOCX/XLSX LAM Teknik) ada di folder saudara: `../Led Lamteknik/`
(`Instrumen_Akreditasi_LAM_Teknik_2025 (dari lamteknik.or.id)/01_Pasca Terakreditasi Pertama dan Unggul/`).
Template LEDPS .docx untuk ekspor dan template LKPS .xlsx untuk pembaca LKPS diambil dari sana.
Lembar kerja `../Led Lamteknik/Matriks butir LED Sarjana.xlsx` berisi pemetaan butir dan anggaran yang sama dengan seed.

## Langkah pertama (bootstrap iterasi 1)

1. Pastikan Node.js LTS, Git, dan Docker Desktop terpasang (`docs/PANDUAN-INSTALASI-WINDOWS.md`). `git init` bila belum.
2. Folder ini tidak kosong, jadi buat kerangka Next.js di folder sementara lalu pindahkan:
   `npx create-next-app@latest _tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`,
   pindahkan isi `_tmp` ke root (gabungkan `src/`, jangan menimpa `src/lib/domain/`), hapus `_tmp`.
3. Tambahkan `"allowImportingTsExtensions": true` di `tsconfig.json` (uji domain mengimpor berkas `.ts`) atau ubah
   impor uji. Jalankan `node --test "src/modules/led/domain/__tests__/*.test.ts"` dan pastikan 22 uji tetap lulus.
   Boleh pindah ke Vitest asalkan semua uji ikut dipindahkan.
4. `npx shadcn@latest init`, lalu tambah komponen: sidebar, button, input, label, form, table, dialog, dropdown-menu,
   badge, progress, tabs, sonner, card, separator, skeleton, tooltip, textarea, select, sheet, breadcrumb, avatar.
5. `docker compose up -d` (PostgreSQL + pgvector), salin `.env.example` ke `.env`.
6. Prisma: `npx prisma init`, salin isi `docs/rancangan/schema.prisma`, sesuaikan dengan versi terpasang, migrasi.
   Buat migrasi SQL untuk `CREATE EXTENSION vector`, indeks HNSW, dan kolom tsvector.
7. Better Auth + adaptor Prisma, halaman login, proteksi rute per peran, skrip seed super admin dari `.env`.
8. Skrip seed instrumen membaca `data/instrumen/lamteknik-2025-pasca.json` (idempoten, berdasarkan `versi.kode`).
9. Lanjutkan sisa iterasi 1 di `docs/RENCANA-ITERASI.md`.

## Perintah

- `docker compose up -d` — PostgreSQL + pgvector (wajib menyala sebelum perintah lain)
- `npm run dev` — aplikasi web (http://localhost:3000)
- `npm run worker` — worker antrean pg-boss: baca LKPS, proses dokumen, generate narasi (wajib berjalan bersama `npm run dev`)
- Tanpa kunci Gemini (pengembangan): `EMBEDDING_PENYEDIA=uji` dan `LLM_NARASI=uji` untuk aplikasi dan worker
- `npm run db:migrate` — terapkan migrasi (`prisma migrate deploy`); `npm run db:seed` — super admin + instrumen (idempoten)
- `npm run cadangan [-- daftar | pulihkan <folder> --db <url> --unggahan <folder>]` — cadangan manual/pemulihan
  (worker juga mencadangkan harian); produksi: `docker compose -f docker-compose.produksi.yml --env-file .env.produksi up -d --build`
- `npx tsx scripts/sampel-verifikasi.ts ekspor|nilai` — sampel 50 kalimat untuk evaluasi verifikasi per kalimat (Bab 4)
- `npm run lint`, `npm run typecheck` (`next typegen` + `tsc`), `npm test` (= `test:unit` + `test:integrasi`)
- `npm run test:integrasi` membuat/memigrasi basis data `led_lamteknik_test` sendiri; basis data pengembangan tidak disentuh
- Migrasi baru: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script`
  (`migrate dev` menolak berjalan non-interaktif), simpan ke `prisma/migrations/<waktu>_<nama>/migration.sql`,
  **hapus baris `DROP INDEX "Potongan_embedding_hnsw_idx"`** (Prisma tidak mengenal indeks HNSW), lalu `npm run db:migrate`

## Struktur kode (31 Okt 2026, berlaku sekarang)

Satu website dua modul (permintaan Adrianne 31 Okt 2026, mengikuti arahan Pak Tris "LKPS dan LED satu website, satu
basis data"). Bagian "Struktur kode" yang lebih lama di bawah adalah catatan per iterasi; jalurnya sudah diperbarui ke
lokasi baru secara otomatis, tetapi untuk letak pasti pakai daftar ini.

- **Alur pengguna** (desain form 2, 2 Nov 2026): login sekali → `/` mengalihkan ke beranda peran (`berandaPeran`;
  tombol LED memakai `berandaLed`). Tombol LKPS | LED (`src/components/shell/pindah-modul.tsx`) memindahkan modul dan
  menyimpan modul terakhir di cookie `modul_terakhir`. Sidebar `menuPeran(peran, "led" | "lkps")` di
  `src/components/shell/menu-peran.ts` selalu Bersama + satu modul, tidak pernah tercampur: `ShellLed`, `ShellLkps`,
  dan halaman bersama (`ShellBersama`: Dashboard, Program studi, Instrumen, akun, Identitas prodi) mengikuti cookie.
  Menu modul LKPS Ghalib dimasukkan ke grup LKPS saat siap.
  Dashboard akreditasi: `src/app/dashboard/`, `led/data/dashboard.ts`, `led/domain/dashboard.ts`.
- **Rute** (`src/app`): `/` (halaman awal), `/login`, `/akun`, `/admin/*` dan `/pengaturan/prodi` (Admin UPPS); LED di
  grup rute `src/app/led/(tim-prodi)/` dan `src/app/led/(admin)/` (lihat bagian revisi 31 Okt 2026); `/led/asesor/*` di
  `src/app/led/asesor/`; `/lkps` (kerangka, ketiga peran) di `src/app/lkps/`. Route Handler LED di `src/app/api/led/*`;
  `/api/auth` dan `/api/pemberitahuan` bersama. Aksi review `src/app/led/aksi-review.ts`, aksi lonceng
  `src/app/aksi-pemberitahuan.ts`, aksi kunci `src/app/aksi-kunci.ts`.
- **Alamat lama** `/proyek/*`, `/proyek/prodi`, `/proyek/kunci-api`, `/pengaturan/kunci-api`, `/asesor/*` diarahkan oleh `redirects()` di
  `next.config.ts`; tautan pemberitahuan lama diperbarui migrasi `20261031090000_rute_modul`.
- **Modul** (`src/modules`, aturan di `src/modules/README.md`, diuji `tests/unit/batas-modul.test.ts`):
  - `bersama/`: `akses.ts`, `aksi.ts`, `antrean.ts`, `auth.ts`, `auth-client.ts`, `db.ts`, `jalur.ts`, `kripto.ts`,
    `penyimpanan.ts`, `peran.ts`, `rute.ts`, `sesi.ts`, `simpan-tertunda.ts`, `tampil.ts`, `utils.ts` (shadcn `cn`),
    `validasi.ts` (fakultas, prodi, akun, login); `data/` (`organisasi`, `kunci-api`, `pengaturan`, `pemakaian`, `log`,
    `cadangan`, `pemasangan`, `pemberitahuan`); `domain/` (`jenjang`, `tahun-akademik`, `teks`, `kunci-api`,
    `model-llm`, `json`); `llm/` (`narasi`, `narasi-uji`, `embedding`); `proses/cadangan.ts`.
  - `led/`: `domain/`, `data/`, `proses/`, `data-lkps/` (pembaca LKPS Excel/PDF yang diunggah ke LED, dulu
    `src/lib/lkps/`), `ekspor/`, `instrumen/`, `komponen/` (narasi, review, basis-pengetahuan, kesiapan, peta-ts,
    pilih-jenjang, `shell-led.tsx` = `ShellLed`/`ShellMenuLed` + `MENU_LED`, `pemilih-led.tsx`), `validasi.ts` (skema
    instrumen, LED baru, jawaban, tim penyusun), `tampil.ts` (`formatMetrik`).
  - `lkps/`: kerangka untuk Ghalib (`README.md`, `index.ts` = pintu modul, `komponen/shell-lkps.tsx`).
  - Komponen tampilan umum tetap di `src/components/` (shadcn/ui, `shell/` = `ShellAplikasi`, `ShellBersama`,
    `ShellPeran`, `menu-peran.ts` dengan menu per peran, lonceng, menu pengguna).
- **Prisma**: skema dipecah `prisma/schema/{bersama,led,lkps}.prisma` (`prisma.config.ts` → `schema: "prisma/schema"`,
  output generator `../../src/generated/prisma`); satu basis data, migrasi tetap `prisma/migrations/`.
- **Worker**: `src/worker/index.ts` (satu proses) memanggil `src/worker/{bersama,led,lkps}.ts`. Nama antrean tidak
  diubah; antrean LKPS nanti berawalan `lkps-`.
- **Uji**: `npm run test:unit` menjalankan `src/modules/*/domain/__tests__/*.test.ts` dan `tests/unit/*.test.ts`.
- Peran dan menu revisi 31 Okt 2026 (Admin UPPS / Tim Prodi / Asesor) sudah dikerjakan; lihat bagian "Struktur kode
  (revisi 31 Okt 2026)" di bawah. Bagian ini tetap berlaku untuk modul, Prisma, worker, dan uji.

## Struktur kode (revisi 31 Okt 2026)

Dikerjakan dari `docs/RENCANA-REVISI-31OKT.md` (Tahap 0–9, branch `revisi-31okt`); catatan per tahap di
`docs/CATATAN-PENGEMBANGAN.md`.

- **Peran dan akses**: `src/modules/bersama/peran.ts` (`PERAN`, `LABEL_PERAN`, `berandaPeran` = `/` untuk semua),
  `akses.ts` (`pastikanAdmin`, `pastikanTimProdi`, `pastikanProdiSendiri`, `pastikanPeran`, `pastikanAsesor`), `sesi.ts`
  (`wajibAdmin`, `wajibTimProdi`, `wajibPeran`, `wajibAsesor`; peran lain diarahkan ke `/`). `Pengguna.prodiId` dari sesi
  (Better Auth `additionalFields.prodiId`, `input: false`). LED: `ambilProyek(p, id)` = Tim Prodi pemilik;
  `ambilProyek(p, id, { baca: true })` juga Admin UPPS (semua LED) dan asesor yang ditugaskan; `ambilProyekUbah` = Tim
  Prodi pemilik dan LED tidak diarsipkan. Akun: `buatAkunTimProdi`, `buatAkunAsesor`, `buatAkunAdmin`, `pindahProdiAkun`,
  `simpanIdentitasProdi` (`src/modules/bersama/data/organisasi.ts`). Pemberitahuan review ke semua akun Tim Prodi prodi
  pemilik LED.
- **Menu dan rute**: `src/components/shell/menu-peran.ts` (`MENU_PENGATURAN_UPPS`, `MENU_LED_ADMIN`, `MENU_LKPS_ADMIN`,
  `MENU_ADMIN`, `menuLuarModul`, `berandaLed`: admin `/led/pantau`, asesor `/led/asesor`, Tim Prodi `/led`). Rute LED:
  `src/app/led/(tim-prodi)/` (`/led` dengan kartu Mulai LED, `/led/baru` → `/led`, `/led/identitas-prodi`,
  `/led/[proyekId]/*`), `src/app/led/(admin)/`
  (`/led/pantau`, `/led/instrumen`, `/led/dokumen-bersama`), `src/app/led/asesor/` (asesor; `/led/asesor/[proyekId]/*`
  juga tampilan hanya baca Admin UPPS). `/pengaturan/prodi` dan `/admin/*` milik Admin UPPS; `/pengaturan/kunci-api`
  diarahkan ke `/admin/kunci-api` (`next.config.ts`).
- **Prodi bawaan**: `data/prodi/ft-unila.json` (16 prodi) dan `src/modules/bersama/data/prodi-bawaan.ts`
  (`isiProdiBawaan`, idempoten nama + jenjang) dari `prisma/seed.ts` dan pemasangan pertama.
- **LED baru dan TS**: `pilihanTs`, `tsBawaan`, `labelTsPengajuan`, `namaLedOtomatis`, `isianSetelahGantiTahun`
  (`src/modules/bersama/domain/tahun-akademik.ts`), `skemaProyek` (`nama` opsional; kosong = nama otomatis di
  `buatProyek`), `skemaNamaProyek` (ubah nama, wajib), `src/app/led/(tim-prodi)/form-mulai-led.tsx`.
- **Akun (perbaikan 1 Nov 2026)**: `ubahNamaAkun`, `ubahPeranAkun` (`src/modules/bersama/data/organisasi.ts`), halaman
  `/admin/akun/tambah`, `/admin/akun/[id]/nama`, `/admin/akun/[id]/peran`.
- **Penilaian**: model `UsulanSkor`, antrean `skor-rubrik` (`src/modules/led/proses/skor-rubrik.ts`), rekap murni
  (`nilaiButir`, `persenNilai`, `rekapPenilaian`, `skorTerpakai`, `perluNilaiUlang` di `src/modules/led/domain/review.ts`),
  `penilaianProyek` dan `mulaiSkorRubrik` (`src/modules/led/data/review.ts`), halaman bersama
  `src/modules/led/komponen/penilaian/halaman-penilaian.tsx` (asesor `/led/asesor/[id]/penilaian`, Tim Prodi
  `/led/[id]/penilaian` "Perkiraan nilai", admin hanya baca), narasi hanya baca `src/modules/led/komponen/narasi/narasi-baca.tsx`.
  `panggilTerstruktur({ keluaranUji })` untuk `LLM_NARASI=uji` selain narasi.
- **Susun seluruh LED**: `TugasGenerate.bagianBerikutnya`, `rangkaianKe`, `rangkaianTotal`; urutan di
  `src/modules/led/domain/rangkaian.ts`; `rencanaSusun`/`lanjutkanRangkaian` (`src/modules/led/proses/generate.ts`),
  `rencanaSusunSeluruh`/`mulaiSusunSeluruh` (`src/modules/led/data/generate.ts`); kartu halaman otomatis dari data
  `src/modules/led/komponen/halaman-otomatis.tsx`. Jeda model uji `LLM_NARASI_UJI_JEDA_MS`.
- **Model AI disebut jelas**: `modelAiAktif()` (`src/modules/bersama/data/pengaturan.ts`) dari `PengaturanLLM`.
- **LKPS PDF per tabel**: `sumberLkps` (`src/modules/led/data/sumber-lkps.ts`) menggabung tabel semua berkas sumber
  (`gabungTabelLkps`, `ringkasTabelTerbaca` di `src/modules/led/data-lkps/gabung.ts`); Excel lengkap menggantikan semua
  sumber, PDF ditambahkan. `petaHalamanTabelPdf` (baca-pdf.ts) untuk uji pemecahan PDF.
- **Uji helper**: `tests/integrasi/bantu.ts` (`buatAdmin`, `siapkanFakultas`, `buatTimProdi`, `siapkanProdi`).

## Struktur kode (setelah iterasi 1)

- `src/modules/led/domain/` logika murni teruji; `src/modules/led/data/` akses data, setiap fungsi menerima `Pengguna` dan memeriksa
  peran/`prodiId`; `src/modules/bersama/akses.ts` (`Pengguna`, `GalatAkses`, `GalatPengguna`); `src/modules/bersama/validasi.ts` skema Zod bersama.
- `src/modules/bersama/auth.ts` Better Auth (plugin admin; peran di kolom `role`, nonaktif = `banned`), `src/modules/bersama/sesi.ts`
  (`ambilPengguna`, `wajibSuperAdmin`, `wajibPenanggungJawab`), `src/proxy.ts` (pengganti middleware di Next.js 16).
- Aksi server di `src/app/**/aksi.ts` dibungkus `jalankanAksi` (`src/modules/bersama/aksi.ts`).
- Rute: `/login`, `/admin/*` (super admin), `/led` dan `/led/[proyekId]/*` (penanggung jawab;
  halaman form bagian/kriteria di `/led/[id]/bagian/[kode]`).
- Versi instrumen yang dipakai proyek dikunci (tidak bisa diubah/dihapus); perubahan lewat salin versi.

## Struktur kode (setelah iterasi 2)

- `src/modules/led/data-lkps/`: pembaca LKPS Excel (`baca-xlsx.ts`, pembaca aliran ExcelJS), PDF (`baca-pdf.ts`, posisi teks),
  struktur template (`struktur.ts`, `kolom-template.json`), validasi isi (`periksa.ts`). Tabel disimpan dengan kunci
  huruf kolom template (A, B, C, ...).
- `src/modules/led/domain/metrik-lkps.ts`: rumus metrik butir angka Sarjana (Matriks Penilaian 2025) + skor perkiraan;
  hitungan manual pembanding di `docs/uji/hitungan-manual-lkps.md`. `potong-teks.ts` (800–1.200 karakter, 15%),
  `rrf.ts` (reciprocal rank fusion).
- `src/modules/led/proses/` (dipanggil worker): `lkps.ts`, `dokumen.ts` (unpdf/mammoth → potong → embedding → Potongan).
- `src/modules/led/data/`: `lkps.ts`, `dokumen.ts`, `pencarian.ts` (vektor pgvector + tsvector, RRF); di `src/modules/bersama/data/`: `kunci-api.ts`
  (AES-256-GCM, pemilihan kunci), `pengaturan.ts` (model; ganti model embedding → proses ulang semua dokumen).
- Unggahan lewat Route Handler `src/app/api/led/proyek/[proyekId]/{lkps,dokumen}`; berkas asli di `UPLOAD_DIR`,
  disajikan `src/app/api/led/dokumen/[dokumenId]/berkas`. Rute `/api/*` tidak lewat `proxy.ts` (proxy memotong body > 10 MB).
- Fikstur uji: `tests/fikstur/lkps-contoh-s1.{xlsx,pdf}` dari data fiktif `tests/fikstur/data-lkps-contoh.ts`
  (`npx tsx scripts/buat-fikstur-lkps.ts`, lalu `scripts/buat-fikstur-lkps-pdf.ts`). Peta kolom PDF:
  `npx tsx scripts/buat-kolom-template.ts` bila template LKPS berganti.
- Uji: `tests/unit/` (tanpa DB), `tests/integrasi/` (DB uji, antrean mati, embedding uji `EMBEDDING_PENYEDIA=uji`).

## Struktur kode (setelah iterasi 3)

- `src/modules/led/domain/narasi.ts`: penyamaran data pribadi untuk prompt, tabel LKPS ke Markdown, keluaran LLM ke dokumen
  Tiptap (paragraf membawa atribut `sumber`), pemeriksaan (panjang, angka, sumber, penanda belum ada bukti), urutan
  generate (IKU → LB/KEB → AF → SWOT), ringkasan IKU, diff kata, status gabungan. `model-llm.ts`: daftar models.list.
- `src/modules/led/proses/generate.ts` (worker): susun konteks satu sub-bagian, panggil LLM, simpan `VersiDraf`; tugas
  `TugasGenerate` diproses dari `indeks` dan berhenti rapi (status `tertunda`) bila kunci habis.
  `src/modules/led/proses/llm-narasi.ts`: rotasi kunci + urutan model cadangan, log `LogPemakaian` per panggilan.
- `src/modules/led/data/generate.ts`: mulai/batal/lanjut, draf per bagian, simpan suntingan (versi suntingan diperbarui dalam
  30 menit), pulihkan, bandingkan, tandai selesai. `tugas-generate.ts`: antre ulang tugas tertunda saat kunci baru ditambah.
  `pengaturan.ts`: muat daftar model Google, uji model. `pemakaian.ts`: log untuk super admin.
- UI: `src/modules/led/komponen/narasi/` (editor Tiptap, banner antrean di layout proyek, tombol generate),
  `src/app/led/(tim-prodi)/[proyekId]/bagian/[kode]/panel-draf.tsx` (tab Narasi: editor, baris Periksa, Riwayat versi),
  `tab-sub.tsx` (dua tab), `pemilih-sub.tsx` (dropdown sub-bagian), `src/modules/led/komponen/narasi/panel-samping.tsx`
  (`BarisPeriksa`, panel samping Sheet), `src/modules/led/domain/bahan-prodi.ts` (label dan contoh Bahan dari prodi).
  Status antrean: `GET /api/led/proyek/[proyekId]/generate`.
- Kunci API per prodi: `/pengaturan/kunci-api` (juga dari daftar proyek), komponen bersama `src/components/kunci-api/`.
- Akun: `src/app/akun/ganti-sandi`; `wajibGantiSandi` memaksa ganti sandi (`wajibLogin`, `jalankanAksi`, `jalankanRute`).
- Uji LLM memakai `aturModelUji` (`src/modules/bersama/llm/narasi.ts`) dengan `MockLanguageModelV4`; `GENERATE_JEDA_MAKS_MS=0`
  memendekkan jeda batas per menit di uji.

## Struktur kode (setelah iterasi 4)

- `src/modules/led/ekspor/`: `xml.ts` (pecah body, teks tanpa kotak, `gantiTeks` lintas run), `template.ts` (placeholder per
  sub-bagian, hapus yang tidak berlaku, Daftar Tabel/Gambar, `updateFields`), `isi-data.ts` (halaman muka, identitas,
  tim, Tabel 2.1/2.2), `word.ts` (Tiptap → docx; tabel/gambar bernomor per bab dengan field TC), `halaman.ts` (LibreOffice).
- `src/modules/led/domain/ekspor.ts`: nomor bab, ukuran/skala gambar, judul tabel/gambar, pemeriksaan sebelum ekspor, perkiraan halaman.
- `src/modules/led/proses/ekspor.ts` (worker, antrean `ekspor-word`), `src/modules/led/data/ekspor.ts` (tim penyusun, periksa/mulai/unduh
  ekspor, unggah template per versi). Halaman `/led/[id]/tim`, `/led/[id]/ekspor`; unduh `/api/led/ekspor/[id]/berkas`;
  unggah template lewat `/api/led/instrumen/[versiId]/berkas/template` (revisi 19 Okt). Cek pemetaan template:
  `npx tsx scripts/cek-template-led.ts S1`.

## Struktur kode (setelah U-10)

- Dokumen bersama fakultas: `Dokumen` dengan `proyekId = null` (`unggahDokumenBersama`/`daftarDokumenBersama` di
  `src/modules/led/data/dokumen.ts`, halaman `/led/dokumen-bersama`); dipakai semua LED; kode sumber prompt `U1…`.
- Proyek: `ambilProyekUbah` menolak perubahan pada proyek diarsipkan (`diarsipkanPada`); `ubahNamaProyek`,
  `aturArsipProyek`, `hapusProyek` (konfirmasi nama, berkas di disk ikut dihapus).

## Struktur kode (revisi 19 Okt 2026)

- Peran dan akses: `src/modules/bersama/akses.ts`, `src/modules/bersama/sesi.ts`; admin di `/admin/akun` dan
  `/admin/kunci-api?tab=kunci|model|pemakaian`; PJ di `/led/*` (menu di
  `src/modules/led/komponen/shell-led.tsx`). Identitas institusi: model `Fakultas` (`src/modules/bersama/data/organisasi.ts`, halaman
  `/pengaturan/institusi`): perguruan tinggi, UPPS, status PT, alamat, kota, kode pos, telepon, SK pendirian PT (D7;
  kunci SK pendirian dan kota di identitas prodi hanya cadangan data lama). Logo sampul (khusus LED): model `LogoSampul`
  (led.prisma), `led/data/logo.ts`, penyisipan di `led/ekspor/logo.ts` (D8).
- LED per periode: `tahunPengajuan`, `labelPeriode`, `tsDariTahunPengajuan` (`src/modules/bersama/domain/tahun-akademik.ts`),
  `instrumenAktifUntuk(jenjang)` dan `buatProyek` (`src/modules/led/data/proyek.ts`).
- Satu sub-bagian satu halaman: `/led/[id]/bagian/[kode]` (ringkasan) dan `/led/[id]/bagian/[kode]/[sub]`;
  data bersama `src/modules/led/data/kriteria.ts`; status/posisi/unsur skor 4 di `src/modules/led/domain/navigasi.ts`; simpan sebelum
  pindah halaman lewat `src/modules/bersama/simpan-tertunda.ts` (`TautanSimpan`, `IsianJawaban`, `EditorNarasi`, `IsianNilaiManual`).
- Unggah instrumen: `src/modules/led/domain/{tata-letak-pdf,matriks,bobot,template-led,ekstraksi-instrumen}.ts` (murni, diuji),
  `src/modules/led/instrumen/{pdf,template}.ts` (baca PDF/docx), `src/modules/led/data/unggah-instrumen.ts`, worker
  `src/modules/led/proses/instrumen.ts` (antrean `ekstrak-instrumen`), halaman `/led/instrumen`, `/led/instrumen/[versiId]`,
  `/led/instrumen/[versiId]/cek`; berkas `/api/led/instrumen/[versiId]/berkas/[template|matriks|pedoman]`. Pemanggil LLM
  generik `panggilTerstruktur` (`src/modules/led/proses/llm-narasi.ts`). Fikstur di `tests/fikstur/instrumen/`.
  Versi per jenjang menyimpan seluruh struktur template (semua varian jenjang) supaya ekspor dapat menghapus paragraf
  jenjang lain; butirnya hanya untuk jenjang versi.
- Butir angka: `src/modules/led/domain/butir-angka.ts`, `src/modules/led/data/nilai-butir.ts`; katalog rumus `katalogRumus()` di
  `src/modules/led/domain/metrik-lkps.ts`.

## Struktur kode (revisi 22 Okt 2026)

- Kecepatan generate: `src/modules/led/proses/llm-narasi.ts` (thinking rendah, batas `GENERATE_BATAS_MS` 90 detik, aliran
  `partialOutputStream`), `src/modules/led/proses/generate.ts` (pratinjau `TugasGenerate.pratinjau`, dua IKU bersamaan
  `GENERATE_PARALEL`).
- Kesiapan dan jadwal kerja mundur: `src/modules/led/domain/kesiapan.ts`, `src/modules/led/data/kesiapan.ts`, `src/modules/led/komponen/kesiapan.tsx`;
  `ProyekLED.batasPengajuan`, `jadwal`, `statusReview` (draf, direview, perlu_revisi, layak).
- Rujukan dan ekspor: `src/modules/led/domain/rujukan.ts`, `Ekspor.jenis` (draf/final), `halamanSebelumLampiran`
  (`src/modules/led/ekspor/halaman.ts`), `tandaiDraf` (`src/modules/led/ekspor/xml.ts`), `Dokumen.tahunTerbit`.
- Target dan capaian: `src/modules/led/domain/capaian.ts`, `src/modules/led/data/target-butir.ts` (model `TargetButir`).
- Verifikasi per kalimat: `src/modules/led/domain/verifikasi.ts`, `src/modules/led/data/verifikasi.ts` (Periksa dengan AI),
  `src/modules/led/komponen/narasi/sorotan-kalimat.ts`; konsistensi angka: `src/modules/led/domain/konsistensi.ts`,
  `src/modules/led/data/konsistensi.ts` (`ProyekLED.alasanKonsistensi`).
- Asesor: peran `ASESOR`; `ambilProyek(p, id, { baca: true })` mengizinkan asesor yang ditugaskan (`ProyekLED.asesorId`)
  hanya untuk fungsi baca, fungsi ubah tetap lewat `ambilProyekUbah` (PJ saja). Domain `src/modules/led/domain/review.ts`
  (jangkar teks + konteks, alur status, nilai akhir dan perkiraan status), data `src/modules/led/data/review.ts` (model
  `CatatanRevisi`, `BalasanCatatan`, `SkorAsesor`, `Pemberitahuan`), aksi `src/app/led/aksi-review.ts`, halaman `/led/asesor/*`
  dan `/admin/penugasan`, komponen `src/modules/led/komponen/review/` (sorotan catatan, panel catatan dengan polling 4 detik
  `GET /api/led/proyek/[id]/catatan`), lonceng `src/components/shell/lonceng.tsx` (`GET /api/pemberitahuan`). Versi yang
  dirujuk catatan tidak ditimpa simpan otomatis (`simpanSuntingan`).
- Basis Pengetahuan: `/led/[id]/dokumen?tab=led|bersama`, `src/modules/led/komponen/basis-pengetahuan/` (tabel dokumen, lihat
  potongan), uji cari dengan kueri generate (`kueriGenerate`).
- Server dan cadangan: `Dockerfile`, `docker-compose.produksi.yml`, `Caddyfile`, `src/modules/bersama/proses/cadangan.ts` (antrean
  `cadangan-harian`, model `Cadangan`), `scripts/cadangan.ts`, `docs/PANDUAN-SERVER.md`.

## Struktur kode (LED periode berikutnya, 2 Nov 2026)

- Riwayat akreditasi: model `RiwayatAkreditasi`, `bersama/domain/akreditasi.ts` (baca pola SK, ambang pengingat,
  `perluLedBaru`, status akun), `bersama/data/akreditasi.ts` (`terapkanRiwayatTerbaru`), `led/data/akreditasi.ts` (catat,
  konfirmasi, tolak, baca SK pola/AI). Rute `/api/akreditasi`, `/api/akreditasi/sk`, `/api/akreditasi/[id]/sk`.
  Halaman `/led/[proyekId]/hasil-akreditasi`, `/pengaturan/prodi/[id]/akreditasi`.
- Pengingat: `bersama/data/pengingat-akreditasi.ts`, tabel `PengingatTerkirim`, antrean `pengingat-akreditasi`
  (07.00 WIB, `PENGINGAT_JADWAL`), `npm run pengingat -- [--tanggal YYYY-MM-DD] [--prodi id]`.
- Akun: `User.loginTerakhir` (hook sesi Better Auth).
- Periode berikutnya: `led/domain/periode.ts`, `led/data/periode.ts` (`infoPeriodeBerikutnya`, `bahanUntukSalin`,
  `mulaiLedPeriodeBerikutnya`, `narasiPeriodeLalu`), kolom `ProyekLED.labelArsip`, `asalProyekId`, `pakaiNarasiLalu`,
  `bahanBelumDipindah`; sumber P di `led/domain/prompt.ts`.

## Struktur kode (perbaikan instrumen 2 Nov 2026)

- Pemeriksaan berkas: `led/domain/periksa-berkas-instrumen.ts` (logika murni tiga lapis), `led/instrumen/baca-berkas.ts`
  (baca .docx/.pdf, SHA-256), `led/data/unggah-instrumen.ts` (`unggahBerkasInstrumen`, `periksaSebelumEkstraksi`,
  `konfirmasiBerkasInstrumen`, `tandaiBerkasUsang`, belajar sidik jari saat `aktifkanVersiCek`). Kolom
  `VersiInstrumen.tahunInstrumen`, `sidikJari`, `riwayatPeriksa`; model `SidikJariInstrumen`.
- Diagnosis template: `led/domain/diagnosis-template.ts`.
- Pemetaan judul: `PemetaanTemplate` dan `uraiTemplate(paragraf, pemetaan?)` di `led/domain/template-led.ts`;
  `led/domain/pemetaan-template.ts` (tabel gaya, usulan awal, pratinjau); halaman `/led/instrumen/[versiId]/pemetaan`;
  kolom `pemetaanTemplate`.
- Usulan AI: `led/domain/usulan-struktur.ts` (kerangka, prompt, perkiraan token), worker `struktur-template`
  (`led/proses/struktur-template.ts`), kolom `usulanStruktur`.
- Fikstur: `tests/fikstur/instrumen/` (template resmi 2025, template LPMPP 2022, template format lain dari
  `scripts/buat-fikstur-format-lain.ts`, Matriks Sarjana dan D3 2025, Pedoman 2025).

## Konvensi

- Teks antarmuka, pesan galat, dan nama domain dalam **Bahasa Indonesia** (kode boleh campuran; ikuti istilah domain:
  `butir`, `subBagian`, `kriteria`, `proyek`, `timProdi`). Di antarmuka pakai "Admin UPPS", "Tim Prodi", "Asesor";
  jangan "PJ" atau "penanggung jawab". Nama variabel konsisten dengan seed dan skema.
- TypeScript strict, tanpa `any`. Validasi semua masukan dengan Zod di server.
- Logika domain murni ditaruh di `src/modules/<modul>/domain/` dan diberi uji. Akses data di `src/modules/<modul>/data/` atau server actions,
  bukan di komponen.
- Setiap aksi server memeriksa sesi dan peran (revisi 31 Okt 2026): Tim Prodi hanya LED dan identitas prodinya sendiri;
  asesor hanya membaca dan menilai LED yang ditugaskan; Admin UPPS mengelola akun, prodi, fakultas, instrumen, Basis
  Pengetahuan fakultas, kunci API dan model, penugasan asesor, dan membaca semua LED tanpa mengubahnya. Fungsi data
  memakai `pastikan*`/`ambilProyek`; halaman memakai `wajib*`.
- Kunci API dienkripsi (AES-256-GCM, kunci dari `ENCRYPTION_KEY`), hanya didekripsi di server/worker, tidak pernah
  dikirim ke browser atau ditulis ke log. Tampilkan hanya 4 karakter terakhir.
- Angka di narasi dihitung sistem dari LKPS, bukan oleh LLM. Format Indonesia lewat `src/modules/bersama/domain/teks.ts`.
- Proses lama (generate, baca dokumen, ekspor) lewat pg-boss; antarmuka menampilkan status dan notifikasi, bukan menunggu.
- Commit kecil dan sering dengan pesan jelas (Bahasa Indonesia boleh). Jangan commit `.env`, `uploads/`, `node_modules/`.
- Setelah tiap iterasi: perbarui `docs/CATATAN-PENGEMBANGAN.md` (apa yang dibuat, keputusan teknis, versi pustaka)
  — catatan ini menjadi bahan Bab 3 skripsi.

## Jangan

- Jangan membuat fitur unggah ke LAM Teknik, peran peninjau selain asesor (revisi 22 Okt 2026), atau pembagian kriteria
  ke anggota.
- Jangan mengubah logo/perwajahan halaman awal template LEDPS.
- Jangan mengirim data pribadi (NIP, NIDN, NIM, nama mahasiswa) ke LLM bila memakai kunci gratis tanpa penyamaran
  (layanan gratis Gemini boleh memakai data untuk pengembangan produk). Lihat `docs/SPESIFIKASI.md`.
- Jangan menanam batas kuota Gemini di kode; kuota berubah-ubah.
- Jangan menghapus atau melemahkan uji di `src/modules/*/domain/__tests__/` agar lulus; perbaiki kodenya.

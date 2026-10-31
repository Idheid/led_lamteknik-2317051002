# Catatan pengembangan

Catatan per iterasi: apa yang dibuat, keputusan teknis, versi pustaka, umpan balik pembimbing.
Catatan ini menjadi bahan Bab 3 (perancangan) dan Bab 4 (implementasi) skripsi.

## 2 Oktober 2026 — paket awal (disiapkan di Claude Cowork)

- Dibuat: CLAUDE.md, dokumen rencana iterasi, spesifikasi, panduan instalasi Windows, draf skema Prisma,
  docker-compose (PostgreSQL 17 + pgvector), data awal instrumen LAM Teknik 2025 (Sarjana).
- Logika inti murni di `src/lib/domain/` dengan 22 uji (`node --test`), semuanya lulus di Node.js 22.22:
  tahun akademik/TS, anggaran halaman dan kata (hasilnya sama dengan lembar kerja Matriks butir LED Sarjana),
  rotasi kunci API Gemini (reset tengah malam waktu Pasifik), utilitas teks Indonesia dan pemeriksaan angka, penyusun prompt.
- Uji coba ekspor (`docs/spike-ekspor/`): `docx` 9.7.1 `patchDocument` berhasil mengisi Template LEDPS asli dengan
  paragraf justify Arial, teks miring, tabel, dan gambar; header, logo, dan gaya template tetap. Temuan: setiap
  sub-bagian punya kotak teks kosong (60 kotak) yang harus dihapus saat penyiapan template.
- Keputusan Adrianne (2 Okt): narasi menggantikan kotak isian. Spike diperbarui: `siapkan-template.py` mengganti
  instruksi + catatan biru + kotak + paragraf kosong di bawah setiap judul dengan `{{kode}}`, mencatat indentasi, dan
  mempertahankan pemisah halaman. Diuji untuk Bab I, II.B, dan C.1; hasilnya rapi (lihat gambar di `docs/spike-ekspor/`).
- Kerangka Next.js belum dibuat karena registry npm tidak bisa diakses dari lingkungan Cowork; dilanjutkan di Claude Code.
- Keputusan terbuka: kunci cadangan super admin dipakai otomatis atau dipilih penanggung jawab (sementara: otomatis,
  bisa dimatikan lewat `pakaiCadanganAdmin`); usulan fitur U-01–U-09; server fakultas (Node.js/Docker); prodi uji.

## Iterasi 1 — Fondasi dan instrumen dinamis (2 Oktober 2026, Claude Code)

Kebutuhan F-01 sampai F-07 dan tata letak UI. Belum didemokan ke Pak Tris (umpan balik dicatat di bawah setelah demo).

### Yang dibuat

- **Kerangka**: Next.js 16 App Router (`src/`), TypeScript strict, Tailwind CSS 4, shadcn/ui (preset `radix-nova`),
  PostgreSQL 17 + pgvector lewat Docker Compose, Prisma 7 (`prisma.config.ts`, generator `prisma-client`,
  `@prisma/adapter-pg`). Skema dari `docs/rancangan/schema.prisma` disalin ke `prisma/schema.prisma` lalu disesuaikan.
- **Migrasi awal** `prisma/migrations/20261002000000_init`: `CREATE EXTENSION vector`, semua tabel, kolom
  `Potongan.teksTsv` (tsvector GENERATED dari `teks`, konfigurasi `simple`), indeks GIN untuk kata kunci dan indeks
  HNSW (`vector_cosine_ops`) untuk `Potongan.embedding`.
- **F-01 Login dan peran**: Better Auth (email + kata sandi, sesi di basis data, adaptor Prisma), pendaftaran mandiri
  dimatikan. Plugin admin Better Auth dengan dua peran `SUPER_ADMIN` dan `PENANGGUNG_JAWAB` (`src/lib/peran.ts`).
  Super admin membuat akun penanggung jawab (satu per prodi), menonaktifkan/mengaktifkan (sesi langsung dicabut),
  mengatur ulang kata sandi, dan menghapus akun. Proteksi rute tiga lapis: `src/proxy.ts` (cek cookie optimistis,
  pengganti middleware di Next.js 16), layout per peran (`wajibSuperAdmin`/`wajibPenanggungJawab`), dan lapisan data
  yang menerima `Pengguna` lalu memeriksa peran serta `prodiId` di setiap kueri (`src/lib/akses.ts`, `src/lib/data/`).
  Seed super admin dari `.env`.
- **F-02 UPPS dan prodi**: CRUD UPPS dan prodi (nama, jenjang, kode PDDikti, identitas: SK pendirian, SK pembukaan,
  akreditasi terakhir, kontak). Jenjang tidak bisa diubah bila prodi sudah punya proyek; prodi berproyek tidak bisa dihapus.
- **F-03 Versi instrumen**: daftar versi, salin versi (salinan mendalam: bagian, sub-bagian, butir, pemetaan butir↔sub-bagian,
  dokumen diharapkan, tabel LKPS acuan; salinan nonaktif dengan kode `…-SALINAN`, `…-SALINAN-2`), aktif/nonaktif, hapus.
- **F-04 Bagian dan sub-bagian**: ubah bagian (nama, urutan, batas halaman, pengantar); tambah/ubah/hapus sub-bagian
  (kode, nomor tampilan, judul, grup, tipe, urutan, berlaku-untuk, instruksi per varian jenjang beserta catatan biru template).
- **F-05 Butir per jenjang**: tambah/ubah/hapus butir (bobot, jenis, deskriptor dan unsur skor 4, tabel LKPS, pertanyaan
  pemandu, dokumen pendukung, pemetaan ke sub-bagian, bagian untuk anggaran), daftar butir per jenjang dengan total bobot.
- **F-06 Seed instrumen**: `src/lib/data/impor-instrumen.ts` memvalidasi JSON seed dengan Zod lalu mengimpor dalam satu
  transaksi; idempoten berdasarkan `versi.kode`. Hasil: 1 versi, 14 bagian, 125 sub-bagian, 72 butir Sarjana, bobot 100,01,
  72 pemetaan, 219 dokumen diharapkan, 35 tabel LKPS acuan.
- **F-07 Proyek LED**: penanggung jawab membuat proyek (nama, versi aktif, tahun TS). TS diusulkan dari tanggal hari ini
  lewat `tsDariTanggalPengajuan` (Oktober 2026 → 2025/2026) dan bisa diubah; peta TS sampai TS-7 tampil di form dan Beranda.
  Jenjang proyek mengikuti prodi; anggaran halaman versi disalin ke proyek.
- **UI**: sidebar shadcn (bisa diciutkan menjadi ikon, laci di layar kecil, status disimpan di cookie), menu per peran,
  lencana status per kriteria, menu iterasi berikutnya tampil redup dengan label "segera". Beranda: progres kriteria,
  anggaran halaman (`hitungAnggaran`) per kriteria dan seluruh LED, usulan sistem (`usulanHalamanKriteria`), peta TS,
  identitas pengusul. Halaman bagian/kriteria: sub-bagian yang berlaku untuk jenjang proyek dikelompokkan per grup,
  instruksi template (label TS diganti tahun nyata), butir dengan bobot/jenis/tabel LKPS, daftar cek unsur skor 4,
  dokumen pendukung yang diharapkan, pertanyaan pemandu, isian jawaban penyusun dengan simpan otomatis (peringatan saat
  meninggalkan halaman yang belum tersimpan), target kata per sub-bagian, dan daftar isi halaman. Tombol generate dan
  unggah sudah ada tetapi nonaktif (iterasi 2 dan 3).

### Keputusan teknis (perlu dikonfirmasi bila tidak sesuai)

1. **Versi yang dipakai proyek dikunci penuh** (tidak bisa diubah, bukan hanya tidak bisa dihapus). Alasan: kriteria
   "proyek lama tetap memakai versi lamanya" hanya terjamin bila isi versi lama tidak berubah diam-diam. Perubahan
   dilakukan dengan menyalin versi.
2. **Kolom peran memakai nama plugin admin Better Auth**: `role` (enum Prisma `Peran`) dan `banned`/`banReason`/`banExpires`
   menggantikan `peran` dan `aktif` di draf skema. Dengan begitu login akun nonaktif ditolak oleh Better Auth sendiri.
   `prodiId` tetap kolom tambahan (`additionalFields`).
3. **Kolom tambahan skema**: `VersiInstrumen.catatan`, `jenjang`, `statusAkreditasi`; `SubBagian.jenjangOverride`
   (dari seed, untuk "Kualifikasi akademik DTPS"); `ButirPenilaian.bagianKode` (bagian tempat anggaran butir dihitung);
   `Session.impersonatedBy` (wajib plugin admin, tidak dipakai). Menyimpan sub-bagian lewat form mengosongkan
   `jenjangOverride` karena form menampilkan jenjang efektif.
4. **Uji**: semua uji dijalankan dengan `tsx --test` (runner bawaan Node.js). Uji domain tetap di
   `src/lib/domain/__tests__/` (22 uji lama tidak diubah, ditambah 9). Uji integrasi di `tests/integrasi/` memakai basis
   data terpisah `led_lamteknik_test` yang dibuat dan dimigrasi otomatis oleh `scripts/siapkan-db-uji.ts`; setiap berkas
   uji mengosongkan tabel di awal. Uji integrasi memanggil lapisan data (`src/lib/data/`) langsung, termasuk login
   lewat `auth.api.signInEmail`.
5. **Aksi server tipis**: `src/app/**/aksi.ts` hanya membungkus fungsi lapisan data lewat `jalankanAksi`
   (`src/lib/aksi.ts`) yang mengubah galat Zod/akses/Prisma menjadi pesan berbahasa Indonesia.
6. **Target kata sub-bagian** (`targetKataSubBagian`): sub-bagian bersama dari porsi 35%, sub-bagian IKU = jumlah target
   butirnya, sub-bagian narasi di bab tanpa butir = kata bagian dibagi rata (perkiraan).

### Perbedaan dari catatan pustaka di CLAUDE.md

- **Next.js 16**: `middleware.ts` berganti nama menjadi `proxy.ts`; `params`/`searchParams` asinkron; tipe global
  `PageProps<"/rute">`/`LayoutProps` dari `next typegen` (dijalankan di `npm run typecheck`).
- **shadcn/ui 4**: komponen `form` tidak ada lagi di preset baru; diganti `field` (Field, FieldLabel, FieldError) yang
  dipakai bersama `Controller` React Hook Form. Utilitas `cn` datang dari paket `cn`.
- **Prisma 7.10**: tidak mengenal indeks HNSW. `prisma migrate dev` akan selalu mengusulkan
  `DROP INDEX "Potongan_embedding_hnsw_idx"`. Aturan: terapkan migrasi dengan `npm run db:migrate` (`migrate deploy`);
  saat membuat migrasi baru (`npx prisma migrate dev --create-only`), hapus baris DROP INDEX tersebut dari SQL-nya.
  Kolom tsvector dan indeks GIN sudah dinyatakan di skema (`dbgenerated`, `type: Gin`) sehingga tidak menimbulkan selisih.
  Prisma 8 masih rilis kandidat, jadi dipakai 7.10.0.
- **Zod 4**: `z.enum` menerima tuple kode jenjang; skema yang sama dipakai di form klien dan lapisan data.

### Versi pustaka (dikunci di package.json)

Next.js 16.3.8, React 19.2.8, TypeScript 5.9.3, Prisma/@prisma/client/@prisma/adapter-pg 7.10.0, pg 8.23.1,
Better Auth 1.7.7, Zod 4.6.5, React Hook Form 7.89.0, @hookform/resolvers 5.9.1, Tailwind CSS 4.3.3, shadcn 4.21.1
(radix-ui 1.6.7), lucide-react 1.49.0, sonner 2.0.8, tsx 4.23.15. Node.js 22.21, PostgreSQL 17 (image `pgvector/pgvector:pg17`).

### Hasil pemeriksaan kriteria selesai

| Kriteria | Cara diperiksa | Hasil |
| --- | --- | --- |
| Super admin membuat UPPS, prodi, akun PJ; PJ hanya melihat prodinya | UI di browser + `tests/integrasi/akses.test.ts` | Lulus. PJ yang membuka `/admin` diarahkan ke `/proyek`; akses proyek prodi lain ditolak |
| Seed 1 versi, 14 bagian, 125 sub-bagian, 72 butir Sarjana, bobot 100,01, 150 halaman | `npm run db:seed` dua kali + `tests/integrasi/instrumen.test.ts` | Lulus, idempoten |
| Salin versi lalu tambah butir; proyek lama tetap di versi lama | UI (salinan 73 butir, bobot 100,51; versi lama 72) + uji integrasi | Lulus |
| Sidebar C.1–C.7; C.3 = 19 IKU + 4 bersama untuk Sarjana | UI + uji integrasi + uji unit | Lulus; a.06, a.07, a.08, b.03 tidak tampil |
| Beranda: C.1 4, C.2 8, C.3 29, C.4 11, C.5 10, C.6 20, C.7 21 | UI + uji unit | Lulus; total 150 halaman, 103 untuk kriteria |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus (31 uji unit, 6 uji integrasi) |
| Demo ke Pak Tris | — | **Belum** (dilakukan Adrianne) |

### Catatan lingkungan

- Docker Desktop 4.69 di laptop pengembangan gagal menyala karena berkas soket Unix basi di
  `%LOCALAPPDATA%\Docker\run` dan `%LOCALAPPDATA%\docker-secrets-engine` yang tidak bisa dihapus. Diatasi sementara dengan
  mengganti nama kedua folder itu (`*.basi-*`) sebelum menyalakan Docker; restart Windows biasanya membuat berkas itu bisa
  dihapus.

### Umpan balik pembimbing

(diisi setelah demo)

## Iterasi 2 — Unggah dan pemrosesan (2 Oktober 2026, Claude Code)

Kebutuhan F-08 sampai F-12. Umpan balik pembimbing untuk iterasi 1 belum ada (bagian di atas masih "diisi setelah
demo"), jadi tidak ada perubahan iterasi 1 yang diterapkan.

### Yang dibuat

- **F-08 LKPS Excel** (`src/lib/lkps/baca-xlsx.ts`). Satu aturan baca generik untuk semua sheet template: cari baris
  nomor kolom (A = 1, B = 2, C = 3), judul kolom dari baris di atasnya, data di bawahnya, panel INFO diabaikan, baris
  kategori/jumlah dilewati, blok jenjang dipilih untuk 6.d dan 6.f.1. Sheet yang berlaku per jenjang disalin dari
  sheet "Daftar Tabel" template (`struktur.ts`). Validasi: sheet hilang dan struktur berubah = galat; tabel wajib
  kosong dan sel wajib kosong (`KOLOM_WAJIB` per sheet) = peringatan; TS di sheet Menu dibandingkan dengan TS proyek.
  Tabel disimpan ke `TabelLKPS` dengan kunci huruf kolom template; berkas terbaru yang terbaca menjadi sumber data
  (bisa dipilih ulang).
- **Metrik butir angka** (`src/lib/domain/metrik-lkps.ts`): 33 butir angka Sarjana (6-I, 6-II, 9, 10, 11, 18, 19,
  23, 25–28, 30–37, 40–47, 49–52) beserta skor perkiraan. Rumus dari PDF Matriks Penilaian LED dan LKPS Sarjana 2025;
  definisi variabel mengikuti panel INFO template (NDTPS = Dosen Tetap dengan V di kolom J, kerja sama sah bila masa
  berlaku beririsan dengan 4 tahun sampai akhir TS, NM = baris prodi bertanda V, RBK = rerata BK per semester, dst.).
  Metrik tampil di halaman Data LKPS dan di kartu butir halaman kriteria.
- **Fikstur LKPS fiktif**: template LKPS asli diisi data rekaan (`tests/fikstur/data-lkps-contoh.ts`,
  `scripts/buat-fikstur-lkps.ts` → `tests/fikstur/lkps-contoh-s1.xlsx`). Hitungan manual tiap butir di
  `docs/uji/hitungan-manual-lkps.md`, diperiksa ulang dengan kalkulator terpisah, dan diuji di
  `tests/unit/lkps-contoh.test.ts`.
- **F-09 LKPS PDF** (`src/lib/lkps/baca-pdf.ts`): teks berposisi dari pdf.js (unpdf); judul tabel dicocokkan dengan
  judul sheet template; baris nomor kolom menjadi patokan posisi; batas kolom diambil dari awal teks rata kiri; sel
  terbungkus digabung ke baris sebelumnya. Hasil selalu `perluDicek`. Halaman tabel bisa dikoreksi manual
  (tambah/hapus baris, ubah sel, tandai "sudah dicek") dan metrik dihitung ulang. Fikstur PDF
  (`scripts/buat-fikstur-lkps-pdf.ts`) meniru cetakan Excel: judul, nomor kolom, sel terbungkus, pindah halaman, dan
  blok jenjang lain di 6.d. Uji: semua metrik dari PDF sama dengan metrik dari Excel.
- **F-10 dokumen pendukung**: unggah PDF/DOCX/PNG/JPG/GIF (jenis dikenali dari isi berkas, maksimal 25 MB) per
  sub-bagian dan butir. Dokumen bisa dikaitkan ke "dokumen yang diharapkan" (daftar cek di halaman kriteria
  menampilkan tanda terpenuhi) dan diberi tautan bukti sahih (hanya http/https). Halaman Dokumen: semua berkas, status
  proses, ubah judul/tautan, unduh asli, proses ulang, hapus.
- **F-11 pemrosesan**: worker pg-boss (`npm run worker`, antrean `baca-lkps` dan `proses-dokumen`, diulang otomatis
  2× dengan jeda bertambah). Ekstraksi teks dengan unpdf (per halaman) dan mammoth; potongan 800–1.200 karakter dengan
  tumpang tindih 15% di batas paragraf/kalimat/kata (`potong-teks.ts`); embedding Gemini `gemini-embedding-001`
  (`outputDimensionality` 768, `taskType` RETRIEVAL_DOCUMENT/QUERY, dinormalkan) disimpan di `Potongan.embedding`
  (pgvector, indeks HNSW), dan teks di `teksTsv` (tsvector "simple", GIN). Status per berkas: diunggah, diproses,
  siap, gagal, menunggu_kunci. Mengganti model embedding (menu Model LLM super admin) mengantre ulang semua dokumen
  teks. Pencarian gabungan (`pencarian.ts`): kandidat vektor (jarak kosinus) dan kata kunci (ts_rank, kueri OR yang
  hanya berisi huruf/angka), digabung RRF k = 60, 8 potongan teratas, disaring per proyek dan per sub-bagian
  (ditambah dokumen umum).
- **Kunci API sederhana**: menu Kunci API penanggung jawab (tambah, uji koneksi, hapus). Kunci dienkripsi AES-256-GCM,
  hanya 4 karakter terakhir yang tampil; pemilihan kunci dan penandaan kuota habis memakai
  `src/lib/domain/kunci-api.ts`. Dokumen tanpa kunci berstatus "menunggu kunci" dan diantre ulang otomatis saat kunci
  ditambahkan.
- **F-12 gambar**: disimpan apa adanya (hash SHA-256 dicatat; byte yang disajikan sama dengan unggahan) dan punya
  judul gambar. `simpulGambar()` menyiapkan simpul gambar Tiptap (src berkas asli + judul) untuk editor iterasi 3.
- **UI**: menu Data LKPS, Dokumen, dan Kunci API aktif. Beranda menampilkan status kunci, LKPS sumber data, dokumen
  siap dicari, dan dokumen yang diharapkan yang masih kurang. Halaman kriteria punya tombol unggah per dokumen yang
  diharapkan, daftar berkas per sub-bagian, dan kotak metrik LKPS per butir angka. Proses berjalan di latar; halaman
  menyegarkan diri selama masih ada berkas yang diproses.

### Keputusan teknis dan asumsi (perlu dikonfirmasi pembimbing)

1. **Asumsi rumus** untuk bagian yang tidak dirinci matriks: BOP dari kolom Program Studi baris 1.a–1.f; DPD dan DPkMD
   per DTPS; RIPK tertimbang jumlah lulusan; MS dan WT dengan titik tengah kelompok; KBK = sedang + tinggi; PMA = penuh
   + paruh waktu saat TS; skor butir 26 dan 44 pada rentang yang teksnya terpotong di PDF. Daftar lengkap di
   `docs/uji/hitungan-manual-lkps.md`; setiap butir menampilkan catatan asumsinya.
2. **Skor perkiraan** ikut dihitung (rumus skor tersedia di matriks) dan ditandai sebagai bantuan, bukan penilaian asesor.
3. **Pembaca Excel memakai aliran ExcelJS**: model penuh ExcelJS butuh ±35 detik untuk template (gaya dan validasi
   ±1.000 baris × 54 sheet), sedangkan aliran ±3 detik. Konsekuensinya, sel gabungan tidak diulang ke kolom
   sebelahnya, sehingga judul kolom memakai teks sel masing-masing.
4. **Embedding uji** (`EMBEDDING_PENYEDIA=uji`, feature hashing kata, 768 dimensi) dipakai uji otomatis dan bisa
   dipakai demo lokal tanpa kunci; ditolak di produksi. **Jalur Gemini belum diuji dengan kunci sungguhan** karena
   lingkungan pengembangan tidak punya kunci; uji koneksi tersedia di menu Kunci API.
5. **pg-boss** memakai skema `pgboss` di basis data yang sama. Uji integrasi mematikan antrean (`ANTREAN_NONAKTIF=1`)
   dan memanggil fungsi proses langsung.
6. **Rute unggah tidak lewat `proxy.ts`**: Next.js 16 hanya menyalin 10 MB pertama body permintaan yang lewat proxy
   (`proxyClientMaxBodySize`), sehingga unggahan besar akan terpotong diam-diam. Semua rute `/api/*` memeriksa sesi sendiri.
7. **Konstanta dari modul "use client"** tidak bisa dipakai komponen server (yang diterima hanya referensi klien), jadi
   konstanta bersama ditaruh di modul biasa (`src/lib/tampil.ts`). Masalah ini ditemukan saat uji di browser.

### Migrasi

`prisma/migrations/20261002120000_iterasi2_unggah` menambah kolom status/aktif/masalah/identitas di `BerkasLKPS`;
judul, blok, kolom, kolomRumus, dan dikoreksi di `TabelLKPS` (unik per berkas + sheet); serta jenis, judul, hash,
dokumenDiharapkanId, dan jumlahPotongan di `Dokumen`. Migrasi dibuat dengan `prisma migrate diff` (`migrate dev`
menolak berjalan non-interaktif), lalu baris `DROP INDEX "Potongan_embedding_hnsw_idx"` dihapus sesuai aturan.

### Versi pustaka baru

exceljs 4.4.0, unpdf 1.8.1, mammoth 1.13.0, pg-boss 12.35.1, ai 7.0.127, @ai-sdk/google 4.0.87, docx 9.8.1,
pdf-lib 1.17.1 (hanya pengembangan, untuk fikstur).

### Hasil pemeriksaan kriteria selesai

| Kriteria | Cara diperiksa | Hasil |
| --- | --- | --- |
| Satu LKPS contoh terbaca benar (template diisi data fiktif, fikstur dibuat) | `tests/unit/lkps-contoh.test.ts`, `tests/integrasi/unggah.test.ts`, unggah lewat API dan tampilan di browser | Lulus: 43 tabel Sarjana dan identitas sheet Menu terbaca; hanya 1 peringatan, yang memang disengaja |
| Metrik butir angka dihitung sistem dan diuji terhadap hitungan manual | 55 nilai metrik dan 33 skor dibandingkan dengan `docs/uji/hitungan-manual-lkps.md` | Lulus (toleransi 0,0001) |
| Dokumen PDF dan DOCX bisa dicari: gabungan vektor + kata kunci, disaring per proyek dan sub-bagian | `tests/integrasi/unggah.test.ts` dan panel Uji pencarian di halaman Dokumen | Lulus, dengan embedding uji (bukan Gemini) |
| Perlu kunci Gemini, diisi penanggung jawab lewat menu Kunci API | Menu Kunci API, uji enkripsi, antre ulang dokumen "menunggu kunci" | Lulus; koneksi Gemini sungguhan belum dicoba (butuh kunci Adrianne) |
| F-09 PDF cadangan, F-10 daftar cek dan tautan bukti, F-12 gambar utuh | `lkps-pdf.test.ts`, `unggah.test.ts`, browser | Lulus |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus (57 uji unit, 15 uji integrasi) |

### Umpan balik pembimbing

(diisi setelah demo)

## Perbaikan sebelum iterasi 3 dan iterasi 3 — Mesin penyusun (2 Oktober 2026, Claude Code)

Keputusan Adrianne: iterasi 3 dan 4 dilanjutkan tanpa menunggu umpan balik pembimbing; review bersama pembimbing dan
stakeholder setelah website jadi (dicatat di `CLAUDE.md` dan `docs/RENCANA-ITERASI.md`).

### Perbaikan sebelum iterasi 3

1. **Kunci API per prodi**: menu Kunci API juga ada di sidebar halaman "Semua proyek LED" (`/proyek/kunci-api`);
   komponen bersama `src/components/kunci-api/`. Beranda proyek menampilkan peringatan bila tidak ada kunci yang bisa
   dipakai (`ringkasanKunciProdi`), dengan tautan ke menu Kunci API.
2. **Model LLM**: isian teks diganti dropdown dari endpoint `models.list` Google (memakai kunci aktif mana pun,
   cadangan super admin lebih dulu; kunci dikirim lewat header `x-goog-api-key`, bukan URL). Model narasi dan cadangan
   = model yang mendukung `generateContent` (model gambar/suara/robotika disaring), model embedding = `embedContent`.
   Setiap pilihan menampilkan nama, kode, dan penjelasan singkat (`penjelasanModel`); tombol **Muat ulang daftar** dan
   **Uji model**; urutan model cadangan (maks. 5) bisa diatur. Model narasi bawaan diganti ke `gemini-3-flash-preview`;
   saat daftar dimuat, model generasi 1.x/2.x atau model yang tidak ada di daftar otomatis diganti model 3.x flash
   (stabil diutamakan dari pratinjau). Batas kuota Gemini tidak ditanam di kode.
3. **Akun dan serah terima** (tetap dua peran): super admin bisa membuat super admin lain; semua pengguna bisa mengganti
   kata sandi sendiri (wajib kata sandi lama, lewat `auth.api.changePassword`, sesi lain dicabut); akun baru dan akun
   yang sandinya diatur ulang punya `wajibGantiSandi` sehingga diarahkan ke `/akun/ganti-sandi` (halaman, aksi server,
   dan rute API ikut menolak). Hanya super admin yang mengatur ulang sandi, menonaktifkan, dan menghapus akun; tidak
   bisa untuk akun sendiri; minimal satu super admin aktif. Aturan satu akun per prodi kini hanya menghitung akun
   **aktif** (`User.prodiId` tidak lagi unik). Kunci API, versi draf, dan log memakai `onDelete: SetNull` ke akun,
   jadi data prodi tetap ada saat akun dihapus.
4. **Petunjuk di setiap halaman** (`src/components/petunjuk.tsx`, bisa ditutup, diingat per halaman di browser) dan
   `docs/PANDUAN-PENGGUNAAN.md` untuk super admin dan penanggung jawab.

### Iterasi 3 — yang dibuat

| Kode | Implementasi |
| --- | --- |
| F-13 | `TugasGenerate` + antrean pg-boss `generate`. Per kriteria: IKU → latar belakang dan kebijakan → analisis faktor → SWOT (`urutkanUntukGenerate`); AF dan SWOT menerima ringkasan IKU (`ringkasIku`). Per sub-bagian/butir (Generate ulang butir) dan per bagian di luar kriteria memakai jalur yang sama. Konteks: identitas, instruksi (label TS diganti), butir + unsur skor 4, jawaban penyusun [J], metrik sistem [M-…], tabel LKPS [T-sheet] (Markdown ringkas), 8 potongan dokumen [D1–D8] dari pencarian gabungan, target kata. Prompt dari `src/lib/domain/prompt.ts`, keluaran terstruktur `generateText` + `Output.object` (skema Zod setara `SKEMA_KELUARAN`). |
| F-14 | Status unsur skor 4 per butir (terpenuhi/sebagian/belum ada bukti + sumber) dan dokumen yang perlu diunggah, ditampilkan sebagai daftar cek di tab Hasil generate. |
| F-15 | Paragraf Tiptap membawa atribut `sumber` (tampil sebagai penanda kecil "Sumber: …" lewat CSS, tidak ikut ekspor) dan legenda kode sumber per versi. |
| F-16 | Editor Tiptap (tebal, miring, daftar berbutir/bernomor, tabel, gambar dari unggahan proyek), simpan otomatis 1,5 detik setelah berhenti mengetik. |
| F-17 | Setiap generate dan suntingan menjadi `VersiDraf` baru (suntingan beruntun oleh orang yang sama dalam 30 menit memperbarui versi suntingan yang sama); bandingkan dua versi (diff kata `diffWordsWithSpace`: dihapus dicoret, ditambah disorot); pulihkan = salinan versi lama menjadi versi baru. |
| F-18 | Target kata dari anggaran proyek (`targetKataSubBagian`); peringatan bila di luar ±15%. |
| F-19 | `src/lib/proses/llm-narasi.ts`: kunci dipilih `pilihKunci` (kunci prodi, lalu cadangan super admin bila diizinkan); model narasi lalu model cadangan; 429 harian pada satu model → model berikutnya; semua model habis → kunci ditandai `kuota_habis` sampai reset, kunci berikutnya dipakai; batas per menit/galat sementara → tunggu `retryDelay` lalu ulang; tidak ada kunci → tugas `tertunda` dengan pesan meminta kunci baru, dijadwalkan ulang saat reset kuota (pg-boss `startAfter`) dan langsung diantre ulang saat kunci baru ditambahkan (`antreUlangTugasTertunda`). Tugas lanjut dari `indeks` sub-bagian yang tertunda. |
| F-20 | `LogPemakaian` per panggilan (kunci, prodi, proyek, tugas, sub-bagian, model, token masuk/keluar, durasi, galat); halaman super admin **Log pemakaian** (24 jam/7/30 hari, per model, per prodi, 100 panggilan terakhir); token per versi juga tampil di kartu hasil. |
| F-21 | Status sub-bagian (belum, draf, disunting, selesai) dan status kriteria gabungan (`statusGabungan`), sakelar Selesai per sub-bagian, tombol Tandai selesai per kriteria (hanya bila semua sub-bagian punya draf), progres draf per kriteria di Beranda. |
| Cek | `periksaDokumen`: panjang (`statusPanjang`), angka (`angkaTidakBerdasar` terhadap angka di metrik, tabel, jawaban, potongan, butir, ringkasan IKU, dan tahun TS−10 sampai TS+6), sumber per paragraf terhadap kode sah, penanda `[BELUM ADA BUKTI: …]`, dan unsur yang tidak dilaporkan (`periksaKeluaran`). Dijalankan ulang setiap simpan suntingan. |

Tampilan halaman kriteria: tombol **Generate kriteria** di atas; setiap kartu sub-bagian berisi instruksi, butir +
data LKPS, jawaban penyusun, dan dokumen di atas, lalu tab **Hasil generate** (editor, penanda sumber, pemeriksaan
otomatis, daftar cek skor 4) dan **Riwayat versi** (daftar, pulihkan, bandingkan). **Pemberitahuan antrean** tampil
di atas semua halaman proyek (progres, sub-bagian yang sedang disusun, tombol Batalkan/Lanjutkan/Tambah kunci API),
memantau `GET /api/proyek/[id]/generate`, dan menyegarkan halaman setiap ada sub-bagian selesai; halaman boleh ditinggal.

### Keputusan teknis dan asumsi

1. **Penyamaran data pribadi selalu aktif** (tidak hanya untuk kunci gratis): deret 10–20 digit (NIDN, NIM, NIK, NIP)
   diganti `[ID disamarkan]`; kolom LKPS berlabel NIDN/NIDK/NUPTK/NIP/NIM/NIK dan "Nama Mahasiswa/Lulusan" disamarkan.
   Nama dosen tidak disamarkan (dibutuhkan narasi SDM dan tidak termasuk daftar larangan).
2. **Satu tugas aktif per proyek** supaya kuota tidak terpakai ganda dan urutan IKU → AF/SWOT terjaga. Memulai generate
   tanpa kunci tetap membuat tugas (status tertunda) agar otomatis dimulai setelah kunci diisi.
3. **Tabel metrik butir angka dibuat sistem** di awal narasi butir angka; LLM hanya menulis analisis. Tabel dan judul
   tabel tidak dihitung dalam anggaran kata dan tidak diperiksa angkanya.
4. **Gemini 3 memakai suhu bawaan** (Google menyarankan 1,0; suhu rendah bisa membuat keluaran berulang); suhu
   pengaturan hanya dipakai model generasi lama. `maxOutputTokens` minimal 8.192 karena token *thinking* ikut dihitung.
5. **Mode uji narasi** (`LLM_NARASI=uji`, ditolak di produksi): model tiruan deterministik tanpa kunci, teks bertanda
   "[Mode uji]", untuk mencoba alur antrean/editor/riwayat tanpa kuota. Uji otomatis memakai `MockLanguageModelV4`
   lewat `aturModelUji`, termasuk galat 429 tiruan berformat respons Google (QuotaFailure + RetryInfo).
6. **Atribut Tiptap dikirim sebagai salinan JSON murni** ke aksi server: objek atribut Tiptap bukan objek biasa
   sehingga React mengirimnya sebagai *temporary client reference* dan server gagal membacanya (ditemukan saat uji
   di browser).
7. **Prompt tidak diubah** dari iterasi sebelumnya (`src/lib/domain/prompt.ts` dan ujinya tetap); sub-bagian tanpa
   sumber apa pun akan memunculkan masalah "sumber tidak dikenal" atau penanda belum ada bukti, sesuai aturan anti-halusinasi.

### Migrasi

`prisma/migrations/20261002200000_iterasi3`: `User.prodiId` tidak unik + `wajibGantiSandi`; relasi akun → data prodi
`SetNull`; `KunciAPI.pemilikId`; `PengaturanLLM.daftarModel/daftarModelDiperbarui`; `LogPemakaian.tugasId/prodiId/durasiMs`;
`VersiDraf.tugasId`; `BagianDraf.updatedAt`; tabel `TugasGenerate`; model narasi 2.5 di data lama diganti
`gemini-3-flash-preview`.

### Versi pustaka baru

@tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-table, @tiptap/extension-image,
@tiptap/extension-paragraph 3.31.4; diff 9.0.0.

### Hasil pemeriksaan kriteria selesai

| Kriteria | Cara diperiksa | Hasil |
| --- | --- | --- |
| Satu kriteria lengkap disusun, disunting, diulang per butir, dibandingkan dengan versi lama, dan dipulihkan | `tests/integrasi/generate.test.ts` (C.1, 7 sub-bagian, model tiruan) dan di browser dengan `LLM_NARASI=uji` (generate C.1 lewat antrean worker, sunting di editor, bandingkan versi 1 dan 2, pulihkan versi 1) | Lulus |
| 429 harian tiruan: generate berhenti, pesan meminta kunci baru tampil, setelah kunci baru diisi generate lanjut dari butir tertunda | `generate.test.ts`: C.4 (16 sub-bagian) berhenti di sub-bagian ke-3, kedua model dicoba, kunci ditandai kuota habis sampai reset, banner berstatus tertunda; kunci B ditambahkan → tugas diantre ulang dan selesai tanpa mengulang 2 sub-bagian pertama | Lulus |
| Narasi tidak memuat angka di luar data (konteks fiktif) | `narasi.test.ts` (konteks fiktif: angka sah lolos, 19,8 dan 93% tertangkap) dan `generate.test.ts` (narasi tiruan dengan 97,3% dan 1.234 ditandai; draf normal tanpa temuan); suntingan "15 kali" langsung ditandai di browser | Lulus untuk pemeriksaan; uji dengan Gemini sungguhan belum dilakukan (lihat di bawah) |
| Akun: super admin lain, ganti sandi sendiri, wajib ganti sandi, aturan super admin terakhir, satu akun aktif per prodi, data tetap saat akun dihapus | `tests/integrasi/akun.test.ts` | Lulus |
| Model LLM dari models.list, model 2.5 diganti 3.x, uji model | `tests/integrasi/model.test.ts`, `model-llm.test.ts` | Lulus (respons Google tiruan) |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus (66 uji unit, 24 uji integrasi) |

**Uji ujung ke ujung dengan kunci Gemini asli belum dijalankan**: saat dicek, tabel `KunciAPI` di basis data
pengembangan masih kosong (tidak ada kunci yang tersimpan), sehingga jalur Gemini sungguhan (models.list, generate C.1,
kuota) belum dicoba. Setelah kunci ditambahkan di menu Kunci API, jalankan worker tanpa `LLM_NARASI=uji`, muat ulang
daftar model di menu Model LLM, lalu Generate kriteria C.1 (±7 panggilan).

### Umpan balik pembimbing

(review bersama pembimbing dan stakeholder setelah website jadi)

## Perbaikan setelah iterasi 3 dan iterasi 4 — Ekspor Word (2–3 Oktober 2026, Claude Code)

### Perbaikan setelah iterasi 3

- Kunci API menerima semua karakter ASCII yang terlihat (format kunci Google baru `AQ.…` memuat titik, dan format
  mendatang bisa memuat simbol lain); hanya spasi, baris baru, dan huruf non-ASCII yang ditolak. Keabsahan kunci
  dipastikan lewat Uji koneksi.
- Satu menu **Kunci API prodi** (`/proyek/kunci-api`); alamat lama per proyek diarahkan ke sana. Sidebar di dalam
  proyek punya grup **Prodi** (Semua proyek LED, Kunci API prodi) supaya bisa kembali ke daftar proyek.
- Keputusan Adrianne: urutan kunci tetap **kunci prodi → kunci cadangan super admin** (super admin = fakultas setelah
  serah terima); tidak ada lapisan kunci fakultas terpisah.

### Iterasi 4 — yang dibuat

| Kode | Implementasi |
| --- | --- |
| Penyiapan template | `src/lib/ekspor/template.ts` (pengembangan `docs/spike-ekspor/siapkan-template.py`): titik temu template ↔ instrumen adalah **teks instruksi** (kunci 110 huruf karena banyak instruksi berawalan sama); bila template tidak punya paragraf instruksi, judul bernomornya yang menjadi jangkar. Instruksi, catatan biru (termasuk sambungan baris "/ Magister …"), lanjutan instruksi yang terpecah, kotak teks, dan paragraf kosong diganti `{{kode}}`; instruksi yang bernomor (I./II.) dipertahankan sebagai judul singkat; sub-bagian yang tidak berlaku untuk jenjang dihapus beserta judulnya; pemisah halaman/bagian dipertahankan. Hasil: S1 106 placeholder + 15 dihapus, D3 101 + 20, S2 103 + 18, PPI 98 + 23, **0 tidak ditemukan**. Pemeriksaan cepat: `npx tsx scripts/cek-template-led.ts S1 [keluaran.docx]`. |
| Template per versi | Super admin mengunggah template LEDPS (.docx) di halaman versi instrumen; sistem langsung melaporkan pemetaan per jenjang. Cadangan pengembangan: `TEMPLATE_LEDPS_PATH`. |
| F-22 | Antrean `ekspor-word` (worker): template disiapkan, data proyek diisi, narasi Tiptap ditambal dengan `docx` `patchDocument` (`keepOriginalStyles`), berkas disimpan di `UPLOAD_DIR/ekspor`, diunduh lewat `/api/ekspor/[id]/berkas`. Halaman dihitung LibreOffice (`soffice --headless --convert-to pdf`, profil terpisah) lalu jumlah halaman PDF; ekspor > 150 halaman berstatus **ditahan** (tidak bisa diunduh). Tanpa LibreOffice jumlah halaman **diperkirakan** (kata/kata per halaman + baris tabel + gambar + 10 halaman tetap) dan ditandai perkiraan. |
| F-23 | Halaman muka (program dan nama prodi, PT, UPPS, kota, tahun; catatan template dihapus), identitas pengusul (baris "Label: ……" diisi; nilai kosong ditulis "–" dan dilaporkan), tabel daftar prodi UPPS, identitas tim penyusun (blok Nama/NIDN/Jabatan/Tanggal per dosen, diperbanyak/dikurangi sesuai jumlah), Tabel 2.1 dan 2.2 dari menu baru **Tim penyusun**. Kata pengantar, ringkasan eksekutif, Bab III, dan Bab IV disusun paling akhir dari ringkasan analisis faktor dan SWOT semua kriteria (`perluRingkasanSemua`). Identitas prodi ditambah: kota, pejabat penandatangan SK pendirian/pembukaan, tahun pertama menerima mahasiswa, alamat. |
| F-24 | Daftar isi template (field TOC) tetap; ditambah **Daftar Tabel** dan **Daftar Gambar** (field `TOC \f t` / `\f g`) dengan entri `TC` tersembunyi di setiap judul tabel/gambar; `settings.xml` diberi `updateFields` sehingga Word memperbarui semua daftar saat dibuka. |
| Format | Paragraf rata kiri-kanan, Arial 11, spasi 1,15, indentasi kiri sama dengan instruksi yang digantikan; istilah asing miring; daftar berbutir/bernomor dengan indentasi gantung; tabel lebar penuh, baris judul tebal dan diulang di halaman berikut, judul di atas bernomor per bab (Bab II mulai Tabel 2.3 karena Tabel 2.1/2.2 sudah ada di template); gambar berkas asli, rasio asli, lebar maks. 17,1 cm (646 px), judul di bawah. Penanda sumber tidak ikut diekspor. |
| Pemeriksaan | Ekspor ditolak bila ada bagian belum ditandai selesai, sub-bagian tanpa draf, penanda `[BELUM ADA BUKTI:`, tabel tanpa judul (paragraf judul tabel buatan sistem atau diawali "Tabel"), gambar tanpa judul, tim penyusun kosong, atau template belum ada. Peringatan (tidak menolak): identitas prodi kosong, tautan bukti Lampiran kosong, LibreOffice tidak tersedia, logo PT perlu diganti manual. |

### Keputusan teknis dan asumsi

1. **Kotak "Logo Perguruan Tinggi"** di halaman muka dibiarkan (perwajahan template tidak boleh diubah); penyusun
   mengganti logo di Word. Diberi peringatan di hasil ekspor.
2. **Catatan "Keterangan: 1) Lampirkan salinan …"** di identitas pengusul dipertahankan karena bagian formulir resmi
   (rujukan nomor kaki).
3. **Jumlah mahasiswa per prodi UPPS** di tabel identitas belum ada sumber datanya (ditulis "–").
4. **Lampiran** diisi daftar tautan bukti sahih dari kolom tautan dokumen (U-02).
5. Pemeriksaan teks memakai XML langsung (bukan pustaka DOM) agar bagian template yang tidak disentuh tetap identik.
6. Bug yang ditemukan uji unit dan diperbaiki: Bab III sempat dianggap bab 2 (`'III'.startsWith('II')`); sel tabel
   template yang hanya berisi node teks kosong tidak terisi.

### Migrasi

`prisma/migrations/20261003090000_iterasi4_ekspor`: `VersiInstrumen.templateLedLokasi/templateLedNama/templateLedLaporan`;
`Ekspor` ditambah namaBerkas, ukuran, halamanPerkiraan, pesan, dibuatOlehId, updatedAt, status bawaan `antre`, lokasi opsional.

### Versi pustaka baru

jszip 3.10.2 (sebelumnya hanya dependensi tidak langsung `docx`).

### Hasil pemeriksaan kriteria selesai

| Kriteria | Cara diperiksa | Hasil |
| --- | --- | --- |
| Tidak ada instruksi template, catatan biru, atau kotak isian kosong yang tersisa | `tests/integrasi/ekspor.test.ts` (semua bagian disusun model tiruan, diekspor ke template asli, isi document.xml diperiksa) dan pemeriksaan struktur hasil | Lulus. Yang tersisa hanya kotak logo PT (sengaja) dan kotak tanda tangan tim (bagian formulir, tanggal sudah terisi) |
| ≤ 150 halaman, justify, Arial 11, spasi 1,15, gaya judul template, gambar sama dengan unggahan, tabel berjudul di atas bernomor per bab, gambar berjudul di bawah | Uji integrasi (jc both, Arial, Tabel 2.3, Gambar 2.1, media PNG asli, TC/TOC) | Lulus. **Jumlah halaman masih perkiraan** karena LibreOffice belum terpasang di komputer pengembangan |
| Pemeriksaan sebelum ekspor menolak bagian belum selesai, penanda belum ada bukti, tabel/gambar tanpa judul | `ekspor.test.ts` (domain dan integrasi) | Lulus |
| Template per versi | `ekspor.test.ts`: unggah .docx, tolak berkas lain dan penanggung jawab, 0 sub-bagian tidak ditemukan untuk semua jenjang versi | Lulus |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus (75 uji unit, 27 uji integrasi) |

Belum diperiksa: tampilan berkas di Microsoft Word secara visual (perlu dibuka manual) dan hitung halaman LibreOffice.

## Setelah iterasi 4 — U-10, pengelolaan proyek, LibreOffice (3 Oktober 2026, Claude Code)

### U-10 Bahan bersama UPPS

- `Dokumen` dimiliki tepat satu: proyek (`proyekId`) **atau** UPPS (`uppsId`); dijaga CHECK constraint di basis data
  (migrasi `20261003120000_u10_bahan_bersama_upps`).
- Super admin mengunggah di menu **Bahan bersama UPPS** (`/admin/bahan-upps`, rute `/api/admin/upps/[uppsId]/dokumen`).
  Dokumen diproses sekali dan di-embedding dengan **kunci cadangan super admin** (`penyediaUntukUpps`), bukan kunci prodi.
- Pencarian gabungan memasukkan potongan bahan bersama UPPS prodi (`HasilCari.bersama`); di prompt diberi kode
  **U1, U2, …** (dokumen proyek tetap D1, D2, …) dan legenda "Bahan bersama UPPS", sehingga pemeriksaan sumber mengenalnya.
- Penanggung jawab melihat bahan bersama di menu Dokumen (lencana "Bahan bersama fakultas", hanya baca, bisa dibuka
  dan disisipkan gambarnya); bahan bersama ikut memenuhi daftar cek dokumen yang diharapkan dan masuk Lampiran
  (tautan bukti) serta gambar ekspor. Prodi di UPPS lain tidak melihatnya.

### Pengelolaan proyek

- Proyek selalu milik prodi akun (diambil dari sesi); nama proyek hanya label. Formulir proyek baru dan daftar proyek
  kini menampilkan prodinya dengan jelas.
- **Ubah nama**, **Arsipkan / Aktifkan kembali**, dan **Hapus proyek** (wajib mengetik ulang nama; menghapus draf,
  riwayat, LKPS, dokumen, ekspor beserta berkasnya) di kartu Pengaturan proyek, Beranda.
- Keputusan: LED periode lama **diarsipkan, tidak dihapus**, karena menjadi rujukan akreditasi berikutnya (siklus
  ±5 tahun) dan jejak mutu prodi. Proyek arsip hanya baca (generate, sunting, unggah, jawaban, tim ditolak) tetapi
  tetap bisa dibuka dan diekspor. Hapus hanya untuk proyek yang salah dibuat (migrasi `20261003130000_arsip_proyek`).

### LibreOffice

- LibreOffice 26.8.0 dipasang di komputer pengembangan dari installer MSI resmi (tanda tangan Authenticode The
  Document Foundation diverifikasi; winget gagal mengunduh karena koneksi ke server pengalih diblokir, jadi dipakai
  mirror resmi). Jumlah halaman ekspor kini **dihitung**, bukan diperkirakan (uji: 23 halaman untuk data uji).
- Pratinjau PDF hasil ekspor memperlihatkan narasi di bawah butir bernomor "I." menjorok lebih sedikit daripada "II.";
  penyebabnya indentasi berasal dari definisi penomoran (`numbering.xml`), bukan paragraf. Diperbaiki: indentasi
  placeholder dibaca dari level penomoran (`bacaIndentasiPenomoran`, `indentEfektif`).

### Hasil pemeriksaan

| Hal | Cara diperiksa | Hasil |
| --- | --- | --- |
| U-10: unggah oleh super admin, dicari prodi di UPPS yang sama, tidak oleh UPPS lain, kode U1, daftar cek, hanya baca | `tests/integrasi/bahan-upps.test.ts`, halaman `/admin/bahan-upps` | Lulus |
| Ubah nama, arsip hanya baca, aktifkan kembali, hapus dengan konfirmasi, bahan UPPS tidak ikut terhapus | `bahan-upps.test.ts`, Beranda di browser | Lulus |
| Hitung halaman LibreOffice dan tampilan hasil | `ekspor.test.ts` + konversi PDF dan pratinjau halaman | Lulus (23 halaman, dihitung) |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus |

## Revisi 19 Oktober 2026 (Claude Code)

Sumber: dokumen "Rencana Revisi Website LED LAM Teknik" (19 Okt 2026, disetujui Adrianne). Lima keputusan, dikerjakan
per tahap dan setiap tahap diuji sebelum tahap berikutnya.

### Tahap 1–2 — Data, peran, program studi, periode (commit `e2df002`)

- Peran menjadi **Admin** (hanya Akun PJ dan Kunci API; model Gemini dan log pemakaian dipindah ke tab di halaman Kunci
  API) dan **Penanggung jawab fakultas** (satu akun untuk seluruh fakultas: semua LED, program studi, instrumen,
  dokumen bersama, kunci API fakultas). Admin tidak bisa membuka LED.
- UPPS diganti identitas **Fakultas** (diisi sekali). Prodi mendapat `akreditasiBerlakuSampai` (daftar diurutkan dari
  yang paling dekat berakhir). Kunci API dan dokumen bersama milik fakultas.
- LED per periode 5 tahun: `tahunPengajuan`, label "Periode 2026–2031", TS = "tahun data LKPS" dihitung dari tahun
  pengajuan (dapat diubah di Pengaturan LED), satu LED aktif per prodi, instrumen dipilih otomatis menurut jenjang.
- Satu migrasi (`20261019090000_revisi_pj_fakultas`) tanpa menghapus data: UPPS → Fakultas, `tahunPengajuan` dari
  tanggal dibuat, LED aktif ganda per prodi diarsipkan, pertanyaan pemandu dan dokumen yang diharapkan buatan sendiri
  dikosongkan. Cadangan basis data dev sebelum migrasi: `led-tmp/cadangan-sebelum-revisi-19okt.dump`.

### Tahap 3 — Satu sub-bagian satu halaman (commit `23f3874`, `649cdc4`)

- Halaman kriteria menjadi **ringkasan**: status tiap sub-bagian (belum diisi, ada jawaban, ada draf, selesai, dari
  data), target kata, bilah kemajuan, **Lanjutkan** (sub-bagian pertama yang belum selesai), Generate semua, Tandai selesai.
- Halaman baru `/proyek/[id]/bagian/[kode]/[sub]`: judul "C.4 · 3 dari 14", bilah posisi, urutan isi sesuai dokumen
  revisi, daftar sub-bagian di samping, **Sebelumnya/Berikutnya** (di sub-bagian terakhir ke ringkasan kriteria berikutnya).
- Simpan sebelum pindah: penyimpan otomatis (jawaban, editor narasi, nilai manual) mendaftar ke
  `src/lib/simpan-tertunda.ts`; tautan pindah (`TautanSimpan`) menunggu semua penyimpan selesai dan tidak berpindah
  bila gagal; komponen juga menyimpan saat dilepas.
- Peringatan sebelum generate AF/SWOT bila kriteria belum punya draf IKU.
- Daftar cek skor 4 = deskriptor skor 4 resmi dipecah per nomor (1), (2), … (`pecahUnsurSkor4`). Pemecahan ini
  menemukan dua butir data bawaan yang salah terpecah ("S.d", butir 53-I dan 57); diperbaiki di data dan lewat
  migrasi `20261019120000_perbaiki_unsur_skor4`.
- UI pertanyaan pemandu dan dokumen yang diharapkan dihapus (pertanyaan = instruksi resmi template).

### Tahap 4 — Unggah instrumen per jenjang (commit `0623c80`)

Alur: Instrumen baru (jenjang) → unggah Template LED (.docx), Matriks Penilaian (.pdf), Pedoman Penilaian (.pdf) +
halaman tabel bobot → Mulai ekstraksi (worker `ekstrak-instrumen`) → Periksa hasil → Sudah dicek, aktifkan.

- **Template tanpa AI** (`src/lib/domain/template-led.ts`): paragraf dibaca dengan nama gaya, penomoran Word
  (numId/ilvl), dan tanda kotak isian. Judul besar membuka bab, gaya judul kriteria membuka C.1…C.7, paragraf bernomor
  yang bukan instruksi menjadi judul, isi sampai kotak isian menjadi satu blok (instruksi + catatan biru yang
  menentukan jenjang). Blok berurutan di bawah judul yang sama dengan jenjang berbeda menjadi varian. Kode sub-bagian
  diambil dari versi rujukan bila instruksinya cocok (skor = awalan bersama terpanjang setelah awalan baku "Bagian ini
  menjelaskan data dan analisis terkait …" dibuang), sehingga kode stabil antarversi (rumus, ekspor, draf lama).
  Hasil pada template resmi 2025: **sub-bagian dan urutannya identik dengan data bawaan untuk 10 jenjang**.
- **Tabel bobot tanpa AI** (`bobot.ts`): posisi kolom NO./ELEMEN/INDIKATOR/BOBOT dari pdf.js; setiap angka di kolom
  bobot memulai sub-indikator. Letak tabel tiap jenjang dideteksi otomatis dari judul "LAMPIRAN: BOBOT PENILAIAN" dan
  judul "PROGRAM …" sebelumnya (Sarjana: halaman PDF 223–227, sesuai dokumen revisi). Sarjana: 71 dari 72 bobot sama
  dengan data bawaan; butir 58 di tabel resmi hanya punya satu bobot (2,92) untuk dua sub-indikator (data bawaan
  membaginya 1,46 + 1,46), jadi bobot dibagi rata dan ditandai untuk dicek.
- **Matriks**: teks PDF biasa bercampur antarkolom, jadi tabel disusun ulang dari posisi teks (`matriks.ts`; kolom dari
  judul No/Kriteria/Indikator/4/3/2/1/0, baris dari nomor di kolom No, berlanjut lintas halaman, judul bagian sebagai
  konteks). Hanya teks baris yang sudah rapi dikirim ke Gemini per kelompok ± 6 baris, bersama tabel bobot, daftar
  sub-bagian, dan katalog 33 rumus lama. AI memecah sub-indikator, merapikan kolom, dan **mengusulkan** sub-bagian,
  jenis, dan rumus. Kemajuan disimpan per kelompok; kuota habis → tertunda, lanjut dari kelompok yang sama.
- **Halaman cek**: PDF asli di kiri (melompat ke halaman butir), tabel yang bisa disunting di kanan, usulan AI ditandai
  sampai dikonfirmasi, pemeriksaan otomatis (total bobot 100 ± 0,01, nomor berurutan, deskriptor 4, ≥ 1 sub-bagian,
  instruksi sub-bagian, semua butir dicek). Aktivasi menonaktifkan versi aktif lama jenjang itu; LED lama tetap.
- Pemanggil LLM dijadikan generik (`panggilTerstruktur`): rotasi kunci, model cadangan, dan log pemakaian sama dengan narasi.
- Versi per jenjang menyimpan **seluruh** struktur template (semua varian jenjang) agar ekspor bisa menghapus paragraf
  jenjang lain (ditemukan oleh uji alur penuh tahap 6); butirnya khusus jenjang versi.

Uji tahap 4 dengan Gemini sungguhan (Matriks Sarjana 2025, `gemini-3-flash-preview`, 11 panggilan, ± 45 ribu token
masuk dan 58 ribu token keluar), dibandingkan dengan 72 butir data bawaan:

| Hal | Hasil |
| --- | --- |
| Baris matriks → butir | 60 baris → 72 butir/sub-indikator; kode 72/72 sama |
| Bobot | 72/72 sama, total 100,01 |
| Sub-bagian usulan AI | 72/72 sama persis |
| Rumus lama usulan AI | 32/32 cocok (+1 usulan untuk butir 19) |
| Jenis angka/narasi | 68/72 sama (17, 19, 21-II, 29 diusulkan "angka"; ditandai untuk dicek) |
| Deskriptor skor 4 | menyalin teks resmi PDF (data bawaan berupa parafrase manual) |

Versi uji coba ini (`LAMTEKNIK-2025-S1-UJICOBA`, status "Perlu dicek", belum aktif) dibiarkan di basis data dev untuk
dicoba di halaman cek.

### Tahap 5 — Butir angka (commit `fb6e644`)

- Rumus dipetakan lewat `kodeRumus` butir instrumen (bukan kode butir Sarjana). Butir tanpa rumus, atau rumus yang
  tidak bisa membaca LKPS (tabel kosong/format berubah, `lengkap = false`), otomatis beralih ke **nilai hitung manual**
  (`NilaiManual`, isian di halaman sub-bagian). Nilai manual masuk prompt sebagai sumber `[M-NILAI-<butir>]`, angkanya
  dianggap sah oleh pemeriksaan angka, dan tampil di tabel sistem.

### Tahap 6 — Uji alur penuh (commit `2c3c621`)

`tests/integrasi/alur-penuh.test.ts`, dari basis data kosong: tambah prodi → unggah instrumen S1 (fikstur resmi) →
cek dan aktifkan → buat LED → isi satu kriteria → generate → ekspor Word. Uji ini menemukan dua cacat yang sudah
diperbaiki: catatan biru jenjang lain tertinggal di Word (struktur template tidak lengkap) dan versi pertama tanpa
rujukan tidak punya tabel LKPS acuan (kini memakai kerangka bawaan).

### Tahap 7 — Dokumen

- Diperbarui: `CLAUDE.md` (keputusan 1–4 dan 8, struktur kode revisi), `docs/PANDUAN-PENGGUNAAN.md` (ditulis ulang untuk
  Admin dan PJ fakultas), `README.md`, `docs/RENCANA-ITERASI.md`, catatan ini.
- **Di luar kode**: desain Figma dan peta form eksternal belum diselaraskan; perlu diperbarui manual mengikuti menu dan
  halaman di atas.
- Belum diputuskan (tidak memengaruhi kode): siapa pemegang peran admin (ditulis umum), dan konfirmasi ke Pak Tris bahwa
  "borang unggul" = skema Pasca Terakreditasi Pertama dan Unggul.

### Catatan lingkungan

- Selama pengujian, komputer pengembangan kehabisan memori (server dev berhenti dengan `spawn ENOMEM`) dan VM WSL
  Docker ikut mati. Docker Desktop lalu gagal mulai karena berkas soket AF_UNIX sisa (`%LOCALAPPDATA%\Docker\run\
  dockerInference`, `%LOCALAPPDATA%\docker-secrets-engine\engine.sock`) tidak bisa dihapus. Pemulihan: hentikan Docker,
  `wsl --shutdown`, ganti nama kedua folder itu (`*.basi-…`), jalankan Docker Desktop lagi. Jangan memakai "Reset to
  factory defaults" karena menghapus kontainer dan volume basis data. Kontainer Superset dari proyek lain ikut menyala
  otomatis dan memakan memori; hentikan bila tidak dipakai.

### Hasil pemeriksaan revisi

| Hal | Cara diperiksa | Hasil |
| --- | --- | --- |
| Admin hanya Akun PJ/Kunci API; PJ membuka semua prodi | `tests/integrasi/akses.test.ts`, server dev | Lulus |
| LED kedua untuk prodi yang sama ditolak sampai yang lama diarsipkan | `akses.test.ts` | Lulus |
| Jawaban tidak hilang saat pindah halaman; generate satu halaman dan Generate semua | `generate.test.ts` (tahap 3), server dev | Lulus |
| Unggah Matriks Sarjana 2025 dibandingkan butir yang ada | `unggah-instrumen.test.ts` (model tiruan) + uji Gemini sungguhan (tabel di atas) | Lulus |
| Butir berumus otomatis; tanpa rumus/rumus gagal → nilai manual menjadi sumber | `generate.test.ts` (tahap 5), `butir-angka.test.ts` | Lulus |
| Alur penuh sampai ekspor Word | `alur-penuh.test.ts` | Lulus |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus (90 uji unit, 35 uji integrasi) |

## Revisi 22 Oktober 2026 (Claude Code)

Sumber: tab "Revisi 22 Oktober" pada dokumen rencana revisi (artifact Claude Docs). Urutan kerja mengikuti dokumen;
setiap tahap diuji sebelum tahap berikutnya.

### Tahap 1 — Kecepatan generate (commit `3320cf3`)

- Gemini 3 dipanggil dengan `thinkingLevel: "low"`, batas 90 detik per panggilan (`GENERATE_BATAS_MS`; habis waktu →
  coba sekali lagi, lalu model cadangan), keluaran dialirkan (`streamText` + `partialOutputStream`) dan teks sementara
  disimpan di `TugasGenerate.pratinjau` (kotak "Sedang ditulis", dibaca ulang tiap 2 detik). Dua sub-bagian IKU
  berurutan dikerjakan bersamaan (`GENERATE_PARALEL`, bawaan 2).
- Ukuran nyata: rata-rata 5,8 detik per sub-bagian (sebelumnya 12,9 detik dengan model dan kunci yang sama), teks pertama
  tampil ± 2 detik.

### Tahap 2 — Deadline, kesiapan, jadwal kerja mundur (commit `457a9d6`)

- `ProyekLED.batasPengajuan` (usulan: akreditasi berakhir − 6 bulan), `jadwal` (tonggak yang diubah PJ), `statusReview`.
  Tonggak dihitung mundur: LKPS 8 minggu, kriteria 6, bab lain 4, review 2, ekspor 0 minggu sebelum batas.
- Semua LED diurutkan menurut tanggal akreditasi berakhir, arsip di bawah; kolom kesiapan (LKPS %, draf/selesai, catatan
  asesor, status review, sisa waktu; merah ≤ 6 bulan dan belum layak, kuning ≤ 12 bulan); tombol Buat LED di daftar
  prodi. Bab II.A memakai jadwal dan susunan tim tanpa nama.

### Tahap 3 — Rujukan, Lampiran, tautan bukti, DRAF (commit `28249d6`)

- Rujukan singkat di akhir paragraf Word dari kode sumber (dokumen + tahun terbit, tabel LKPS, metrik); Daftar Rujukan
  di Lampiran; jumlah halaman dihitung sampai judul LAMPIRAN (Lampiran tidak dihitung dalam 150 halaman).
- Ekspor final wajib Layak diajukan dan tautan bukti untuk setiap dokumen yang dirujuk; ekspor DRAF kapan saja dengan
  tanda DRAF di header/footer, pemeriksaan menjadi peringatan.

### Tahap 4 — Target dan capaian (commit `7e0f3ea`)

- `TargetButir` per butir angka; persen capaian, status tercapai, dan tren TS-2 → TS dihitung di kode
  (`src/lib/domain/capaian.ts`), masuk prompt sebagai metrik `M-CAPAIAN-*`/`M-TREN-*`; aturan prompt baru: evaluasi
  capaian memakai angka sistem.

### Tahap 5 — Verifikasi per kalimat dan konsistensi angka (commit `47f028c`)

- Cek otomatis per kalimat tanpa kuota AI: angka harus ada di sumber yang dirujuk paragraf, lalu kecocokan kata kunci
  (ambang 0,6/0,3; kalimat berangka yang semua angkanya cocok cukup 0,2). Garis bawah hijau/kuning/merah di editor,
  ringkasan, saringan kalimat bermasalah, tombol **Periksa dengan AI** (satu panggilan Gemini per sub-bagian).
- Konsistensi angka antar kriteria dan terhadap LKPS (angka sebanding 0,5–2× nilai metrik, toleransi 1%); perbedaan
  menahan ekspor final sampai diperbaiki atau diberi alasan.
- Bahan Bab 4: `npx tsx scripts/sampel-verifikasi.ts ekspor <proyekId> sampel.csv` mengambil 50 kalimat acak (seed
  tetap) dengan label otomatis dan label AI; peneliti mengisi `label_manual`, lalu `... nilai sampel.csv` menghitung
  akurasi, matriks kebingungan, dan persentase kalimat sesuai sumber (faithfulness). **Penilaian manual 50 kalimat belum
  dilakukan** karena LED pengembangan belum punya draf hasil generate; jalankan setelah satu LED digenerate.

### Tahap 6 — Server dan cadangan (commit `2e814f9`)

- `Dockerfile` (Node 22, LibreOffice Writer, font Liberation/Carlito/Caladea, pg_dump 17), `docker-compose.produksi.yml`
  (migrasi, web `next start`, worker, PostgreSQL + pgvector, Caddy untuk HTTPS), `.env.produksi.example`,
  `docs/PANDUAN-SERVER.md`.
- Akses dari perangkat lain: `BETTER_AUTH_TRUSTED_ORIGINS` (dibaca Better Auth langsung). Diuji di laptop mode produksi
  lewat IP Wi-Fi: login dari alamat IP yang dipercaya diterima, alamat lain ditolak `INVALID_ORIGIN`.
- Cadangan harian oleh worker (pg-boss `schedule`, 02.00 WIB, `missed: once`): pg_dump format custom + zip unggahan,
  ditulis ke folder sementara lalu diganti nama, sisakan 14; status terakhir di halaman Akun PJ admin. Pemulihan
  `npm run cadangan -- pulihkan`. Diuji: cadangan data pengembangan dipulihkan ke basis data terpisah, jumlah baris
  semua tabel utama dan isi semua berkas unggahan identik.
- Belum: build image Docker di server sungguhan (menunggu alamat server; membangun image mengunduh paket).

### Tahap 7 — Asesor (commit `6836f72`)

- Akses: `ambilProyek(p, id, { baca: true })` mengizinkan asesor yang ditugaskan hanya pada fungsi baca; semua fungsi
  ubah tetap lewat `ambilProyekUbah` (PJ), jadi asesor tidak bisa menyunting, generate, atau ekspor.
- Catatan revisi berjangkar pada teks polos versi aktif (paragraf depth-first dipisah baris baru): teks persis + 60
  karakter konteks kiri/kanan; letaknya dicari ulang setiap dokumen berubah, kemunculan dengan konteks paling cocok
  dipilih. Bila teks hilang, catatan ditandai "Teks asli sudah berubah".
- Alur: terbuka → diperbaiki (PJ, versi aktif dicatat) → diterima atau dibuka lagi (asesor, wajib balasan). Versi yang
  dirujuk catatan tidak ditimpa simpan otomatis (cacat yang ditemukan uji integrasi: suntingan PJ dalam 30 menit
  menimpa versi saat catatan dibuat sehingga tidak ada yang bisa dibandingkan).
- Real time memakai polling (catatan 4 detik, lonceng 15 detik) supaya tidak butuh server WebSocket.
- Penilaian akhir: skor 0–4 dengan deskriptor matriks, skor sistem butir angka sebagai acuan (beda wajib beralasan),
  Σ bobot × skor (bobot Sarjana berjumlah 100,01 sehingga maksimum 400,04), perkiraan status dari
  `VersiInstrumen.statusAkreditasi`. Instrumen seed lama hanya memuat deskriptor skor 4; deskriptor 0–3 terisi bila
  instrumen jenjang diekstrak dari Matriks Penilaian (halaman memberi keterangan).
- Uji dua sesi bersamaan (PJ di `localhost`, asesor di `127.0.0.1` supaya kuki terpisah): catatan asesor muncul di
  layar PJ tanpa muat ulang, Sudah diperbaiki muncul di layar asesor beserta tanda versi baru, Bandingkan menampilkan
  kalimat tambahan, Terima. Data uji di LED pengembangan dihapus lagi; akun asesor uji dan penugasannya dibiarkan
  (kredensial di `.env`: `DEMO_ASESOR_*`).

### Tahap 8 — Basis Pengetahuan (commit `6836f72`)

- Menu digabung: di dalam LED **Basis Pengetahuan** dengan tab Dokumen LED ini dan Dokumen bersama fakultas; di menu
  fakultas **Basis Pengetahuan fakultas**. Tabel dokumen bersama (`src/components/basis-pengetahuan/`): status, jumlah
  potongan (klik untuk melihat teks setiap potongan), tahun ("t.t." bila kosong), tautan bukti.
- Uji cari menampilkan skor RRF, peringkat vektor/kata kunci, kode sumber D/U sama dengan saat generate, dan tombol
  **Pakai kueri generate** (`kueriGenerate` dipakai bersama oleh generate dan uji cari).

### Tahap 9 — One Data

Menunggu persetujuan daftar data dan akses API. Disiapkan `docs/ONE-DATA-KEBUTUHAN.md` (data per prioritas dari kolom
LKPS, data yang tidak diminta seperti NIK, rancangan ID sinkron, kebutuhan dari pihak One Data). Belum ada perubahan kode.

### Tahap 10 — Dokumen

Diperbarui: `CLAUDE.md` (keputusan 2, 6, 9, 11; struktur kode revisi 22 Okt), `docs/PANDUAN-PENGGUNAAN.md` (tiga peran),
`README.md`, `docs/RENCANA-ITERASI.md`, catatan ini; baru: `docs/PANDUAN-SERVER.md`, `docs/ONE-DATA-KEBUTUHAN.md`.
Di luar kode: Figma, peta form, diagram use case tiga aktor, dan Bab 1–3.

### Hasil pemeriksaan revisi 22 Okt

| Hal | Cara diperiksa | Hasil |
| --- | --- | --- |
| Generate lebih cepat dan bertahap | `kecepatan.test.ts`, ukuran nyata | 5,8 detik vs 12,9 detik per sub-bagian |
| Prodi paling dekat berakhir di atas; tonggak terlewat merah | `kesiapan.test.ts` | Lulus |
| Rujukan, Daftar Rujukan, halaman tanpa Lampiran, DRAF | `ekspor.test.ts` | Lulus |
| Angka capaian sama dengan hitungan sistem | `generate.test.ts` (tahap 4), `capaian.test.ts` | Lulus |
| Angka yang sengaja dibuat berbeda tertangkap | `verifikasi.test.ts` | Lulus |
| Dibuka dari alamat lain; cadangan dipulihkan | uji LAN mode produksi, `cadangan.test.ts`, pemulihan data pengembangan | Lulus |
| Catatan asesor muncul tanpa muat ulang (dua sesi) | uji browser, `review.test.ts` | Lulus |
| Lihat potongan dan uji cari | `basis-pengetahuan.test.ts`, browser | Lulus |
| `npm run lint`, `npm run typecheck`, `npm test` | dijalankan | Lulus (107 uji unit, 53 uji integrasi) |

## Perbaikan setelah uji pengguna (23 Oktober 2026, Claude Code)

Umpan balik Adrianne setelah mencoba revisi 22 Okt (11 butir):

| Butir | Masalah | Perbaikan |
| --- | --- | --- |
| 1 | Ekspor DRAF memunculkan dialog "menyambung ke printer" | LibreOffice di Windows menanyakan printer bawaan (printer Wi-Fi/WSD) saat menghitung halaman. `soffice` kini dijalankan dengan `SAL_DISABLE_DEFAULTPRINTER=1` dan `SAL_DISABLE_PRINTERLIST=1`; jumlah halaman template uji sama (37) dengan dan tanpa printer. |
| 2 | "(Tim Penyusun LED)" di akhir paragraf Word | Jawaban, susunan tim, dan jadwal penyusun bukan sumber yang dirujuk; hanya dokumen dan LKPS yang diberi rujukan. |
| 3 | Unggah dokumen masih ada di halaman sub-bagian | Diganti daftar dokumen terkait + tombol "Tambah ke Basis Pengetahuan" (sub-bagian terpilih otomatis, lalu kembali). |
| 4 | "No object generated: could not parse the response" | Jawaban Gemini yang tidak terbaca kini diperbaiki ringan (`perbaikiJson`: pagar kode, teks tambahan, koma berlebih), bila gagal diulang sekali lalu pindah ke model cadangan, dan alasannya dicatat (`keluaran_rusak: finishReason, panjang`). Sebelumnya dua kegagalan langsung menggagalkan tugas. Catatan: model cadangan di pengaturan masih kosong; kuota gratis gemini-3-flash 5/menit dan 20/hari per project. |
| 5 | Formulir LED baru di samping daftar | Halaman sendiri `/proyek/baru` dan tombol "Buat LED baru". |
| 6 | Teks di bawah judul terlalu panjang | Deskripsi judul dipendekkan atau dihapus (petunjuk halaman tetap ada). |
| 7 | Review asesor dan jadwal kerja tidak terlihat di Beranda | Dua kartu utama di atas Beranda: pita judul berwarna, tahap review, angka besar, tombol Ajukan review besar; jadwal kerja dengan pita merah dan tonggak berwarna. |
| 8 | Unggah data bercampur dengan daftar | Halaman tambah tersendiri: Tambah data LKPS, Tambah dokumen (LED/bersama), Tambah kunci (PJ dan admin). |
| 9 | Pindah antara LED dan menu fakultas membingungkan | Satu sidebar PJ (`ShellPj`): pemilih LED di atas, menu LED yang dibuka (diingat di kuki `led_terakhir`) selalu tampil, Pengaturan fakultas di bawah. Ditemukan juga: konten melebar keluar layar karena `SidebarInset` tidak menyusut (`min-w-0`). |
| 10 | Peran admin vs PJ tidak jelas; tombol buat akun tidak terlihat | Satu tombol "Tambah akun" dengan pilihan peran beserta penjelasan; menu "Kelola akun"; tombol judul halaman kini membungkus (sebelumnya terpotong di layar sempit). Admin pertama dibuat dari halaman login, tidak lagi dari `.env` (`src/lib/data/pemasangan.ts`). |
| 11 | Jadwal terlewat kurang terlihat di Semua LED | Kartu LED besar (`KartuLed`): seluruh kartu merah dengan pita "Jadwal terlewat: …" bila ada tonggak terlewat. |

Uji baru: `tests/integrasi/keluaran-rusak.test.ts`, `tests/integrasi/pemasangan.test.ts`, `src/lib/domain/__tests__/json.test.ts`.
Catatan diagnosa: 10 panggilan Gemini sungguhan untuk mencari penyebab butir 4 menghabiskan kuota harian kunci uji.


## Satu website dua modul: LKPS dan LED (31 Oktober 2026, Claude)

Permintaan Adrianne: LKPS dan LED digabung dalam satu website; di halaman awal pengguna memilih LKPS atau LED, lalu
menu dan halamannya terpisah; folder kode juga dipisah antara bagian LED dan LKPS. Dasarnya arahan Pak Tris (pertemuan
6, ±27 Okt 2026): LKPS dan LED satu website, satu basis data, tampilan sama, berkoordinasi dengan Ghalib. Keputusan
Adrianne: satu login untuk kedua modul; modul LKPS Ghalib belum dibuat (disiapkan kerangka kosong); peran mengikuti Pak
Tris (Admin UPPS, Tim Prodi per prodi, Asesor/Reviewer) dikerjakan sebagai langkah berikutnya, bukan di perubahan ini.

| Bagian | Sebelum | Sesudah |
| --- | --- | --- |
| Halaman awal | `/` langsung ke `/proyek` (PJ) atau `/asesor` | `/` = **Pilih modul**: kartu LKPS dan LED, plus Data bersama (PJ). Admin tetap ke `/admin/akun` |
| Pindah modul | – | Tombol **LKPS \| LED** dan ikon halaman awal di kepala setiap halaman (`pindah-modul.tsx`) |
| Rute LED | `/proyek/*`, `/asesor/*`, `/api/{proyek,dokumen,dokumen-bersama,ekspor,instrumen}/*` | `/led/*` (grup rute `(penyusun)`), `/led/asesor/*`, `/api/led/*` |
| Data bersama | `/proyek/prodi`, `/proyek/kunci-api` | `/pengaturan/prodi`, `/pengaturan/kunci-api`, tampil di sidebar kedua modul |
| Modul LKPS | – | `/lkps` (beranda sementara), `src/modules/lkps/` (README, pintu `index.ts`, sidebar) |
| Kode | `src/lib/**` dan komponen LED di `src/components/` | `src/modules/{bersama,led,lkps}`; komponen umum tetap di `src/components/` |
| Skema Prisma | `prisma/schema.prisma` | `prisma/schema/{bersama,led,lkps}.prisma` (isi model tidak berubah) |
| Worker | `src/worker/index.ts` | `index.ts` + `bersama.ts`, `led.ts`, `lkps.ts` (nama antrean tidak berubah) |

Cara kerja pemindahan (dapat diulang, bahan Bab 3):

1. Skrip pemindah membaca peta berkas lama → baru (213 berkas), menyelesaikan setiap impor (`@/…` dan relatif) ke
   berkas sasarannya, lalu menulis ulang 888 impor sesuai lokasi baru sebelum berkas dipindah. Impor relatif yang
   menyeberang modul diubah menjadi alias `@/`, kecuali antar-`domain/` (tetap relatif `.ts` supaya bisa diuji `node --test`).
2. Alamat rute di kode dan uji diganti (`/proyek` → `/led`, `/proyek/prodi` → `/pengaturan/prodi`, `/asesor` →
   `/led/asesor`, `/api/proyek` → `/api/led/proyek`, …).
3. Berkas yang isinya campuran dipecah per simbol: `validasi.ts` (bersama: fakultas, prodi, akun, login; LED: instrumen,
   LED baru, jawaban, tim penyusun), `tampil.ts` (`formatMetrik` ke LED), pemberitahuan lonceng dari `data/review.ts` ke
   `bersama/data/pemberitahuan.ts`, daftar jenjang dari `domain/instrumen.ts` ke `bersama/domain/jenjang.ts`.
4. Alamat lama tetap berfungsi lewat `redirects()` di `next.config.ts`; tautan pemberitahuan yang tersimpan diperbarui
   migrasi `20261031090000_rute_modul` (tanpa perubahan tabel).
5. Batas modul diuji otomatis (`tests/unit/batas-modul.test.ts`): LKPS tidak memakai LED; bersama tidak memakai LKPS dan
   hanya memakai LED di dua tempat yang tercatat (lanjutkan pekerjaan LED setelah kunci API baru; instrumen bawaan saat
   pemasangan pertama).

Pemeriksaan (31 Okt 2026, laptop Windows, `led-tmp/cek-modul.bat`):

| Pemeriksaan | Hasil |
| --- | --- |
| `prisma validate`, `prisma generate` dengan folder skema | Lulus |
| `prisma migrate deploy` (migrasi `rute_modul`) | Lulus |
| `prisma migrate diff` skema baru vs basis data | Hanya `DROP INDEX "Potongan_embedding_hnsw_idx"` (sudah dikenal), artinya skema tidak berubah |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 112/112 lulus (termasuk 3 uji batas modul) |
| `npm run test:integrasi` | 57/57 lulus |
| `npm run build` | Lulus (3 peringatan lama soal pelacakan berkas `penyimpanan.ts`/`ekspor.ts`, tidak terkait perubahan ini) |
| Browser (akun PJ) | `/` Pilih modul tampil; `/proyek` → `/led`; `/proyek/prodi` → `/pengaturan/prodi`; Beranda LED, sub-bagian C.1-KEB dengan catatan asesor, Ekspor (unduh `/api/led/ekspor/...` 200), `/lkps`, Instrumen, Basis Pengetahuan fakultas, Kunci API fakultas terbuka; tautan lonceng sudah `/led/...` |

Cadangan sebelum perubahan: `led-tmp/kode-sumber.tar.gz` (seluruh kode + `.git`) dan berkas lama di
`../led-lamteknik-lama-31okt/`. Perubahan di-commit di Tahap 0 revisi 31 Okt (di bawah).

## Revisi 31 Oktober 2026 (peran dan masukan Pak Tris 6)

Sumber: `docs/RENCANA-REVISI-31OKT.md` (masukan Pak Tris pertemuan 6 dan keputusan Adrianne 31 Okt 2026). Dikerjakan di
branch `revisi-31okt`, tahap demi tahap; setiap tahap diuji (`lint`, `typecheck`, `test:unit`, `test:integrasi`) dan
di-commit sebelum tahap berikutnya.

### Tahap 0: simpan struktur satu website dua modul

- Branch `revisi-31okt` dibuat dari `main`; perubahan "Satu website dua modul" (bagian di atas) di-commit di sini.
- Folder rute lama yang sudah kosong (`src/app/proyek`, `src/app/asesor`, `src/app/api/{proyek,dokumen,ekspor,instrumen}`)
  dihapus; hanya berisi folder kosong.
- `jalankan-website.bat` (peluncur lokal di laptop, tidak pernah di-commit) dimasukkan ke `.gitignore` supaya `git status` bersih.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 112/112 lulus (termasuk uji batas modul) |
| `npm run test:integrasi` | 57/57 lulus |

### Tahap 1: peran Admin UPPS, Tim Prodi, Asesor

- Enum `Peran` = `ADMIN`, `TIM_PRODI`, `ASESOR` (migrasi `20261031100000_peran_tim_prodi`: `ALTER TYPE ... RENAME VALUE`, lalu
  semua akun PJ lama menjadi `ADMIN` sesuai keputusan B2; bawaan peran baru `TIM_PRODI`). `User.prodiId` (Restrict) dan
  `Prodi.anggota`. Label: "Admin UPPS", "Tim Prodi", "Asesor (reviewer)". Better Auth: `adminRoles: ["ADMIN"]`,
  `defaultRole: "TIM_PRODI"`, `prodiId` additionalField `input: false`, appName "Akreditasi LAM Teknik".
- Penjaga: `pastikanAdmin`, `pastikanTimProdi`, `pastikanProdiSendiri`, `pastikanPeran` (akses.ts); `wajibAdmin`,
  `wajibTimProdi`, `wajibPeran` (sesi.ts). `Pengguna.prodiId` dibaca dari sesi.
- LED: `ambilProyek` tanpa opsi hanya Tim Prodi pemilik LED; `baca: true` juga Admin UPPS (semua LED) dan asesor yang
  ditugaskan. `ambilProyekUbah` karenanya hanya Tim Prodi prodinya. `daftarProyek`: Tim Prodi LED prodinya, Admin semua.
  `buatProyek` hanya Tim Prodi; prodi diambil dari akun (`prodiId` dihapus dari `skemaProyek`, masukan prodi diabaikan).
  Pengguna sistem worker (`penggunaSistem`) = Tim Prodi prodi LED itu.
- Pemberitahuan review: `idTimProdiAktif(prodiId)` (semua akun Tim Prodi aktif prodi pemilik LED, bukan semua PJ).
- Kunci API (B3): hanya Admin UPPS; `JenisKunci` "utama"/"cadangan" (nilai `pemilik` di basis data tetap nilai lama:
  `penanggung_jawab` = kunci utama, `super_admin` = cadangan). `/admin/kunci-api` memuat dua daftar dengan tombol Tambah
  masing-masing; `/pengaturan/kunci-api` dialihkan ke sana. Tim Prodi melihat status (`ringkasanKunci`) dan teks "Hubungi
  Admin UPPS" di Beranda LED dan Basis Pengetahuan.
- Organisasi: fakultas, prodi, instrumen (termasuk Template LED), dan Basis Pengetahuan fakultas (unggah) hanya Admin UPPS.
  Tim Prodi melihat prodinya, mengubah identitas prodinya (`simpanIdentitasProdi`, bukan nama/jenjang, B4), dan membaca
  dokumen bersama fakultas (tab Basis Pengetahuan LED hanya baca, tombol Tambah hanya untuk dokumen LED).
- Kelola akun: Tambah akun dengan pilihan peran (Tim Prodi wajib memilih program studi), kolom Program studi, menu baris
  "Pindah program studi" (sesi akun dicabut). Prodi yang masih punya akun Tim Prodi atau LED tidak bisa dihapus.
- Halaman: penjaga halaman admin `wajibAdmin`; halaman LED penyusun `wajibTimProdi`; instrumen, dokumen bersama, dan
  Program studi `wajibAdmin`; layout `/led` dan daftar LED menerima Admin UPPS dan Tim Prodi (menu per peran dirapikan di
  Tahap 2). Halaman awal tidak lagi mengalihkan admin; admin melihat bagian "Pengaturan UPPS". Modul LKPS terbuka untuk
  ketiga peran. Form LED baru menampilkan prodi akun (teks, bukan pilihan). Seed membuat/menjaga akun `ADMIN`.
- Uji: helper `buatAdmin`, `siapkanFakultas`, `buatTimProdi`, `siapkanProdi` (bantu.ts) menggantikan `siapkanPj`; semua uji
  integrasi disesuaikan (prodi, instrumen, kunci, dokumen bersama oleh admin; LED oleh Tim Prodi prodinya; "pengguna lain"
  = Tim Prodi prodi lain karena admin kini boleh membaca). Uji baru di `akses.test.ts`: Tim Prodi A tidak bisa membaca atau
  mengubah LED prodi B; masukan prodi lain diabaikan; Admin membaca semua LED tetapi tidak bisa mengubah atau membuat LED;
  dua akun Tim Prodi satu prodi sama-sama menyunting dan riwayat versi mencatat penyuntingnya; pindah prodi dan hapus prodi.
  Di `review.test.ts`: pemberitahuan sampai ke akun Tim Prodi kedua di prodi yang sama dan tidak ke Tim Prodi prodi lain.
- Teks antarmuka "PJ"/"penanggung jawab" diganti "Tim Prodi"/"Admin UPPS" (halaman asesor, catatan revisi, penugasan,
  login admin pertama, pesan galat). Nilai internal `"PJ"` di domain review (sisi catatan) tetap.
- `grep -rn "PENANGGUNG_JAWAB\|SUPER_ADMIN" src tests` (di luar `src/generated`) kosong.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 112/112 lulus |
| `npm run test:integrasi` | 58/58 lulus (run penuh: 56/58; dua asersi lama yang mengharapkan admin ditolak membaca LED dan pemeriksa instrumen = PJ disesuaikan, lalu kedua berkas diulang: lulus) |

### Tahap 2: menu dan halaman per peran

- Rute LED dipisah dengan grup rute: `src/app/led/(tim-prodi)/` (`/led`, `/led/baru`, `/led/identitas-prodi`,
  `/led/[proyekId]/*`, layout `wajibTimProdi`) dan `src/app/led/(admin)/` (`/led/pantau`, `/led/instrumen`,
  `/led/dokumen-bersama`, layout `wajibAdmin`). Grup lama `(penyusun)` dihapus. File dipindah satu per satu karena server
  pengembangan yang sedang berjalan mengunci foldernya.
- Tampilan baca LED untuk admin: pakai ulang `/led/asesor/[proyekId]/*` (pilihan yang paling sedikit duplikasinya).
  Layout dan halamannya menerima `ASESOR` dan `ADMIN`; untuk admin sidebar berisi menu Admin UPPS + "LED ini (hanya
  baca)", `RuangAsesor` dan `FormPenilaian` diberi `hanyaBaca` (tanpa blok/catatan, balasan, terima, skor, keputusan),
  kotak perbaikan tidak dimuat. Daftar `/led/asesor` tetap khusus asesor. Data: `aksesReview` mengizinkan admin membaca
  catatan dan penilaian; `balasCatatan` kini memeriksa peran Tim Prodi/asesor.
- `/led/pantau`: semua prodi urut akreditasi berakhir, LED aktif, kesiapan/jadwal/status review (`RingkasKesiapan` +
  `kesiapanSemua`), asesor, tombol Lihat.
- Tim Prodi: `/led` berisi LED prodinya (aktif sebagai kartu, arsip di bawah) dan tombol besar "Buat LED" bila belum ada
  LED aktif. Sidebar LED Tim Prodi: "LED prodi" dan "Identitas prodi" (halaman baru untuk keputusan B4: Tim Prodi
  mengisi identitas pengusul prodinya; nama, jenjang, kode, tanggal akreditasi tetap admin). Basis Pengetahuan fakultas
  tetap lewat tab di Basis Pengetahuan LED.
- Menu (`src/components/shell/menu-peran.ts`): `MENU_PENGATURAN_UPPS` (Kelola akun, Program studi, Kunci API, Penugasan
  asesor), `MENU_LED_ADMIN` (Pantau LED, Instrumen, Basis Pengetahuan fakultas), `MENU_LKPS_ADMIN` (kosong dulu; grup
  tanpa item tidak ditampilkan `NavSidebar`). `berandaLed`: admin `/led/pantau`, asesor `/led/asesor`, Tim Prodi `/led`.
  `ShellBersama`/`ShellPeran`/layout admin/`ShellLed`/`ShellLkps` memakai menu per peran. Tab Kunci API: Kunci, Model
  Gemini, Log.
- Halaman awal: Admin UPPS melihat kartu LKPS dan LED serta "Pengaturan UPPS" (Kelola akun, Program studi, Kunci API dan
  model, Penugasan asesor, Instrumen); Tim Prodi melihat nama prodinya di bawah sapaan.
- `next.config.ts`: `/pengaturan/kunci-api/*` dan `/proyek/kunci-api/*` diarahkan ke `/admin/kunci-api/*`; halaman
  `/pengaturan/kunci-api` dihapus. `/led/[proyekId]/kunci-api` lama diarahkan ke Beranda LED.
- Uji integrasi baru (review.test.ts): admin membaca catatan, jumlah catatan, dan penilaian semua LED, tetapi ditolak saat
  membalas, menerima, membuat catatan, memberi skor, atau membuka kotak perbaikan; Tim Prodi prodi lain ditolak.
- Uji browser (server pengembangan lokal, tiga akun uji `uji.admin@`, `uji.tim@`, `uji.asesor@demo.test` di basis data
  pengembangan; sandi uji tidak dicatat di sini):

| Peran | Yang diperiksa | Hasil |
| --- | --- | --- |
| Admin UPPS | Halaman awal: kartu LKPS/LED + Pengaturan UPPS (5 tautan); sidebar Pengaturan UPPS + LED (LKPS kosong tidak tampil) | Sesuai |
| Admin UPPS | `/led/pantau` tabel prodi, Lihat → `/led/asesor/[id]` hanya baca (tanpa alat catatan); Kunci API dua daftar | Sesuai |
| Admin UPPS | `/led`, `/led/[id]`, `/led/asesor` → halaman awal; `/pengaturan/kunci-api` → `/admin/kunci-api`; `/proyek` → `/led` → halaman awal | Sesuai |
| Tim Prodi | Halaman awal dengan nama prodi; `/led` kartu LED prodi, sidebar hanya LED prodi + Identitas prodi; di dalam LED menu LED ini | Sesuai |
| Tim Prodi | `/led/pantau`, `/led/instrumen`, `/admin/akun`, `/pengaturan/prodi`, `/led/asesor/[id]` → halaman awal | Sesuai |
| Asesor | `/led/asesor` daftar LED ditugaskan; LED yang tidak ditugaskan → 404; `/led`, `/led/pantau`, `/admin/akun` → halaman awal; `/asesor` → `/led/asesor` | Sesuai |

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 112/112 lulus |
| `npm run test:integrasi` | 59/59 lulus |

### Tahap 3: program studi FT sudah terisi

- `data/prodi/ft-unila.json`: 16 prodi LAM Teknik FT Unila (jenjang, nama, akreditasi berlaku sampai, peringkat terakhir
  di `identitas.peringkatAkreditasi`) dan identitas fakultas bawaan (Fakultas Teknik, Universitas Lampung, Bandar
  Lampung). Sumber sesuai rencana (SAKTI LAM Teknik dan unila.ac.id, diakses 3 Okt 2026).
- `src/modules/bersama/data/prodi-bawaan.ts` (`isiProdiBawaan`): idempoten menurut nama (tanpa beda huruf besar) +
  jenjang; prodi yang sudah ada tidak ditimpa, tidak ada yang dihapus, kode PDDikti kosong. Identitas fakultas hanya
  mengisi kolom yang masih kosong. Dipanggil dari `prisma/seed.ts` dan `buatAdminPertama` (pemasangan pertama).
- Uji integrasi baru `tests/integrasi/prodi-bawaan.test.ts` (16 prodi dari basis data kosong, nilai contoh, nama sama
  jenjang beda, seed kedua/ketiga tanpa data ganda, ubahan admin dan prodi tambahan tidak tersentuh, fakultas hanya kolom
  kosong) dan `pemasangan.test.ts` (pemasangan pertama mengisi 16 prodi).
- Kriteria `npm run db:seed` diperiksa langsung pada basis data uji yang dikosongkan: seed pertama "16 ditambahkan",
  jumlah prodi 16; seed kedua "0 ditambahkan, 16 sudah ada", jumlah tetap 16. Basis data pengembangan juga di-seed
  (15 ditambahkan; S1 Teknik Elektro sudah ada dan tidak ditimpa).

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 112/112 lulus |
| `npm run test:integrasi` | 61/61 lulus |

### Tahap 4: LED baru berfokus pada TS

- `pilihanTs(tahunPengajuan)` (dua pilihan: TS (P−1)/P "pakai bila data tahun akademik (P−1)/P sudah lengkap" dan TS
  (P−2)/(P−1) "pakai bila pengajuan sebelum tahun akademik itu selesai"), `tsBawaan(tahunPengajuan, tanggal)`
  (`tsDariTanggalPengajuan` dibatasi ke dua pilihan), dan `labelTsPengajuan` di `bersama/domain/tahun-akademik.ts`,
  dengan uji domain.
- `skemaProyek` menerima `tsTahunMulai`; nilai di luar dua pilihan ditolak ("Pilih salah satu TS yang ditawarkan ...");
  kosong = (P−1)/P. `buatProyek` menyimpan TS pilihan.
- Formulir LED baru: prodi dari akun (teks), Tahun pengajuan, TS sebagai dua radio dengan keterangan, nama otomatis
  "LED {prodi} TS {tahun akademik}" yang mengikuti TS selama belum diubah sendiri. TS bawaan dihitung dari usulan batas
  pengajuan (6 bulan sebelum akreditasi berakhir) atau hari ini.
- Kartu LED, Pantau LED, daftar Program studi, dan judul Beranda LED memakai "TS 2025/2026 · pengajuan 2026". Kartu
  Beranda "Periode akreditasi" diganti "TS (tahun data LKPS)"; label periode 5 tahun hanya tampil kecil di Pengaturan LED.
- Uji integrasi baru `tests/integrasi/led-baru.test.ts`: LED dengan TS (P−1)/P, (P−2)/(P−1), TS kosong, dan tiga TS di
  luar pilihan ditolak. Diperiksa juga di browser (akun uji Tim Prodi): mengubah tahun pengajuan menjadi 2027
  menampilkan pilihan TS 2026/2027 dan 2025/2026; memilih TS 2026/2027 mengubah nama menjadi "LED Teknik Informatika TS
  2026/2027".

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 115/115 lulus |
| `npm run test:integrasi` | 63/63 lulus |

### Tahap 5: penilaian di depan dan menonjol

- Model `UsulanSkor` (`@@unique([proyekId, butirKode])`) dan kolom `ProyekLED.statusSkorRubrik`/`pesanSkorRubrik`
  (migrasi `20261031110000_usulan_skor`; baris `DROP INDEX "Potongan_embedding_hnsw_idx"` dibuang dari diff).
- Antrean `skor-rubrik` (`ANTREAN.skorRubrik`, tanpa ulang otomatis), pengerja di `src/worker/led.ts` (juga dipulihkan
  saat worker mulai), proses `src/modules/led/proses/skor-rubrik.ts`: untuk setiap butir narasi, narasi aktif sub-bagian
  terkait (`ButirSubBagian`) disamarkan (`samarkanTeks`) lalu dinilai lewat `panggilTerstruktur` (indikator, deskriptor
  0-4, unsur skor 4, narasi) dengan keluaran Zod `{ skor 0..4, alasan, unsurTerpenuhi[], unsurKurang[] }`. Butir angka
  tidak dinilai AI (skor sistem dari LKPS). Butir yang usulannya masih sesuai versi narasi aktif dilewati, jadi tugas
  yang berhenti karena kunci habis (`menunggu_kunci`) lanjut dari butir berikutnya; `antreUlangTugasTertunda` (dipanggil
  saat Admin UPPS menambah kunci) ikut mengantre ulang usulan skor. Batas per menit: dijadwalkan ulang otomatis.
- `panggilTerstruktur` mendapat `keluaranUji`: dengan `LLM_NARASI=uji` usulan skor dibuat deterministik (unsur dianggap
  terpenuhi bila kata kuncinya muncul di narasi), tanpa kunci dan tanpa Gemini.
- Domain (`led/domain/review.ts`, dengan uji): `nilaiButir` (bobot × skor), `persenNilai`, `rekapPenilaian` (per
  kriteria dan total), `skorTerpakai` (skor asesor bila ada, selain itu skor otomatis), `perluNilaiUlang` (versi narasi
  berubah sejak usulan dibuat).
- `penilaianProyek` (asesor, Tim Prodi, Admin UPPS) kini juga mengembalikan skor otomatis dan sumbernya, usulan AI
  (alasan, unsur kurang, perlu dinilai ulang), sub-bagian terkait dan narasi aktifnya apa adanya, rekap gabungan, nama
  kriteria, dan status penghitungan; `akhir`/`perkiraan` tetap nilai asesor saja (dasar keputusan). Opsi `tanpaNarasi`
  untuk kartu Beranda. `mulaiSkorRubrik` (Tim Prodi pemilik LED).
- Halaman bersama `src/modules/led/komponen/penilaian/halaman-penilaian.tsx`: ringkasan besar (total, persen, perkiraan
  status, jumlah butir berskor, batang nilai per kriteria), tabel per kriteria (Butir, Bobot, Skor otomatis, Skor asesor,
  Nilai, Persentase), baris yang dibuka menampilkan narasi sub-bagian terkait (`NarasiBaca`, hanya baca), deskriptor
  terpilih, serta alasan dan unsur kurang dari AI. Asesor memilih skor (alasan wajib bila berbeda dari skor sistem) dan
  total dihitung ulang langsung di peramban; keputusan Layak diajukan/Perlu revisi di bawah. `form-penilaian.tsx` lama
  dihapus.
- Asesor: "Penilaian" menjadi item pertama menu LED ini (sebelum Ringkasan review). Admin UPPS membaca halaman yang sama
  tanpa alat skor. Tim Prodi: `/led/[proyekId]/penilaian` "Perkiraan nilai" (menu LED ini dan kartu paling atas Beranda
  LED dengan total, perkiraan status, label "Perkiraan, bukan nilai resmi LAM Teknik"), tombol "Hitung usulan skor",
  tanpa bisa mengubah skor.
- Uji integrasi baru `tests/integrasi/skor-rubrik.test.ts` (LLM_NARASI=uji): hanya Tim Prodi pemilik LED yang bisa
  menghitung; butir narasi berdraf mendapat usulan, butir angka tidak; skor otomatis masuk rekap tetapi tidak nilai
  asesor; admin membaca; narasi tidak berubah = tidak ada panggilan baru; suntingan akun Tim Prodi kedua menandai perlu
  dinilai ulang lalu dihitung ulang; tanpa kunci berhenti `menunggu_kunci` dan lanjut setelah Admin UPPS menambah kunci.
- Uji browser (server pengembangan dimulai ulang karena klien Prisma lama masih termuat setelah migrasi; worker juga
  dimulai ulang supaya antrean `skor-rubrik` terdaftar): akun uji asesor (sementara ditugaskan ke LED pengembangan)
  membuka Penilaian, membuka butir 1 dan membaca narasi C.1 di baris yang sama, mengubah skor 4 → 2 dan total langsung
  berubah 4,56 → 2,28 (1,14 × 2). Pemicu pilihan skor diperbaiki supaya hanya menampilkan "Skor N". Penugasan asesor dan
  skor asli di basis data pengembangan dikembalikan. Halaman Perkiraan nilai Tim Prodi tampil tanpa pilihan skor; tombol
  "Hitung usulan skor" sengaja tidak diklik di server pengembangan supaya kuota Gemini tidak terpakai.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 118/118 lulus |
| `npm run test:integrasi` | 66/66 lulus |

### Tahap 6: susun otomatis dari depan sampai belakang

- `TugasGenerate.bagianBerikutnya String[]`, `rangkaianKe`, `rangkaianTotal` (migrasi `20261031120000_rangkaian_generate`).
- Domain `led/domain/rangkaian.ts` (dengan uji): `urutanBagianSusun` (C.1–C.7 menurut nomor, lalu II.A, II.B, III, I,
  IV, terakhir AWAL), `subAwalSusun` (AWAL-PENGANTAR lalu AWAL-RINGKASAN), `subBelumSelesai`, `dataKosongHalamanAwal`.
  Catatan: rencana menyebut II.B, III, I, IV; II.A (narasi tim dan jadwal kerja, juga di-generate) disisipkan sebelum
  II.B karena tombolnya menyusun "semua bagian".
- `rencanaSusun` dan `lanjutkanRangkaian` (proses/generate.ts): satu tugas per bagian, sub-bagian di dalamnya tetap
  diurutkan IKU → LB/KEB → AF → SWOT; sub-bagian yang ditandai selesai dilewati (dihitung ulang saat bagian berikutnya
  dibuat). Setelah tugas selesai, worker membuat tugas bagian berikutnya. Tugas yang tertunda (kunci habis) atau gagal
  tidak memajukan rangkaian; setelah dilanjutkan dan selesai, rangkaian berjalan lagi. Batalkan mengosongkan
  `bagianBerikutnya`, jadi seluruh rangkaian berhenti.
- Data: `rencanaSusunSeluruh` (untuk konfirmasi) dan `mulaiSusunSeluruh` (Tim Prodi pemilik LED; satu penyusunan aktif per
  LED). `tugasProyek` mengirim `rangkaian {ke, total}`; banner antrean menampilkan "Bagian 3 dari 12 · x/y sub-bagian".
- Beranda LED: kotak "Susun seluruh LED" dengan konfirmasi yang menyebut jumlah sub-bagian dan urutan bagian (nonaktif
  bila LED diarsipkan atau masih ada penyusunan berjalan); kartu "Halaman otomatis dari data" menandai halaman muka,
  identitas pengusul, dan tim penyusun "otomatis dari data" dan menyebut data yang masih kosong beserta tautan
  pengisiannya (Identitas prodi, Tim penyusun).
- Mode uji: jeda model narasi uji bisa diatur `LLM_NARASI_UJI_JEDA_MS` (bawaan 1500 ms; uji memakai 0).
- Uji integrasi baru `tests/integrasi/susun-seluruh.test.ts` (LLM_NARASI=uji): rencana melewati sub-bagian selesai dan
  menempatkan kata pengantar dan ringkasan paling akhir; Tim Prodi prodi lain ditolak; rangkaian C.1 → II.A berjalan
  berurutan; tanpa kunci tugas II.A tertunda dan rangkaian tidak maju, setelah dilanjutkan selesai lalu IV dibuat;
  Batalkan pada IV menghentikan rangkaian (AWAL tidak dibuat); rangkaian baru IV → AWAL berakhir setelah ringkasan.
- Uji browser (akun uji Tim Prodi; server pengembangan dan worker dimulai ulang karena skema berubah): tombol tampil di
  Beranda, konfirmasi menyebut "99 sub-bagian dari 13 bagian ... C.1, ..., IV, AWAL" dan sengaja tidak dijalankan
  (kuota Gemini), kartu halaman otomatis menyebut data identitas dan tim yang masih kosong.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 121/121 lulus |
| `npm run test:integrasi` | 69/69 lulus |

### Tahap 7: jadwal kerja hanya pengingat, model AI disebut jelas

- Jadwal kerja: tidak ada aksi yang memeriksa jadwal (sudah begitu sejak 22 Okt); kartu Jadwal kerja kini menulis
  "Jadwal ini hanya pengingat. Unggah dan penyusunan tetap bisa dilakukan kapan saja."
- `modelAiAktif()` (bersama/data/pengaturan.ts): model narasi, cadangan, dan embedding dari `PengaturanLLM`, dengan label
  "Google Gemini {model}" (atau keterangan mode uji pengembangan). Ditampilkan di bawah tombol Generate (kriteria dan
  sub-bagian), di banner antrean, di kotak Susun seluruh LED, di judul halaman Kunci API admin (narasi, cadangan,
  pencarian dokumen), dan di halaman awal di bawah kartu modul ("AI: Google Gemini ...; pencarian dokumen: ...").
- Uji integrasi baru `tests/integrasi/jadwal-model.test.ts`: dengan semua tonggak dan batas pengajuan terlewat, unggah
  LKPS dan dokumen, jawaban penyusun, generate (LLM_NARASI=uji), pemeriksaan ekspor DRAF, dan ajukan review tetap
  berhasil; nama model mengikuti `simpanPengaturan` tanpa mengubah kode.
- Diperiksa di browser: halaman awal, tombol Generate C.1, Beranda (Susun seluruh LED dan kartu Jadwal kerja), dan
  halaman Kunci API admin menampilkan model sesuai pengaturan pengembangan (gemini-3-flash-preview, gemini-embedding-001).

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 121/121 lulus |
| `npm run test:integrasi` | 71/71 lulus |

### Tahap 8: data LKPS berupa PDF per tabel

- Sumber data LKPS bisa lebih dari satu berkas: `sumberLkps(proyekId)` (`led/data/sumber-lkps.ts`) mengambil semua berkas
  sumber (aktif), terbaru dulu, dan menggabung tabelnya dengan `gabungTabelLkps` (`led/data-lkps/gabung.ts`, murni):
  satu tabel per sheet, berkas terbaru menang, urut seperti template. Dipakai semua pembaca LKPS: `lkpsAktif` (kini juga
  `sumber` dan masalah gabungan), metrik butir angka (`nilai-butir.ts`), target/capaian butir, kesiapan (persen LKPS),
  ringkasan bahan Beranda, dan konteks generate.
- `prosesBerkasLkps`: Excel LKPS lengkap yang terbaca tetap menggantikan semua sumber lama; PDF yang terbaca ditambahkan
  ke sumber yang ada. "Jadikan sumber data" pada satu berkas tetap menjadikannya satu-satunya sumber.
- Tambah data LKPS menerima banyak berkas sekaligus (`multiple`; Route Handler mengunggah sesuai urutan pilihan sehingga
  berkas terakhir menjadi yang terbaru). Halaman Data LKPS menampilkan kartu "Tabel LKPS": jumlah tabel yang berlaku
  untuk jenjang, yang sudah terbaca, dan yang belum ada (`ringkasTabelTerbaca`; sheet yang berbagi kode tabel, misalnya
  2a1–2a3 = Tabel 2.a, disebut dengan nama sheetnya).
- `petaHalamanTabelPdf` (baca-pdf.ts): halaman awal–akhir setiap tabel di PDF LKPS, dipakai uji pemecahan PDF.
- `src/modules/lkps/README.md`: aturan cetak tabel LKPS ke PDF dari Pak Tris (satu tabel satu halaman, boleh bersambung
  dengan judul kolom berulang, kolom tidak dipindah ke bawah, lanskap bila lebar, judul tabel tetap dicetak).
- Uji unit baru `tests/unit/lkps-gabung.test.ts` (berkas terbaru menang, urutan template, tabel berlaku per jenjang).
  Uji integrasi baru `tests/integrasi/lkps-pdf-tabel.test.ts`: `tests/fikstur/lkps-contoh-s1.pdf` dipecah dengan
  `pdf-lib` menjadi satu PDF per tabel, diunggah semuanya ke satu LED; tabel gabungan sama dengan membaca PDF utuh (isi
  sel per tabel; `nomorBaris` PDF adalah nomor urut dalam berkas sehingga tidak dibandingkan) dan skor butir angka sama
  dengan LED yang memakai PDF utuh; PDF 4.a yang lebih baru menggantikan 4.a lama tanpa menghapus tabel lain; Excel
  lengkap menggantikan semua PDF; PDF sesudah Excel digabung dengan Excel.
- Diperiksa di browser: kartu Tabel LKPS pada LED pengembangan (belum ada berkas) menampilkan 43 tabel Sarjana yang belum
  ada; unggah tidak dicoba di server pengembangan (alur unggah diuji di uji integrasi).

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 123/123 lulus |
| `npm run test:integrasi` | 73/73 lulus |

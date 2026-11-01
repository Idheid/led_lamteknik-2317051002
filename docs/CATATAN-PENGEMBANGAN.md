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

## Perbaikan setelah uji 1 Nov 2026

Dari `docs/PERBAIKAN-1NOV.md` (uji Adrianne 1 Nov 2026), dikerjakan sesudah Tahap 8 dan sebelum Tahap 9 rencana
31 Okt, satu commit per butir. Sebelumnya juga di-commit satu perbaikan kecil yang ditemukan saat mencoba alur Tahap 9:
`skorSah` menolak skor dua desimal yang tidak tepat di biner (2,29 × 100 = 229,00000000000003), sehingga skor sistem
pecahan bisa ditolak; kini memakai toleransi pembulatan dan diberi uji domain.

### P1: akun lama "Penanggung Jawab" dan "Super Admin"

- Kelola akun, menu baris: **Ubah nama** (`/admin/akun/[id]/nama`) dan **Ubah peran** (`/admin/akun/[id]/peran`),
  keduanya halaman sendiri dengan `HalamanTambah` (konsisten dengan Tambah akun di P2). Ubah peran memakai pilihan peran
  yang sama dengan Tambah akun (`PERAN_BARU`); Tim Prodi wajib memilih prodi; beralih dari Tim Prodi ke peran lain
  mengosongkan `prodiId`.
- Data (`bersama/data/organisasi.ts`): `ambilAkun`, `ubahNamaAkun`, `ubahPeranAkun` (skema `skemaUbahNamaAkun`,
  `skemaUbahPeranAkun`). Aturan: admin tidak bisa mengubah peran akunnya sendiri; menurunkan Admin UPPS ditolak bila
  tidak ada Admin UPPS aktif lain; sesi akun yang diubah dicabut supaya login ulang dengan peran baru; `LogAktivitas`
  mencatat `ubah_peran` (peranLama, peranBaru, prodiLama, prodiBaru) dan `ubah_nama` (lama, baru).
- `.env.example`: contoh nama admin pertama "Admin UPPS" dan komentar "akun Admin UPPS pertama" (nama variabel
  `SUPERADMIN_*` tetap). Seed sudah memakai "Admin UPPS" sebagai nama bawaan sejak Tahap 1.
- `docs/RENCANA-REVISI-31OKT.md` keputusan B2: "akun PJ lama menjadi Admin UPPS; Admin bisa mengubahnya menjadi Tim
  Prodi lewat Ubah peran".
- Uji integrasi (`akun.test.ts`): ubah nama; Admin → Tim Prodi (tanpa prodi ditolak, prodi tidak dikenal ditolak),
  sesi dicabut, akun langsung melihat LED prodinya, log tercatat; Tim Prodi → Asesor (prodi dikosongkan); menolak
  mengubah peran sendiri; Tim Prodi tidak bisa mengubah nama/peran; menurunkan satu-satunya Admin UPPS aktif ditolak
  (dari sesi admin lain yang akunnya sudah nonaktif), menaikkan asesor menjadi admin lalu menurunkan admin lama boleh.
- Diperiksa di browser (server pengembangan) dan sekaligus membereskan temuan di basis data pengembangan: akun
  `pj.ti@contoh.ac.id` "Penanggung Jawab TI" diubah lewat **Ubah peran** menjadi Tim Prodi S1 Teknik Informatika lalu
  lewat **Ubah nama** menjadi "Tim Prodi Teknik Informatika"; akun `admin@contoh.ac.id` "Super Admin" diubah namanya
  menjadi "Admin UPPS". Log aktivitas mencatat ketiga perubahan. Kelola akun tidak lagi memuat nama "Penanggung Jawab"
  atau "Super Admin".

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 123/123 lulus |
| `npm run test:integrasi` | 75/75 lulus |

### P2: formulir Tambah akun terpotong

- Tambah akun pindah ke halaman sendiri `/admin/akun/tambah` (`HalamanTambah`, seperti Tambah kunci dan Tambah prodi):
  kartu peran berjajar tiga di layar lebar, prodi (wajib untuk Tim Prodi), lalu nama, email, kata sandi awal sebaris.
  Setelah berhasil kembali ke Kelola akun dengan pesan sukses. Tombol Tambah akun di Kelola akun kini tautan; dialog
  lama dihapus. Ubah nama/Ubah peran (P1) juga halaman sendiri, jadi konsisten.
- Pengaman umum: `DialogContent` (`src/components/ui/dialog.tsx`) dan `AlertDialogContent`
  (`src/components/ui/alert-dialog.tsx`) diberi `max-h-[calc(100svh-2rem)]` dan `overflow-y-auto`.
- Diperiksa di browser: 1366×768, halaman tanpa gulir mendatar dan tombol Buat akun terjangkau; 375×812, halaman tanpa
  gulir mendatar, akun asesor uji dibuat sampai selesai dan kembali ke Kelola akun; dialog Atur ulang kata sandi di
  375×812 mendapat batas tinggi 780 px dan `overflow-y: auto`.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 123/123 lulus |
| `npm run test:integrasi` | 75/75 lulus |

### P3: "Jawaban penyusun" menjadi "Bahan dari prodi (untuk AI)"

- Isian di halaman sub-bagian berlabel **"Bahan dari prodi (untuk AI)"** dengan keterangan: tulis fakta yang belum ada di
  dokumen (kegiatan, nomor dan tanggal SK, angka, rencana); AI memakainya saat menyusun narasi (sumber J); isian tidak
  ikut diekspor, yang diekspor adalah Narasi. Placeholder berisi contoh sesuai sub-bagian dari `contohBahanProdi`
  (`src/modules/led/domain/bahan-prodi.ts`: per kriteria C.1–C.7, AF, SWOT, kata pengantar, Bab III, umum).
- Kode sumber di bawah paragraf memakai atribut tampilan `data-sumber-label` (`labelKodeSumber`): "Sumber: J = Bahan dari
  prodi, T-1". "Keterangan kode sumber" menulis J = "Bahan dari prodi" (juga untuk versi lama yang legendanya masih
  "Jawaban penyusun di formulir"); legenda versi baru langsung "Bahan dari prodi".
- Petunjuk Beranda LED dan ringkasan kriteria, pesan panel draf, dan penanda mode uji tidak lagi menyebut "jawaban
  penyusun". Label blok di prompt LLM ("JAWABAN PENYUSUN [J]") tidak diubah karena bukan teks antarmuka dan dikunci uji
  domain prompt.
- Bagian P3 di `panel-draf.tsx` (legenda J), `[sub]/page.tsx` (prop `contoh`), dan `editor-narasi.tsx`
  (`data-sumber-label`) ikut commit P4 karena berkas yang sama dirombak di P4; commit P3 memuat sisanya.
- Uji domain baru `bahan-prodi.test.ts` (contoh per sub-bagian, label kode sumber).
- Diperiksa di browser (LED uji Teknik Sipil, C.1-IKU-a): label, keterangan, dan contoh tampil; setelah bahan diisi dan
  sub-bagian di-generate ulang (model uji), penanda paragraf berbunyi "Sumber: J = Bahan dari prodi, T-1" dan legenda
  J = "Bahan dari prodi".

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 125/125 lulus |
| `npm run test:integrasi` | 75/75 lulus |

### P4: tata letak halaman sub-bagian

- Kepala halaman: kode · n dari m · judul, status, Generate; di bawahnya Sebelumnya, pemilih sub-bagian berbentuk dropdown
  "n dari m" (`pemilih-sub.tsx`), dan Berikutnya (navigasi yang sama diulang di bawah halaman). Kolom daftar sub-bagian
  di kanan dihapus. Pindah lewat dropdown menyimpan isian tertunda dulu, sama seperti Sebelumnya/Berikutnya.
- Dua tab (`tab-sub.tsx`): **"1. Bahan untuk AI"** (instruksi template dan butir penilaian + deskriptor skor 4 dapat
  dilipat, terbuka bila belum ada narasi; LKPS/nilai manual/target; Bahan dari prodi; dokumen; tombol Generate narasi
  di bawah) dan **"2. Narasi (masuk ke Word)"** (editor selebar halaman, info versi + model + token, sakelar Selesai,
  keterangan kode sumber, Riwayat versi dalam lipatan). Tab awal Narasi bila sudah ada draf, selain itu Bahan. Isi
  kedua tab tetap terpasang (hanya disembunyikan) sehingga isian yang belum tersimpan tidak hilang saat pindah tab;
  pindah halaman menyimpan isian tertunda dulu. Saat generate selesai, tab pindah ke Narasi.
- Baris **Periksa** (`src/modules/led/komponen/narasi/panel-samping.tsx`): tombol berlencana Catatan asesor (jumlah
  belum diterima; kuning bila ada yang terbuka), Pemeriksaan (jumlah hal yang perlu dicek), Verifikasi (jumlah kalimat
  tidak sesuai). Klik membuka panel samping `Sheet` ± 26rem (`modal={false}`, bisa ditutup, tidak menghalangi editor);
  panel tidak pernah terbuka sendiri. Klik sorotan catatan di narasi atau tautan `#catatan-…` membuka panel Catatan.
  Pita kuning "n catatan asesor belum diperbaiki" dengan tombol **Lihat catatan**.
- Editor narasi `spellcheck="false"` (Tim Prodi dan asesor).
- Tampilan asesor (`ruang-asesor.tsx`) memakai susunan yang sama: satu kolom, baris Periksa dengan Catatan asesor,
  pita kuning bila ada catatan "sudah diperbaiki" yang menunggu asesor.
- Commit ini juga memuat bagian P3 di `panel-draf.tsx`, `[sub]/page.tsx`, dan `editor-narasi.tsx`.
- Diperiksa di browser pada 1366×768 dengan sidebar terbuka (LED uji Teknik Sipil, C.1-IKU-a): editor 1029 px
  (sidebar 256 px), pemilih "3 dari 7", tab Narasi terbuka karena sudah ada draf, kolom kanan tidak ada; panel
  Pemeriksaan terbuka 384 px. Alur catatan asesor: asesor memblok "Program studi menjalankan" → Kirim catatan (lencana
  1) → klik sorotan membuka panel Catatan; Tim Prodi melihat pita kuning, menyunting narasi (tersimpan sebagai versi 4
  Suntingan), Lihat catatan → Sudah diperbaiki (pita hilang); asesor melihat pita "1 catatan sudah diperbaiki Tim
  Prodi", Terima → lencana 0. Karena LED uji itu sudah Layak diajukan dari uji Tahap 9, statusnya dikembalikan ke
  Direview lewat SQL di basis data pengembangan untuk uji ini, lalu asesor menyatakan Layak diajukan lagi lewat
  halaman Penilaian (nilai 324,45).

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 125/125 lulus |
| `npm run test:integrasi` | 75/75 lulus |

### P5: LED baru, nama mengikuti tahun dan formulir disederhanakan

- Penyebab temuan: nama otomatis hanya mengikuti TS, dan TS tidak dipilih ulang bila TS lama masih ada di daftar tahun
  baru (2027 → 2028: TS 2026/2027 ada di keduanya). Sekarang setiap kali tahun pengajuan diganti, TS bawaan tahun itu
  (`tsBawaan`) **selalu** dipilih ulang, lalu nama mengikuti. Logikanya fungsi murni `isianSetelahGantiTahun` dan
  `namaLedOtomatis` di `src/modules/bersama/domain/tahun-akademik.ts`. Format nama:
  **"LED {prodi} {tahun pengajuan} (TS {tahun akademik})"**, misalnya "LED Teknik Sipil 2027 (TS 2026/2027)".
- Disederhanakan: Tim Prodi yang belum punya LED aktif langsung melihat kartu **"Mulai LED {prodi}"** di `/led`
  (`form-mulai-led.tsx`, menggantikan `form-proyek-baru.tsx`) berisi tahun pengajuan dan dua pilihan TS saja, tanpa
  isian nama. Pratinjau "Nama LED: … Bisa diubah nanti di Pengaturan LED." tampil di bawahnya. Bila instrumen jenjang
  belum aktif, alasannya tampil dan tombol Mulai LED nonaktif. `/led/baru` diarahkan ke `/led`; menu pemilih LED
  "Mulai LED baru" menuju `/led`.
- `skemaProyek.nama` kini opsional; `buatProyek` tanpa nama (atau nama kosong) memakai `namaLedOtomatis`. Ubah nama di
  Pengaturan LED tetap wajib diisi (`skemaNamaProyek`).
- Uji: belum ada perangkat uji komponen (tidak ada jsdom/testing-library), jadi logika formulir saat tahun diganti
  dipisah menjadi fungsi murni dan diuji di uji domain `tahun-akademik.test.ts` (kasus temuan 2027 → 2028, TS bawaan
  selalu dipilih ulang). Uji integrasi baru di `akses.test.ts`: `buatProyek` tanpa nama → "LED Teknik Sipil 2027 (TS
  2025/2026)", nama kosong → nama otomatis, nama diisi → dipakai apa adanya.
- Diperiksa di browser: akun uji Tim Prodi sementara dipindah ke S1 Teknik Elektro (belum punya LED) lewat Ubah peran;
  `/led/baru` diarahkan ke `/led`; kartu "Mulai LED Sarjana Teknik Elektro" tanpa isian nama; tahun 2027 → nama "LED
  Teknik Elektro 2027 (TS 2025/2026)", pilih TS 2026/2027 lalu ganti ke 2028 → TS bawaan 2026/2027 dipilih ulang dan
  nama "LED Teknik Elektro 2028 (TS 2026/2027)", kembali ke 2026 → TS 2025/2026. Mulai LED membuat LED bernama "LED
  Teknik Elektro 2026 (TS 2025/2026)"; nama berhasil diubah di Pengaturan LED. LED uji itu lalu dihapus lewat Hapus
  proyek dan akun dikembalikan ke S1 Teknik Informatika. Isian tahun diberi `max-w-32` (sebelumnya melebar penuh).

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 127/127 lulus |
| `npm run test:integrasi` | 76/76 lulus |

### Tahap 9: dokumen dan pemeriksaan akhir

Dokumen:

- `CLAUDE.md`:
  - Keputusan yang dikunci butir 1 (instrumen diunggah Admin UPPS), butir 2 (tiga peran, tabel akses ringkas, aturan
    akun termasuk Ubah nama/Ubah peran, LED baru dari kartu Mulai LED), butir 3 (halaman sub-bagian dua tab, Bahan dari
    prodi, baris Periksa), butir 8 (kunci dikelola Admin UPPS), dan Konvensi hak akses.
  - Bagian baru "Struktur kode (revisi 31 Okt 2026)" (route group, akses, menu, prodi bawaan, LED baru dan TS, akun,
    penilaian, susun seluruh LED, LKPS PDF per tabel, komponen halaman sub-bagian).
- `docs/SPESIFIKASI.md`: tabel menu per peran (termasuk Tambah akun di halaman sendiri, Ubah nama/Ubah peran, kartu
  Mulai LED, susunan halaman sub-bagian, tampilan asesor) dan sumber J = Bahan dari prodi di konteks RAG.
- `docs/PANDUAN-PENGGUNAAN.md` ditulis ulang menjadi A Admin UPPS, B Tim Prodi, C Asesor, termasuk P1–P5.

Uji browser (server pengembangan dengan `LLM_NARASI=uji` dan `EMBEDDING_PENYEDIA=uji` supaya kuota Gemini tidak
terpakai; akun uji `uji.admin@`, `uji.tim.sipil@`, `uji.tim@`, `uji.asesor@`, `uji.asesor2@demo.test`):

| Langkah | Hasil |
| --- | --- |
| Admin UPPS membuat akun Tim Prodi Teknik Sipil; login pertama wajib ganti sandi | Berhasil |
| Tim Prodi membuat LED (TS 2025/2026 · pengajuan 2026) | Berhasil (sebelum P5; kartu Mulai LED diuji terpisah di P5) |
| Unggah LKPS: 3 PDF sekaligus, 43/43 tabel terbaca dari 3 sumber; unggah dokumen .docx | Berhasil |
| Susun seluruh LED: 13/13 bagian, 105 draf | Berhasil |
| Perkiraan nilai → Hitung usulan skor: 72/72 butir, 324,19 | Berhasil |
| Admin UPPS menugaskan asesor; Tim Prodi Ajukan review → Direview | Berhasil |
| Asesor memblok teks → catatan; Tim Prodi menyunting + Sudah diperbaiki; asesor Terima | Berhasil (diulang di tata letak P4 dengan panel samping) |
| Asesor menilai di halaman Penilaian: butir 1 lewat UI (total berubah langsung 324,19 → 324,42) | Berhasil; 71 butir lainnya diisi lewat fungsi data `simpanSkor` sebagai asesor |
| Asesor Layak diajukan (324,45) | Berhasil |
| Tim Prodi ekspor final: syarat awal 73 hal | Tim penyusun diisi lewat UI; satu penanda `[BELUM ADA BUKTI]` dihapus lewat editor dan C.1 Tandai selesai lewat UI; 57 penanda sisa (keluaran model uji) dihapus dan 12 bagian lain ditandai selesai lewat fungsi data `simpanSuntingan`/`tandaiBagianSelesai` sebagai Tim Prodi; 37 perbedaan angka diberi alasan lewat tombol Beri alasan |
| Ekspor final | Berhasil: 33 halaman sebelum Lampiran (34 dengan Lampiran), 722 KB, unduhan .docx 200 OK |
| Admin UPPS Pantau LED: Sipil Layak diajukan, 105/105 selesai; Lihat → tampilan hanya baca (editor tidak bisa disunting, tanpa formulir catatan) | Berhasil |

Catatan uji:

- 37 perbedaan angka sebagian besar berasal dari teks model uji yang menyebut nomor sub-bagian (misalnya "› 3.i
  Publikasi …" terbaca sebagai angka 3). Dengan narasi Gemini asli hal ini jarang terjadi; bila sering muncul,
  pemeriksa konsistensi bisa mengabaikan nomor sub-bagian.
- LED uji Sipil sempat dikembalikan ke Direview lewat SQL untuk uji P4, lalu dinyatakan Layak lagi lewat UI.
- Instrumen LAMTEKNIK-2025-PASCA diaktifkan lewat UI untuk uji ini (sebelumnya nonaktif); akun dan LED uji dibiarkan di
  basis data pengembangan. Berkas uji `public/_uji/` dihapus.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm test` (unit + integrasi) | unit 127/127, integrasi 76/76 lulus |
| `npm run build` | Lulus (25 halaman statis) |

## Perbaikan unggah instrumen (2 Nov 2026)

Dari `docs/PERBAIKAN-INSTRUMEN.md` (Adrianne mencoba menambah instrumen jenjang selain Sarjana), dikerjakan berurutan
I1 sampai I5 di branch `revisi-31okt`, satu commit per butir, dengan aturan kerja `docs/RENCANA-REVISI-31OKT.md`.

### I1: pemeriksaan berkas dan tahun instrumen saat diunggah

Semua keputusan diambil dari **isi berkas**; metadata Word/PDF dan nama berkas tidak dipakai sama sekali.

- Data:
  - `VersiInstrumen.tahunInstrumen Int` (migrasi `20261102090000_periksa_berkas_instrumen` mengisi versi lama dengan
    2025), `sidikJari Json?` (ringkasan bacaan tiap berkas yang diterima dan centang konfirmasi yang diberikan),
    `riwayatPeriksa Json?` (tiga penolakan terakhir).
  - Model baru `SidikJariInstrumen` (berkas yang dipelajari saat versi diaktifkan atau ditandai usang).
  - Berkas `data/instrumen/sidik-jari.json`: enam SHA-256 dari dokumen ditambah satu berkas LPMPP yang belum tercantum
    (template Magister "Unggul Khusus-Unggul Internasional", `df3a7663…`, struktur lama, usang). Juga struktur kriteria
    2025 reguler, 2025 Unggul Internasional, dan struktur lama (9 kriteria).
- Formulir "Instrumen baru" mendapat isian wajib **Tahun instrumen**; nama dan kode mengikuti tahun dan jenjang. Tahun
  juga tampil dan bisa diubah di Identitas versi selama versi belum aktif. Validasi: 2020 ≤ tahun ≤ tahun berjalan + 2
  ("Tahun instrumen tidak masuk akal."). Tahun lebih lama dari versi aktif jenjang yang sama ditolak saat membuat dan
  saat mengubah tahun. Versi lama lintas jenjang yang memuat butir jenjang itu ikut dihitung.
- Logika murni `src/modules/led/domain/periksa-berkas-instrumen.ts`:
  - jenis berkas dari isi (`jenisDocx`, `jenisPdf`);
  - lapis 1: `tahunDariTeks` (pola `I?APS-xx 2025`, "Instrumen LAM Teknik 2025", "Peraturan LAM Teknik Nomor n Tahun
    2025", judul "MATRIKS/PEDOMAN PENILAIAN … 2025"; pola kuat didahulukan) dan `jenjangDariMatriks`.
    `jenjangDariMatriks` membaca judul halaman "PROGRAM STUDI - PROGRAM X I?APS-", karena sampul resmi matriks
    Sarjana/D3 salah tulis "PROGRAM DIPLOMA SATU";
  - lapis 2: `kriteriaDariKonteks` (judul "I. …" di bawah "A. KRITERIA" hasil `susunMatriks`),
    `kriteriaTemplateCadangan` (template bergaya "heading": judul pertama sesudah "Kriteria Akreditasi" menentukan gaya
    dan tingkat), `cocokKriteria`;
  - lapis 3: sidik jari berkas dan struktur yang dikenal;
  - keputusan `periksaBerkasInstrumen`, `konfirmasiTertunda`, `tambahRiwayat`.
- Pembanding kriteria memakai `kunciTeks` tanpa spasi, karena teks PDF bisa terpotong ("Akuntabilita s"). Selain itu
  "Pengabdian kepada Masyarakat" disamakan dengan "PkM". Nama yang tidak terbaca sebagai konteks dicari di seluruh teks
  matriks. Cocok bila tidak ada kriteria template yang hilang dan tidak ada kriteria matriks yang lebih; ini setara
  dengan "jumlah sama dan setiap nama ada", tetapi tetap benar bila satu baris judul kriteria tidak terbaca.
- Pembaca berkas (I/O) `src/modules/led/instrumen/baca-berkas.ts`:
  - membaca paragraf .docx, teks 3 halaman awal PDF, dan seluruh Matriks untuk kriteria (sekitar 0,4 detik untuk 35–40
    halaman), sehingga cukup cepat dijalankan sinkron;
  - .docx yang diunggah di baris PDF tetap disebut jenisnya.
- Alur unggah (`unggahBerkasInstrumen`):
  - berkas dibaca dan diperiksa sebelum disimpan. Berkas yang ditolak tidak disimpan; penolakannya masuk
    `riwayatPeriksa` dan `LogAktivitas` (`tolak_berkas_instrumen`) lalu dilempar `GalatBerkasDitolak`;
  - lapis 2 berjalan bila pasangannya (template ↔ matriks) sudah terunggah, dengan membaca ulang berkas pasangan dari
    penyimpanan;
  - sebelum ekstraksi, ketiga berkas diperiksa sekali lagi, karena tahun bisa diubah sesudah unggah, lalu centang
    konfirmasi diwajibkan;
  - "Saya sudah memastikan berkas ini instrumen tahun {y}" diminta bila tahun tidak tertulis di teks. Centang skema
    diminta untuk template PJJ atau Unggul Internasional di versi reguler. Centang berlaku untuk tahun dan SHA-256 saat
    dicentang dan dicatat di `LogAktivitas` (`konfirmasi_tahun_instrumen`).
- Belajar versi baru:
  - saat versi diaktifkan, SHA-256 berkasnya (dengan kriteria template) disimpan ke `SidikJariInstrumen`. Berkas yang
    sudah ada di `sidik-jari.json` tidak ditimpa, supaya template resmi 2025 tetap tercatat sebagai 2025;
  - tombol **Tandai berkas usang** muncul di versi nonaktif bila sudah ada versi aktif jenjang yang sama dengan tahun
    lebih baru. Berkas yang juga dipakai versi aktif dilewati (misalnya template yang sama dipakai lagi di tahun baru).
- Halaman versi:
  - kotak penolakan (judul, alasan, apa yang terbaca dari isi berkas, langkah berikutnya, waktu). Penolakan lain
    dilipat di "Penolakan sebelumnya", dan kotak hilang setelah berkas jenis itu diterima;
  - baris "Terbaca: tahun 2025 · Sarjana · 7 kriteria" dan info sidik jari di tiap berkas;
  - blok centang konfirmasi; tombol Mulai ekstraksi nonaktif sampai centang diberikan;
  - `UnggahBerkas` mendapat `segarkanSaatGagal`, supaya kotak penolakan langsung tampil.
- Keputusan teknis:
  - Versi tidak punya kolom skema. Semua versi yang dibuat aplikasi ini dianggap LED reguler (`SKEMA_VERSI`).
  - Di uji integrasi, tahun 2030 di-set langsung lewat Prisma, karena validasi formulir hanya menerima sampai tahun
    berjalan + 2. Uji domain memakai 2030 langsung.
- Diperiksa dengan semua berkas di `../Led Lamteknik/`:
  - 21 Matriks (reguler, PJJ, Unggul Internasional, Perpanjangan) terbaca tahun 2025 dengan jenjang yang benar,
    termasuk "DIPLOMATIGA PJJ";
  - Pedoman Penilaian terbaca 2025; Naskah Akademik dan Pedoman Penyusunan dikenali sebagai jenis lain;
  - template LPMPP terbaca 9 kriteria lama, dan "Peringatan Pengisian LED" dikenali.
- Uji:
  - domain `periksa-berkas-instrumen.test.ts` (11 uji): tahun dua arah, tahun baru 2030 diterima walau struktur belum
    dikenal, template resmi 2025 untuk 2030 diterima dengan info, kriteria lama ditolak tanpa sidik jari, usang, skema,
    jenjang, salah jenis, tahun aktif, konfirmasi, riwayat;
  - integrasi `periksa-berkas-instrumen.test.ts` (6 uji) memakai berkas fikstur dan Matriks sintetis (pdf-lib):
    batas tahun, penolakan tidak disimpan dan riwayat tiga terakhir, berkas resmi diterima, tahun baru 2030 dan template
    belum dikenal diterima, tahun diubah lalu ditolak sebelum ekstraksi, centang tahun, tandai usang;
  - `unggah-instrumen.test.ts` ditambah: sidik jari matriks/pedoman tersimpan saat aktivasi dan dikenali pada unggahan
    berikutnya.
- Uji browser (server pengembangan, akun uji Admin UPPS):
  - tahun 2024 ditolak ("Sudah ada instrumen aktif tahun 2025 untuk Sarjana; tahun 2024 lebih lama."); nama dan kode
    mengikuti tahun;
  - versi `LAMTEKNIK-2025-S1-I1` dibuat. Pedoman di baris Matriks, Matriks D3, dan template LPMPP masing-masing ditolak
    dengan alasan yang tepat, dan kotak penolakan tampil setelah dimuat ulang;
  - berkas resmi diterima dengan "Terbaca: …" dan info, lalu kotak penolakan hilang.
  - Server pengembangan yang sedang berjalan harus dijalankan ulang, karena Prisma Client lamanya belum mengenal
    `tahunInstrumen`.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 138/138 lulus |
| `npm run test:integrasi` | 82/82 lulus |

### I2: pesan galat diagnosis

- Logika murni `src/modules/led/domain/diagnosis-template.ts`:
  - `diagnosisTemplate(paragraf, hasilUrai, { jenjang, tahun })` menghasilkan rusak, bukan Template LED, struktur LED
    lama, format judul tidak dikenali, jenjang tidak ada, atau cocok. Setiap diagnosis membawa pesan dan langkah sesuai
    tabel dokumen;
  - ringkasan (`ringkasTemplate`) memuat jumlah paragraf, BAB yang ditemukan (tanpa baris daftar isi), kriteria
    (aturan bawaan atau cara cadangan I1), 10 gaya judul terbanyak dengan contoh teks, dan jenjang yang ada.
  - Struktur lama dikenali bila sedikitnya 4 kriteria sama dengan 9 kriteria lama dan tidak ada kriteria C.x.
- Dipakai di tiga tempat:
  - unggah template (`bacaTemplate` di `baca-berkas.ts`, diteruskan ke `periksaBerkasInstrumen`):
    - rusak dan bukan Template LED ditolak dengan pesan diagnosis (menggantikan pesan jenis I1 untuk template);
    - struktur lama dan jenjang tidak ada ditolak, sesudah pemeriksaan sidik jari supaya berkas yang dikenal tetap
      disebut namanya;
    - format lain diterima dengan info, dan ringkasannya ikut tampil di "apa yang terbaca";
  - sebelum ekstraksi: template berformat lain menghentikan ekstraksi dengan pesan diagnosis;
  - langkah template di worker (`proses/instrumen.ts`): galat umum "Tidak ada kriteria … Pastikan berkas adalah Template
    LEDPS resmi" dan "tidak memuat sub-bagian untuk jenjang" diganti pesan diagnosis beserta ringkasan yang terbaca.
- Halaman versi: kotak "Format judul tidak dikenali" (kuning, bukan merah) berisi pesan, ringkasan, dan tabel gaya
  judul. Mulai ekstraksi nonaktif selama diagnosis ini berlaku. Tombol "Pemetaan judul" ditambahkan di I3 dan "Minta
  usulan AI" di I4, supaya tidak ada tautan ke halaman yang belum ada.
- Uji:
  - domain `diagnosis-template.test.ts` (4 uji): rusak, bukan template, struktur lama, format lain dengan ringkasan,
    jenjang tidak ada, cocok;
  - unit `tests/unit/template-instrumen.test.ts`: Template LEDPS 2025 resmi terbaca untuk D3, S1, STr, S2, S3, PPI
    dengan diagnosis cocok; PDF yang diunggah sebagai template didiagnosis rusak;
  - integrasi I1 disesuaikan dengan pesan diagnosis untuk berkas rusak.
- Uji browser: template 2025 yang judulnya diganti ke Heading 1/2/3 (dibuat dengan
  `scripts/buat-fikstur-format-lain.ts`, di-commit di I3) diterima di versi `LAMTEKNIK-2025-S1-I1`. Kriteria tetap
  cocok dengan Matriks lewat cara cadangan. Kotak diagnosis tampil (471 paragraf, 4 BAB, 7 kriteria, tabel gaya), dan
  Mulai ekstraksi nonaktif.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 144/144 lulus |
| `npm run test:integrasi` | 82/82 lulus |

### I3: pemetaan judul oleh Admin (tanpa AI, tanpa token)

- `VersiInstrumen.pemetaanTemplate Json?` (migrasi `20261102100000_pemetaan_template`) menyimpan `{ gaya: { nama gaya →
  peran }, polaCatatan, kotak }`. Peran yang tersedia: BAB, Bagian Bab II, Penanda "Kriteria Akreditasi", Kriteria,
  judul sub-bagian tingkat 1/2/3, Instruksi, Abaikan. Gaya yang tidak dipetakan dibaca "seperti biasa".
- `uraiTemplate(paragraf, pemetaan?)` (`domain/template-led.ts`):
  - tanpa pemetaan, perilakunya persis seperti sebelumnya, dan semua uji lama tetap lulus;
  - dengan pemetaan, peran gaya menggantikan aturan nama gaya resmi ("I. Judul Besar", "II. Sub Judul", "C.1. …");
  - judul sub-bagian tingkat 1–3 membuka judul pada kedalaman itu, dan Instruksi memaksa paragraf menjadi instruksi;
  - pola catatan jenjang sendiri (regex, divalidasi `polaCatatanSah`) dan pilihan "setiap tabel adalah kotak isian".
- `domain/pemetaan-template.ts`:
  - `daftarGaya`: nama gaya, jumlah paragraf, bernomor, tingkat (ilvl), dan 3 contoh teks.
  - `usulanPemetaan` (tanpa AI):
    - gaya yang memuat "BAB …" menjadi BAB;
    - gaya yang memuat "Kriteria Akreditasi" menjadi Bagian Bab II, atau Penanda bila hanya dipakai di situ;
    - gaya yang muncul tepat N kali di bawah "Kriteria Akreditasi" menjadi Kriteria (N = jumlah kriteria Matriks);
    - "heading 2/3" menjadi sub-bagian, hanya bila template hampir tidak memakai penomoran Word untuk judul. Pada
      template resmi aturan ini mengubah hasil (103 → 107 sub-bagian Sarjana), jadi dibatasi.
  - `pratinjauPemetaan`: pohon bagian → sub-bagian per jenjang, dengan peringatan bila kriteria kosong, jumlah kriteria
    ≠ Matriks, jenjang tanpa sub-bagian, atau Bab II tidak terbaca.
- Data (`unggah-instrumen.ts`):
  - `dataPemetaan` dan `simpanPemetaan`;
  - simpan membaca ulang template dengan pemetaan itu: diagnosis, kriteria, dan kecocokan dengan Matriks. Bila cocok,
    ringkasan template diperbarui;
  - pemetaan tetap disimpan walau belum cocok, dan ekstraksi menunggu sampai diagnosis cocok;
  - aksi dicatat `simpan_pemetaan_template`, dan unggah template baru mengosongkan pemetaan.
- Pemetaan yang sama dipakai di semua tempat template dibaca: pemeriksaan sebelum ekstraksi (I1/I2), langkah template
  di worker (`proses/instrumen.ts`), dan kriteria untuk lapis 2.
  - Ekspor Word (`ekspor/template.ts`) tidak memakai nama gaya. Placeholder dicari dari teks instruksi dan judul
    sub-bagian hasil ekstraksi, yang dibuat dengan pemetaan. Jadi ekspor otomatis mengikuti pemetaan yang sama
    (diuji di I5).
- Halaman `/led/instrumen/[versiId]/pemetaan` (Admin UPPS):
  - tabel gaya dengan pilihan peran (penanda "usulan awal") dan isian pola catatan serta kotak isian;
  - pratinjau langsung di samping, dihitung di peramban dengan fungsi domain yang sama;
  - tombol Simpan pemetaan, dan tombol "Pemetaan judul" di kotak diagnosis (I2);
  - setelah disimpan, halaman versi menulis "Template dibaca dengan pemetaan judul dari Admin" dengan tautan Ubah
    pemetaan.
- Fikstur: aturan penggantian gaya ada di `tests/fikstur/instrumen/format-lain.ts` (dipakai uji dan
  `scripts/buat-fikstur-format-lain.ts`). Template resmi diubah sehingga judulnya hanya Heading 1/2/3; isi, kotak
  isian, dan penomoran tetap.
  - Dokumen meminta pustaka `docx`, tetapi gaya diganti langsung di XML (JSZip), karena membuat ulang 774 paragraf
    beserta kotak teks dan penomoran Word dengan pustaka `docx` tidak akan persis sama. Berkas .docx-nya di-commit di
    I5.
- Uji:
  - domain `pemetaan-template.test.ts` (4 uji): tanpa pemetaan tidak berubah, peran gaya, sub-bagian tingkat 1,
    instruksi, abaikan, pola catatan dan tabel sebagai kotak, usulan, tabel gaya, pratinjau dengan peringatan, pola
    tidak sah;
  - unit `template-instrumen.test.ts`: template resmi berformat Heading 1/2/3 tidak terbaca tanpa pemetaan. Dengan
    usulan awal, hasilnya sama persis dengan template resmi (`deepEqual` seluruh struktur), dan usulan untuk template
    resmi tidak mengubah hasilnya;
  - integrasi `pemetaan-template.test.ts`: unggah format lain, ekstraksi ditolak dengan diagnosis, usulan dan tabel
    gaya, pola tidak sah ditolak, simpan → cocok dan log, langkah template menghasilkan sub-bagian yang sama dengan
    versi bertemplate resmi untuk S1, D3, S2, PPI, dan unggah template baru mengosongkan pemetaan.
- Uji browser (versi `LAMTEKNIK-2025-S1-I1` dengan template format lain):
  - halaman Pemetaan menampilkan 6 gaya dengan usulan awal (heading 1 = BAB, heading 2 = Bagian Bab II, heading 3 =
    Kriteria) dan pratinjau 13 bagian, 7 kriteria (Matriks: 7), 103 sub-bagian Sarjana;
  - Simpan pemetaan berhasil, kotak diagnosis hilang di halaman versi, dan Mulai ekstraksi aktif;
  - kolom Nomor disembunyikan di layar sempit supaya kolom Peran tetap terlihat;
  - server pengembangan harus dijalankan ulang setelah migrasi, karena Prisma Client lama belum mengenal
    `pemetaanTemplate`.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 149/149 lulus |
| `npm run test:integrasi` | 83/83 lulus |

### I4: usulan struktur dari AI (hanya bila Admin memilihnya)

- Tombol **Minta usulan AI** ada di kotak diagnosis halaman versi (I2) dan di halaman Pemetaan (I3).
  - Tombol ini tidak pernah berjalan otomatis: unggah, diagnosis, halaman Pemetaan, dan perkiraan tidak memanggil AI.
  - Sebelum dikirim, dialog konfirmasi menampilkan "±{n} judul dikirim, perkiraan {t} token" dan model dari Pengaturan
    LLM (`modelAiAktif().labelNarasi`).
- Yang dikirim hanya **kerangka** (`domain/usulan-struktur.ts`):
  - `kerangkaTemplate` memilih paragraf judul atau calon judul: pendek, dan bernomor, bergaya judul, huruf kapital,
    atau diawali nomor. Dari tiap paragraf dikirim nama gaya, bernomor, ilvl, dan 120 karakter pertama;
  - `promptStruktur` menambahkan daftar gaya dan daftar kriteria Matriks bila sudah diunggah;
  - instruksi "Bagian ini …" dan isi narasi tidak dikirim, dan template tidak memuat data pribadi;
  - `perkiraanToken` memperkirakan sekitar 4 karakter per token ditambah keluaran per gaya. Untuk template 2025
    berformat lain: ±161 judul, ±3.300 token.
- Worker antrean baru `struktur-template` (`proses/struktur-template.ts`):
  - memakai `panggilTerstruktur` dengan skema Zod (peran per gaya, termasuk "biasa", ditambah alasan singkat), sehingga
    aturan kunci dan model cadangannya sama dan setiap panggilan tercatat di `LogPemakaian`
    (`struktur-template:{kode}`);
  - di mode uji (`LLM_NARASI=uji`) keluarannya tetap tanpa Gemini;
  - bila kunci habis atau belum ada, berhenti dengan status gagal dan pesan "Usulan AI berhenti: … Pemetaan judul tetap
    bisa diisi sendiri tanpa AI." Tidak diulang otomatis, berbeda dengan penyusunan narasi, karena usulan ini hanya
    dibuat atas klik Admin.
- `VersiInstrumen.usulanStruktur Json?` (migrasi `20261102110000_usulan_struktur`) menyimpan status, peran per gaya,
  alasan, model, token, dan waktu.
  - Hasil AI **hanya mengisi usulan**: tabel Pemetaan menimpa isian awal untuk gaya yang dinilai AI, menandainya
    "usulan AI", dan menampilkan alasannya. `pemetaanTemplate` tidak pernah diubah oleh AI.
  - Admin memeriksa lalu menekan Simpan pemetaan; setelah itu `usulanStruktur` dikosongkan. Unggah template baru juga
    mengosongkannya.
  - Halaman Pemetaan memantau status (`PemantauProses`) selama usulan dibuat.
- Uji:
  - domain `usulan-struktur.test.ts` (2 uji): kerangka tanpa isi narasi dan instruksi, teks paling panjang 120
    karakter, daftar kriteria Matriks, perkiraan token, keluaran AI menjadi usulan, gaya asing diabaikan;
  - integrasi `usulan-struktur.test.ts` (2 uji):
    - dengan `LLM_NARASI=uji`: unggah, halaman Pemetaan, dan perkiraan tidak memanggil AI (LogPemakaian 0), dan worker
      tanpa permintaan tidak berbuat apa-apa;
    - setelah diminta, usulan selesai sama dengan pemetaan yang benar, tetapi `pemetaanTemplate` tetap kosong;
      LogPemakaian 1 dan LogAktivitas `minta_usulan_ai_struktur` tercatat; permintaan ganda ditolak; setelah Admin
      menyimpan, usulan dikosongkan;
    - tanpa kunci (mode uji dimatikan): gagal dengan pesan jelas dan tidak diulang otomatis.
- Uji browser (server pengembangan dan worker dengan `LLM_NARASI=uji`):
  - di halaman Pemetaan, Minta usulan AI menampilkan dialog "±161 judul dikirim, perkiraan 3.301 token. Model: model
    uji pengembangan (tanpa Gemini)";
  - setelah Kirim ke AI, worker mencatat `[struktur-template] … selesai`, dan halaman diperbarui sendiri dengan "Usulan
    AI (uji-narasi, 0 token) sudah diisikan ke tabel".

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 151/151 lulus |
| `npm run test:integrasi` | 85/85 lulus |

### I5: fikstur, uji, dan dokumen

- Fikstur baru di `tests/fikstur/instrumen/`:
  - `template-led-lama-2022.docx`: salinan template LPMPP Sarjana "APS Akademik dan Vokasi (LED Word)", SHA-256
    `58e897fe…`, sama dengan daftar sidik jari;
  - `matriks-d3-2025.pdf`: Matriks D3 2025 resmi dari folder lamteknik.or.id 01_Pasca;
  - `template-format-lain.docx`: dibuat dengan `scripts/buat-fikstur-format-lain.ts` (lihat catatan I3 soal JSZip).
    Tanggal di dalam zip dibuat tetap supaya berkasnya sama setiap kali dibuat, dan uji memastikan fikstur sama dengan
    keluaran skrip.
- Penyesuaian: template struktur lama yang diunggah sesudah Matriks kini ditolak lewat lapis 2 (ketidakcocokan
  kriteria; pesannya menyebut kedua daftar dan "struktur LED lama"). Diagnosis "struktur LED lama" dipakai bila Matriks
  belum ada. Judul penolakan "struktur LED lama" tidak lagi dikecilkan hurufnya.
- Uji yang diminta dokumen dan letaknya:

| Uji | Letak | Hasil |
| --- | --- | --- |
| Template 2025 resmi terbaca untuk semua jenjang, diagnosis cocok | `tests/unit/template-instrumen.test.ts` (I2) | Lulus (D3, S1, STr, S2, S3, PPI) |
| LPMPP 2022 → struktur LED lama; ditolak lewat sidik jari usang, dan tanpa sidik jari lewat kriteria Matriks 2025 | `tests/unit/template-instrumen.test.ts`, `tests/integrasi/instrumen-fikstur.test.ts` | Lulus |
| Matriks D3 di versi S1 → ditolak karena jenjang (Matriks D3 diterima di versi D3 dan cocok dengan template resmi) | `instrumen-fikstur.test.ts`, unit Matriks D3 | Lulus |
| Pedoman diunggah sebagai Matriks → salah jenis | `periksa-berkas-instrumen.test.ts` (integrasi, I1) | Lulus |
| Isian 2025, Matriks 2030 → ditolak; isian 2030, Matriks 2030, template cocok → diterima walau struktur belum dikenal | domain dan integrasi `periksa-berkas-instrumen.test.ts` (I1) | Lulus |
| Template resmi 2025 untuk isian 2030 + Matriks 2030 berkriteria sama → diterima dengan info "sama dengan 2025" | domain dan integrasi I1 | Lulus |
| Sesudah aktivasi sidik jari tersimpan dan berkas yang sama dikenali | `unggah-instrumen.test.ts` (I1) | Lulus |
| `template-format-lain.docx` + pemetaan → struktur sama dengan resmi; ekspor Word menaruh narasi di judul yang benar | `instrumen-fikstur.test.ts`, unit I3 | Lulus |
| Usulan AI dengan `LLM_NARASI=uji`: hanya mengisi usulan, tidak menyimpan sendiri, tidak berjalan tanpa klik | `usulan-struktur.test.ts` (I4) | Lulus |

- Uji ekspor (`instrumen-fikstur.test.ts`):
  - dua LED, masing-masing memakai versi bertemplate resmi dan versi bertemplate format lain + pemetaan, dengan narasi
    bertanda di II.A-1, C.1-LB, C.3-KEB, dan C.6-SWOT;
  - `bangunDocx` keduanya: sub-bagian Sarjana sama, tidak ada sub-bagian yang tidak ditemukan, dan daftar placeholder
    sama (lebih dari 90);
  - paragraf tepat di atas setiap narasi sama dengan berkas dari template resmi dan memuat judul sub-bagiannya.
- Metadata berkas tidak dipakai di uji mana pun.
- Dokumen:
  - `CLAUDE.md` keputusan butir 1 (tahun instrumen, pemeriksaan berkas, diagnosis, pemetaan judul, usulan AI opsional)
    dan bagian baru "Struktur kode (perbaikan instrumen 2 Nov 2026)";
  - `docs/PANDUAN-PENGGUNAAN.md` A.4 Instrumen: Tahun instrumen, konfirmasi, Tandai berkas usang, tabel berkas yang
    benar per jenjang, dan langkah bila berkas ditolak (termasuk Pemetaan judul dan Minta usulan AI).
- Pemeriksaan akhir tambahan: `npm run build` lulus (25 halaman statis). Peringatan pelacakan berkas Turbopack untuk
  `bersama/penyimpanan.ts` sudah ada sejak sebelum perbaikan ini.
- Sisa uji browser di basis data pengembangan: versi draf `LAMTEKNIK-2025-S1-I1` (template format lain + pemetaan,
  belum diekstrak). Akun uji yang sempat dibuat untuk I1 sudah dihapus, dan `public/_uji/` dihapus.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 153/153 lulus |
| `npm run test:integrasi` | 87/87 lulus |
| `npm run build` | Lulus |


### Perbaikan kecil: tombol mata di isian kata sandi (2 Nov 2026)

- Komponen baru `src/components/input-sandi.tsx` (`InputSandi`): isian kata sandi dengan tombol mata untuk menampilkan
  atau menyembunyikan isinya (`aria-label` dan `aria-pressed`).
- Dipakai di halaman login, formulir admin pertama, Tambah akun (kata sandi awal), dan Atur ulang sandi. Halaman Ganti
  sandi sudah punya tombol serupa sejak sebelumnya.
- Diperiksa di browser: di Tambah akun, isian berubah dari `password` ke `text` setelah tombol diklik, dan labelnya
  menjadi "Sembunyikan kata sandi".

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 153/153 lulus |
| `npm run test:integrasi` | 87/87 lulus |

## LED periode berikutnya (2 Nov 2026)

Dari `docs/RENCANA-LED-PERIODE-BERIKUTNYA.md`, dikerjakan berurutan L1 sampai L6 di branch `revisi-31okt`, satu commit
per butir.

### L1: catat hasil akreditasi dan riwayat akreditasi prodi

- Data:
  - model `RiwayatAkreditasi` di `bersama.prisma` (lembaga, peringkat, nomor dan tanggal SK, berlaku mulai/sampai,
    `proyekId`, berkas SK, jenis `hasil`/`koreksi`/`awal`, alasan, status `menunggu`/`berlaku`/`ditolak`, dicatat dan
    dikonfirmasi oleh). `proyekId` sengaja tanpa relasi supaya skema bersama tidak bergantung pada LED;
  - `ProyekLED.labelArsip`;
  - migrasi `20261102120000_riwayat_akreditasi` membuat satu riwayat "awal" dari data prodi yang ada (16 prodi di
    basis data pengembangan). Prodi bawaan baru juga langsung mendapat riwayat awal.
- `terapkanRiwayatTerbaru` (`bersama/data/akreditasi.ts`) menurunkan `Prodi.akreditasiBerlakuSampai` dan
  `identitas.peringkatAkreditasi`, `nomorSkAkreditasi`, `lembagaAkreditasi` dari riwayat berlaku terbaru.
  - Ubah prodi (Admin): mengubah tanggal, peringkat, atau nomor SK dicatat sebagai riwayat "koreksi manual", dan alasan
    wajib diisi (isian baru "Alasan koreksi data akreditasi").
  - Tim Prodi tidak lagi bisa mengetik tiga isian itu di Identitas prodi; isiannya dinonaktifkan dengan keterangan.
- Catat hasil akreditasi (`led/data/akreditasi.ts`):
  - syarat: LED belum diarsipkan, Layak diajukan atau sudah diekspor final, dan belum ada catatan yang menunggu atau
    berlaku;
  - Admin UPPS mencatat langsung berlaku (boleh tanpa LED untuk SK dari luar sistem). Tim Prodi hanya dari LED
    prodinya, dengan status menunggu, dan Admin diberi tahu lewat lonceng;
  - Konfirmasi atau Tolak (alasan wajib) di halaman prodi, dan pencatat diberi tahu;
  - setelah berlaku: data prodi diturunkan, LED yang diajukan diarsipkan berlabel "Diajukan {tahun} · {peringkat}",
    dan Tim Prodi diberi tahu;
  - semuanya dalam satu transaksi. Bila gagal di tengah (misalnya penyusunan masih berjalan), tidak ada riwayat yang
    tercatat, LED tidak diarsipkan, dan PDF SK yang sempat disimpan dihapus.
- Bantuan isi dari PDF SK:
  - tanpa AI: `bacaSk` (`bersama/domain/akreditasi.ts`) mencari "berlaku sejak … sampai dengan …", "pada tanggal",
    "Nomor:", dan peringkat. Tanggal Indonesia dan angka diubah ke YYYY-MM-DD; pola yang tidak dikenali tidak ditebak;
  - "Baca dengan AI": perkiraan token dan model tampil dulu di dialog, angka ≥ 15 digit (misalnya NIP) disamarkan, dan
    panggilan lewat `panggilTerstruktur` dicatat di LogPemakaian. Mode uji memakai pola yang sama;
  - hasil keduanya hanya mengisi formulir dan ditandai "dari SK". Berkas tidak disimpan sebelum Simpan.
- Halaman dan tombol:
  - Beranda LED (Tim Prodi): kotak "Hasil akreditasi" dengan tombol Catat hasil akreditasi
    (`/led/[proyekId]/hasil-akreditasi`) dan status catatan;
  - Pantau LED (Admin): tombol Catat hasil akreditasi di LED yang memenuhi syarat;
  - Program studi → prodi: kartu **Riwayat akreditasi** (periode, peringkat, SK dengan tautan PDF dan LED, jenis,
    status, Konfirmasi/Tolak) dan tombol ke `/pengaturan/prodi/[id]/akreditasi`;
  - daftar LED arsip menampilkan label arsip;
  - rute `/api/akreditasi` (catat, multipart), `/api/akreditasi/sk` (pola, perkiraan, AI), dan
    `/api/akreditasi/[id]/sk` (unduh SK).
- `beritahu` kini menerima `proyekId` opsional (pemberitahuan tingkat prodi).
- Uji:
  - domain `bersama/domain/__tests__/akreditasi.test.ts` (2 uji, teks SK fiktif);
  - integrasi `akreditasi.test.ts` (4 uji): riwayat awal dan koreksi beralasan; Tim Prodi menunggu lalu Admin
    mengonfirmasi (data prodi, arsip berlabel, pemberitahuan, prodi lain ditolak); tolak; kegagalan di tengah tidak
    mengarsipkan LED; Admin tanpa LED; baca SK pola dan AI uji tanpa menyimpan apa pun.
- Uji browser (akun uji Admin UPPS):
  - di Catat hasil akreditasi prodi Teknik Sipil, PDF SK fiktif dipilih lalu "Isi dari PDF SK" mengisi 5 isian
    bertanda "dari SK" dan memilih LED uji Sipil;
  - "Baca dengan AI" menampilkan "Perkiraan 566 token. Model: model uji pengembangan";
  - halaman prodi menampilkan Riwayat akreditasi. Penyimpanan diuji di alur L6.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 155/155 lulus |
| `npm run test:integrasi` | 91/91 lulus |


### L2: pengingat otomatis

- Fungsi murni di `bersama/domain/akreditasi.ts`:
  - `ambangPengingat(berlakuSampai, hariIni)`: ambang terkecil yang sudah tercapai, yaitu hari ini ≥ tanggal berakhir
    − 18/12/6 bulan. Akreditasi yang sudah lewat tetap ambang 6. Bila pekerjaan harian sempat mati, hanya ambang
    terkini yang dikirim;
  - `acuanPeriode`: tanggal SK, lalu tanggal mulai berlaku; untuk data awal prodi, lima tahun sebelum berakhir;
  - `perluLedBaru`: ≤ 18 bulan dan tidak ada LED aktif yang dibuat sesudah acuan itu;
  - `pesanPengingat`, misalnya "Akreditasi Sarjana Teknik Elektro berakhir 20 Agu 2030 (12 bulan lagi). Mulai LED
    periode berikutnya."
- Tabel `PengingatTerkirim { prodiId, berlakuSampai, ambang }` (unik), migrasi `20261102130000_pengingat_akreditasi`.
  Karena tanggal berakhir ikut menjadi kunci, SK baru memulai siklus pengingat baru.
- `bersama/data/pengingat-akreditasi.ts`:
  - `statusPeriodeProdi`;
  - `kirimPengingatAkreditasi(hariIni)`: lonceng ke semua akun Tim Prodi aktif (tautan `/led`) dan Admin UPPS (tautan
    `/led/pantau`);
  - `ingatkanTimProdi` (Admin, dicatat `ingatkan_tim_prodi`).
  - Modul bersama membaca tabel LED lewat Prisma tanpa mengimpor kode LED, jadi uji batas modul tetap lulus.
- Pekerjaan worker `pengingat-akreditasi` (antrean bersama) dijadwalkan setiap hari pukul 07.00 WIB
  (`PENGINGAT_JADWAL` untuk mengubahnya, `missed: once` seperti cadangan harian). Untuk menjalankannya manual:
  `npm run pengingat`.
- Pantau LED: lencana **Perlu LED baru** dan tombol **Ingatkan Tim Prodi** (bila prodi punya akun Tim Prodi).
- Uji:
  - domain (tambahan di `akreditasi.test.ts`): batas tepat 18/12/6 bulan, sudah lewat, acuan periode, LED periode lalu
    atau yang diarsipkan tidak dihitung, teks pesan;
  - integrasi `pengingat-akreditasi.test.ts` (2 uji): empat prodi (12 bulan, > 18 bulan, sudah punya LED baru, 6 bulan
    dengan LED lama), dikirim ke Tim Prodi dan Admin; hari berikutnya tidak dikirim ulang; ambang 6 bulan dikirim
    sekali lagi; Ingatkan Tim Prodi hanya Admin.
- Uji browser: Pantau LED di basis data pengembangan menandai empat prodi yang berakhir 20 Des 2027 dengan Perlu LED
  baru. Teknik Sipil (berakhir 20 Des 2026) tidak ditandai karena sudah punya LED aktif. Pengiriman pengingat diuji di
  alur L6.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 156/156 lulus |
| `npm run test:integrasi` | 93/93 lulus |


### L3: akun Tim Prodi sebelum periode baru

- `User.loginTerakhir` (migrasi `20261102140000_login_terakhir`, diisi dari sesi yang masih tersimpan) diperbarui
  setiap kali sesi login dibuat lewat `databaseHooks.session.create.after` Better Auth.
- `statusAkunProdi` (domain):
  - "Belum ada akun Tim Prodi" bila tidak ada akun aktif;
  - "Periksa akun Tim Prodi" bila semua akun aktif tidak login lebih dari 12 bulan. Akun yang belum pernah login
    dihitung dari tanggal dibuat, supaya akun baru tidak langsung ditandai.
- `statusPeriodeProdi` membawa daftar akun Tim Prodi dan statusnya.
  - Pantau LED menampilkan setiap akun aktif dengan "login {tanggal}" atau "belum pernah login", lencana status, dan
    tautan cepat **Tambah akun** (`/admin/akun/tambah?prodi=…`, prodi sudah terpilih) dan **Kelola akun**
    (`/admin/akun?prodi=…`, tersaring per prodi, dengan "Tampilkan semua akun").
  - Pengingat untuk Admin UPPS (L2) ditambah "Belum ada akun Tim Prodi." atau "Periksa akun Tim Prodi." bila perlu.
- Kelola akun mendapat kolom Login terakhir.
- Uji:
  - domain (tambahan di `akreditasi.test.ts`): belum ada, akun nonaktif, batas 12 bulan, akun baru belum login;
  - integrasi (tambahan di `pengingat-akreditasi.test.ts`): login lewat Better Auth mengisi `loginTerakhir`, status
    tiga prodi, dan pesan pengingat Admin memuat status akun.
- Uji browser:
  - Pantau LED menampilkan "Uji Tim Sipil · belum pernah login" dan "Tim Prodi Demo · login 31 Okt 2026", dan prodi
    tanpa akun bertanda "Belum ada akun Tim Prodi";
  - Kelola akun `?prodi=` hanya menampilkan satu akun Sipil, dan Tambah akun `?prodi=` sudah memilih Sarjana Teknik
    Sipil.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 157/157 lulus |
| `npm run test:integrasi` | 94/94 lulus |


### L4: tombol "Mulai LED periode berikutnya"

- `syaratPeriodeBerikutnya` (`led/domain/periode.ts`): tombol tampil di Menu LED bila hasil akreditasi LED aktif sudah
  dicatat (menunggu atau berlaku), LED aktif Layak diajukan, sudah diekspor final, atau akreditasi berakhir ≤ 18 bulan
  lagi (`ambangPengingat` L2). Selain itu tombol tetap ada di Pengaturan LED dengan peringatan "LED aktif belum
  selesai …".
- `led/data/periode.ts`:
  - `infoPeriodeBerikutnya` (Tim Prodi): LED aktif, syarat, dan instrumen aktif jenjang;
  - `mulaiLedPeriodeBerikutnya`: instrumen dicek sebelum apa pun berubah. Dalam satu transaksi: periksa penyusunan
    berjalan, arsipkan LED lama, buat LED baru. Bila ditolak, LED lama tetap aktif dan LED baru tidak ada. Prodi
    diambil dari akun, jadi tidak ada cara menyentuh LED prodi lain. Dicatat `mulai_periode_berikutnya`.
- `buatProyek` dipecah menjadi `instrumenWajibAktif` dan `dataLedBaru`, dipakai kedua jalur supaya isi LED baru
  (nama otomatis, anggaran, batas pengajuan) sama.
- Antarmuka:
  - Menu LED menampilkan kartu **Mulai LED periode berikutnya** (alasan syarat dan instrumen yang dipakai). Isinya
    sama dengan kartu Mulai LED (tahun pengajuan dan TS, nama otomatis) ditambah dialog konfirmasi: "{LED lama} akan
    diarsipkan (tetap bisa dibuka dan diekspor). LED baru memakai instrumen {versi aktif}."
  - Pengaturan LED (Beranda LED) punya bagian "LED periode berikutnya" yang membuka kartu itu
    (`/led?periode=berikutnya`) dengan peringatan bila syarat belum terpenuhi.
  - Pilihan bahan yang disalin ditambahkan di L5.
- Uji:
  - domain `periode.test.ts`;
  - integrasi `periode-berikutnya.test.ts`: syarat menurut tanggal; Admin ditolak; penyusunan berjalan ditolak dan LED
    lama tetap aktif; instrumen belum aktif ditolak; berhasil mengarsipkan yang lama dan membuat yang baru (tahun, TS,
    satu LED aktif); LED prodi lain tidak tersentuh.
- Uji browser:
  - akun uji Tim Prodi Sipil baru dibuat untuk alur L4–L6, dengan sandi acak yang tidak ditulis di chat. Login
    sekaligus menguji tombol mata di halaman login;
  - Menu LED menampilkan kartu "Mulai LED periode berikutnya" karena LED uji Sipil sudah Layak diajukan;
  - dialog konfirmasi berisi teks yang sesuai lalu dibatalkan. Penekanan sebenarnya diuji di alur L6.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 158/158 lulus |
| `npm run test:integrasi` | 95/95 lulus |


### L5: salin bahan dari LED lama

- `ProyekLED.asalProyekId`, `pakaiNarasiLalu` (bawaan false), dan `bahanBelumDipindah` (migrasi
  `20261102150000_salin_bahan_periode`).
- Kartu Mulai LED periode berikutnya mendapat kotak centang (`pilihan-bahan.tsx`). Semua tercentang kecuali dokumen
  lebih tua dari 5 tahun dan narasi lama sebagai sumber P:
  - **Tim penyusun**: disalin ke LED baru dengan tanda `periksaUlang`. Halaman Tim penyusun menampilkan "Periksa ulang
    tim penyusun"; tandanya hilang begitu tim disimpan, karena skema tim membuang kunci lain;
  - **Bahan dari prodi**: `petakanBahan` (domain) menyalin per kode yang sama. Bila instrumen berganti, dicocokkan
    lewat judul sub-bagian (`kunciTeks`, hanya bila judul itu unik). Teks diberi awalan "[dari LED {tahun}]". Yang
    tidak cocok disimpan di `bahanBelumDipindah` dan tampil di Beranda LED sebagai "Bahan lama yang belum dipindah";
  - **Dokumen prodi**: dipilih satu per satu (`dokumenDicentangBawaan`: tahun terbit lebih dari 5 tahun sebelum tahun
    pengajuan baru tidak dicentang). Berkas disalin sebelum transaksi (bukan dipindah); baris Dokumen dibuat di dalam
    transaksi dengan status "diunggah", lalu diproses ulang lewat antrean `proses-dokumen`. Dokumen diharapkan
    dibawa hanya bila versi instrumennya sama. Bila transaksi gagal, salinan berkas dihapus lagi;
  - **Narasi lama tidak disalin.** Di tab Bahan halaman sub-bagian ada panel lipat **Narasi LED periode lalu**
    (`narasiPeriodeLalu`: kode sama atau judul sama; LED asal, atau LED arsip terbaru prodi), hanya baca;
  - opsi **sumber P** (bawaan mati): untuk sub-bagian `-AF` (analisis faktor/evaluasi capaian) dan `-SWOT` (strategi
    perbaikan), narasi lama (disamarkan, maks. 6.000 karakter) masuk prompt sebagai blok "NARASI LED PERIODE LALU [P]
    (periode lalu: gunakan untuk membandingkan, bukan disalin)". P menjadi kode sumber sah dengan legenda "Narasi LED
    periode lalu (…)";
  - **Data LKPS tidak disalin.**
- Uji:
  - domain `periode.test.ts` (tambahan): pemetaan bahan per kode dan per judul, bahan kosong diabaikan, dokumen > 5
    tahun, AF/SWOT, narasi lama per judul, blok P di prompt dan kode sumber;
  - integrasi `periode-berikutnya.test.ts` (tambahan): pilihan bawaan, tim bertanda periksa ulang, bahan berawalan,
    bahan tanpa padanan, dokumen terpilih disalin (berkas beda lokasi, isi sama, status diunggah) dan dokumen lama tetap
    ada, narasi dan LKPS tidak disalin, panel narasi lalu, sumber P hanya AF dan hanya bila diaktifkan, kegagalan di
    tengah tidak menambah dokumen dan tidak mengarsipkan.
- Uji browser: kartu periode berikutnya di LED uji Sipil menampilkan Tim penyusun (1 orang), Bahan dari prodi (1
  sub-bagian), 1 dokumen tercentang, dan sumber P tidak tercentang. Penyalinan sebenarnya diuji di alur L6.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 160/160 lulus |
| `npm run test:integrasi` | 96/96 lulus |


### L6: uji dan dokumen

- Perbaikan yang ditemukan saat uji alur:
  - L1 mengarsipkan LED yang diajukan begitu hasilnya berlaku. Akibatnya Tim Prodi tidak lagi punya LED aktif, dan
    yang muncul kartu Mulai LED biasa tanpa salinan bahan, padahal alur rencana adalah "Admin mencatat hasil → Tim
    Prodi menekan Mulai LED periode berikutnya".
  - Perbaikannya, `ledSumber` (`led/data/periode.ts`): bila tidak ada LED aktif, LED arsip terbaru yang hasil
    akreditasinya berlaku (dan belum diikuti LED lain) menjadi sumber. Kartu Mulai LED periode berikutnya tampil
    menggantikan kartu Mulai LED, dengan konfirmasi "Bahan yang dipilih disalin dari {LED} (sudah diarsipkan)", dan
    tidak ada yang diarsipkan lagi. Tetap satu LED aktif per prodi.
  - Teks syarat menjadi "Hasil akreditasi LED terakhir sudah dicatat."
  - Skrip `npm run pengingat` mendapat opsi `--tanggal` (hari simulasi) dan `--prodi`, supaya uji tidak mengirim
    pengingat untuk prodi lain.
- Uji yang diminta rencana dan letaknya:

| Uji | Letak | Hasil |
| --- | --- | --- |
| Ambang pengingat 18/12/6 bulan, `perluLedBaru` | domain `bersama/domain/__tests__/akreditasi.test.ts` | Lulus |
| Pencocokan bahan lintas versi instrumen | domain `led/domain/__tests__/periode.test.ts` | Lulus |
| Pola baca SK (teks SK fiktif) | domain `akreditasi.test.ts`, integrasi PDF fiktif di `akreditasi.test.ts` | Lulus |
| Catat hasil: Admin langsung berlaku, Tim Prodi menunggu konfirmasi | integrasi `akreditasi.test.ts` | Lulus |
| Riwayat menurunkan tanggal, peringkat, dan nomor SK prodi | integrasi `akreditasi.test.ts` | Lulus |
| Pengingat terkirim sekali per ambang | integrasi `pengingat-akreditasi.test.ts` | Lulus |
| Mulai LED periode berikutnya mengarsipkan yang lama dan menyalin bahan yang dipilih | integrasi `periode-berikutnya.test.ts` (L4, L5, dan L6 dari LED yang sudah diarsipkan) | Lulus |
| Kegagalan di tengah tidak mengarsipkan LED lama | integrasi `akreditasi.test.ts`, `periode-berikutnya.test.ts` | Lulus |
| Tim Prodi prodi lain tidak bisa melakukan semua ini | integrasi `akreditasi.test.ts` (catat, status), `periode-berikutnya.test.ts` (riwayat, SK, konfirmasi, info periode, LED prodi lain tidak tersentuh), `pengingat-akreditasi.test.ts` (Ingatkan) | Lulus |

- Uji browser. Dua akun uji baru dibuat untuk alur ini, `uji.l.admin@demo.test` (Admin UPPS) dan `uji.l.tim@demo.test`
  (Tim Prodi Teknik Sipil), dengan sandi acak yang tidak ditulis di chat. Server pengembangan dan worker berjalan dengan
  `LLM_NARASI=uji` dan `EMBEDDING_PENYEDIA=uji`.

| Langkah | Hasil |
| --- | --- |
| Admin: Pantau LED → Catat hasil akreditasi pada LED uji Sipil (Layak diajukan); PDF SK fiktif → Isi dari PDF SK | 5 isian terisi bertanda "dari SK" (Terakreditasi Unggul, 0789/SK/…, 30 Okt 2026, 1 Nov 2026 – 31 Okt 2031) |
| Simpan | "Hasil akreditasi dicatat. Data prodi diperbarui."; Riwayat akreditasi bertambah (dengan PDF SK dan tautan LED); tanggal prodi menjadi 31 Okt 2031; LED lama berlabel "Diajukan 2026 · Terakreditasi Unggul" |
| Pekerjaan harian dijalankan manual: `npm run pengingat -- --tanggal 2030-06-01 --prodi <Sipil>`, lalu sekali lagi untuk hari berikutnya | 1 prodi diingatkan, lalu 0. Lonceng: dua akun Tim Prodi Sipil (tautan `/led`) dan akun Admin (tautan `/led/pantau`, ditambah "Periksa akun Tim Prodi." karena pada tanggal simulasi akun tidak login > 12 bulan) |
| Tim Prodi: lonceng "Pemberitahuan, 2 belum dibaca" berisi "Akreditasi Sarjana Teknik Sipil berakhir 31 Okt 2031 (16 bulan lagi). Mulai LED periode berikutnya." | Berhasil |
| Tim Prodi: LED prodi → kartu Mulai LED periode berikutnya (tim, bahan, dan dokumen tercentang; sumber P tidak) → konfirmasi "Bahan yang dipilih disalin dari LED Teknik Sipil TS 2025/2026 (sudah diarsipkan)…" → Mulai LED baru | LED baru "LED Teknik Sipil 2031 (TS 2029/2030)" terbuka |
| Isi LED baru | Tim penyusun bertanda periksa ulang (halaman Tim penyusun menampilkan peringatannya); bahan C.1-IKU-a "[dari LED 2026] …"; dokumen renstra-sipil.docx disalin dan diproses ulang worker (status siap); panel Narasi LED periode lalu di C.1-IKU-a menampilkan narasi LED lama |

- Dokumen:
  - `CLAUDE.md`: keputusan butir 2 (LED per periode) dan bagian "Struktur kode (LED periode berikutnya, 2 Nov 2026)";
  - `docs/PANDUAN-PENGGUNAAN.md`: Admin UPPS (Catat hasil akreditasi, konfirmasi, koreksi beralasan, pengingat, akun
    sebelum periode baru) dan Tim Prodi (Identitas prodi, LED periode berikutnya, Catat hasil akreditasi);
  - `docs/SPESIFIKASI.md`: tabel menu Program studi, Pantau LED, LED prodi, dan Beranda LED.
- Akibat di basis data pengembangan:
  - LED uji Sipil kini diarsipkan berlabel, dan ada LED baru "LED Teknik Sipil 2031 (TS 2029/2030)";
  - riwayat akreditasi Sipil berisi SK fiktif (berlaku s.d. 31 Okt 2031);
  - pemberitahuan pengingat terkirim ke akun Admin pengembangan dan PengingatTerkirim (Sipil, ambang 18) tercatat;
  - dua akun uji baru.
  - Akun uji tambahan sebelumnya (`uji.instrumen@demo.test`) sudah dihapus, begitu juga folder `public/_uji/`.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 160/160 lulus |
| `npm run test:integrasi` | 97/97 lulus |
| `npm run build` | Lulus (27 halaman statis) |


## Desain form 2 (2 Nov 2026)

Tugas dari dosen:
1. Gabungkan web app LED dan LKPS dari lembaga akreditasi yang sejenis (LAM Teknik) dalam satu web app, tanpa
   pengaturan yang berulang.
2. Buat Dashboard Fakultas/UPPS untuk memantau kesiapan akreditasi seluruh prodi (contoh gambar: daftar prodi,
   lembaga, peringkat, masa berlaku dan hitung mundur, kelengkapan LKPS dan LED, simulasi asesor, status GPM yang
   diganti LPMPP).

Keputusan Adrianne:
- Status LPMPP = peran Asesor (reviewer internal) yang diberi label LPMPP; tetap tiga peran.
- LKPS tetap diunggah sebagai berkas di LED, karena modul LKPS Ghalib belum selesai. Detail penggabungan diserahkan,
  dan rencana D1/D2 disetujui.
- Kolom Lembaga dari riwayat akreditasi; instrumen tetap LAM Teknik saja.
- Gaya mengikuti aplikasi sekarang.

Dikerjakan D1 lalu D2, satu commit per butir.

### D1: LED dan LKPS satu aplikasi, menu terpadu per peran

- Halaman "Pilih modul" dan tombol pindah modul LKPS | LED dihapus (`pindah-modul.tsx`). Ini mengganti keputusan 31
  Okt 2026 (halaman awal pilih modul).
  - `/` langsung mengalihkan ke beranda peran: Admin UPPS ke Dashboard akreditasi, Tim Prodi ke LED prodi, reviewer
    LPMPP ke LED ditugaskan. Akun Tim Prodi tanpa prodi mendapat pesan, supaya tidak berputar-putar.
  - Nama di sidebar selalu "Akreditasi LAM Teknik", dan kepala halaman bertuliskan "LED dan LKPS LAM Teknik". Lonceng
    tampil untuk semua peran, karena Admin juga menerima pengingat akreditasi (L2).
- Menu per peran (`components/shell/menu-peran.ts`):
  - Admin UPPS:
    - **Pemantauan**: Dashboard akreditasi, Penugasan reviewer LPMPP;
    - **Penyusunan LED & LKPS**: Instrumen, Basis Pengetahuan fakultas;
    - **Pengaturan UPPS**: Program studi, Kelola akun, Kunci API dan model AI.
  - Tim Prodi, **Prodi saya**: LED prodi, **Data LKPS**, Identitas prodi;
  - reviewer LPMPP, **Review LPMPP**: LED ditugaskan.
  - Modul LED dan modul LKPS memakai menu yang sama (`menuLuarModul`).
- Tidak ada pengaturan berulang:
  - akun, prodi dan identitas fakultas, kunci API dan model, serta instrumen hanya di menu Admin UPPS;
  - identitas prodi Tim Prodi satu halaman, dan data akreditasinya dari riwayat (L1);
  - LKPS diunggah sekali ke LED aktif prodi dan dipakai LED. Menu **Data LKPS** (`/lkps`) Tim Prodi langsung membuka Data
    LKPS LED aktif; tanpa LED aktif, ada pesan untuk memulai LED dulu supaya TS diketahui. Admin dan reviewer
    dialihkan ke berandanya. Saat modul LKPS Ghalib siap (`MODUL_LKPS.siap`), `/lkps` diganti berandanya, dan LED
    tetap membaca dari tempat yang sama.
- Label peran `ASESOR` menjadi **Reviewer LPMPP** (Kelola akun, Tambah akun, menu Penugasan reviewer LPMPP). Nilai
  enum tetap `ASESOR`. Teks "asesor" di dalam halaman review LED (± 200 tempat) belum diganti.
- `src/modules/README.md` diperbarui.
- Uji browser (server pengembangan Anda, akun uji Tim Prodi Sipil): `/` langsung ke LED prodi; sidebar "Akreditasi LAM
  Teknik · Sarjana Teknik Sipil" dengan Prodi saya (LED prodi, Data LKPS, Identitas prodi); kepala halaman tanpa tombol
  LKPS | LED; `/lkps` mengalihkan ke Data LKPS LED aktif.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 160/160 lulus |
| `npm run test:integrasi` | 97/97 lulus |


### D2: Dashboard akreditasi Fakultas/UPPS

- Halaman `/dashboard` (Admin UPPS) menggantikan Pantau LED; `/led/pantau` dialihkan ke sana.
  - Menu dan beranda Admin UPPS mengarah ke `/dashboard`, dan pengingat akreditasi untuk Admin bertautan ke sana.
  - Tombol Ingatkan Tim Prodi pindah ke `src/app/dashboard/`.
  - Gaya mengikuti aplikasi (mode terang dan gelap), bukan tema gelap contoh gambar.
- Bentuk mengikuti contoh gambar dosen, dengan GPM diganti LPMPP:
  - tab bertanda jumlah: **Semua Prodi**, **Prioritas Re-akreditasi**, **Sudah Unggul**, **Dalam Review LPMPP**;
  - kolom:
    - Program studi & jenjang (kode PDDikti, tanda Perlu LED baru dan status akun Tim Prodi);
    - Lembaga akreditasi (dari riwayat, misalnya BAN-PT untuk SK lama);
    - Peringkat;
    - Masa berlaku dan hitung mundur (Kritis/Perhatian/Aktif/Berakhir);
    - Kelengkapan LKPS dan Kelengkapan LED (batang persen);
    - Simulasi asesor (Σ bobot × skor dan proyeksi peringkat);
    - Status LPMPP dan nama reviewer;
    - Aksi (Detail, Lihat LED, Catat hasil, Ingatkan).
- Logika murni `led/domain/dashboard.ts`:
  - `masaBerlaku`: Kritis ≤ 6 bulan, Perhatian ≤ 18 bulan (sama dengan ambang pengingat L2), lewat = Berakhir;
    teksnya "82 hari lagi", "12 bulan lagi", atau "2,4 tahun";
  - `statusLpmpp`: dari `statusReview` reviewer, ekspor final, dan hasil akreditasi;
  - `persenLed`: selesai penuh, berdraf setengah;
  - `masukTab`, `jumlahPerTab`.
- Data `led/data/dashboard.ts` (`dataDashboard`, hanya Admin) memakai ulang fungsi yang ada: riwayat akreditasi (L1),
  `statusPeriodeProdi` (L2/L3), `kesiapanLed`, `penilaianProyek` (rekap gabungan), dan `syaratCatatHasil`.
- Dokumen: `CLAUDE.md` (keputusan butir 2 dan alur pengguna), `docs/PANDUAN-PENGGUNAAN.md` (pembuka, Admin UPPS,
  Dashboard, Tim Prodi, Reviewer LPMPP), `docs/SPESIFIKASI.md` (menu per peran dan tabel menu), dan README modul.
- Uji:
  - domain `dashboard.test.ts` (3 uji): masa berlaku dan teks hitung mundur, delapan status LPMPP, kelengkapan LED,
    tab dan jumlahnya;
  - integrasi `dashboard.test.ts`: lembaga dan peringkat dari riwayat (BAN-PT, "Terakreditasi Unggul"), Kritis "96
    hari lagi", Revisi dari LPMPP, Hasil akreditasi dicatat tanpa LED aktif, status akun, jumlah per tab, Tim Prodi
    ditolak;
  - `pengingat-akreditasi.test.ts` disesuaikan dengan tautan Admin yang baru (`/dashboard`).
- Uji browser (server pengembangan, akun uji Admin):
  - `/` langsung ke `/dashboard`, dengan sidebar Pemantauan / Penyusunan LED & LKPS / Pengaturan UPPS;
  - tab Semua Prodi (17), Prioritas Re-akreditasi (4), Sudah Unggul (5), Dalam Review LPMPP (1);
  - baris Sarjana Teknik Sipil: LAM Teknik, Terakreditasi Unggul, 31 Okt 2031, LED 0%, status Penyusunan, Detail dan
    Lihat LED;
  - prodi tanpa akun bertanda "Belum ada akun Tim Prodi".

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 163/163 lulus |
| `npm run test:integrasi` | 98/98 lulus |
| `npm run build` | Lulus (28 halaman statis) |


### D3: tombol LKPS | LED kembali, fitur bersama di grup "Bersama"

Permintaan Adrianne setelah D1: pengguna harus tetap bisa membedakan fitur LED dan fitur LKPS (termasuk modul LKPS Ghalib
nanti), jadi tombol pindah modul di kepala halaman dikembalikan. Fitur yang sama atau harus selaras ditampilkan
gabung.

- `pindah-modul.tsx` dikembalikan:
  - ikon kotak menuju beranda peran;
  - LKPS menyala di `/lkps` dan di Data LKPS yang sementara ada di LED (`/led/{id}/lkps`);
  - LED menyala di `/led/...`; halaman bersama tidak menyalakan modul ("Bersama: LED dan LKPS LAM Teknik").
- `menuPeran(peran, konteks)` menggantikan `menuLuarModul` (`components/shell/menu-peran.ts`):
  - grup **Bersama (LED & LKPS)**:
    - Admin: Dashboard akreditasi, Program studi, Instrumen LAM Teknik, Penugasan reviewer LPMPP, Kelola akun, Kunci
      API dan model AI. Instrumen dipindah ke Bersama karena Matriks Penilaian dan tabel LKPS acuan dipakai LED dan
      LKPS;
    - Tim Prodi: Identitas prodi;
  - grup **LED · Laporan Evaluasi Diri**: Admin Basis Pengetahuan fakultas, Tim Prodi LED prodi, reviewer LED
    ditugaskan;
  - grup **LKPS · Laporan Kinerja Prodi**: Admin Kelengkapan LKPS prodi, Tim Prodi dan reviewer Data LKPS;
  - `ShellLed`, asesor = Bersama + LED; `ShellLkps` = Bersama + LKPS; `ShellBersama` (Dashboard, Program studi, Kelola
    akun, Kunci API, Penugasan, Ganti sandi) = Bersama + LED + LKPS. Dashboard kini memakai `ShellBersama`.
- `/lkps` menjadi beranda modul LKPS sementara per peran:
  - Tim Prodi: ke Data LKPS LED aktif;
  - Admin: tabel **Kelengkapan LKPS prodi** (data yang sama dengan kolom di Dashboard);
  - reviewer: LED yang ditugaskan, menuju Penilaian.
- Integrasi modul Ghalib nanti: menunya (`MENU_LKPS` di `modules/lkps/komponen/shell-lkps.tsx`) dimasukkan ke grup LKPS
  di `menu-peran.ts`, dan `/lkps` diganti berandanya. Data LKPS di LED menjadi hanya baca dari modul LKPS lewat
  `modules/lkps/index.ts`.
- Dokumen: `CLAUDE.md`, `docs/PANDUAN-PENGGUNAAN.md` (pembuka, Admin, Tim Prodi), dan `docs/SPESIFIKASI.md` (menu per
  peran).
- Uji browser:
  - Admin di Dashboard: tombol LKPS | LED tanpa modul menyala, sidebar Bersama + LED + LKPS;
  - Admin di `/lkps`: LKPS menyala, sidebar Bersama + LKPS, tabel Kelengkapan LKPS 17 prodi;
  - Admin di Basis Pengetahuan fakultas: LED menyala, sidebar Bersama + LED;
  - Tim Prodi Sipil: di `/led` LED menyala (Bersama + LED); `/lkps` dialihkan ke Data LKPS LED aktif dan tombol LKPS
    menyala ("Laporan Kinerja Program Studi").

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 163/163 lulus |
| `npm run test:integrasi` | 98/98 lulus |

### D4: Admin, LED dan LKPS tidak tercampur; Pantau LED prodi

Permintaan Adrianne: di bagian Admin, LKPS hanya menampilkan fitur Bersama + LKPS dan LED hanya Bersama + LED; Admin juga
bisa memantau LED setiap prodi di modul LED, bukan hanya dari tabel dashboard.

- `menuPeran(peran, konteks)` kini hanya `"led" | "lkps"`: selalu Bersama + satu modul. Konteks "bersama" (ketiga
  grup sekaligus) dihapus.
- Halaman bersama (`ShellBersama`: Dashboard, Program studi, Instrumen, Penugasan, akun, Identitas prodi) memakai modul
  terakhir yang dibuka. `PindahModul` menulis cookie `modul_terakhir` (setahun, `samesite=lax`) setiap modul aktif;
  `ShellBersama` membacanya (`modulDariKuki`, bawaan LED) dan meneruskan `modul` ke `ShellAplikasi`, sehingga tombol
  LKPS | LED menyala sesuai sidebar dengan keterangan "Fitur bersama LED dan LKPS".
- Instrumen (`/led/instrumen`) dan Identitas prodi (`/led/identitas-prodi`) termasuk grup Bersama tetapi beralamat di
  bawah `/led`; keduanya kini memakai `ShellBersama`, jadi membukanya dari LKPS tidak memindahkan ke LED.
- **Pantau LED prodi** `/led/pantau` dihidupkan lagi (sebelumnya dialihkan ke `/dashboard`): kartu `KartuLed` per prodi
  (sama dengan beranda LED Tim Prodi) dari `dataDashboard` + `kesiapanSemua`, ditambah reviewer, status LPMPP, tombol
  Penilaian, Tugaskan reviewer, Catat hasil; prodi tanpa LED aktif di daftar terpisah. Klik kartu membuka
  `/led/asesor/[id]` (hanya baca).
- `berandaLed("ADMIN")` = `/led/pantau` (tombol LED); halaman awal `/` memakai `berandaPeran` (Admin tetap ke Dashboard).
- Uji unit baru `tests/unit/menu-peran.test.ts` (3): grup tidak tercampur, beranda, cookie.
- Uji browser (Admin uji.l.admin):
  - cookie LKPS → Dashboard: sidebar Bersama + LKPS, tombol LKPS menyala;
  - tombol LED → `/led/pantau`: Bersama + LED (Pantau LED prodi, Basis Pengetahuan), kartu Teknik Sipil dan Informatika;
  - Program studi setelah itu: tetap Bersama + LED;
  - klik kartu Teknik Sipil → LED hanya baca (Penilaian, Ringkasan, Narasi);
  - dari `/lkps` klik Instrumen: tetap Bersama + LKPS.
- Batasan: cookie ditulis setelah halaman modul selesai dimuat (hidrasi); bila belum, halaman bersama memakai LED.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Lulus |
| `npm run test:unit` | 166/166 lulus |
| `npm run test:integrasi` | 98/98 lulus |

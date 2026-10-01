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

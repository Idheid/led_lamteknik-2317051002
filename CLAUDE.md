# CLAUDE.md — Sistem Penyusun LED LAM Teknik

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

Metode pengembangan: **prototyping**. Kerjakan per iterasi (lihat `docs/RENCANA-ITERASI.md`). Jangan melompat ke
iterasi berikutnya sebelum kriteria selesai iterasi berjalan terpenuhi. Keputusan Adrianne (2 Okt 2026): iterasi 3 dan 4
tidak menunggu demo/umpan balik pembimbing per iterasi; review bersama pembimbing dan pemangku kepentingan dilakukan
setelah website jadi.

Dokumen rencana lengkap (Claude Doc): https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

## Keputusan yang sudah dikunci (jangan diubah tanpa persetujuan Adrianne)

1. Lembaga: **LAM Teknik saja**. Instrumen acuan: LAM Teknik 2025, skema Pasca Terakreditasi Pertama dan Unggul
   (Peraturan LAM Teknik No. 5 dan 6 Tahun 2025), 7 kriteria C.1–C.7. Instrumen disimpan sebagai **versi** yang bisa
   disalin dan disunting (kriteria, sub-bagian, butir, bobot bisa berubah per tahun/peraturan).
2. **Dua peran**, semua lewat login:
   - **Super admin** (tim pengembang, lalu diserahterimakan ke fakultas): versi instrumen, UPPS dan prodi, akun
     penanggung jawab dan akun super admin lain, model LLM, kunci API cadangan, log pemakaian dan aktivitas.
   - **Penanggung jawab prodi** (satu akun **aktif** per prodi): proyek LED prodinya, tahun TS, unggah LKPS dan
     dokumen, generate dan sunting semua bagian, tandai kriteria selesai, tambah kunci API prodi, unduh Word.
   - Tidak ada peran peninjau dan tidak ada pembagian kriteria ke anggota.
   - Aturan akun: semua pengguna bisa mengganti kata sandi sendiri (wajib kata sandi lama); akun baru dan akun yang
     sandinya diatur ulang wajib mengganti sandi saat login. Hanya super admin yang mengatur ulang sandi,
     menonaktifkan, dan menghapus akun; super admin tidak bisa menonaktifkan/menghapus diri sendiri dan minimal ada
     satu super admin aktif. Proyek, kunci API, dan riwayat versi terikat ke **prodi**, bukan ke akun. Pergantian PJ:
     nonaktifkan akun lama, buat akun baru.
3. **Form per kriteria**: satu halaman per kriteria berisi butir-butirnya (instruksi, pertanyaan pemandu, unggah
   dokumen, daftar cek unsur skor 4, editor hasil). Jumlah halaman form mengikuti jumlah kriteria di versi instrumen.
4. **Generate per kriteria** (tombol di atas halaman kriteria) dan **ulang per butir/sub-bagian**. Satu panggilan LLM =
   satu sub-bagian. Hasil bisa disunting; **setiap generate/suntingan disimpan sebagai versi** dan bisa dibandingkan/dipulihkan.
5. Bagian di luar kriteria (kata pengantar, ringkasan eksekutif, Bab I, II.A, II.B, Bab III, Bab IV) **ikut di-generate**
   mengikuti instruksi template. Halaman muka, identitas, dan tabel tim diisi dari data.
6. **Maksimal 150 halaman termasuk cover dan kata pengantar** (arahan pembimbing, lebih ketat dari template).
   Panjang narasi per butir mengikuti bobot; butir berjenis angka ditulis singkat. Lihat `src/lib/domain/anggaran.ts`.
7. **TS** = tahun akademik penuh terakhir saat pengajuan (Okt 2026 -> TS 2025/2026). Disimpan per proyek sebagai
   tahun mulai; label TS di LKPS diganti tahun nyata di narasi. Lihat `src/lib/domain/tahun-akademik.ts`.
8. **Kunci API**: penanggung jawab mengisi satu kunci; saat kuota habis generate berhenti rapi di butir terakhir,
   sistem meminta kunci baru, lalu lanjut dari butir itu. Super admin juga bisa mengisi kunci cadangan
   (dipakai setelah kunci penanggung jawab habis; pengaturan `pakaiCadanganAdmin`, keputusan final menunggu konfirmasi).
   Kuota Gemini dihitung **per project Google**, bukan per kunci; reset tengah malam waktu Pasifik (14.00–15.00 WIB);
   galat 429 RESOURCE_EXHAUSTED. Lihat `src/lib/domain/kunci-api.ts`.
9. **Ekspor**: mengisi template LEDPS resmi (bukan dokumen baru). Huruf bawaan template (**Arial 11**, gaya Normal),
   spasi 1,15, paragraf rata kiri-kanan, judul memakai gaya template, gambar persis seperti diunggah, tebal hanya
   untuk judul. Narasi **menggantikan** isi template di bawah setiap judul sub-bagian: instruksi "Bagian ini ...",
   catatan biru "(Penjelasan ... disampaikan ...)", dan kotak isian kosong dihapus; judul bernomor template tetap.
   Spesifikasi lengkap di `docs/SPESIFIKASI.md`, contoh kerja di `docs/spike-ekspor/`.
10. **Tampilan**: sidebar (bisa diciutkan), modern, nyaman, mudah dipakai, berbahasa Indonesia. Menu per peran di
    `docs/SPESIFIKASI.md`.
11. **Data LKPS** masuk lewat unggah Excel (utama, template LKPS LAM Teknik 2025) atau PDF (cadangan, angka ditandai
    perlu dicek). Bukan tarik langsung dari One Data.
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
| Pemasangan | Docker Compose (PostgreSQL+pgvector sekarang; aplikasi+worker nanti) | Server fakultas harus bisa Node.js/Docker |

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
src/lib/domain/                <- logika murni yang SUDAH DIUJI (22 uji awal; 31 setelah iterasi 1)
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
   impor uji. Jalankan `node --test "src/lib/domain/__tests__/*.test.ts"` dan pastikan 22 uji tetap lulus.
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
- `npm run lint`, `npm run typecheck` (`next typegen` + `tsc`), `npm test` (= `test:unit` + `test:integrasi`)
- `npm run test:integrasi` membuat/memigrasi basis data `led_lamteknik_test` sendiri; basis data pengembangan tidak disentuh
- Migrasi baru: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
  (`migrate dev` menolak berjalan non-interaktif), simpan ke `prisma/migrations/<waktu>_<nama>/migration.sql`,
  **hapus baris `DROP INDEX "Potongan_embedding_hnsw_idx"`** (Prisma tidak mengenal indeks HNSW), lalu `npm run db:migrate`

## Struktur kode (setelah iterasi 1)

- `src/lib/domain/` logika murni teruji; `src/lib/data/` akses data, setiap fungsi menerima `Pengguna` dan memeriksa
  peran/`prodiId`; `src/lib/akses.ts` (`Pengguna`, `GalatAkses`, `GalatPengguna`); `src/lib/validasi.ts` skema Zod bersama.
- `src/lib/auth.ts` Better Auth (plugin admin; peran di kolom `role`, nonaktif = `banned`), `src/lib/sesi.ts`
  (`ambilPengguna`, `wajibSuperAdmin`, `wajibPenanggungJawab`), `src/proxy.ts` (pengganti middleware di Next.js 16).
- Aksi server di `src/app/**/aksi.ts` dibungkus `jalankanAksi` (`src/lib/aksi.ts`).
- Rute: `/login`, `/admin/*` (super admin), `/proyek` dan `/proyek/[proyekId]/*` (penanggung jawab;
  halaman form bagian/kriteria di `/proyek/[id]/bagian/[kode]`).
- Versi instrumen yang dipakai proyek dikunci (tidak bisa diubah/dihapus); perubahan lewat salin versi.

## Struktur kode (setelah iterasi 2)

- `src/lib/lkps/`: pembaca LKPS Excel (`baca-xlsx.ts`, pembaca aliran ExcelJS), PDF (`baca-pdf.ts`, posisi teks),
  struktur template (`struktur.ts`, `kolom-template.json`), validasi isi (`periksa.ts`). Tabel disimpan dengan kunci
  huruf kolom template (A, B, C, ...).
- `src/lib/domain/metrik-lkps.ts`: rumus metrik butir angka Sarjana (Matriks Penilaian 2025) + skor perkiraan;
  hitungan manual pembanding di `docs/uji/hitungan-manual-lkps.md`. `potong-teks.ts` (800–1.200 karakter, 15%),
  `rrf.ts` (reciprocal rank fusion).
- `src/lib/proses/` (dipanggil worker): `lkps.ts`, `dokumen.ts` (unpdf/mammoth → potong → embedding → Potongan).
- `src/lib/data/`: `lkps.ts`, `dokumen.ts`, `pencarian.ts` (vektor pgvector + tsvector, RRF), `kunci-api.ts`
  (AES-256-GCM, pemilihan kunci), `pengaturan.ts` (model; ganti model embedding → proses ulang semua dokumen).
- Unggahan lewat Route Handler `src/app/api/proyek/[proyekId]/{lkps,dokumen}`; berkas asli di `UPLOAD_DIR`,
  disajikan `src/app/api/dokumen/[dokumenId]/berkas`. Rute `/api/*` tidak lewat `proxy.ts` (proxy memotong body > 10 MB).
- Fikstur uji: `tests/fikstur/lkps-contoh-s1.{xlsx,pdf}` dari data fiktif `tests/fikstur/data-lkps-contoh.ts`
  (`npx tsx scripts/buat-fikstur-lkps.ts`, lalu `scripts/buat-fikstur-lkps-pdf.ts`). Peta kolom PDF:
  `npx tsx scripts/buat-kolom-template.ts` bila template LKPS berganti.
- Uji: `tests/unit/` (tanpa DB), `tests/integrasi/` (DB uji, antrean mati, embedding uji `EMBEDDING_PENYEDIA=uji`).

## Struktur kode (setelah iterasi 3)

- `src/lib/domain/narasi.ts`: penyamaran data pribadi untuk prompt, tabel LKPS ke Markdown, keluaran LLM ke dokumen
  Tiptap (paragraf membawa atribut `sumber`), pemeriksaan (panjang, angka, sumber, penanda belum ada bukti), urutan
  generate (IKU → LB/KEB → AF → SWOT), ringkasan IKU, diff kata, status gabungan. `model-llm.ts`: daftar models.list.
- `src/lib/proses/generate.ts` (worker): susun konteks satu sub-bagian, panggil LLM, simpan `VersiDraf`; tugas
  `TugasGenerate` diproses dari `indeks` dan berhenti rapi (status `tertunda`) bila kunci habis.
  `src/lib/proses/llm-narasi.ts`: rotasi kunci + urutan model cadangan, log `LogPemakaian` per panggilan.
- `src/lib/data/generate.ts`: mulai/batal/lanjut, draf per bagian, simpan suntingan (versi suntingan diperbarui dalam
  30 menit), pulihkan, bandingkan, tandai selesai. `tugas-generate.ts`: antre ulang tugas tertunda saat kunci baru ditambah.
  `pengaturan.ts`: muat daftar model Google, uji model. `pemakaian.ts`: log untuk super admin.
- UI: `src/components/narasi/` (editor Tiptap, banner antrean di layout proyek, tombol generate),
  `src/app/proyek/[proyekId]/bagian/[kode]/panel-draf.tsx` (tab Hasil generate / Riwayat versi).
  Status antrean: `GET /api/proyek/[proyekId]/generate`.
- Kunci API per prodi: `/proyek/kunci-api` (juga dari daftar proyek), komponen bersama `src/components/kunci-api/`.
- Akun: `src/app/akun/ganti-sandi`; `wajibGantiSandi` memaksa ganti sandi (`wajibLogin`, `jalankanAksi`, `jalankanRute`).
- Uji LLM memakai `aturModelUji` (`src/lib/llm/narasi.ts`) dengan `MockLanguageModelV4`; `GENERATE_JEDA_MAKS_MS=0`
  memendekkan jeda batas per menit di uji.

## Struktur kode (setelah iterasi 4)

- `src/lib/ekspor/`: `xml.ts` (pecah body, teks tanpa kotak, `gantiTeks` lintas run), `template.ts` (placeholder per
  sub-bagian, hapus yang tidak berlaku, Daftar Tabel/Gambar, `updateFields`), `isi-data.ts` (halaman muka, identitas,
  tim, Tabel 2.1/2.2), `word.ts` (Tiptap → docx; tabel/gambar bernomor per bab dengan field TC), `halaman.ts` (LibreOffice).
- `src/lib/domain/ekspor.ts`: nomor bab, ukuran/skala gambar, judul tabel/gambar, pemeriksaan sebelum ekspor, perkiraan halaman.
- `src/lib/proses/ekspor.ts` (worker, antrean `ekspor-word`), `src/lib/data/ekspor.ts` (tim penyusun, periksa/mulai/unduh
  ekspor, unggah template per versi). Halaman `/proyek/[id]/tim`, `/proyek/[id]/ekspor`; unduh `/api/ekspor/[id]/berkas`;
  unggah template `/api/admin/versi/[versiId]/template`. Cek pemetaan template: `npx tsx scripts/cek-template-led.ts S1`.

## Konvensi

- Teks antarmuka, pesan galat, dan nama domain dalam **Bahasa Indonesia** (kode boleh campuran; ikuti istilah domain:
  `butir`, `subBagian`, `kriteria`, `proyek`, `penanggungJawab`). Nama variabel konsisten dengan seed dan skema.
- TypeScript strict, tanpa `any`. Validasi semua masukan dengan Zod di server.
- Logika domain murni ditaruh di `src/lib/domain/` dan diberi uji. Akses data di `src/lib/data/` atau server actions,
  bukan di komponen.
- Setiap aksi server memeriksa sesi dan peran; penanggung jawab hanya boleh mengakses data prodinya sendiri
  (filter `prodiId` di setiap kueri).
- Kunci API dienkripsi (AES-256-GCM, kunci dari `ENCRYPTION_KEY`), hanya didekripsi di server/worker, tidak pernah
  dikirim ke browser atau ditulis ke log. Tampilkan hanya 4 karakter terakhir.
- Angka di narasi dihitung sistem dari LKPS, bukan oleh LLM. Format Indonesia lewat `src/lib/domain/teks.ts`.
- Proses lama (generate, baca dokumen, ekspor) lewat pg-boss; antarmuka menampilkan status dan notifikasi, bukan menunggu.
- Commit kecil dan sering dengan pesan jelas (Bahasa Indonesia boleh). Jangan commit `.env`, `uploads/`, `node_modules/`.
- Setelah tiap iterasi: perbarui `docs/CATATAN-PENGEMBANGAN.md` (apa yang dibuat, keputusan teknis, versi pustaka)
  — catatan ini menjadi bahan Bab 3 skripsi.

## Jangan

- Jangan membuat fitur unggah ke LAM Teknik, peran peninjau, atau pembagian kriteria ke anggota.
- Jangan mengubah logo/perwajahan halaman awal template LEDPS.
- Jangan mengirim data pribadi (NIP, NIDN, NIM, nama mahasiswa) ke LLM bila memakai kunci gratis tanpa penyamaran
  (layanan gratis Gemini boleh memakai data untuk pengembangan produk). Lihat `docs/SPESIFIKASI.md`.
- Jangan menanam batas kuota Gemini di kode; kuota berubah-ubah.
- Jangan menghapus atau melemahkan uji di `src/lib/domain/__tests__/` agar lulus; perbaiki kodenya.

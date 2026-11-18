# Peta penggabungan modul LKPS (Ghalib) ke led-lamteknik

Gabung LKPS G0 (18 November 2026), **versi akhir G8** (status akhir di bagian 7). Sumber: `Achmadghalib725/LKPS_LAM-TEKNIK@c718eff` (Achmad Ghalib), di-clone ke
`../lkps-ghalib-c718eff` (di luar repo, tidak dijalankan, tidak di-commit). Rencana: `docs/RENCANA-GABUNG-LKPS.md`.

Inventaris: 101 berkas di luar `src/generated/` (± 15.500 baris tanpa `package-lock.json`); belum ada uji otomatis.

## 1. Berkas

### Dipindah

| Asal (repo Ghalib) | Tujuan (led-lamteknik) | Tahap |
|---|---|---|
| `prisma/schema.prisma` (model tabel LKPS dan konfigurasi) | `prisma/schema/lkps.prisma` (model `Lkps*`) | G3 |
| `src/lib/templates/kriteria-1…9-*.ts`, `index.ts`, `types.ts` | `src/modules/lkps/domain/templat/` | G3 |
| `src/lib/lkpsTemplates.ts` (ekspor ulang templat) | digabung ke `src/modules/lkps/domain/templat/index.ts` | G3 |
| `src/lib/computation-engine.ts` | `src/modules/lkps/domain/hitung.ts` (rumus tidak diubah) | G4 |
| `src/lib/permissions.ts` | `src/modules/lkps/domain/akses.ts` (peran LED) | G4 |
| `src/lib/active-prodi.ts` | `src/modules/lkps/data/prodi-aktif.ts` (tanpa jatuh ke prodi pertama) | G4 |
| `src/app/api/{kerjasama,mahasiswa,sdm,keuangan,pendidikan,penelitian,pkm,luaran,penjaminan}/route.ts` | logika ke `src/modules/lkps/data/<modul>.ts`, rute tipis `src/app/api/lkps/<modul>/route.ts` | G4 |
| `src/app/api/{identitas,kriteria/[id],konfigurasi,computation}/route.ts` | `src/modules/lkps/data/…` + `src/app/api/lkps/<nama sama>/route.ts` | G4 |
| `src/app/api/ingestion/route.ts` | `src/modules/lkps/data/impor.ts` + `/api/lkps/impor` (`exceljs`) | G4 |
| `src/app/api/export/route.ts` | `src/modules/lkps/data/ekspor.ts` + `/api/lkps/ekspor` (`exceljs`, template dari `LKPS_TEMPLAT_EKSPOR`) | G4 |
| `src/app/api/upload/route.ts` | `src/modules/lkps/data/bukti.ts` + `/api/lkps/bukti` (penyimpanan LED) | G4 |
| `src/app/api/onedata/sync/route.ts`, `src/lib/myunila-client.ts`, `src/lib/onedata-parser.ts` | `src/modules/lkps/data/onedata/` + `/api/lkps/onedata/sinkron` (mati, konfigurasi hanya dari `.env`, **tanpa nilai bawaan kredensial**) | G6 |
| `src/app/(dashboard)/dashboard/page.tsx` | `src/modules/lkps/komponen/beranda/` + `src/app/lkps/page.tsx` | G5 |
| `src/app/(dashboard)/{kerjasama,mahasiswa,sdm,keuangan,pendidikan,penelitian,pkm,luaran,penjaminan}/page.tsx` | `src/modules/lkps/komponen/<modul>/` + `src/app/lkps/<modul>/page.tsx` | G5 |
| `src/app/(dashboard)/{kriteria/[id],identitas,import,export,konfigurasi}/page.tsx` | `src/modules/lkps/komponen/…` + `src/app/lkps/{kriteria/[id],identitas,impor,ekspor,konfigurasi}/page.tsx` | G5 |
| `src/components/layout/header.tsx` (dropdown prodi, c718eff) | dasar komponen baru pemilih prodi `src/modules/lkps/komponen/pemilih-prodi.tsx` (cookie `lkps_prodi`) | G5 |
| `src/components/common/icon-badge.tsx` | `src/modules/lkps/komponen/` bila masih dipakai halaman (dihapus di G7) | G5 |
| `src/app/globals.css` (kelas `.card`, `.btn`, `.form-input`, …) | `src/modules/lkps/komponen/gaya-lkps.css`, dibungkus `.lkps-klasik`, variabel `--lkps-*`, tanpa `@import` font/Tailwind | G5 |

### Dibuang

| Asal | Alasan |
|---|---|
| `.git`, `node_modules`, `src/generated/`, `package-lock.json` | dibangkitkan/dipasang ulang di repo LED |
| `.env*` | rahasia; konfigurasi LED sendiri |
| `cookies_admin.txt` | cookie sesi admin; rahasia, **tidak disalin** |
| `prisma/seed.ts`, `scripts/seed-ft-users.ts`, `scripts/seed-pasca-users.ts` | akun dan data contoh tidak dipindah (keputusan 4); akun memakai akun LED |
| `scripts/clear-all-criteria-data.ts` | menghapus data semua kriteria tanpa batas prodi |
| `public/*.svg`, `src/app/favicon.ico`, `src/app/page.module.css`, `src/app/page.tsx` | aset templat Next.js |
| `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/proxy.ts` | kerangka, login, dan proxy memakai milik LED |
| `src/app/(dashboard)/layout.tsx` | diganti layout `src/app/lkps/layout.tsx` dan `ShellLkps` |
| `src/app/(dashboard)/admin/page.tsx`, `src/app/api/admin/users/route.ts` | kelola akun memakai `/admin/akun` LED (keputusan 2) |
| `src/app/api/auth/[...all]/route.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/types/next-auth.d.ts` | Better Auth LED (pendaftaran terbuka Ghalib ikut hilang) |
| `src/lib/prisma.ts` | `@/modules/bersama/db` |
| `src/app/api/prodi/route.ts` | `daftarProdi` LED |
| `src/app/api/notifications/route.ts` | lonceng pemberitahuan LED (`@/modules/bersama/data/pemberitahuan`) |
| `src/app/api/sync-led/route.ts` (dan tombolnya di `export/page.tsx`) | jembatan ke LED dibuang (keputusan 2) |
| `src/components/{Header,Sidebar,Providers,RoleNotice,IconBadge,index}.tsx`, `src/components/layout/{sidebar,index}.tsx`, `src/components/common/{providers,role-notice,index}.tsx` | kerangka LED (`ShellLkps`, `Petunjuk`, `JudulHalaman`) |
| `AGENTS.md`, `CLAUDE.md`, `README.md` (Ghalib) | diganti `src/modules/lkps/README.md` (panduan untuk Ghalib, G8) |
| `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `prisma.config.ts`, `.gitignore` | konfigurasi LED; dependensi `xlsx`, `bcryptjs`, `@types/bcryptjs` tidak ditambahkan |

## 2. Model

| Asal | Tujuan | `prodiId` | Catatan |
|---|---|---|---|
| `User`, `Session`, `Account`, `Verification` | milik LED | – | tidak dipindah |
| `IdentitasPT` | identitas institusi LED (`Fakultas`) + `Prodi.identitas` | – | tidak dipindah; lihat tabel 5 |
| `Prodi` | `Prodi` LED | – | tidak dipindah; relasi balik ditambahkan di `bersama.prisma` |
| `TimPenyusun` | `LkpsTimPenyusun` (`lkps_tim_penyusun`) | wajib | `fotoTtd` → `berkasLokasi`/`berkasNama` |
| `Kerjasama` | `LkpsKerjasama` (`lkps_kerjasama`) | wajib | `fileMou` → `berkasLokasi`/`berkasNama` |
| `SeleksiMahasiswaBaru` | `LkpsSeleksiMahasiswaBaru` | wajib | |
| `MahasiswaAsing` | `LkpsMahasiswaAsing` | wajib | |
| `DosenTetap` | `LkpsDosenTetap` | wajib | `nidn @unique` global → usul `@@unique([prodiId, nidn])` (**konfirmasi**: dosen yang sama bisa mengajar di dua prodi) |
| `BimbinganTA` | `LkpsBimbinganTa` | wajib (usul) | asal hanya `dosenId`; `prodiId` ditambahkan supaya penghapusan/pembacaan bisa dibatasi prodi tanpa join |
| `EWMP` | `LkpsEwmp` | wajib (usul) | sama seperti `BimbinganTA` |
| `LuaranDosen` | `LkpsLuaranDosen` | wajib | |
| `TenagaKependidikan` | `LkpsTenagaKependidikan` | wajib | |
| `PenggunaanDana` | `LkpsPenggunaanDana` | wajib | |
| `Laboratorium` | `LkpsLaboratorium` | wajib | |
| `MataKuliah` | `LkpsMataKuliah` | wajib | `fileRps` → `berkasLokasi`/`berkasNama` |
| `ProgramMBKM` | `LkpsProgramMbkm` | wajib | |
| `PenelitianDosen` | `LkpsPenelitianDosen` | wajib | dipakai halaman penelitian dan PkM (kolom jenis) |
| `IpkLulusan` | `LkpsIpkLulusan` | wajib | |
| `PrestasiMahasiswa` | `LkpsPrestasiMahasiswa` | wajib | |
| `EfektivitasStudi` | `LkpsEfektivitasStudi` | wajib | |
| `TracerStudy` | `LkpsTracerStudy` | wajib | |
| `LuaranMahasiswa` | `LkpsLuaranMahasiswa` | wajib | |
| `DokumenSpmi` | `LkpsDokumenSpmi` | wajib | `fileDokumen` → `berkasLokasi`/`berkasNama` |
| `RegulasiLKPS` | `LkpsRegulasi` | **tanpa** | konfigurasi fakultas/UPPS |
| `KriteriaConfig` | `LkpsKriteriaConfig` | **tanpa** | konfigurasi |
| `TabelConfig` | `LkpsTabelConfig` | **tanpa** | konfigurasi; lihat masalah 11 (isian tabel dinamis) |
| (baru, usul) | `LkpsIsianTabel` (`prodiId`, `tabelId`, `baris` Json, `bukti` Json) | wajib | **konfirmasi**: isian kriteria dinamis Ghalib disimpan di `TabelConfig.formatKolom` (bersama semua prodi) |

Model tanpa `prodiId` (berlaku untuk seluruh fakultas): `LkpsRegulasi`, `LkpsKriteriaConfig`, `LkpsTabelConfig`.

## 3. Rute

### Halaman

| Asal | Tujuan |
|---|---|
| `/dashboard` | `/lkps` (beranda LKPS) |
| `/kerjasama`, `/mahasiswa`, `/sdm`, `/keuangan`, `/pendidikan`, `/penelitian`, `/pkm`, `/luaran`, `/penjaminan` | `/lkps/<nama sama>` |
| `/kriteria/[id]` | `/lkps/kriteria/[id]` |
| `/identitas` | `/lkps/identitas` |
| `/import` | `/lkps/impor` |
| `/export` | `/lkps/ekspor` |
| `/konfigurasi` | `/lkps/konfigurasi` (hanya Admin UPPS) |
| `/admin` | dibuang; `/admin/akun` |
| `/login`, `/` | dibuang; login dan beranda LED |

### API

| Asal | Tujuan |
|---|---|
| `/api/kerjasama`, `/api/mahasiswa`, `/api/sdm`, `/api/keuangan`, `/api/pendidikan`, `/api/penelitian`, `/api/pkm`, `/api/luaran`, `/api/penjaminan`, `/api/identitas`, `/api/kriteria/[id]`, `/api/konfigurasi`, `/api/computation` | `/api/lkps/<nama sama>` |
| `/api/ingestion` | `/api/lkps/impor` |
| `/api/export` | `/api/lkps/ekspor` |
| `/api/upload` | `/api/lkps/bukti` (unggah) + unduh lewat rute berhak baca prodi |
| `/api/onedata/sync` | `/api/lkps/onedata/sinkron` (G6) |
| `/api/prodi` | dibuang; `daftarProdi` LED |
| `/api/admin/users` | dibuang; Kelola akun LED |
| `/api/notifications` | dibuang; pemberitahuan LED |
| `/api/sync-led` | dibuang |
| `/api/auth/[...all]` | dibuang; milik LED |

## 4. Peran

| Ghalib (`enum Peran`, `permissions.ts`) | LED | Hak di modul LKPS (G4) |
|---|---|---|
| `SUPER_ADMIN`, `ADMIN_UPPS`, `PENANGGUNG_JAWAB` | `ADMIN` (Admin UPPS) | baca semua prodi (lewat pemilih); tulis identitas/tim, konfigurasi; ekspor; **tidak** menulis isian kriteria |
| `OPERATOR_PRODI` | `TIM_PRODI` | tulis dan baca isian kriteria 1–9, identitas/tim, ekspor, **hanya prodinya** |
| `ASESOR` / `REVIEWER` | `ASESOR` (Reviewer LPMPP) | baca dan ekspor **hanya prodi yang LED-nya ditugaskan** (keputusan ⏸ G4; rancangan Ghalib: semua prodi) |
| `GUEST` | `TAMU` | tidak ada akses ke modul LKPS; hanya dashboard akreditasi (G2) |

## 5. Isian prodi dan identitas Ghalib

| Pemakaian di kode Ghalib | Pengganti di LED | Catatan |
|---|---|---|
| `Prodi.namaProdi`, `Prodi.jenjang` (diedit di `/identitas`, `api/identitas` menghapus dan membuat ulang semua prodi) | `Prodi.nama`, `Prodi.jenjang`, dikelola Admin di `/pengaturan/prodi` | `/lkps/identitas` hanya membaca |
| `Prodi.peringkatAkreditasi` (identitas, `api/prodi`) | `RiwayatAkreditasi` berlaku terbaru (`Prodi.identitas.peringkatAkreditasi` diturunkan darinya) | |
| `Prodi.jumlahMahasiswaAktif` (form identitas; **tidak dipakai** perhitungan) | tidak perlu: `computation` memakai `SeleksiMahasiswaBaru.mahasiswaAktifReguler + …Transfer` TS | tidak dibuat kolom baru (**konfirmasi**) |
| `IdentitasPT.namaPT`, `namaUPPS`, `alamat`, `noSkPendirianPT`, `tanggalSkPT` | `Fakultas.perguruanTinggi`, `nama`, `alamat`, `skPendirian`, `tanggalSkPendirian` (identitas institusi, Admin) | |
| `IdentitasPT.namaProdi`, `noSkPembukaanPS`, `tanggalSkPS` | `Prodi.nama`, `Prodi.identitas.skPembukaan`, `tanggalSkPembukaan` | |
| `IdentitasPT.jenisProgram` (Akademik/Vokasi) | diturunkan dari `Prodi.jenjang` (D1–D3, STr, S2Tr, S3Tr = Vokasi) | **konfirmasi** aturan turunan; tidak dibuat kolom baru |
| `TimPenyusun` (diedit di `/identitas`; dihapus semua lalu dibuat ulang) | `LkpsTimPenyusun` per prodi | ganti-semua dibatasi `prodiId` |

## 6. Masalah dan cara perbaikan

| # | Masalah (kode c718eff) | Perbaikan saat dipindah |
|---|---|---|
| 1 | `src/lib/myunila-client.ts` memuat nilai bawaan kredensial (ID Aplikasi, username, password) | tidak disalin; konfigurasi hanya dari `.env` tanpa nilai bawaan; nilainya tidak dicetak di mana pun (G6) |
| 2 | `cookies_admin.txt` (cookie sesi admin) di akar repo | tidak disalin; Ghalib menghapusnya di repo lama (hal terbuka) |
| 3 | Pendaftaran terbuka dan `role` diisi pengguna (`auth.ts`) | hilang: login memakai Better Auth LED (pendaftaran ditutup, peran diatur admin) |
| 4 | "Ganti semua baris" tanpa batas prodi: `kerjasama` POST `deleteMany({ where: {} })` untuk peran selain operator atau operator tanpa prodi; `identitas` POST `prodi.deleteMany()` dan `timPenyusun.deleteMany()` **tanpa syarat**; sinkron One Data juga `deleteMany` | semua penulisan lewat lapisan data dengan `where: { prodiId }` wajib di transaksi; `identitas` tidak lagi menulis `Prodi` |
| 5 | Unggahan bukti ditulis ke `public/uploads/bukti` (terbuka tanpa login) | penyimpanan LED (`@/modules/bersama/penyimpanan`), unduh lewat rute yang memeriksa hak baca prodi |
| 6 | Template ekspor dari jalur mati di laptop (`D:/laragon/...`) | `LKPS_TEMPLAT_EKSPOR` di `.env`; bila kosong, workbook baru |
| 7 | `xlsx` 0.18.5 (tidak dirawat, kerentanan diketahui) | `exceljs` |
| 8 | Prodi aktif Admin/Asesor jatuh ke prodi pertama di basis data | `null` → "Pilih program studi" |
| 9 | `GET` semua modul: bila prodi aktif `null`, `where: {}` mengembalikan data **semua prodi** | prodi aktif wajib; tanpa prodi → tidak ada data |
| 10 | `update`/`delete` per baris memakai `where: { id }` saja (mis. `laboratorium`, `mataKuliah`, `programMBKM`, `prestasiMahasiswa`, `luaranMahasiswa`): baris prodi lain bisa diubah bila id diketahui | `where: { id, prodiId }` (atau cek kepemilikan dulu) |
| 11 | Isian kriteria dinamis (`/api/kriteria/[id]`, aksi `saveTableRows`) disimpan di `TabelConfig.formatKolom` (konfigurasi bersama): semua prodi berbagi baris yang sama, dan rute ini tidak memeriksa hak tulis | model baru `LkpsIsianTabel` per prodi (usul, **konfirmasi**); hak tulis `TIM_PRODI` prodinya |
| 12 | `prodiId` dari isi permintaan dipakai bila pengguna tidak punya prodi (`prodiId: userProdiId \|\| r.prodiId`) | `prodiId` hanya dari `prodi-aktif` di server |
| 13 | Tanggal kosong diganti `new Date()` (mis. kerja sama) | galat validasi zod |
| 14 | `export`, `computation`, `ingestion`, `kriteria/[id]`, `upload`, `onedata/sync` tidak memeriksa hak (hanya ada sesi); `ingestion` membuat baris dengan `prodiId` bisa `null` | hak lewat `domain/akses.ts`; prodi aktif wajib |
| 15 | `kerjasama` POST tidak menyimpan `fileMou` dari baris (berkas MoU yang diunggah tidak tersimpan di baris) | dicatat; diperbaiki di lapisan data (`berkasLokasi`/`berkasNama`) tanpa mengubah kolom lain |
| 16 | `DosenTetap.nidn @unique` global: dosen yang sama tidak bisa dicatat di dua prodi | usul `@@unique([prodiId, nidn])` (**konfirmasi**) |
| 17 | Struktur tabel mengikuti LKPS lama (sheet 2a1 = seleksi mahasiswa, 3a1 = dosen tetap, 4a = penggunaan dana), bukan template LAM Teknik 2025 yang dibaca LED | tidak diubah (keputusan Ghalib dan Pak Tris); dicatat di `src/modules/lkps/README.md` |

## Keputusan Adrianne di ⏸ G0 (18 Nov 2026): keempatnya disetujui

(sebelumnya: "Butuh konfirmasi di ⏸ G0")

1. Model baru `LkpsIsianTabel` untuk isian kriteria dinamis per prodi (masalah 11). Tanpa ini, isian kriteria dinamis
   satu prodi menimpa prodi lain.
2. `LkpsDosenTetap`: `@@unique([prodiId, nidn])` menggantikan `nidn @unique` global (masalah 16).
3. `prodiId` wajib juga di `LkpsBimbinganTa` dan `LkpsEwmp` (anak `LkpsDosenTetap`).
4. `jenisProgram` diturunkan dari jenjang; `jumlahMahasiswaAktif` tidak dibuat (tidak dipakai perhitungan).

## Keputusan Adrianne di ⏸ G4 (18 Nov 2026)

1. Asesor hanya membaca LKPS prodi yang LED-nya ditugaskan kepadanya (bukan semua prodi seperti rancangan Ghalib).
2. Nilai cadangan di hitung skor (bila tabel kosong) boleh tetap ada; yang penting datanya bisa diedit.
3. Perbedaan perilaku lain dari kode asal (impor kerja sama/tracer tanpa tanggal/tahun ditolak, Tim Prodi menyimpan
   tendik, hapus konfigurasi yang sudah diisi ditolak, galat `{ pesan }`) diserahkan ke pengembang; dicatat di
   `docs/CATATAN-PENGEMBANGAN.md` bagian G4.

## 7. Status akhir (G8, 18 Nov 2026)

| Tahap | Commit | Isi |
|---|---|---|
| G0 | `75847d2` | peta ini, inventaris, rencana |
| G1 | `9d1908f` | peran `TAMU` |
| G2 | `da8ef11` | dashboard akreditasi hanya baca untuk Tamu |
| G3 | `85064a5` | skema `prisma/schema/lkps.prisma` (model `Lkps*`) |
| G4 | `6ab49be` | domain, data, dan API `/api/lkps/*` |
| G5 | `23d4fdc` | halaman `/lkps/*` di kerangka LED, menu, pemilih prodi, gaya terlingkup |
| G6 | `25d6d8e` | sinkron One Data mati secara bawaan |
| G7 | – | **belum dikerjakan**: menunggu keputusan Adrianne (dikerjakan sekarang atau diserahkan ke Ghalib); `gaya-lkps.css` tetap ada |
| G8 | (commit G8) | uji akhir, uji jalan empat peran, dokumentasi |

Masalah bagian 6: nomor 1, 3–14, dan 16 diperbaiki seperti kolom "Perbaikan". Nomor 2 dan 17 tetap hal terbuka
(repo lama dan struktur tabel). Nomor 15: baris kerja sama kini menyimpan bukti MoU (`berkasLokasi`/`berkasNama`), dan
uji jalan G8 memastikan bukti itu bisa diunduh lagi.

Rute halaman bagian 3 sudah ada semua (`/lkps`, `/lkps/<modul>`, `/lkps/kriteria/[id]`, `/lkps/identitas`,
`/lkps/impor`, `/lkps/ekspor`, `/lkps/konfigurasi`). Rute API juga sudah ada semua, termasuk `/api/lkps/onedata/sinkron`.

**Hal terbuka:**
- G7, penyamaan tampilan dengan komponen shadcn/ui LED: kerjakan sekarang atau serahkan ke Ghalib.
- Struktur tabel LKPS dibandingkan dengan template LKPS LAM Teknik 2025 (keputusan Ghalib dan Pak Tris).
- Sambungan data modul LKPS ke LED (adaptor opsional); unggah berkas tetap jalur utama.
- Kredensial WS API myUnila yang dipakai (aplikasi Adrianne atau Ghalib); bentuk respons `/v1/auth/check-token`;
  asumsi nilai pengisi sinkron One Data (lihat `CATATAN-PENGEMBANGAN.md` G6).
- Keamanan repo lama Ghalib (ganti password MyUnila, hapus cookie), dikerjakan Ghalib di repo lamanya.
- Akun Tamu belum bisa dibuat dari Kelola akun; Tamu direncanakan masuk lewat SSO (Rencana 18 Nov, mulai S3).


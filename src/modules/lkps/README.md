# Modul LKPS: panduan untuk Ghalib

Modul LKPS (Laporan Kinerja Program Studi) berasal dari repo Ghalib `Achmadghalib725/LKPS_LAM-TEKNIK` commit `c718eff`
dan digabung ke website led-lamteknik pada 18 November 2026 (branch `gabung-lkps`, tahap G0–G8 di
`docs/RENCANA-GABUNG-LKPS.md`). Satu login, satu basis data, dan satu tampilan dengan modul LED. Peta lengkap asal →
tujuan ada di `docs/GABUNG-LKPS-PETA.md`, dan catatan setiap tahap di `docs/CATATAN-PENGEMBANGAN.md` bagian "Gabung LKPS
(18 November 2026)".

## 1. Menjalankan

Prasyarat dan perintah sama dengan LED (lihat `CLAUDE.md` bagian Perintah dan `docs/PANDUAN-INSTALASI-WINDOWS.md`):

```bash
docker compose up -d          # PostgreSQL 17 + pgvector
npm install
npm run db:migrate            # menerapkan migrasi (prisma migrate deploy), termasuk tabel lkps_*
npm run dev                   # http://localhost:3000
npm run worker                # worker antrean LED (modul LKPS belum memakai antrean)
```

Akun dibuat Admin UPPS di **Kelola akun** (tidak ada akun contoh dan tidak ada seed akun dari repo lama). Modul LKPS
dibuka lewat tombol **LKPS** di kepala halaman atau alamat `/lkps`.

Sinkron One Data (myUnila) mati secara bawaan. Untuk menyalakannya, isi `LKPS_ONEDATA_AKTIF=true` dan
`MYUNILA_API_URL`, `MYUNILA_APP_ID`, `MYUNILA_USERNAME`, `MYUNILA_PASSWORD` di `.env` (lihat `docs/PANDUAN-SERVER.md`
bagian 7). Jangan menulis nilai kredensial di kode, dokumen, atau commit.

## 2. Letak folder

| Bagian | Lokasi |
| --- | --- |
| Halaman (tipis) | `src/app/lkps/<modul>/page.tsx`; layout `src/app/lkps/layout.tsx` (kerangka LED, pemilih prodi, gaya) |
| Komponen halaman (klien) | `src/modules/lkps/komponen/<modul>/halaman-<modul>.tsx` (asal halaman `src/app/(dashboard)/*` repo lama) |
| Komponen bersama modul | `komponen/bersama/` (`konteks.tsx` peran/prodi aktif, `pemberitahuan-peran.tsx`, `ikon-lencana.tsx`, `kirim.ts`), `pemilih-prodi.tsx`, `wajib-prodi.tsx`, `shell-lkps.tsx`, `beranda/` |
| Komponen tampilan | komponen LED di `src/components/ui` (shadcn/ui) dan blok halaman kriteria `komponen/bersama/ui-lkps.tsx` (`KartuHitung`, `KosongArahan`, `KartuTabel`, `UnggahBukti`, `TombolHapus`, …), ikon/cincin kriteria `komponen/bersama/kriteria-tampil.tsx`. Gaya CSS kode asal sudah dihapus (G7). |
| Route Handler | `src/app/api/lkps/<modul>/route.ts` (tipis: `jalankanRute` + `prodiAktifWajib` + fungsi data) |
| Akses data | `src/modules/lkps/data/<modul>.ts`; One Data di `data/onedata/` |
| Logika murni + uji | `src/modules/lkps/domain/` (`akses.ts`, `validasi.ts`, `hitung.ts`, `bukti.ts`, `prodi.ts`, `onedata-prodi.ts`, `templat/`), uji di `domain/__tests__/` |
| Model Prisma | `prisma/schema/lkps.prisma` (model `Lkps*`, tabel `lkps_*`) |
| Pintu modul | `src/modules/lkps/index.ts` (`MODUL_LKPS.siap = true`); fungsi yang boleh dipakai modul lain diekspor dari sini |
| Menu sidebar | `menuLkps` di `src/components/shell/menu-peran.ts` |

Pemetaan alamat lama: `/dashboard` → `/lkps`, `/kerjasama` … `/penjaminan` → `/lkps/kerjasama` … `/lkps/penjaminan`,
`/kriteria/[id]` → `/lkps/kriteria/[id]`, `/identitas`, `/import` → `/lkps/impor`, `/export` → `/lkps/ekspor`,
`/konfigurasi` → `/lkps/konfigurasi`. API: `/api/<modul>` → `/api/lkps/<modul>`; `ingestion` → `impor`, `export` →
`ekspor`, `upload` → `bukti`, `onedata/sync` → `onedata/sinkron`. `/login`, `/admin`, `/api/prodi`, `/api/admin/users`,
`/api/notifications`, dan `/api/sync-led` dibuang (diganti fitur LED).

## 3. Aturan batas modul

- `src/modules/lkps` **tidak boleh** mengimpor `src/modules/led` (diperiksa `tests/unit/batas-modul.test.ts`). Yang
  dipakai bersama ada di `src/modules/bersama` (mis. `prodiDitugaskanAsesor` di `bersama/data/penugasan-asesor.ts`).
- Halaman di `src/app/lkps` boleh memakai data LED bila perlu (beranda LKPS menautkan LED aktif prodi).
- LED tetap membaca LKPS dari berkas Excel/PDF yang diunggah di **Data LKPS** proyek LED. Data modul LKPS belum dipakai
  LED; menyambungkannya (adaptor opsional) adalah hal terbuka.
- Semua penulisan lewat lapisan data dengan `where: { prodiId }`; halaman dan rute tidak memakai `prisma` langsung.
- Galat untuk pengguna: `GalatPengguna` (400) dan `GalatAkses` (403) dari `@/modules/bersama/akses`; rute
  mengembalikan `{ pesan }` (bukan `{ error }` seperti repo lama).

## 4. Peran dan hak akses

Peran repo lama dipetakan ke peran LED (matriks di `domain/akses.ts`, rincian di `docs/GABUNG-LKPS-PETA.md` bagian 4):

| Repo lama | LED | Modul LKPS |
| --- | --- | --- |
| `OPERATOR_PRODI` | `TIM_PRODI` | baca dan isi semua kriteria, identitas/tim penyusun, impor, bukti, sinkron One Data **untuk prodinya saja** |
| `ADMIN_UPPS` (+ `SUPER_ADMIN`, `PENANGGUNG_JAWAB`) | `ADMIN` | baca semua prodi (pilih lewat pemilih prodi), tulis tim penyusun, **struktur kriteria & tabel** (`/lkps/konfigurasi`); tidak mengisi kriteria |
| `ASESOR` / `REVIEWER` | `ASESOR` (Reviewer LPMPP) | hanya baca, **hanya prodi yang LED-nya ditugaskan kepadanya** |
| `GUEST` | `TAMU` | tidak membuka modul LKPS; hanya Dashboard akreditasi |

- Prodi aktif: Tim Prodi selalu prodinya; Admin UPPS dan reviewer memilih lewat pemilih prodi (cookie `lkps_prodi`,
  diperiksa ulang di server). Tanpa pilihan → "Pilih program studi", tidak jatuh ke prodi pertama.
- Di halaman klien, peran dibaca dengan `useInfoLkps()` atau `useModulePermission(modul)`. Ini hanya untuk tampilan;
  hak sebenarnya selalu diperiksa lapisan data (`pastikanBacaProdiLkps`, `pastikanTulisLkps`).

## 5. Menambah tabel atau model `Lkps*`

1. Tambah model di `prisma/schema/lkps.prisma`:
   - nama berawalan `Lkps`, `@@map("lkps_…")`;
   - kolom `prodiId String` + relasi ke `Prodi` (`onDelete: Restrict`) + `@@index([prodiId])`;
   - tambah relasi balik di model `Prodi` (`prisma/schema/bersama.prisma`).
2. Migrasi dengan cara di `CLAUDE.md` bagian Perintah (`migrate dev` menolak berjalan non-interaktif):
   `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script`, simpan ke
   `prisma/migrations/<waktu>_lkps_<nama>/migration.sql`, **hapus baris `DROP INDEX "Potongan_embedding_hnsw_idx"`**,
   lalu `npm run db:migrate`. Jangan menjalankan `npx prisma format` dan jangan menyunting migrasi yang sudah di-commit.
3. Skema validasi zod di `domain/validasi.ts` (tahun dan tanggal wajib; teks dibatasi panjangnya).
4. Fungsi data di `data/<modul>.ts`: periksa hak dulu (`pastikanBacaProdiLkps` / `pastikanTulisLkps`), lalu baca/tulis
   dengan `prodiId`. Simpan per baris memakai `simpanPerBaris` (`data/bantu.ts`) supaya id baris prodi lain ditolak.
5. Rute di `src/app/api/lkps/<modul>/route.ts` dengan `jalankanRute` dan `prodiAktifWajib`; tambahkan ke tabel di
   `tests/unit/lkps-rute.test.ts`.
6. Halaman: komponen di `komponen/<modul>/`, halaman tipis di `src/app/lkps/<modul>/page.tsx` dibungkus `WajibProdi`,
   menu di `menuLkps`. Pakai komponen shadcn/ui di `src/components/ui` dan blok `ui-lkps.tsx` (kartu hitungan langsung,
   tampilan kosong yang memberi arahan, kartu tabel berikon kriteria); jangan menambah CSS sendiri (diperiksa
   `tests/unit/lkps-halaman.test.ts`).
7. Tabel dinamis (tanpa model baru) cukup lewat **Struktur kriteria & tabel**: isian per prodi disimpan di
   `LkpsIsianTabel`.

## 6. Uji

```bash
npm run lint
npm run typecheck
npm run test:unit         # src/modules/*/domain/__tests__ dan tests/unit
npm run test:integrasi    # basis data uji terpisah; jangan dijalankan dua kali bersamaan
npm run build
```

Uji yang khusus LKPS:
- unit: `domain/__tests__/{hitung,akses}.test.ts`, `tests/unit/lkps-{rute,halaman,onedata}.test.ts`;
- integrasi: `tests/integrasi/lkps-akses.test.ts`.

`tests/integrasi/akses-tamu.test.ts` otomatis memanggil setiap fungsi `export async function x(p: Pengguna, …)` di
`src/modules/*/data` sebagai Tamu dan mengharapkan `GalatAkses`. Fungsi data baru otomatis ikut teruji.

Hitungan tangan mesin hitung skor: `docs/uji/hitungan-manual-lkps-gabung.md`. Skenario black-box:
`docs/uji/skenario-blackbox-gabung-lkps.md`.

## 7. Alur branch

- Penggabungan dikerjakan di `gabung-lkps` (dari `revisi-31okt`). Rencana 18 Nov (Tamu dan SSO) dilanjutkan mulai S3
  di branch `tamu-sso` yang dibuat dari `gabung-lkps`.
- Untuk pekerjaan LKPS berikutnya, buat branch dari `gabung-lkps` (atau dari branch utama setelah digabung), misalnya
  `lkps-<fitur>`, lalu ajukan pull request. Satu commit per langkah yang bisa diuji; tulis catatan di
  `docs/CATATAN-PENGEMBANGAN.md`.
- Repo lama tidak dipakai lagi untuk kode. Keamanan repo lama (ganti password MyUnila, hapus `cookies_admin.txt` dari
  riwayat) dikerjakan di repo lama.

## 8. Perbedaan struktur tabel dengan template LKPS LAM Teknik 2025

Struktur tabel modul ini dipindah **tanpa perubahan** dari repo lama (keputusan rencana penggabungan). Ia belum sama
dengan template LKPS LAM Teknik 2025 yang dibaca LED (sheet `1`, `2a1`–`2a3`, `2b`, `3a1`–`3a5`, `3b`, `3c`, `4a`–`4k`,
`5a`–`5c`, `6a`–`6i`, `7a`, `7b`; lihat `docs/SPESIFIKASI.md` bagian 5):

- Modul ini memakai susunan 9 kriteria (Kriteria 1 Tata Pamong … Kriteria 9 SPMI), seperti instrumen lama; template
  2025 memakai susunan tabel 1–7.
- Tabel yang ada di template 2025 tetapi belum punya model sendiri bisa dibuat lewat **Struktur kriteria & tabel**
  (isian dinamis), atau model `Lkps*` baru.
- Ekspor Excel (`/lkps/ekspor`) mengisi templat milik repo lama (`domain/templat/`), bukan template 2025 yang diunggah
  ke LED. Berkas ekspor ini belum tentu terbaca LED.
- Mesin hitung skor (`domain/hitung.ts`) dipindah tanpa perubahan rumus. Jumlah bobot kriterianya 110, jadi skor
  maksimum 440, bukan 400. Nilai cadangan saat tabel kosong (mis. 250 mahasiswa) dipertahankan.

Penyesuaian struktur dengan template 2025 diputuskan Ghalib bersama Pak Tris.

## 9. Aturan cetak tabel LKPS ke PDF (Pak Tris, revisi 31 Okt 2026)

Tim Prodi mencetak LKPS per tabel ke PDF lalu mengunggahnya ke LED sebagai sumber data (modul LED membaca dan
menggabungkan PDF per tabel). Ekspor PDF modul LKPS (belum ada) mengikuti aturan berikut:

- Satu tabel satu halaman. Bila tidak muat, tabel boleh bersambung ke halaman berikutnya dengan judul kolom (dan baris
  nomor kolom) diulang di setiap halaman.
- Kolom tidak boleh dipindah ke bawah atau dipecah ke halaman lain; semua kolom tetap satu baris.
- Tabel yang lebar dicetak lanskap (mendatar) supaya kolomnya tidak terpotong.
- Judul tabel ("Tabel 4.a ...") tetap dicetak di awal tabel supaya pembaca PDF LED bisa mengenali tabelnya.

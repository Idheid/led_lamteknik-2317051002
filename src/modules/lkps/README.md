# Modul LKPS (kerangka)

Dikerjakan Ghalib. Kerangka disiapkan 31 Okt 2026 supaya modul LKPS langsung masuk ke website yang sama dengan LED
(satu login, satu basis data, tampilan sama). Lihat juga `src/modules/README.md`.

## Tempat berkas

| Bagian | Lokasi |
| --- | --- |
| Halaman | `src/app/lkps/` (sudah ada: `layout.tsx` memeriksa login, `page.tsx` beranda sementara) |
| Route Handler (unggah/unduh) | `src/app/api/lkps/` |
| Logika murni + uji | `src/modules/lkps/domain/`, `src/modules/lkps/domain/__tests__/` |
| Akses data | `src/modules/lkps/data/` |
| Pekerjaan latar | `src/modules/lkps/proses/`, didaftarkan di `src/worker/lkps.ts`; nama antrean berawalan `lkps-` di `src/modules/bersama/antrean.ts` |
| Komponen tampilan | `src/modules/lkps/komponen/` (sudah ada: `shell-lkps.tsx`, menu sidebar LKPS) |
| Model Prisma | `prisma/schema/lkps.prisma`; migrasi tetap di `prisma/migrations/` |
| Pintu modul | `src/modules/lkps/index.ts`: fungsi yang boleh dipakai modul lain (misalnya LED membaca tabel LKPS) |

## Yang sudah tersedia dari modul bersama

- Login, sesi, peran: `wajibLogin`, `ambilPengguna` (`@/modules/bersama/sesi`), `Pengguna`, `GalatAkses`,
  `GalatPengguna` (`@/modules/bersama/akses`), aksi server `jalankanAksi` (`@/modules/bersama/aksi`), Route Handler
  `jalankanRute` (`@/modules/bersama/rute`).
- Basis data: `prisma` (`@/modules/bersama/db`).
- Program studi dan fakultas: `daftarProdi`, `ambilFakultas` (`@/modules/bersama/data/organisasi`), jenjang
  (`@/modules/bersama/domain/jenjang`), tahun akademik dan TS (`@/modules/bersama/domain/tahun-akademik`).
- Kunci API Gemini fakultas dan model LLM (`@/modules/bersama/data/kunci-api`, `@/modules/bersama/llm/`).
- Antrean pg-boss (`@/modules/bersama/antrean`), penyimpanan berkas unggahan (`@/modules/bersama/penyimpanan`),
  pemberitahuan lonceng (`@/modules/bersama/data/pemberitahuan`).
- Tampilan: `ShellAplikasi`, `JudulHalaman`, `Petunjuk`, komponen shadcn/ui di `src/components/`.

## Aturan

- Jangan mengimpor dari `src/modules/led/` (diperiksa `tests/unit/batas-modul.test.ts`).
- Model Prisma berawalan `Lkps` supaya tidak bentrok dengan `BerkasLKPS`/`TabelLKPS` milik LED (itu data LKPS yang
  diunggah ke LED sebagai sumber narasi).
- Rencana fitur (arahan Pak Tris): isian tabel per prodi sesuai template LKPS LAM Teknik 2025, impor/ekspor Excel, PDF
  per tabel (tabel lebar mendatar, kolom tidak terpotong), ID sinkron One Data di setiap baris, isian manual sebagai
  cadangan.

## Aturan cetak tabel LKPS ke PDF (Pak Tris, revisi 31 Okt 2026)

Tim Prodi mencetak LKPS per tabel ke PDF lalu mengunggahnya ke LED sebagai sumber data (modul LED membaca dan
menggabungkan PDF per tabel). Ekspor PDF modul LKPS mengikuti aturan berikut:

- Satu tabel satu halaman. Bila tidak muat, tabel boleh bersambung ke halaman berikutnya dengan judul kolom (dan baris
  nomor kolom) diulang di setiap halaman.
- Kolom tidak boleh dipindah ke bawah atau dipecah ke halaman lain; semua kolom tetap satu baris.
- Tabel yang lebar dicetak lanskap (mendatar) supaya kolomnya tidak terpotong.
- Judul tabel ("Tabel 4.a ...") tetap dicetak di awal tabel supaya pembaca PDF LED bisa mengenali tabelnya.

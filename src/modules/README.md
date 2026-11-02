# Modul website akreditasi

Satu website (satu login, satu basis data) berisi dua modul kode: **LKPS** dan **LED**. Desain form 2 (2 Nov 2026):
bagi pengguna keduanya satu aplikasi, satu menu per peran (tanpa halaman pilih modul). Setelah login, `/` langsung
mengalihkan ke beranda peran (Admin UPPS: Dashboard akreditasi; Tim Prodi: LED prodi dengan Data LKPS dan Identitas
prodi; reviewer LPMPP: LED ditugaskan). Selama modul LKPS belum siap, `/lkps` membuka Data LKPS LED aktif prodi.

| Folder | Isi | Rute | Skema Prisma | Worker |
| --- | --- | --- | --- | --- |
| `bersama/` | login dan sesi, peran dan akses, koneksi DB, prodi dan fakultas, kunci API dan model LLM, log, cadangan, pemberitahuan, validasi bersama, antrean | `/`, `/login`, `/akun`, `/admin`, `/pengaturan` | `prisma/schema/bersama.prisma` | `src/worker/bersama.ts` |
| `led/` | Laporan Evaluasi Diri: instrumen, LED, data LKPS yang diunggah ke LED, Basis Pengetahuan (RAG), generate narasi, verifikasi, review asesor, ekspor Word | `/led/...`, `/api/led/...` | `prisma/schema/led.prisma` | `src/worker/led.ts` |
| `lkps/` | Laporan Kinerja Program Studi (dikerjakan Ghalib, masih kerangka) | `/lkps/...`, `/api/lkps/...` | `prisma/schema/lkps.prisma` | `src/worker/lkps.ts` |

Isi tiap modul mengikuti pola yang sama:

- `domain/` logika murni tanpa basis data, diberi uji di `domain/__tests__/` (impor relatif berakhiran `.ts`).
- `data/` akses data; setiap fungsi menerima `Pengguna` dan memeriksa peran.
- `proses/` pekerjaan latar yang dipanggil worker (pg-boss).
- `komponen/` komponen tampilan khusus modul. Komponen tampilan umum (shadcn/ui, sidebar, lonceng) ada di
  `src/components/`.

## Batas modul

Diperiksa otomatis oleh `tests/unit/batas-modul.test.ts`:

- `lkps/` dan `led/` boleh memakai `bersama/`.
- `lkps/` tidak memakai `led/`. LED yang membaca data LKPS, lewat fungsi yang diekspor dari `lkps/index.ts`.
- `bersama/` tidak memakai `lkps/`. `bersama/` memakai `led/` hanya di dua tempat yang tercatat: melanjutkan pekerjaan
  LED setelah kunci API baru ditambahkan (`bersama/data/kunci-api.ts`) dan mengimpor instrumen bawaan saat pemasangan
  pertama (`bersama/data/pemasangan.ts`).

Halaman di `src/app` boleh memakai modul mana pun (misalnya halaman awal menampilkan jumlah LED).

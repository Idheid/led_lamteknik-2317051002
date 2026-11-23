# Skenario uji black-box: login dua pilihan, Tamu, dan SSO Unila (23 November 2026)

Uji jalan RENCANA-18NOV S7 butir 1, untuk Bab IV.

- **Lingkungan:** branch `tamu-sso`, basis data dev, di laptop pengembangan.
  - B1–B3 dan B5–B12: `next dev` dengan `SSO_AKTIF=true` dan `SSO_MODE=tiruan`. Penyedia SSO tiruan hanya hidup di
    mode pengembangan.
  - B4: build produksi (`next start`) dengan `SSO_AKTIF=false`.
- **Penyedia SSO:** tiruan (`/api/sso/tiruan`), karena penyedia API Access Unila belum dikonfigurasi
  (`docs/SSO-AKSES-CATATAN.md` belum terisi). Alur aplikasi (rute, keputusan, sesi, peran, keluar) sama untuk kedua
  penyedia; yang berbeda hanya halaman login SSO dan validasi kiriman.
- **Akun:** akun uji sementara Admin UPPS dan Tim Prodi S1 Teknik Informatika (UNILA ID `dosen.tiruan`). Kata sandinya
  acak dan tidak dicatat. Akun, Tamu hasil uji, pemberitahuan, dan log uji dihapus sesudahnya.
- **Alat:** browser bawaan Claude Code (klik dan isian seperti pengguna); data diperiksa lewat konsol browser dan
  kueri basis data.
- **Status:** L = lulus, G = gagal. Kolom "Bukti otomatis" menyebut uji otomatis yang menguji hal yang sama.

| Kode | Skenario | Langkah | Hasil yang diharapkan | Hasil | Status | Bukti otomatis |
|---|---|---|---|---|---|---|
| B1 | Login biasa berhasil | Isi email dan kata sandi Admin UPPS yang benar, klik Masuk | Masuk ke Dashboard akreditasi; menu Admin UPPS tampil | Dashboard akreditasi, sidebar Admin UPPS | L | `akun.test.ts` |
| B2 | Kata sandi salah | Isi email akun Tim Prodi dengan kata sandi salah, klik Masuk | Pesan "Email atau kata sandi salah."; tetap di halaman masuk | Pesan tampil, POST `sign-in/email` 401 | L | `login-gagal.test.ts` |
| B3 | Terkunci setelah 3 kali gagal | Ulangi B2 sampai tiga kali gagal, lalu klik Masuk lagi | Peringatan kuning "Terlalu banyak percobaan. Coba lagi dalam 5 menit…"; tombol Masuk nonaktif | Tiga kali 401 lalu 429 `LOGIN_TERKUNCI`, peringatan "5 menit", tombol nonaktif | L | `login-gagal.test.ts`, `login-sso.test.ts` |
| B4 | Tombol SSO tersembunyi saat SSO mati | `SSO_AKTIF=false`, buka `/login`; buka `/api/sso/mulai` langsung | Tidak ada tombol "Masuk dengan SSO Unila"; `/api/sso/mulai` dialihkan ke `/login?galat=sso_mati` | Tidak ada tombol SSO (foto dan logo tetap tampil); `/api/sso/mulai` → `/login?galat=sso_mati` | L | `login-sso.test.ts`, `sso.test.ts` |
| B5 | SSO dosen terdaftar | Klik "Masuk dengan SSO Unila", pilih "Dosen terdaftar" (UNILA ID sama dengan akun Tim Prodi) | Masuk ke akun itu dengan perannya (Tim Prodi), langsung ke LED prodi; peran tidak berubah | Masuk sebagai "Dosen Uji S7 Terdaftar", halaman LED prodi S1 Teknik Informatika | L | `sso.test.ts` |
| B6 | SSO pengguna belum terdaftar menjadi Tamu | SSO, pilih "Dosen belum terdaftar" | Akun Tamu dibuat; masuk ke Dashboard akreditasi dengan keterangan "Anda masuk sebagai Tamu…"; Admin UPPS mendapat pemberitahuan "Tamu baru masuk lewat SSO: <nama>." | Dashboard Tamu, sidebar hanya "Dashboard akreditasi"; lonceng admin berisi pemberitahuan dengan tautan Tamu baru | L | `sso.test.ts` |
| B7 | SSO mahasiswa ditolak | SSO, pilih "Mahasiswa" | Kembali ke halaman masuk dengan "Akun mahasiswa tidak dapat masuk ke aplikasi ini."; tidak ada akun dibuat | Pesan tampil; 0 akun dengan UNILA ID mahasiswa; log `sso_ditolak` kode `sso_mahasiswa` | L | `sso.test.ts`, `sso.test.ts` (unit, `putuskan`) |
| B8 | SSO akun nonaktif ditolak | SSO, pilih "Akun SSO nonaktif" | Kembali ke halaman masuk dengan "Akun SSO Anda tidak aktif. Hubungi Helpdesk UPA TIK."; tidak ada akun dibuat | Pesan tampil; 0 akun; log kode `sso_nonaktif` | L | `sso.test.ts` |
| B9 | Tamu membuka halaman lain | Sebagai Tamu (B6), buka `/led`, `/lkps`, `/admin/akun`, `/pengaturan/prodi`, `/akun/ganti-sandi` | Semua dialihkan ke `/dashboard` | Kelima alamat berakhir di `/dashboard` | L | `tamu.test.ts`, `akses-tamu.test.ts` |
| B10 | Tamu tidak melihat tombol Ingatkan dan email akun | Sebagai Tamu, periksa Dashboard dan menu pengguna | Tidak ada tombol "Ingatkan", tidak ada alamat email di halaman; menu pengguna hanya "Keluar" (tanpa "Ganti kata sandi") | 0 tombol Ingatkan, 0 email di halaman, menu hanya "Keluar" | L | `tamu.test.ts`, `akun-unila-id.test.ts` |
| B11 | Admin mengubah Tamu menjadi Tim Prodi | Admin: Kelola akun → "Tamu baru (1)" → menu baris → Ubah peran → Tim Prodi, coba simpan tanpa prodi, lalu pilih S1 Teknik Informatika → Simpan peran | Tanpa prodi: "Pilih program studi." dan tombol nonaktif; dengan prodi: tersimpan, Tamu baru menjadi 0 | Sesuai; akun menjadi Tim Prodi dengan prodi, penyaring "Tamu baru (0)" | L | `akun-unila-id.test.ts` |
| B12 | Keluar dari SSO | Sesudah B5, menu pengguna → Keluar | Sesi aplikasi dihapus; diarahkan ke alamat keluar SSO lalu kembali ke halaman masuk | POST `/api/sso/keluar` 200 → alamat keluar SSO tiruan → `/login?keluar=sso`; `get-session` null | L | `sso.test.ts` (S6) |

## Belum bisa diuji

| Kode | Skenario | Alasan |
|---|---|---|
| B12a | Sesudah keluar, "Masuk dengan SSO Unila" meminta UNILA ID lagi (tidak langsung masuk ke akun sebelumnya) | Perlu SSO Unila asli dan URL keluar Access (`SSO-AKSES-CATATAN.md` bagian 5) |
| B13 | Semua skenario SSO dengan penyedia Access asli | Penyedia Access belum dikonfigurasi; menunggu dokumentasi dan `app_key` dari UPA TIK |

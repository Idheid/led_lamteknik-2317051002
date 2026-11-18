# Skenario uji black-box: Gabung LKPS dan peran Tamu (18 November 2026)

Uji jalan RENCANA-GABUNG-LKPS G8 butir 2–3.

- **Lingkungan:** build produksi (`npm run build`, `next start -p 3100`) di laptop pengembangan, basis data dev,
  branch `gabung-lkps`.
- **Akun:** akun uji sementara `admin.lkps@uji.test`, `tim.lkps@uji.test` (Tim Prodi S1 Teknik Informatika),
  `asesor.lkps@uji.test` (ditugaskan ke LED S1 Teknik Informatika), dan `tamu.lkps@uji.test`. Kata sandinya acak dan
  tidak dicatat. Akun dan data uji dihapus sesudah uji, dan penugasan reviewer LED dikembalikan.
- **Alat:** browser bawaan Claude Code (klik dan isian seperti pengguna). Respons API dan gaya terhitung diperiksa lewat
  konsol browser.
- **Hasil:** L = lulus. Kolom "Bukti" menyebut uji otomatis yang menguji hal yang sama.

## A. Tim Prodi

| No | Langkah | Hasil yang diharapkan | Hasil | Bukti |
|---|---|---|---|---|
| A1 | Login, tombol LKPS | Beranda LKPS prodi sendiri tanpa pemilih prodi; menu Beranda, Identitas & tim, K1–K9, Impor One Data, Ekspor Excel; tanpa Struktur kriteria & tabel; keterangan "Data di modul LKPS belum dipakai LED…" + tautan Data LKPS LED aktif | L | `lkps-halaman.test.ts` (menu) |
| A2 | K1 → Tambah Kerjasama → isi mitra, judul, tanggal → Simpan | Baris tersimpan, "Data berhasil disimpan", skor RK diperbarui | L | `lkps-akses.test.ts` |
| A3 | Ubah baris K1 → unggah MoU (PDF) → Simpan | POST `/api/lkps/bukti` 200; baris menyimpan tautan bukti; unduh tautan 200 `application/pdf` | L | `lkps-akses.test.ts` (bukti) |
| A4 | K6 → Tambah Penelitian → judul, dosen → Simpan | Baris tersimpan dengan tahun 2026 dan jenis Penelitian | L | – |
| A5 | K4 → Tabel 4.a → isi satu angka → Simpan | Tiga baris TS-2…TS tersimpan, angka di TS-2 | L | – |
| A6 | K7 → Tambah PkM → Simpan tanpa isian | Toast "Judul wajib diisi; Nama dosen wajib diisi.", tidak tersimpan | L | `validasi`, `kirimLkps` |
| A7 | POST penelitian tanpa tahun (konsol) | 400 `{ pesan: "Tahun wajib diisi." }` | L | `lkps-akses.test.ts` |
| A8 | Ekspor Excel | 200, berkas `LKPS_LAM_Teknik_<tanggal>.xlsx` (zip "PK", ± 16 KB) | L | – |
| A9 | Impor One Data | Tombol "Tarik Data Terbaru Prodi" nonaktif dan redup, keterangan "Sinkron One Data belum diaktifkan. Impor berkas di bawah tetap bisa dipakai."; POST `/api/lkps/onedata/sinkron` 503 | L | `lkps-onedata.test.ts` |
| A10 | Identitas & tim | Identitas PT/UPPS dan prodi terkunci (dari data LED) dengan tautan Identitas prodi; jenis program S1 = Akademik | L | – |
| A11 | Data prodi lain lewat `?prodiId=` | Diabaikan: Tim Prodi selalu prodinya | L | `lkps-akses.test.ts` |

## B. Admin UPPS

| No | Langkah | Hasil yang diharapkan | Hasil | Bukti |
|---|---|---|---|---|
| B1 | Login, tombol LKPS tanpa memilih prodi | "Pilih program studi" (tidak jatuh ke prodi pertama) | L | `lkps-akses.test.ts` |
| B2 | Pilih "Sarjana Teknik Informatika" di pemilih prodi | Beranda memuat data prodi itu; semua halaman K1–K9, identitas, impor, ekspor, konfigurasi memanggil `/api/lkps/*` dengan respons 200 | L | – |
| B3 | Buka K1 sesudah Tim Prodi mengisi | Baris Tim Prodi tampil, kotak "Mode hanya baca", tanpa tombol tambah | L | – |
| B4 | Struktur kriteria & tabel | Terbuka (khusus Admin UPPS); regulasi bawaan tampil | L | `lkps-halaman.test.ts` |
| B5 | Halaman LED sesudah membuka LKPS | Gaya `/dashboard` (595 elemen), `/admin/akun` (326), `/led/pantau` (214) identik dengan muat penuh tanpa `gaya-lkps.css` | L | `lkps-halaman.test.ts` (lingkup CSS) |

## C. Reviewer LPMPP (Asesor)

| No | Langkah | Hasil yang diharapkan | Hasil | Bukti |
|---|---|---|---|---|
| C1 | Login, tombol LKPS, buka pemilih prodi | Hanya satu pilihan: prodi yang LED-nya ditugaskan | L | `lkps-akses.test.ts` (G5) |
| C2 | Buka K1 | Data prodi tampil (baca 200), tanpa tombol tambah | L | – |
| C3 | POST simpan penelitian (konsol) | 403 "Anda tidak berhak melakukan aksi ini." | L | `lkps-akses.test.ts` |
| C4 | Prodi yang tidak ditugaskan | Ditolak ("Pilih program studi" / `GalatAkses`) | L | `lkps-akses.test.ts` |

## D. Tamu

| No | Langkah | Hasil yang diharapkan | Hasil | Bukti |
|---|---|---|---|---|
| D1 | Login | Langsung ke Dashboard akreditasi; sidebar hanya "Dashboard akreditasi" | L | `tamu.test.ts` |
| D2 | Buka `/lkps/kerjasama` | Dialihkan (bukan halaman LKPS) | L | `tamu.test.ts` |
| D3 | GET `/api/lkps/kerjasama` (konsol) | 403 | L | `akses-tamu.test.ts` |
| D4 | Semua fungsi data LKPS sebagai Tamu | `GalatAkses` | L | `akses-tamu.test.ts` (otomatis) |

## E. Tanpa login

| No | Langkah | Hasil yang diharapkan | Hasil | Bukti |
|---|---|---|---|---|
| E1 | `curl /lkps` | 307 ke `/login?ke=%2Flkps` | L | – |
| E2 | `curl /api/lkps/kerjasama` | 401 `{ pesan: "Sesi Anda berakhir. Silakan masuk lagi." }` | L | `lkps-rute.test.ts` (`penolakanRute`, semua rute lewat `jalankanRute`) |

## F. Penyamaan tampilan (G7)

Uji ulang sesudah semua halaman LKPS memakai komponen LED (build produksi, akun uji sementara; data dan akun uji
dihapus sesudahnya).

| No | Langkah | Hasil yang diharapkan | Hasil | Bukti |
|---|---|---|---|---|
| F1 | Tim Prodi: beranda LKPS | Kartu progres per kriteria dengan ikon berwarna dan cincin progres, gaya LED | L | – |
| F2 | Tim Prodi: Identitas & tim → isi anggota, unggah tanda tangan PNG, Simpan | Toast "Tim penyusun tersimpan."; tanda tangan terunduh 200 `image/png` | L | – |
| F3 | Tim Prodi: K1 tambah kerja sama + unggah MoU lewat kotak unggah | Tersimpan, kartu RK berubah langsung, tautan MoU di tabel 200 | L | – |
| F4 | Tim Prodi: K2 isi MA reguler TS 150 → Simpan | Tersimpan, RMD 15,00 | L | – |
| F5 | Tim Prodi: K3 tambah dosen; tambah lalu hapus tendik (dialog konfirmasi); sub-tab 3.b.6 → tambah luaran | Tersimpan/terhapus; kategori "Sitasi" terpilih otomatis | L | – |
| F6 | Tim Prodi: K4 isi dana TS → Simpan; tambah lab | Ringkasan Rp 250.000.000; lab tersimpan dengan jam/luas 0 (tanpa angka contoh) | L | – |
| F7 | Tim Prodi: K7 tambah PkM | Tersimpan dengan jenis PkM, tidak tampil di K6 | L | – |
| F8 | Tim Prodi: K9 centang satu dokumen + unggah PDF → Simpan | 1/6 dokumen; PDF 200; tidak ada nomor SK/tautan karangan | L | `lkps-halaman.test.ts` |
| F9 | Admin: konfigurasi → tambah kriteria + tabel | Tersimpan; "Buka halaman" semua ke `/lkps/…`; sidebar "K10" | L | `lkps-halaman.test.ts` (menu) |
| F10 | Admin: halaman kriteria dinamis | Hanya baca, tanpa isian dan tombol simpan | L | – |
| F11 | Tim Prodi: kriteria dinamis → isi baris → Simpan tabel | Toast; baris tersimpan untuk prodi ini | L | `lkps-akses.test.ts` (G4) |
| F12 | Semua halaman LKPS | Tidak ada kelas CSS kode asal, `confirm()`/`alert()`, atau `eslint-disable` | L | `lkps-halaman.test.ts` |


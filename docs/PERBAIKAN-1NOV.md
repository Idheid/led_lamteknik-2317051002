# Perbaikan setelah uji Adrianne (1 November 2026)

Lanjutan `docs/RENCANA-REVISI-31OKT.md`. Kerjakan **setelah Tahap 8 selesai dan sebelum Tahap 9**, supaya dokumen
akhir di Tahap 9 sudah mencakup perbaikan ini. Aturan kerja sama dengan rencana 31 Okt: satu commit per butir,
semua pemeriksaan lulus, catat di `docs/CATATAN-PENGEMBANGAN.md` (bagian "Perbaikan setelah uji 1 Nov 2026").

## P1. Akun lama bernama "Penanggung Jawab" dan "Super Admin"

Temuan: di Kelola akun masih ada akun "Penanggung Jawab TI" (pj.ti@contoh.ac.id) dan "Super Admin". Perannya sudah
Admin UPPS (migrasi `20261031100000_peran_tim_prodi`, keputusan B2), tetapi namanya masih nama lama. Menurut Adrianne,
penanggung jawab adalah pembuat LED, jadi seharusnya menjadi **Tim Prodi**. Admin belum bisa mengubah peran dan nama akun.

- Kelola akun, menu baris: tambah **Ubah nama** dan **Ubah peran**.
  - Ubah peran menampilkan pilihan peran yang sama dengan Tambah akun. Bila memilih Tim Prodi, wajib memilih prodi.
    Bila beralih dari Tim Prodi ke peran lain, `prodiId` dikosongkan.
  - Aturan: admin tidak bisa mengubah peran akunnya sendiri; harus tetap ada minimal satu Admin UPPS aktif; sesi akun
    yang perannya diubah dicabut supaya pengguna login ulang dengan peran baru.
  - Catat di `LogAktivitas` (peran lama, peran baru, prodi).
- `.env.example` dan seed: ganti contoh nama admin pertama dari "Super Admin" menjadi "Admin UPPS". Nama variabel
  `SUPERADMIN_*` jangan diganti (dipakai `.env` yang sudah ada); cukup komentarnya: "akun Admin UPPS pertama".
- Ubah teks keputusan B2 di `docs/RENCANA-REVISI-31OKT.md`: "akun PJ lama menjadi Admin UPPS; Admin bisa mengubahnya
  menjadi Tim Prodi lewat Ubah peran".
- Uji integrasi: ubah peran Admin → Tim Prodi (wajib prodi), Tim Prodi → Asesor (prodi dikosongkan), menolak mengubah
  peran sendiri, menolak bila admin aktif tinggal satu.

## P2. Formulir Tambah akun terpotong dan tidak bisa digulir

Temuan: dialog Tambah akun lebih tinggi dari layar (kartu peran + prodi + nama + email + kata sandi), bagian atas dan
bawah terpotong, tombol Simpan tidak terlihat.

- Pindahkan Tambah akun ke halaman sendiri `/admin/akun/tambah` memakai `HalamanTambah`, sama seperti Tambah kunci
  dan Tambah prodi. Setelah berhasil, kembali ke Kelola akun dengan pesan sukses.
- Ubah peran (P1) memakai dialog yang bisa digulir atau halaman sendiri; pilih yang konsisten dengan Tambah akun.
- Pengaman umum: di `src/components/ui/dialog.tsx` dan `alert-dialog.tsx` beri `DialogContent` batas tinggi
  `max-h-[calc(100svh-2rem)]` dan `overflow-y-auto`, supaya dialog lain yang panjang juga bisa digulir.
- Cek di layar laptop 1366×768 dan di ukuran ponsel (375×812).

## P3. "Jawaban penyusun" membingungkan

Faktanya: isian ini **bahan untuk AI** (sumber `[J]` di prompt, `src/modules/led/domain/prompt.ts`). Isian ini tidak
ikut diekspor; yang masuk ke Word adalah **Narasi** (hasil generate yang bisa disunting).

- Ganti label menjadi **"Bahan dari prodi (untuk AI)"**. Keterangan: "Tulis fakta yang belum ada di dokumen: kegiatan,
  nomor dan tanggal SK, angka, rencana. AI memakainya saat menyusun narasi (sumber J). Isian ini tidak ikut diekspor;
  yang diekspor adalah Narasi."
- Placeholder contoh sesuai sub-bagian, misalnya "Contoh: VMTS ditetapkan dengan SK Dekan No. ... tanggal ...;
  disosialisasikan lewat ...".
- Kode sumber "J" di bawah paragraf dan di "Keterangan kode sumber" ditulis "J = Bahan dari prodi".
- Perbarui teks petunjuk halaman kriteria yang masih menyebut "Jawaban penyusun".

## P4. Tata letak halaman sub-bagian terlalu sempit dan penuh (usulan, disetujui Adrianne bila tidak dihapus)

Temuan: ada dua kolom samping bertumpuk (daftar sub-bagian di kanan halaman 16rem, lalu panel 18rem berisi Catatan
asesor, Pemeriksaan otomatis, Verifikasi per kalimat), sehingga editor narasi sempit. Bahan dan hasil bercampur dalam
satu halaman panjang, dan pengguna bingung mana yang dipakai. Garis merah bergelombang di narasi adalah pemeriksa ejaan
browser (bahasa Inggris).

Susunan baru:

1. **Kepala halaman**: C.1 · 2 dari 7 · judul sub-bagian, status, tombol Generate, lalu Sebelumnya/Berikutnya dan
   pemilih sub-bagian berbentuk dropdown ("2 dari 7"). Kolom daftar sub-bagian di kanan dihapus (daftarnya ada di
   dropdown dan di ringkasan kriteria).
2. **Dua tab berurutan**:
   - **1. Bahan untuk AI**: instruksi template (bisa dilipat; terbuka bila narasi belum ada), butir dan daftar cek
     skor 4 (bisa dilipat), data LKPS atau nilai manual dan target, Bahan dari prodi (P3), dan dokumen terkait dari
     Basis Pengetahuan. Di bawahnya tombol "Generate narasi".
   - **2. Narasi (masuk ke Word)**: editor selebar halaman, info versi dan model AI, Riwayat versi.
   Tab awal: Narasi bila sudah ada draf, Bahan bila belum. Isian tetap disimpan sebelum pindah tab atau halaman.
3. **Satu baris "Periksa"** di atas editor berisi tiga tombol berlencana: **Catatan asesor (1)**, **Pemeriksaan (2)**,
   **Verifikasi (8)**. Klik membuka **panel samping yang bisa ditutup** (komponen `Sheet`, lebar ±26rem) dengan isi
   fitur itu; sorotan kalimat di editor tetap seperti sekarang. Panel tidak terbuka sendiri; bila ada catatan asesor
   terbuka, tampilkan pita kuning kecil di atas editor dengan tombol "Lihat catatan".
4. Matikan pemeriksa ejaan browser di editor narasi (`spellcheck="false"` lewat `editorProps.attributes` Tiptap).
5. Tampilan asesor (`/led/asesor/[proyekId]/bagian/...`) memakai susunan yang sama: narasi lebar, catatan di panel
   samping.

Kriteria: di layar 1366×768 dengan sidebar terbuka, lebar editor minimal ±700 px; semua fitur lama tetap bisa
dipakai; uji browser alur catatan asesor (blok teks → catatan → Sudah diperbaiki → Terima) tetap berjalan.

## P5. LED baru: nama tidak ikut berubah saat tahun diganti, dan formulirnya disederhanakan

Temuan: di formulir LED baru, mengganti tahun pengajuan tidak mengubah nama LED. Penyebab: nama otomatis hanya
mengikuti TS, dan TS tidak diubah bila pilihan TS lama masih ada di daftar tahun baru (misalnya 2027 → 2028, TS
2026/2027 ada di kedua daftar).

- Saat tahun pengajuan diganti, **selalu** pilih ulang TS bawaan untuk tahun itu (`tsBawaan`), lalu nama ikut
  diperbarui selama belum diubah sendiri. Nama otomatis memuat tahun pengajuan dan TS:
  "LED {prodi} {tahun pengajuan} (TS {tahun akademik})".
- Sederhanakan (usulan): Tim Prodi yang belum punya LED aktif langsung melihat kartu **"Mulai LED {prodi}"** di
  `/led` berisi dua isian saja (tahun pengajuan dan TS), tanpa isian nama. Nama dibuat otomatis dan bisa diubah di
  Pengaturan LED. Halaman `/led/baru` diarahkan ke `/led`.
- Uji: uji komponen atau uji integrasi untuk nama otomatis setelah tahun diganti; uji `buatProyek` tanpa nama memakai
  nama otomatis.

# Rencana: LED periode berikutnya (2 November 2026)

Disetujui Adrianne. Pertanyaannya: siapa dan bagaimana LED dibuat untuk 5 tahun berikutnya, setelah LED lama
diarsipkan, dan dari mana sistem tahu tanggal akreditasi berakhir. Kerjakan **L1 → L6** berurutan, satu commit per butir,
dengan aturan kerja `docs/RENCANA-REVISI-31OKT.md`. Catat di `docs/CATATAN-PENGEMBANGAN.md` bagian "LED periode
berikutnya (2 Nov 2026)".

## Keadaan sekarang

- Tanggal akreditasi berakhir disimpan di `Prodi.akreditasiBerlakuSampai`, diisi **Admin UPPS** di Program studi → Ubah
  prodi → "Akreditasi berlaku sampai". Peringkat dan nomor SK disimpan di `Prodi.identitas`. Data awal 16 prodi FT
  diisi seed `src/modules/bersama/data/prodi-bawaan.ts` (sumber SAKTI LAM Teknik, 3 Okt 2026).
- Tanggal itu dipakai untuk:
  - mengurutkan prodi;
  - kesiapan (prodi ≤ 12 bulan tanpa LED);
  - usulan batas pengajuan (6 bulan sebelum berakhir);
  - halaman Pantau LED.
- LED baru dibuat **Tim Prodi**. Kartu "Mulai LED" baru muncul setelah LED lama diarsipkan lewat Pengaturan LED.
- Kekurangan:
  - tanggal berakhir hanya diperbarui kalau admin ingat;
  - tidak ada pengingat;
  - kartu Mulai LED tersembunyi selama LED lama aktif;
  - tidak bisa menyalin bahan dari LED lama;
  - akun Tim Prodi bisa sudah usang setelah 5 tahun.

## Siapa melakukan apa (keputusan)

| Kapan | Siapa | Apa |
| --- | --- | --- |
| SK akreditasi keluar | Admin UPPS (Tim Prodi boleh mengusulkan) | **Catat hasil akreditasi** pada LED yang diajukan → tanggal berakhir prodi terisi otomatis |
| 18, 12, dan 6 bulan sebelum berakhir | Sistem | Pengingat di lonceng untuk Tim Prodi prodi itu dan Admin UPPS |
| Sebelum mulai | Admin UPPS | Memastikan akun Tim Prodi masih orang yang tepat; mengaktifkan instrumen terbaru jenjang itu bila ada |
| Mulai | Tim Prodi | **Mulai LED periode berikutnya** (satu tombol): LED lama diarsipkan otomatis, bahan yang dipilih disalin |

## L1. Catat hasil akreditasi dan riwayat akreditasi prodi

Inilah sumber tanggal berakhir. Tanggal tidak hanya diketik di data prodi, tetapi dicatat dari hasil LED yang diajukan,
sehingga siklusnya tertutup.

- Model baru `RiwayatAkreditasi` di `prisma/schema/bersama.prisma`: `{ id, prodiId, lembaga (bawaan "LAM Teknik"),
  peringkat, nomorSk, tanggalSk, berlakuMulai, berlakuSampai, proyekId? (LED yang diajukan), berkasSkLokasi?, dicatatOlehId,
  createdAt }`.
- `Prodi.akreditasiBerlakuSampai`, `identitas.peringkatAkreditasi`, dan `identitas.nomorSkAkreditasi` **diturunkan dari
  riwayat terbaru**. Migrasi membuat satu baris riwayat dari data prodi yang sudah ada (16 prodi seed) supaya tidak ada
  yang hilang.
- Tombol **"Catat hasil akreditasi"**:
  - di Beranda LED yang statusnya Layak diajukan atau sudah diekspor final (untuk Admin UPPS dan Tim Prodi prodi itu);
  - di halaman Program studi (Admin UPPS).

  Isian: peringkat (pilihan "Terakreditasi Unggul", "Terakreditasi", "Tidak Terakreditasi", lainnya), nomor SK, tanggal SK,
  berlaku sampai, dan unggah PDF SK (opsional).
  - Bila Tim Prodi yang mencatat, statusnya "menunggu konfirmasi Admin UPPS"; data prodi baru berubah setelah dikonfirmasi.
  - Bila Admin yang mencatat, langsung berlaku.
- **Bantuan isi dari PDF SK tanpa AI**: baca teks PDF SK, lalu cari pola tanggal ("berlaku sampai dengan tanggal …",
  "sampai dengan …"), nomor SK, dan peringkat. Hasilnya hanya mengisi usulan di formulir; admin tetap memeriksa.
  - Sediakan juga tombol **"Baca dengan AI"** untuk PDF yang polanya tidak dikenali.
  - Tombol AI ini hanya berjalan bila diklik dan menampilkan perkiraan token dulu, sama seperti aturan usulan AI di
    `docs/PERBAIKAN-INSTRUMEN.md` I4.
- Setelah hasil dicatat, LED yang diajukan otomatis diarsipkan, dengan label "Diajukan {tahun} · {peringkat}".
- Halaman prodi menampilkan **Riwayat akreditasi** (tabel per periode, dengan tautan ke LED dan SK).
- Ubah prodi tetap bisa mengoreksi tanggal secara langsung untuk Admin UPPS. Koreksi itu dicatat sebagai riwayat jenis
  "koreksi manual" dengan alasan wajib.

## L2. Pengingat otomatis

- Pekerjaan worker harian `pengingat-akreditasi` (antrean bersama, dijadwalkan seperti cadangan harian) mencari prodi
  yang akreditasinya berakhir dalam **18, 12, atau 6 bulan** dan belum punya LED aktif untuk periode berikutnya. LED untuk
  periode berikutnya adalah LED yang dibuat setelah tanggal SK terakhir.
- Kirim pemberitahuan lonceng ke semua akun Tim Prodi aktif prodi itu dan ke Admin UPPS, **sekali per ambang**. Tandai
  yang sudah terkirim di tabel `PengingatTerkirim { prodiId, berlakuSampai, ambang }`.
  - Contoh: "Akreditasi Sarjana Teknik Elektro berakhir 20 Agu 2030 (12 bulan lagi). Mulai LED periode berikutnya."
  - Tautan untuk Tim Prodi: `/led`. Tautan untuk Admin: `/led/pantau`.
- Halaman Pantau LED: lencana **"Perlu LED baru"** dan tombol **"Ingatkan Tim Prodi"** (mengirim pemberitahuan
  langsung).
- Fungsi murni `ambangPengingat(berlakuSampai, hariIni)` dan `perluLedBaru(...)` di domain, dengan uji.

## L3. Akun Tim Prodi sebelum periode baru

- Di Pantau LED dan di pengingat Admin, tampilkan akun Tim Prodi prodi itu beserta **login terakhir**.
  - Prodi tanpa Tim Prodi aktif ditandai "Belum ada akun Tim Prodi".
  - Prodi yang semua akunnya tidak login lebih dari 12 bulan ditandai "Periksa akun Tim Prodi".
- Tautan cepat ke Tambah akun (prodi sudah terpilih) dan ke Kelola akun dengan saringan prodi.

## L4. Tombol "Mulai LED periode berikutnya"

- Di `/led` (Tim Prodi), tombol ini **selalu terlihat** bila prodi sudah punya LED aktif dan salah satu syarat terpenuhi:
  - akreditasi berakhir ≤ 18 bulan lagi;
  - LED aktif sudah tercatat hasil akreditasinya (L1);
  - LED aktif berstatus Layak diajukan atau sudah diekspor final.

  Dalam keadaan lain, tombol tetap ada di Pengaturan LED dengan peringatan bahwa LED aktif belum selesai.
- Langkah:
  1. Isi tahun pengajuan dan TS, seperti kartu Mulai LED.
  2. Pilih bahan yang disalin (L5).
  3. Konfirmasi: "LED {lama} akan diarsipkan (tetap bisa dibuka dan diekspor). LED baru memakai instrumen {versi aktif}."
- Dalam satu transaksi: arsipkan LED lama, buat LED baru, salin bahan. Bila instrumen jenjang belum aktif atau ada
  generate berjalan, tolak dengan pesan yang jelas. Proses dibatalkan seluruhnya, jadi LED lama tidak terlanjur
  diarsipkan.
- Tetap satu LED aktif per prodi.

## L5. Salin bahan dari LED lama

Pilihan berupa kotak centang, semuanya terpilih kecuali yang ditandai.

- **Tim penyusun** (Tabel 2.1/2.2): disalin, lalu ditandai "periksa ulang".
- **Dokumen prodi di Basis Pengetahuan**: daftar dokumen LED lama dengan tahun terbitnya, dipilih satu per satu.
  - Dokumen lebih tua dari 5 tahun tidak dicentang secara bawaan.
  - Berkas disalin (bukan dipindah), lalu diproses ulang (embedding) lewat antrean.
- **Bahan dari prodi** (isian untuk AI): disalin per sub-bagian dengan kode yang sama.
  - Bila instrumen berganti, cocokkan lewat judul sub-bagian (`kunciTeks`).
  - Yang tidak cocok ditampilkan sebagai daftar "Bahan lama yang belum dipindah" untuk disalin manual.
  - Teks salinan diberi awalan "[dari LED {tahun}]" supaya Tim Prodi memperbaruinya.
- **Narasi lama: tidak disalin** ke narasi baru, karena instrumen dan kriterianya bisa berbeda. Sebagai gantinya:
  - Di halaman sub-bagian (tab Bahan) ada panel lipat **"Narasi LED periode lalu"** berisi narasi final sub-bagian yang
    sama atau yang judulnya mirip (hanya baca, bisa disalin manual).
  - Opsi (bawaan mati): pakai narasi lama sebagai sumber `P` di prompt, khusus sub-bagian evaluasi capaian dan
    perbaikan, dengan pesan sistem "periode lalu: gunakan untuk membandingkan, bukan disalin".
- Data LKPS **tidak** disalin, karena TS-nya berbeda; Tim Prodi mengunggah LKPS baru.

## L6. Uji dan dokumen

- **Uji domain:** ambang pengingat 18/12/6 bulan, `perluLedBaru`, pencocokan bahan lintas versi instrumen, dan pola
  baca SK (fikstur teks SK fiktif).
- **Uji integrasi:**
  - catat hasil (Admin langsung berlaku; Tim Prodi menunggu konfirmasi);
  - riwayat menurunkan tanggal prodi;
  - pengingat terkirim sekali per ambang;
  - Mulai LED periode berikutnya mengarsipkan yang lama dan menyalin bahan yang dipilih;
  - kegagalan di tengah tidak mengarsipkan LED lama;
  - Tim Prodi prodi lain tidak bisa melakukan semua ini.
- **Uji browser:** Admin mencatat hasil → lonceng Tim Prodi menerima pengingat (jalankan pekerjaan harian secara manual
  di uji) → Tim Prodi menekan Mulai LED periode berikutnya → LED baru berisi tim dan bahan yang disalin.
- **Dokumen:**
  - `CLAUDE.md`: keputusan butir 2, bagian LED per periode;
  - `docs/PANDUAN-PENGGUNAAN.md`: Admin UPPS (catat hasil, pengingat, akun) dan Tim Prodi (mulai periode berikutnya);
  - `docs/SPESIFIKASI.md`: tabel menu.

# Spesifikasi sistem penyusun LED LAM Teknik

Ringkasan teknis dari dokumen rencana (https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5).
Bila ada yang bertentangan, dokumen rencana yang terbaru yang berlaku; catat perbedaannya di `CATATAN-PENGEMBANGAN.md`.

## 1. Alur kerja

Revisi 19 Okt 2026: peran Admin (akun PJ, kunci API) dan Penanggung jawab fakultas (PJ); instrumen diunggah PJ per
jenjang; satu sub-bagian satu halaman. Revisi 22 Okt 2026: peran ketiga **Asesor** (review real time, skor 0–4,
Layak diajukan), Basis Pengetahuan, rujukan dan Daftar Rujukan di Word, verifikasi per kalimat, konsistensi angka,
target dan capaian, kesiapan dan jadwal kerja mundur, ekspor DRAF, server produksi dan cadangan harian. Revisi 31 Okt
2026 (masukan Pak Tris 6): peran **Admin UPPS**, **Tim Prodi** (akun per prodi), **Asesor**; 16 prodi FT Unila sudah
terisi; LED baru berfokus pada TS; Penilaian di depan dengan usulan skor AI; Susun seluruh LED; jadwal hanya pengingat;
model AI disebut; LKPS PDF per tabel. Rincian di `CATATAN-PENGEMBANGAN.md`.

1. Admin UPPS melengkapi identitas fakultas dan program studi (16 prodi FT Unila sudah terisi), membuat akun Tim Prodi
   per prodi dan akun asesor, mengunggah instrumen per jenjang (Template LED, Matriks Penilaian, Pedoman Penilaian),
   memeriksa hasil ekstraksi dan mengaktifkannya, mengisi kunci API, dan mengunggah Basis Pengetahuan fakultas.
2. Tim Prodi membuat LED prodinya: tahun pengajuan dan TS (dua pilihan: (P−1)/P atau (P−2)/(P−1)); nama, instrumen,
   dan prodi ditentukan otomatis. Tim Prodi melengkapi identitas prodi.
3. Tim Prodi mengunggah LKPS (Excel, atau PDF per tabel sekaligus) dan dokumen pendukung, lalu mengisi jawaban per
   sub-bagian (pertanyaan = instruksi resmi template) dan nilai hitung butir angka yang tidak punya rumus.
4. Sistem memproses dokumen (ekstrak, potong, embedding).
5. **Susun seluruh LED** (C.1–C.7, Bab II, III, I, IV, lalu kata pengantar dan ringkasan), Generate semua per kriteria,
   atau satu sub-bagian; Tim Prodi memeriksa, menyunting, mengulang sampai sesuai, lalu menandai kriteria selesai.
6. **Perkiraan nilai**: usulan skor AI per butir narasi (rubrik) dan skor sistem butir angka; Tim Prodi memperbaiki
   narasi pada butir yang unsurnya masih kurang, lalu Ajukan review.
7. Asesor mereview (catatan revisi pada teks, terima perbaikan), menilai di halaman **Penilaian** sambil membaca narasi,
   lalu menyatakan Layak diajukan atau Perlu revisi. Admin UPPS memantau semua LED (hanya baca).
8. Hitung halaman (≤ 150 termasuk cover) lalu Tim Prodi mengunduh berkas Word final. Unggah ke LAM Teknik dilakukan
   manual oleh prodi.

## 2. Struktur isian dan butir penilaian

- Setiap kriteria punya lima sub-bagian: 1 Latar belakang, 2 Kebijakan, 3 Indikator Kinerja Utama (butir a, b, c, …),
  4 Analisis faktor keberhasilan dan penghambat, 5 Strategi perbaikan (SWOT).
- Sub-bagian menyimpan instruksi template per varian jenjang (`varian[].instruksi`, `varian[].jenjang`) dan
  `berlakuUntuk`. Tampilkan hanya sub-bagian yang berlaku untuk jenjang proyek.
- Butir penilaian disimpan per jenjang (Sarjana: 60 butir, 72 baris karena 12 butir punya sub I/II; bobot total 100).
  Setiap butir: bobot, jenis (narasi/angka), deskriptor skor 4–0, unsur skor 4 (deskriptor skor 4 dipecah per nomor),
  tabel LKPS, rumus lama (`kodeRumus`, kosong = nilai diisi manual), pemetaan ke sub-bagian. Pertanyaan pemandu dan
  dokumen yang diharapkan buatan sendiri tidak dipakai lagi (revisi 19 Okt 2026).
- Untuk Sarjana, setiap sub-bagian IKU dipetakan ke tepat satu baris butir. Butir 58 dipecah: 58-I ke Bab II.B,
  58-II ke Bab III.1 (bobot 1,46 + 1,46, asumsi).
- Catatan template yang janggal (sudah ditangani di seed): sub-bagian "Kualifikasi akademik DTPS" ditandai khusus PPI di
  template tetapi dinilai untuk Sarjana (butir 27); huruf "l" (Tracer study) tidak tercetak. Pedoman Penyusunan LED
  menyebut "C. Profil UPPS" di Bab II, sedangkan template tidak memuatnya; ikuti template.

## 3. Mesin penyusun (RAG)

- Satu panggilan LLM = satu sub-bagian. Tombol "Generate kriteria" menjalankan semua sub-bagian kriteria itu berurutan
  lewat antrean: IKU dulu, lalu latar belakang dan kebijakan, lalu analisis faktor (memakai ringkasan IKU), terakhir SWOT.
- Konteks per panggilan (`KonteksSubBagian` di `src/modules/led/domain/prompt.ts`):
  - instruksi sub-bagian sesuai jenjang;
  - butir terkait: deskriptor dan unsur skor 4;
  - Bahan dari prodi (untuk AI), isian per sub-bagian yang tidak ikut diekspor (sumber `J`, label "J = Bahan dari
    prodi"; label blok di prompt tetap "JAWABAN PENYUSUN");
  - metrik yang dihitung sistem dari LKPS (sumber `M-…`), label TS sudah diganti tahun nyata;
  - tabel LKPS yang dirujuk butir, ringkas (sumber `T-…`);
  - potongan dokumen hasil pencarian (sumber `D…`): disaring per proyek dan sub-bagian (plus dokumen umum), pencarian
    gabungan vektor + kata kunci (reciprocal rank fusion), ambil 6–8 potongan teratas;
  - target kata dari anggaran.
- Keluaran terstruktur (`SKEMA_KELUARAN`): paragraf + sumber, status unsur, dokumen yang masih kurang, catatan.
- Pemeriksaan otomatis setelah generate:
  - panjang ±15% dari target (`statusPanjang`);
  - angka di narasi harus ada di metrik/tabel/jawaban/potongan (`angkaTidakBerdasar`);
  - setiap paragraf punya sumber yang dikenal; setiap unsur dilaporkan (`periksaKeluaran`).
  Yang gagal ditandai; pengguna memilih menyunting atau generate ulang.
- Unsur tanpa bukti ditulis dengan penanda `[BELUM ADA BUKTI: …]`; ekspor ditolak selama penanda masih ada.
- Butir berjenis angka: tabel ringkas (dibuat sistem, bukan LLM) + 1–2 paragraf analisis.
- Simpan nama model, tanggal, dan keluaran mentah di setiap versi hasil (untuk uji ulang).

## 4. Anggaran halaman dan kata

Lihat `src/modules/led/domain/anggaran.ts` (teruji). Bawaan: awal 8, Bab I 6, II.A 2, II.B 5, C.1 4, C.2 8, C.3 29, C.4 11,
C.5 10, C.6 20, C.7 21, Bab III 14, Bab IV 2, cadangan 10 = 150 halaman. 425 kata per halaman untuk perencanaan.
Semua angka disimpan sebagai pengaturan proyek (bisa diubah tanpa mengubah kode).

## 5. Data LKPS

- Template LKPS: versi lamteknik.or.id 2025 skema Pasca Terakreditasi Pertama dan Unggul (sheet `1`, `2a1`–`2a3`, `2b`,
  `3a1`–`3a5`, `3b`, `3c`, `4a`–`4k`, `5a`–`5c`, `6a`–`6i`, `7a`, `7b`). Template di folder lpmpp (struktur lama
  9 kriteria) tidak dipakai.
- Berkas tidak boleh diubah nama sheet dan strukturnya (Peringatan Pengisian LKPS). Validasi sheet yang hilang.
- Label TS, TS-1, … disimpan apa adanya; tahun nyata dihitung dari `tsTahunMulai` proyek.
- Pembaca LKPS dibuat sebagai modul tersendiri supaya kelak bisa diganti dengan membaca basis data sistem LKPS.

## 6. Spesifikasi ekspor Word

Ekspor mengisi template LEDPS resmi, bukan membuat dokumen baru. Format halaman mengikuti Petunjuk Penulisan LED
(bukan format skripsi Unila).

| Aspek | Aturan |
| --- | --- |
| Kertas dan margin | A4; margin mengikuti template (atas/bawah 2,03 cm, kiri 2,16 cm, kanan 1,7 cm) |
| Huruf | Bawaan template: Arial 11 (gaya Normal). Satu jenis untuk seluruh dokumen |
| Spasi | 1,15 |
| Perataan | Paragraf justify; judul mengikuti gaya template |
| Judul | Gaya template: `IJudulBesar` (I. Judul Besar), `IISubJudul`, `Heading2`, `Heading3`, gaya kriteria `C1DiferensiasiMisiVisi` |
| Tebal/miring | Tebal hanya judul dan penekanan yang disengaja; istilah asing miring |
| Tabel | Judul di atas, bernomor per bab (Tabel 2.1, …); baris judul kolom tebal dan diulang di halaman berikut |
| Gambar | Berkas asli yang diunggah, rasio dipertahankan, lebar maks 17,1 cm; judul di bawah, bernomor per bab |
| Angka | Desimal koma, ribuan titik, tahun akademik 2025/2026 |
| Isi sub-bagian | Narasi menggantikan instruksi template, catatan biru "(… disampaikan oleh pengusul …)", dan kotak isian kosong; judul bernomor template tetap; narasi sejajar (indentasi kiri sama) dengan instruksi yang digantikannya |
| Halaman awal | Logo dan perwajahan template tidak diubah |
| Daftar isi/tabel/gambar | Field otomatis, diperbarui saat dokumen dibuka |

Penyiapan template (keputusan Adrianne, 2 Okt 2026): untuk setiap sub-bagian, semua isi di bawah judul sampai judul
berikutnya diganti satu placeholder `{{kode}}`, pemisah halaman/bagian dipertahankan, indentasi kiri instruksi dicatat.
Sub-bagian yang tidak berlaku untuk jenjang proyek dihapus beserta judulnya. Contoh kerja: `docs/spike-ekspor/`.

Cara menjaga format: narasi disimpan sebagai JSON Tiptap (paragraf, tebal, miring, daftar, tabel, gambar), lalu
dipetakan ke gaya template saat ekspor. Pengguna tidak memformat manual.

Pemeriksaan sebelum ekspor: semua bagian terisi dan ditandai selesai; ≤ 150 halaman sebelum judul LAMPIRAN (hitung
lewat LibreOffice; Lampiran tidak dihitung); tidak ada penanda "belum ada bukti"; setiap tabel dan gambar berjudul.
Ekspor final juga mensyaratkan status review **Layak diajukan**, tautan bukti untuk setiap dokumen yang dirujuk, dan
setiap perbedaan angka antar kriteria diperbaiki atau diberi alasan. Ekspor DRAF boleh kapan saja (bertanda DRAF,
pemeriksaan hanya peringatan). Setiap paragraf diberi rujukan singkat; Daftar Rujukan ditambahkan di Lampiran.

## 7. Antarmuka

Sidebar kiri (bisa diciutkan menjadi ikon; menjadi laci di layar kecil), area kerja kanan. Satu layar satu tugas,
progres selalu terlihat. Bahasa Indonesia.

Satu website dua modul (31 Okt 2026): setelah login, ketiga peran membuka halaman awal **Pilih modul** (`/`) dengan
kartu LKPS (`/lkps`) dan LED (Admin UPPS `/led/pantau`, Tim Prodi `/led`, asesor `/led/asesor`) serta keterangan model
AI yang dipakai; kepala halaman berisi tombol **LKPS | LED** dan ikon kembali ke halaman awal. Revisi 31 Okt 2026: menu
per peran. Admin UPPS: grup **Pengaturan UPPS** (Kelola akun, Program studi, Kunci API, Penugasan asesor), grup **LED**
(Pantau LED, Instrumen, Basis Pengetahuan fakultas), grup **LKPS** (kosong dulu). Tim Prodi: menu LED prodi dan
Identitas prodi, lalu menu LED ini. Asesor: LED ditugaskan, lalu Penilaian dan Ringkasan review. Membuka alamat milik
peran lain diarahkan ke halaman awal. Menu LKPS diisi saat modul LKPS digabung (masih kerangka).

| Menu | Isi | Peran |
| --- | --- | --- |
| Pilih modul (halaman awal) | Kartu LKPS dan LED, model AI; Admin UPPS juga Pengaturan UPPS; Tim Prodi melihat nama prodinya | Semua |
| Kelola akun | Tambah akun di halaman sendiri `/admin/akun/tambah` (Tim Prodi wajib memilih prodi; satu prodi boleh beberapa akun), kolom program studi; menu baris: Ubah nama, Ubah peran (sesi akun dicabut, tercatat di log; admin tidak bisa mengubah peran sendiri; minimal satu Admin UPPS aktif), pindah prodi, atur ulang sandi, nonaktifkan, hapus; status cadangan terakhir | Admin UPPS |
| Program studi | Identitas fakultas, 16 prodi FT Unila (bisa ditambah), urut akreditasi berakhir, jumlah akun Tim Prodi; per prodi: Riwayat akreditasi (Konfirmasi/Tolak catatan Tim Prodi), Catat hasil akreditasi (isi dari PDF SK tanpa AI atau Baca dengan AI), alasan koreksi wajib bila data akreditasi diubah langsung | Admin UPPS |
| Kunci API (tab Kunci, Model Gemini, Log) | Kunci utama fakultas dan kunci cadangan dalam satu halaman, model narasi/cadangan/embedding, pemakaian token | Admin UPPS |
| Penugasan asesor | Satu asesor per LED | Admin UPPS |
| Pantau LED | LED aktif semua prodi: kesiapan, jadwal, status review, asesor, tombol Lihat (hanya baca); Catat hasil akreditasi pada LED Layak diajukan/ekspor final; lencana Perlu LED baru dan tombol Ingatkan Tim Prodi; akun Tim Prodi dengan login terakhir, tanda Belum ada akun / Periksa akun, tautan Tambah akun dan Kelola akun per prodi | Admin UPPS |
| Instrumen | Instrumen per jenjang: unggah berkas, ekstraksi, periksa hasil, aktifkan | Admin UPPS |
| Basis Pengetahuan fakultas | Dokumen bersama yang dipakai semua LED (kode sumber U); Tim Prodi melihatnya lewat tab di Basis Pengetahuan LED | Admin UPPS |
| LED prodi | LED aktif (kartu) dan arsip prodi akun (dengan label "Diajukan {tahun} · {peringkat}"); kartu "Mulai LED periode berikutnya" bila syaratnya terpenuhi (≤ 18 bulan, Layak diajukan, ekspor final, atau hasil dicatat): tahun, TS, bahan yang disalin, konfirmasi; bila belum ada LED aktif, kartu "Mulai LED {prodi}": tahun pengajuan dan dua pilihan TS saja (TS bawaan dipilih ulang setiap tahun diganti), nama otomatis "LED {prodi} {tahun} (TS {tahun akademik})" yang bisa diubah di Pengaturan LED; `/led/baru` diarahkan ke `/led` | Tim Prodi |
| Identitas prodi | SK pendirian/pembukaan, akreditasi, alamat, kontak (nama dan jenjang diatur Admin UPPS) | Tim Prodi |
| Beranda LED | Susun seluruh LED, kartu Perkiraan nilai, review asesor, jadwal kerja (hanya pengingat), status kunci API, halaman otomatis dari data dan data yang masih kosong, Hasil akreditasi (Catat hasil akreditasi), Bahan lama yang belum dipindah, Pengaturan LED (TS, nama, arsip, periode kecil, LED periode berikutnya) | Tim Prodi |
| Perkiraan nilai | Ringkasan total, persen, perkiraan status, batang per kriteria; tabel per kriteria (skor otomatis AI/sistem, skor asesor, nilai, persentase), narasi tiap butir, tombol Hitung usulan skor | Tim Prodi |
| Data LKPS | Unggah Excel atau banyak PDF per tabel, tabel terbaca/belum ada, hasil baca per tabel, sumber nilai butir angka | Tim Prodi |
| Kriteria C.1 … C.7 dan bab lain | Ringkasan kriteria + satu halaman per sub-bagian: kepala (kode · n dari m · judul, status, Generate, Sebelumnya, pemilih dropdown "n dari m", Berikutnya), tab "1. Bahan untuk AI" (instruksi dan butir/daftar cek skor 4 yang bisa dilipat, data LKPS/nilai manual/target, Bahan dari prodi, dokumen, Generate narasi) dan tab "2. Narasi (masuk ke Word)" (editor selebar halaman tanpa periksa ejaan, versi dan model AI, Selesai, Riwayat versi); baris Periksa (Catatan asesor, Pemeriksaan, Verifikasi) membuka panel samping ± 26rem; pita kuning bila ada catatan asesor terbuka | Tim Prodi |
| Basis Pengetahuan, Tim penyusun | Tab Dokumen LED ini / Dokumen bersama fakultas (hanya baca), lihat potongan, uji cari, tahun, tautan bukti; tim penyusun | Tim Prodi |
| Ekspor Word | Pemeriksaan sebelum ekspor, ekspor DRAF dan final, jumlah halaman, unduh .docx | Tim Prodi |
| LED ditugaskan | LED dari Admin UPPS, status review, catatan yang menunggu | Asesor |
| Penilaian (item pertama LED ini) | Halaman yang sama dengan Perkiraan nilai: pilih skor 0–4 per butir sambil membaca narasi, total berubah langsung, alasan bila berbeda dari skor sistem, Layak diajukan / Perlu revisi | Asesor (Admin UPPS hanya baca) |
| Ringkasan review, sub-bagian | Susunan sub-bagian sama dengan Tim Prodi (narasi selebar halaman, baris Periksa dengan panel Catatan asesor, pita kuning bila ada catatan sudah diperbaiki); blok teks → catatan revisi, Bandingkan, Terima, Buka lagi, Balas | Asesor (Admin UPPS hanya baca) |

Aturan tampilan: komponen shadcn/ui; teks isi ≥ 14 px, kontras WCAG AA; lencana status (belum, draf, selesai) di menu
kriteria; simpan otomatis + peringatan saat meninggalkan halaman yang belum tersimpan; proses lama tampil sebagai
notifikasi, bukan layar menunggu; pesan galat bahasa sehari-hari dengan langkah berikutnya; konfirmasi hanya untuk
aksi menghapus/menimpa.

## 8. Kunci API, privasi, dan keamanan

- Alur kunci dan rotasi: `src/modules/bersama/domain/kunci-api.ts`. Galat 429 per menit = tunggu lalu ulangi kunci yang sama;
  galat harian = tandai kunci habis sampai reset; kunci tidak valid = nonaktif sampai diganti.
- Kunci dienkripsi AES-256-GCM (`ENCRYPTION_KEY`), hanya didekripsi di server/worker, tampil 4 karakter terakhir.
- Layanan gratis Gemini: Google boleh memakai isi permintaan untuk pengembangan produk dan peninjau manusia bisa
  membacanya; Google meminta tidak mengirim data pribadi/rahasia. Layanan berbayar tidak memakai data untuk itu.
  Untuk data asli prodi: kunci berbayar, atau samarkan data pribadi sebelum dikirim (usulan U-03).
- Yang dikirim ke LLM hanya potongan dan tabel yang relevan untuk sub-bagian yang sedang disusun.
- Kata sandi di-hash (Better Auth). Data antarprodi terpisah (filter `prodiId`). Jejak audit di `LogAktivitas`.

## 9. Kebutuhan non-fungsional

Kunci API tidak pernah ke browser; data antarprodi terpisah; jejak audit; proses berat lewat antrean yang bisa
dilanjutkan; antarmuka Bahasa Indonesia dengan sidebar; kata sandi di-hash; hasil ekspor terbuka rapi di Microsoft Word.

# Spesifikasi sistem penyusun LED LAM Teknik

Ringkasan teknis dari dokumen rencana (https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5).
Bila ada yang bertentangan, dokumen rencana yang terbaru yang berlaku; catat perbedaannya di `CATATAN-PENGEMBANGAN.md`.

## 1. Alur kerja

Revisi 19 Okt 2026: peran Admin (akun PJ, kunci API) dan Penanggung jawab fakultas (PJ); instrumen diunggah PJ per
jenjang; satu sub-bagian satu halaman. Revisi 22 Okt 2026: peran ketiga **Asesor** (review real time, skor 0–4,
Layak diajukan), Basis Pengetahuan, rujukan dan Daftar Rujukan di Word, verifikasi per kalimat, konsistensi angka,
target dan capaian, kesiapan dan jadwal kerja mundur, ekspor DRAF, server produksi dan cadangan harian. Rincian di
`CATATAN-PENGEMBANGAN.md`.

1. Admin membuat akun PJ fakultas. PJ mengisi identitas fakultas dan program studi, lalu mengunggah instrumen per
   jenjang (Template LED, Matriks Penilaian, Pedoman Penilaian), memeriksa hasil ekstraksi, dan mengaktifkannya.
2. PJ membuat LED per periode 5 tahun (prodi, tahun pengajuan, nama); instrumen dan TS ditentukan otomatis.
3. PJ mengunggah LKPS dan dokumen pendukung, lalu mengisi jawaban per sub-bagian (pertanyaan = instruksi resmi template)
   dan nilai hitung butir angka yang tidak punya rumus.
4. Sistem memproses dokumen (ekstrak, potong, embedding).
5. Generate semua (per kriteria) atau satu sub-bagian; PJ memeriksa, menyunting, mengulang sampai sesuai,
   lalu menandai kriteria selesai.
6. Setelah C.1–C.7 selesai: generate Bab II.B, Bab III, Bab I, Bab IV, ringkasan eksekutif, kata pengantar
   (bagian yang merangkum isi lain dikerjakan paling akhir).
7. Hitung halaman (≤ 150 termasuk cover) lalu unduh berkas Word. Unggah ke LAM Teknik dilakukan manual oleh prodi.

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
- Konteks per panggilan (`KonteksSubBagian` di `src/lib/domain/prompt.ts`):
  - instruksi sub-bagian sesuai jenjang;
  - butir terkait: deskriptor dan unsur skor 4;
  - jawaban penyusun dari form (sumber `J`);
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

Lihat `src/lib/domain/anggaran.ts` (teruji). Bawaan: awal 8, Bab I 6, II.A 2, II.B 5, C.1 4, C.2 8, C.3 29, C.4 11,
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

| Menu | Isi | Peran |
| --- | --- | --- |
| Akun PJ | Akun penanggung jawab, asesor, dan admin; atur ulang sandi, nonaktifkan; status cadangan terakhir | Admin |
| Penugasan asesor | Satu asesor per LED | Admin |
| Kunci API (tab Kunci, Model Gemini, Log pemakaian) | Kunci cadangan, model narasi/cadangan/embedding, pemakaian token | Admin |
| Semua LED | LED dikelompokkan per prodi, label periode, LED baru | PJ fakultas |
| Program studi | Identitas fakultas, daftar prodi (urut akreditasi berakhir) | PJ fakultas |
| Instrumen | Instrumen per jenjang: unggah berkas, ekstraksi, periksa hasil, aktifkan | PJ fakultas |
| Basis Pengetahuan fakultas | Dokumen bersama yang dipakai semua LED (kode sumber U) | PJ fakultas |
| Kunci API fakultas | Daftar kunci, status, tambah kunci, uji koneksi | PJ fakultas |
| Beranda LED | Progres, periode akreditasi, Pengaturan LED (TS, nama, arsip) | PJ fakultas |
| Data LKPS | Unggah Excel/PDF, hasil baca per tabel, sumber nilai butir angka | PJ fakultas |
| Kriteria C.1 … C.7 dan bab lain | Ringkasan kriteria + satu halaman per sub-bagian (instruksi, butir dan daftar cek skor 4, data LKPS/nilai manual, jawaban, dokumen, hasil generate dan riwayat); Sebelumnya/Berikutnya | PJ fakultas |
| Basis Pengetahuan, Tim penyusun | Tab Dokumen LED ini / Dokumen bersama fakultas, lihat potongan, uji cari, tahun, tautan bukti; tim penyusun | PJ fakultas |
| Ekspor Word | Pemeriksaan sebelum ekspor, ekspor DRAF dan final, jumlah halaman, unduh .docx | PJ fakultas |
| LED ditugaskan, Ringkasan review | LED dari admin, status review, catatan yang menunggu | Asesor |
| Sub-bagian (hanya baca) | Blok teks → catatan revisi, Bandingkan, Terima, Buka lagi, Balas | Asesor |
| Penilaian akhir | Skor 0–4 per butir dengan deskriptor, nilai akhir dan perkiraan status, Layak diajukan / Perlu revisi | Asesor |

Aturan tampilan: komponen shadcn/ui; teks isi ≥ 14 px, kontras WCAG AA; lencana status (belum, draf, selesai) di menu
kriteria; simpan otomatis + peringatan saat meninggalkan halaman yang belum tersimpan; proses lama tampil sebagai
notifikasi, bukan layar menunggu; pesan galat bahasa sehari-hari dengan langkah berikutnya; konfirmasi hanya untuk
aksi menghapus/menimpa.

## 8. Kunci API, privasi, dan keamanan

- Alur kunci dan rotasi: `src/lib/domain/kunci-api.ts`. Galat 429 per menit = tunggu lalu ulangi kunci yang sama;
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

> **Digantikan oleh `docs/RENCANA-10NOV.md` (6 Nov 2026).** Jangan jalankan rencana ini; isinya sudah masuk ke rencana baru.

# Rencana 5 November 2026: model bawaan, data uji pencarian, rumus semua jenjang, OCR

Keputusan Adrianne (5 Nov 2026):

- Naskah skripsi mengikuti sistem.
- Butir angka harus dihitung otomatis di **semua jenjang**, bukan hanya Sarjana.
- OCR untuk PDF hasil pindai: N4 dikerjakan hanya bila Adrianne menyatakan setuju di prompt.

Kerjakan **N1 → N3** berurutan, lalu **N4** bila diminta. Aturan kerja sama dengan `docs/RENCANA-REVISI-31OKT.md`:

- branch `revisi-31okt`;
- lint, typecheck, `test:unit`, dan `test:integrasi` lulus setiap tahap;
- migrasi dengan cara di `CLAUDE.md`;
- batas modul dijaga;
- berhenti dan tanya bila ada yang bertentangan.

Satu commit atau lebih per tahap, misalnya `Rencana 5 Nov N1: model bawaan gemini-3.8-flash`. Catat di
`docs/CATATAN-PENGEMBANGAN.md` bagian baru "Rencana 5 November 2026".

## N1. Model narasi bawaan `gemini-3.8-flash`

Skripsi (Batasan Masalah) menyebut Gemini 3.8 Flash, sedangkan bawaan kode masih `gemini-3-flash-preview`. Model
*preview* bisa dihentikan Google. Daftar model Gemini API per 28 Okt 2026 mencantumkan `gemini-3.8-flash` sebagai stabil.

- Ganti `MODEL_NARASI_BAWAAN` di `src/modules/bersama/data/kunci-api.ts` menjadi `gemini-3.8-flash`. Perbarui semua
  komentar dan teks yang masih menyebut `gemini-3-flash-preview` sebagai bawaan.
- Data yang sudah ada: bila baris pengaturan `utama` masih memakai `gemini-3-flash-preview`, ubah ke `gemini-3.8-flash`
  lewat migrasi data atau seed idempoten. Model yang sengaja dipilih Admin selain itu tidak diubah.
- Halaman Kunci API → Model Gemini: tampilkan peringatan ringan bila model yang dipilih berakhiran `-preview`.
- Model *embedding* tetap `gemini-embedding-001` (768 dimensi, dinormalkan, *task type* RETRIEVAL_DOCUMENT/QUERY). Jangan
  diganti ke `gemini-embedding-2`, karena Batasan Masalah menyebut `001` dan semua potongan harus diproses ulang.
- Uji: seed/migrasi tidak menimpa pilihan Admin; label model di versi draf tetap tercatat.
- Uji manual (dicatat, tidak otomatis): satu kali generate sub-bagian dengan kunci asli memakai `gemini-3.8-flash`.

## N2. Data uji pencarian (untuk rumusan masalah 2 skripsi)

Rumusan masalah 2 mengukur kinerja tahap pengambilan dokumen dengan *precision* dan *recall* terhadap potongan yang
dilabel relevan oleh manusia. Saat ini versi draf hanya menyimpan teks sumber yang dipakai, tanpa peringkat. Peringkat
hanya terlihat di "Uji cari".

1. **Simpan hasil pencarian di setiap versi draf.**
   - Saat generate, simpan di `VersiDraf.pemeriksaan` (atau kolom JSON baru `pencarian`): teks kueri (`kueriGenerate`),
     kueri kata kunci, `k`, dan daftar kandidat.
   - Setiap kandidat berisi `potonganId`, `dokumenId`, peringkat vektor, peringkat kata kunci, peringkat gabungan, skor
     RRF, dan apakah masuk konteks.
   - Tidak mengubah prompt dan hasil narasi.
2. **Ekspor CSV untuk pelabelan** (Tim Prodi pada LED sendiri, Admin UPPS untuk semua LED).
   - Letak: tab Basis Pengetahuan → "Unduh data uji pencarian".
   - Isi per sub-bagian yang sudah punya draf: kumpulan kandidat (*pooling*) berupa gabungan 20 teratas pencarian
     vektor dan 20 teratas pencarian kata kunci, tanpa duplikat. Kueri dijalankan ulang memakai kueri yang tersimpan.
   - Kolom:

     `led, sub_bagian, judul_sub_bagian, butir, kueri, potongan_id, dokumen, halaman, peringkat_gabungan,
     peringkat_vektor, peringkat_kata_kunci, masuk_konteks, cuplikan (≤ 300 karakter), relevan, catatan`.

     Kolom `relevan` dan `catatan` dikosongkan untuk diisi manusia (1/0).
3. **Skrip hitung** `scripts/hitung-retrieval.ts` (tidak di antarmuka):
   - membaca CSV yang sudah dilabel;
   - menghitung *precision*@k dan *recall*@k per sub-bagian untuk k = 1, 3, 5, dan k sistem (6–8), serta rata-ratanya;
   - menulis CSV ringkasan.

   *Recall* dihitung terhadap semua potongan berlabel relevan di kumpulan kandidat (catat batasan ini di keluaran). Baris
   tanpa label dilewati dan dihitung jumlahnya.
4. **Uji:** fikstur kecil dengan label buatan, hasil *precision* dan *recall* dibandingkan dengan hitungan tangan di
   `docs/uji/hitungan-manual-retrieval.md`.
5. **Batas:**
   - jangan mengirim apa pun ke LLM di tahap ini;
   - label tidak pernah dibuat sistem;
   - Tim Prodi hanya bisa mengunduh LED prodinya.

## N3. Rumus butir angka untuk semua jenjang

Saat ini rumus otomatis hanya untuk butir angka Sarjana (katalog 33 rumus, `metrik-lkps.ts`, `butir-angka.ts`). Jenjang
lain beralih ke nilai manual. Matriks Penilaian 2025 memakai metrik yang sama di banyak butir, tetapi **ambang skornya
berbeda per jenjang** dan sebagian tabel LKPS berbeda. Contoh:

| Metrik | Sarjana | Diploma Tiga | Magister |
| --- | --- | --- | --- |
| NDTPS | ≥ 12 | ≥ 9 | ≥ 8 |
| PGBLKL | ≥ 70% | ≥ 50% | tidak ada di matriks Magister |
| PKDTPS | (cek) | (cek) | ≥ 50%, skor = 1 + (6 × PKDTPS) bila < 50% |

Contoh tabel khusus jenjang: D3 memakai 4.e dan 4.g, PPI memakai 4.k.

Sumber resmi: `D:\Skripsi\Led Lamteknik\Instrumen_Akreditasi_LAM_Teknik_2025 (dari lamteknik.or.id)\01_Pasca
Terakreditasi Pertama dan Unggul\Matrik Penilaian LED dan LKPS <Jenjang> ... 2025 ....pdf` (10 jenjang) dan template LKPS
seluruh jenjang di folder yang sama.

Urutan jenjang:

1. Yang ada di FT Unila: Diploma Tiga, Sarjana Terapan, Magister, Program Profesi Insinyur.
2. Lalu Diploma Satu, Diploma Dua, Magister Terapan, Doktor, Doktor Terapan (keputusan 19 Okt: semua 10 jenjang).

Tahapan:

- **R1. Inventaris per jenjang** → `docs/rumus/RUMUS-<JENJANG>.md`.
  - Untuk setiap butir angka di matriks catat:
    - kode butir dan indikator;
    - tabel LKPS dan kolomnya;
    - definisi metrik (salin dari matriks, sebut halaman PDF);
    - aturan skor 4 sampai 0;
    - sama/beda dengan rumus Sarjana.
  - Tandai butir yang datanya **tidak ada di LKPS**. Hanya butir ini yang boleh tetap manual, dan alasannya ditulis.
  - Baca teks matriks dari PDF (`matriks.ts` sudah menyusun baris dari posisi teks). Jangan menebak ambang dari ingatan.
- **R2. Pisahkan metrik dan skor.**
  - Fungsi metrik (hitung dari tabel LKPS) menjadi pustaka bersama.
  - Aturan skor menjadi data per jenjang, misalnya `src/modules/led/domain/rumus/skor-<jenjang>.ts` atau JSON
    bervalidasi Zod.
  - Hasil Sarjana harus **identik** sebelum dan sesudah refaktor. Buat uji regresi dari `tests/fikstur/lkps-contoh-s1.xlsx`
    sebelum mulai.
- **R3. Implementasi per jenjang.**
  - Kode rumus baru berawalan jenjang bila aturannya beda.
  - Fikstur LKPS fiktif per jenjang (`tests/fikstur/lkps-contoh-<jenjang>.xlsx`, isi tabel yang dipakai jenjang itu).
  - Hitungan tangan `docs/uji/hitungan-manual-<jenjang>.md`.
  - Uji unit per butir: nilai metrik dan skor perkiraan.
  - Asumsi untuk bagian yang tidak dirinci matriks dicatat di tabel "Asumsi perlu dikonfirmasi", seperti 11 asumsi
    Sarjana.
- **R4. Sambungkan ke instrumen.**
  - Katalog rumus menjadi per jenjang dan dipakai ekstraksi instrumen saat AI mengusulkan `kodeRumus`. Admin tetap
    mengonfirmasi.
  - Data bawaan/seed per jenjang mengisi `kodeRumus` untuk instrumen resmi 2025.
  - Halaman cek instrumen menampilkan "butir angka tanpa rumus: n" beserta alasannya.
- **R5. Antarmuka.**
  - Data LKPS dan Perkiraan nilai menampilkan sumber nilai per butir (rumus/manual) dengan alasan bila manual.
  - Nilai manual tetap ada sebagai cadangan bila tabel LKPS kosong atau tidak terbaca (perilaku sekarang).
- **Kriteria selesai per jenjang:** setiap butir angka di matriks berstatus "dihitung otomatis" atau "manual karena
  data tidak ada di LKPS: …". Adrianne memeriksa `RUMUS-<JENJANG>.md` sebelum jenjang berikutnya dimulai.

## N4. OCR untuk PDF hasil pindai (kerjakan hanya bila diminta)

Semua PDF instrumen dan pustaka di folder Adrianne (88 berkas) sudah berlapis teks. Yang berisiko adalah dokumen bukti di
Basis Pengetahuan prodi dan fakultas (SK bertanda tangan, notulen, MoU, sertifikat, berita acara), yang sering berupa
pindaian. Sekarang dokumen seperti itu gagal dengan pesan "Tidak ada teks yang bisa dibaca". Dokumen campuran (sebagian
halaman pindaian) diam-diam kehilangan halaman pindaiannya.

- **Cakupan:**
  - dokumen Basis Pengetahuan (LED dan fakultas);
  - PDF SK pada Catat hasil akreditasi.

  LKPS PDF dan instrumen **tidak** di-OCR. Tabel hasil OCR rawan salah kolom, jadi LKPS tetap wajib Excel atau PDF
  dari Excel. Pesan galatnya diperjelas.
- **Deteksi:** halaman PDF dengan teks bersih < 50 karakter dianggap pindaian. Hanya halaman itu yang di-OCR.
- **Mesin bawaan lokal (tanpa AI, tanpa token, data tidak keluar server):**
  - render halaman dengan `renderPageAsImage` dari `unpdf` (sudah dipakai) + `@napi-rs/canvas`, `scale` 2;
  - kenali teks dengan `tesseract.js`, bahasa `['ind', 'eng']`;
  - berkas *traineddata* disimpan di repo atau diunduh saat pemasangan (`langPath`/`cachePath` lokal), bukan diunduh
    saat produksi berjalan.
- **Alur:**
  - jalan di worker (pg-boss) dengan status "diproses (OCR)" dan progres per halaman;
  - teks OCR diberi tanda `sumberTeks: "ocr"` dan keyakinan rata-rata per halaman, lalu dipotong dan di-*embedding*
    seperti biasa;
  - halaman dengan keyakinan < 70% ditandai "perlu dicek";
  - di Basis Pengetahuan ada "Lihat teks hasil OCR" untuk mengoreksi teks sebelum diproses ulang.
- **Opsi lanjutan (bawaan mati):** "Baca dengan AI" memakai pemahaman dokumen Gemini untuk halaman berkeyakinan
  rendah.
  - Hanya atas klik dan konfirmasi, dengan perkiraan token (± 258 token per halaman masukan).
  - Tampilkan peringatan: halaman utuh terkirim ke Google; pada layanan gratis, data boleh dipakai Google.
  - Ikuti pola "Baca dengan AI" di `akreditasi.ts`.
- **Uji:**
  - fikstur PDF pindaian buatan (teks dirender ke gambar lalu dijadikan PDF) menghasilkan kata kunci yang diharapkan;
  - PDF campuran: halaman teks tidak di-OCR, halaman gambar di-OCR;
  - dokumen tanpa teks sama sekali tetap tertangani;
  - pencarian menemukan potongan dari teks OCR.
- **Dokumen:**
  - `docs/PANDUAN-SERVER.md`: kebutuhan `@napi-rs/canvas` dan *traineddata*;
  - `docs/PANDUAN-PENGGUNAAN.md`: OCR dan koreksi teks.

## Prompt untuk Claude Code

```
Baca docs/RENCANA-5NOV.md sampai habis, lalu kerjakan N1 sampai N3 berurutan di branch revisi-31okt, satu commit per
tahap, dengan aturan kerja di docs/RENCANA-REVISI-31OKT.md (lint, typecheck, test:unit, test:integrasi lulus; catat di
docs/CATATAN-PENGEMBANGAN.md bagian "Rencana 5 November 2026"). Untuk N3, setelah R1 tiap jenjang selesai, tunjukkan
ringkasan docs/rumus/RUMUS-<JENJANG>.md dan tunggu saya bilang "lanjut" sebelum mengimplementasikan jenjang itu.
```

Bila OCR disetujui, tambahkan di akhir prompt: `Setelah N3 selesai, kerjakan juga N4 (OCR).`

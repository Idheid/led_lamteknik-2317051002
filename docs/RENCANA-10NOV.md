# Rencana 10 November 2026: RAG kuat, hemat kuota, cepat, dan tidak halu

Disusun 6 November 2026 untuk dijalankan Claude Code mulai Selasa, 10 November 2026.

**Rencana ini menggantikan `docs/RENCANA-5NOV.md`** (belum pernah dijalankan). Isi N1–N4 rencana itu sudah masuk ke tahap
di bawah: N1 → T1, N2 → T2, N4 → T3, N3 → T10.

## Keputusan Adrianne (6 Nov 2026)

- Semua komponen sistem harus **kuat**, bukan sekadar cukup. Kode boleh ditulis ulang.
- Sistem tidak boleh halu: setiap kalimat narasi harus bisa dilacak ke kutipan sumbernya.
- Kuota AI hemat dan generate tetap cepat.
- OCR (dulu N4) **disetujui**.
- Butir angka dihitung otomatis di **semua jenjang** (dulu N3).
- **Tidak termasuk** rencana ini: integrasi API MyUnila, pemilihan DTPR, dan login SSO (arahan Pak Tris 3 Nov). Ketiganya
  menunggu akses API dan sesi SSO dari kampus.

## Aturan kerja

Sama dengan `docs/RENCANA-REVISI-31OKT.md`:

- branch `revisi-31okt`;
- lint, typecheck, `test:unit`, dan `test:integrasi` lulus di setiap tahap;
- migrasi dengan cara di `CLAUDE.md`;
- batas modul dijaga;
- berhenti dan tanya bila ada yang bertentangan.

Tambahan:

- Satu commit atau lebih per tahap, misalnya `Rencana 10 Nov T5: BM25 dengan pg_textsearch`.
- Catat di `docs/CATATAN-PENGEMBANGAN.md` bagian baru "Rencana 10 November 2026".
- **Jangan commit folder `postman/` dan `.postman/`** (bisa berisi ID aplikasi atau token MyUnila). Tambahkan keduanya ke
  `.gitignore` di T1.
- Kunci API dan isi `.env` tidak pernah dicetak atau dicatat. Data pribadi tetap disamarkan (`samarkanTeks`) sebelum
  dikirim ke Gemini.
- Berhenti di setiap titik henti ⏸, tunjukkan ringkasan hasilnya, lalu tunggu Adrianne menulis "lanjut".

## Prinsip desain

1. **Pekerjaan pasti dikerjakan kode, bukan AI.** Ini berlaku untuk menghitung angka, mencari potongan, mencocokkan
   kutipan, dan memeriksa angka. Pekerjaan ini 0 token dan tidak bisa halu.
2. **Dokumen dibaca dan di-*embedding* satu kali; generate hanya mengambil dari basis data.** Vektor dokumen, vektor
   kueri, tabel LKPS, dan hasil OCR disimpan. Berkas yang sama (SHA-256) tidak diproses ulang.
3. **AI dipanggil sesedikit mungkin.**
   - Generate: satu panggilan per sub-bagian.
   - Pemeriksaan dan perbaikan: digabung per bagian (kriteria), bukan per kalimat.
4. **Tidak ada bukti, tidak ada kalimat.** Unsur tanpa bukti ditandai [BELUM ADA BUKTI: …]. Sub-bagian tanpa bukti sama
   sekali tidak dikirim ke AI.
5. **Setiap perubahan pencarian bisa diukur.** Konfigurasi pencarian dicatat di setiap versi draf. Konfigurasi lama tetap
   bisa dijalankan sampai evaluasi skripsi selesai.
6. **Pemeriksa milik sistem membantu tim prodi, bukan alat ukur skripsi.** Evaluasi kesesuaian narasi tetap dinilai
   manusia.

## Ringkasan tahap

| Tahap | Isi | Komponen yang dikuatkan | ⏸ |
|---|---|---|---|
| T1 | Model bawaan `gemini-3.8-flash`, cadangan Flash-Lite | model | |
| T2 | Data uji pencarian, konfigurasi tercatat, ekspor *pool*, skrip *precision*/*recall* | evaluasi | ⏸ |
| T3 | OCR lokal untuk PDF pindaian | ekstraksi teks | |
| T4 | Kepala konteks pada setiap potongan | *chunking*, *embedding* | |
| T5 | BM25 (`pg_textsearch`) menggantikan `ts_rank` | pencarian kata kunci | ⏸ |
| T6 | Kueri per unsur skor 4, batas per dokumen, pra-cek bukti | pencarian, anti-halu | |
| T7 | Generate berbasis kutipan, kutipan dicek kode | pembangkitan, anti-halu | |
| T8 | Pemeriksaan AI otomatis per bagian dan perbaikan terarah | pemeriksaan, anti-halu | ⏸ |
| T9 | Hemat kuota dan cepat: semua vektor diambil dari basis data, dokumen sama tidak diproses ulang, konteks per kriteria | kuota, kecepatan | ⏸ |
| T10 | Rumus butir angka semua jenjang | angka | ⏸ per jenjang |
| T11 | Pengukuran akhir dan dokumentasi | evaluasi | ⏸ |

---

## T1. Model bawaan `gemini-3.8-flash`

Batasan Masalah skripsi menyebut Gemini 3.8 Flash, sedangkan bawaan kode masih `gemini-3-flash-preview`. Model *preview*
bisa dihentikan Google. Daftar model AI Studio (dicek 6 Nov 2026) mencantumkan `gemini-3.8-flash` (berlabel *New*) dan
`gemini-3.5-flash-lite` (*Stable*).

- Ganti `MODEL_NARASI_BAWAAN` di `src/modules/bersama/data/kunci-api.ts` menjadi `gemini-3.8-flash`. Perbarui komentar
  dan teks yang masih menyebut `gemini-3-flash-preview` sebagai bawaan.
- Model cadangan bawaan: `gemini-3.5-flash-lite`. Versi draf sudah mencatat model, jadi draf dari model cadangan tetap
  terlihat.
- Data yang sudah ada:
  - bila baris pengaturan `utama` masih memakai `gemini-3-flash-preview`, ubah ke `gemini-3.8-flash` lewat migrasi data
    atau seed idempoten;
  - model yang sengaja dipilih Admin selain itu tidak diubah.
- Halaman Kunci API → Model Gemini: tampilkan peringatan ringan bila model yang dipilih berakhiran `-preview`.
- Model *embedding* tetap `gemini-embedding-001` (768 dimensi, dinormalkan, *task type* RETRIEVAL_DOCUMENT/QUERY).
  Jangan diganti, karena Batasan Masalah menyebut `001`.
- `.gitignore`: tambahkan `postman/` dan `.postman/`.
- Uji:
  - seed/migrasi tidak menimpa pilihan Admin;
  - label model tercatat di versi draf.
- Uji manual (dicatat, tidak otomatis): satu generate sub-bagian dengan kunci asli memakai `gemini-3.8-flash`.

## T2. Data uji pencarian dan konfigurasi tercatat (rumusan masalah 2) ⏸

Rumusan masalah 2 mengukur tahap pengambilan dokumen dengan *precision* dan *recall* terhadap potongan yang dilabel
relevan oleh manusia. Saat ini peringkat hanya terlihat di "Uji cari" dan tidak tersimpan.

1. **Konfigurasi pencarian bernama.** Buat `KONFIGURASI_PENCARIAN` di `src/modules/led/domain/` dengan tiga nilai:

   | Kode | Vektor | Kata kunci | Kueri | Dipakai |
   |---|---|---|---|---|
   | `A-lama` | `embedding` (teks saja) | `ts_rank` atas `teksTsv` | satu kueri gabungan (`kueriGenerate`) | pembanding |
   | `B-bm25` | `embeddingKonteks` (T4) | BM25 atas teks berkepala (T5) | satu kueri gabungan | pembanding |
   | `C-unsur` | `embeddingKonteks` | BM25 | kueri per unsur skor 4 + batas per dokumen (T6) | bawaan setelah T6 |

   - Di T2 baru `A-lama` yang berjalan. B dan C diaktifkan di tahap masing-masing.
   - Pilihan konfigurasi untuk generate: variabel lingkungan `PENCARIAN_KONFIGURASI` (bawaan mengikuti tahap terakhir
     yang selesai). Pilihan untuk uji: parameter di skrip dan "Uji cari".
2. **Simpan hasil pencarian di setiap versi draf.**
   - Simpan di kolom JSON baru `VersiDraf.pencarian`:
     - kode konfigurasi;
     - teks kueri (satu atau per unsur);
     - `k`;
     - daftar kandidat.
   - Setiap kandidat berisi `potonganId`, `dokumenId`, peringkat vektor, peringkat kata kunci, peringkat gabungan, skor
     RRF, unsur asal (bila per unsur), dan apakah masuk konteks.
   - Tidak mengubah prompt dan narasi.
3. **Ekspor CSV untuk pelabelan.**
   - Siapa: Tim Prodi untuk LED sendiri, Admin UPPS untuk semua LED.
   - Letak: Basis Pengetahuan → "Unduh data uji pencarian".
   - Isi per sub-bagian yang sudah punya draf: *pooling* gabungan 20 teratas dari **setiap jalur di setiap konfigurasi
     yang tersedia** (vektor A, `ts_rank` A, vektor B/C, BM25 B/C), tanpa duplikat. Kueri dijalankan ulang memakai kueri
     tersimpan.
   - Kolom: `led, sub_bagian, judul_sub_bagian, butir, unsur, kueri, potongan_id, dokumen, halaman, peringkat_per_konfigurasi
     (JSON ringkas), masuk_konteks, cuplikan (≤ 300 karakter), relevan, catatan`.
   - Kolom `relevan` (1/0) dan `catatan` dikosongkan untuk diisi manusia.
   - **Label berbasis `potongan_id`.** Karena itu T3–T6 tidak boleh mengganti ID potongan yang teksnya tidak berubah.
4. **Skrip hitung** `scripts/hitung-retrieval.ts` (bukan di antarmuka):
   - membaca CSV berlabel;
   - menjalankan ulang pencarian tersimpan untuk konfigurasi yang diminta (`--konfigurasi A-lama,B-bm25,C-unsur`);
   - menghitung *precision*@k dan *recall*@k per sub-bagian untuk k = 1, 3, 5, dan k sistem, beserta rata-ratanya per
     konfigurasi;
   - menulis CSV ringkasan dan tabel Markdown siap tempel ke Bab IV.

   *Recall* dihitung terhadap semua potongan berlabel relevan di *pool*; catat batasan ini di keluaran. Baris tanpa label
   dilewati dan dihitung jumlahnya.
5. **Uji:** fikstur kecil berlabel buatan; hasilnya dicocokkan dengan hitungan tangan di
   `docs/uji/hitungan-manual-retrieval.md`.
6. **Batas:**
   - tidak ada panggilan LLM di tahap ini selain *embedding* kueri;
   - label tidak pernah dibuat sistem;
   - Tim Prodi hanya bisa mengunduh LED prodinya.

⏸ Tunjukkan contoh CSV ekspor (data uji) dan keluaran skrip pada fikstur.

## T3. OCR lokal untuk PDF pindaian

Semua PDF instrumen dan pustaka di folder Adrianne (88 berkas) sudah berlapis teks. Yang berisiko adalah dokumen bukti di
Basis Pengetahuan prodi dan fakultas (SK bertanda tangan, notulen, MoU, sertifikat, berita acara), yang sering berupa
pindaian. Sekarang dokumen seperti itu gagal dengan pesan "Tidak ada teks yang bisa dibaca". Dokumen campuran diam-diam
kehilangan halaman pindaiannya.

- **Cakupan:** dokumen Basis Pengetahuan (LED dan fakultas) serta PDF SK pada Catat hasil akreditasi.
  - LKPS PDF dan instrumen **tidak** di-OCR. Tabel hasil OCR rawan salah kolom, jadi LKPS tetap wajib Excel atau PDF dari
    Excel. Pesan galatnya diperjelas.
- **Deteksi:** halaman PDF dengan teks bersih < 50 karakter dianggap pindaian. Hanya halaman itu yang di-OCR.
- **Mesin lokal** (tanpa AI, tanpa token, data tidak keluar server):
  - render halaman dengan `renderPageAsImage` dari `unpdf` + `@napi-rs/canvas`, `scale` 2;
  - kenali teks dengan `tesseract.js`, bahasa `['ind', 'eng']`;
  - berkas *traineddata* disimpan di repo atau diunduh saat pemasangan (`langPath`/`cachePath` lokal), bukan saat produksi
    berjalan.
- **Alur:**
  - jalan di worker (pg-boss) dengan status "diproses (OCR)" dan progres per halaman;
  - teks OCR diberi tanda `sumberTeks: "ocr"` dan keyakinan rata-rata per halaman, lalu dipotong dan di-*embedding* seperti
    biasa;
  - halaman dengan keyakinan < 70% ditandai "perlu dicek";
  - Basis Pengetahuan punya "Lihat teks hasil OCR" untuk mengoreksi teks sebelum diproses ulang.
- **Opsi lanjutan (bawaan mati):** "Baca dengan AI" memakai pemahaman dokumen Gemini untuk halaman berkeyakinan rendah.
  - Hanya atas klik dan konfirmasi, dengan perkiraan token (± 258 token per halaman).
  - Peringatan: halaman utuh terkirim ke Google; pada layanan gratis, data boleh dipakai Google.
  - Ikuti pola "Baca dengan AI" di `akreditasi.ts`.
- **Uji:**
  - fikstur PDF pindaian buatan (teks dirender ke gambar lalu dijadikan PDF) menghasilkan kata kunci yang diharapkan;
  - PDF campuran: halaman teks tidak di-OCR, halaman gambar di-OCR;
  - dokumen tanpa teks sama sekali tetap tertangani;
  - pencarian menemukan potongan dari teks OCR.
- **Dokumen:**
  - `docs/PANDUAN-SERVER.md`: kebutuhan `@napi-rs/canvas` dan *traineddata*;
  - `docs/PANDUAN-PENGGUNAAN.md`: OCR dan koreksi teks.

## T4. Kepala konteks pada setiap potongan

Sekarang potongan di-*embedding* dan diindeks tanpa keterangan asalnya. Akibatnya, potongan "Ditetapkan di Bandar
Lampung…" dari sebuah SK sulit ditemukan dengan kueri "SK pengembangan dosen".

- Kolom baru `Potongan.kepala` (teks), disusun kode tanpa AI, misalnya:
  `Dokumen: {judul atau nama berkas} | Jenis: {jenis bila ada} | Hlm. {halaman} | Bagian: {judul bagian terdekat bila
  terdeteksi}`.
- Kolom baru `Potongan.teksIndeks` = `kepala + "\n" + teks`. Kolom ini dipakai untuk *embedding* baru dan indeks BM25 (T5).
- **`teks` tidak berubah**: tetap ditampilkan, dikirim ke prompt, dan dipakai mencocokkan kutipan (T7).
- Kolom baru `embeddingKonteks vector(768)` + indeks HNSW `vector_cosine_ops`.
  - Kolom `embedding` lama **dipertahankan** sampai evaluasi skripsi selesai, supaya konfigurasi `A-lama` tetap bisa
    dijalankan. Tulis catatan penghapusannya di `CATATAN-PENGEMBANGAN.md`.
- Pengindeksan ulang:
  - tugas worker "Indeks ulang potongan" dengan progres;
  - **memperbarui baris di tempat** (ID potongan tetap, karena label T2 berbasis ID);
  - *embedding* dikirim per *batch* 100 seperti sekarang;
  - tampilkan perkiraan jumlah permintaan *embedding* sebelum dijalankan.
- Deteksi "judul bagian terdekat": baris pendek berhuruf kapital atau bernomor (misalnya "BAB II", "Pasal 3",
  "1.2 Tujuan") di halaman yang sama sebelum potongan. Bila ragu, kosongkan; jangan menebak.
- Uji:
  - kepala tersusun benar untuk PDF, DOCX, dan teks OCR;
  - ID potongan tidak berubah setelah indeks ulang;
  - kueri berisi jenis dokumen menemukan potongan yang isinya tidak menyebut jenis itu.

## T5. BM25 dengan `pg_textsearch` ⏸

`ts_rank` mengurutkan berdasarkan frekuensi kata yang cocok dan tidak memakai informasi global (dokumentasi PostgreSQL
12.3.3), jadi kata umum seperti "dan" dan "yang" bisa mengalahkan kata langka seperti "NDTPS". BM25 memberi bobot pada
kata langka (IDF), membatasi pengaruh frekuensi, dan menormalkan panjang dokumen (Robertson & Zaragoza, 2009).

Contoh uji Claude (6 Nov 2026), 6 potongan dengan kueri `jumlah | ndtps | dan | dosen | yang`:

- `ts_rank` menempatkan potongan "Rapat dan kegiatan yang dihadiri dosen dan…" di peringkat 1;
- BM25 menempatkan "Jumlah NDTPS program studi pada TS adalah 14 orang…" di peringkat 1.

**Pemasangan:**

- Ekstensi: `pg_textsearch` (Tiger Data, lisensi PostgreSQL, rilis 1.x). Prasyarat: PostgreSQL 17/18, biner Linux
  amd64/arm64.
- *Image* basis data: buat `docker/db/Dockerfile` `FROM pgvector/pgvector:pg17` yang memasang biner `pg_textsearch` versi
  yang dipatok (sertakan *checksum*), lalu set `shared_preload_libraries = 'pg_textsearch'`.
  - Pakai di `docker-compose.yml`, `docker-compose.produksi.yml`, dan basis data uji integrasi.
  - Perbarui `docs/PANDUAN-INSTALASI-WINDOWS.md` dan `docs/PANDUAN-SERVER.md`.
- Migrasi:
  - `CREATE EXTENSION IF NOT EXISTS pg_textsearch;`
  - indeks BM25 atas `teksIndeks` dengan `text_config='simple'`, `k1` 1,2 dan `b` 0,75 (bawaan).
  - **Cocokkan sintaks indeks dan kueri dengan README versi yang dipatok, jangan dari ingatan.** Per 6 Nov 2026 README
    menulis `CREATE INDEX ... USING bm25(kolom) WITH (text_config='...')`, kueri `ORDER BY kolom <@> 'kata'`, dan
    `to_bm25query('kata', 'nama_indeks')` untuk prepared statement/PL/pgSQL. Skor bernilai negatif, jadi yang lebih kecil
    lebih relevan.
- **Konfigurasi `simple`, bukan `indonesian`.** Uji Claude dengan PostgreSQL 16 menunjukkan *stemmer* Indonesia bawaan
  tidak konsisten:
  - "pengembangan" menjadi `embang`, tetapi "dikembangkan" menjadi `kembang`;
  - "kependidikan" menjadi `ndidik`, tetapi "pendidikan" menjadi `didik`.

  Catat alasan ini di `CATATAN-PENGEMBANGAN.md`.
- Kueri kata kunci tetap dibersihkan seperti `kueriKataKunci` (huruf/angka saja), tanpa operator OR buatan.
- `ts_rank` atas `teksTsv` tetap ada untuk konfigurasi `A-lama`.
- **Rencana cadangan bila ekstensi gagal dipasang di server sasaran:** jangan diam-diam kembali ke `ts_rank`. Hentikan,
  jelaskan penyebabnya, dan tawarkan BM25 yang dihitung dengan SQL dari `tsvector` (`unnest`, `ts_stat` untuk frekuensi
  dokumen). Tunggu persetujuan.
- Uji:
  - fikstur 6 potongan di atas: `B-bm25` menempatkan potongan NDTPS di peringkat 1, `A-lama` tidak;
  - filter proyek, sub-bagian, dokumen bersama, dan model *embedding* tetap berlaku di jalur BM25;
  - "Uji cari" bisa memilih konfigurasi dan menampilkan peringkat per jalur.

⏸ Tunjukkan hasil uji fikstur dan "Uji cari" untuk satu sub-bagian nyata dengan konfigurasi A dan B berdampingan.

## T6. Kueri per unsur skor 4, batas per dokumen, dan pra-cek bukti

Sekarang semua unsur dijadikan satu kueri panjang (`kueriGenerate`, maks. 1.500 karakter). Akibatnya, potongan untuk satu
unsur bisa menenggelamkan unsur lain.

- **Kueri** (konfigurasi `C-unsur`):
  - satu kueri umum: judul sub-bagian + instruksi (400 karakter pertama);
  - satu kueri per unsur skor 4: `{indikator}. {unsur}`.
- **Vektor kueri diambil dari basis data.** Kueri per unsur melipatgandakan jumlah kueri, jadi tabel `EmbeddingKueri`
  (rincian di T9 butir 1) **dibuat di tahap ini**:
  - kueri yang belum ada di-*embedding* sekali dalam satu `embedMany`, lalu disimpan;
  - generate berikutnya membaca dari tabel.

  Tugas "Siapkan vektor kueri" di muka ditambahkan di T9.
- **Penggabungan:**
  - setiap kueri: vektor 30 teratas + BM25 30 teratas → RRF (k = 60);
  - hasil semua kueri digabung lagi dengan RRF;
  - setiap unsur yang punya kandidat **dijamin** mendapat minimal 1 potongan, bila tersedia 2;
  - paling banyak 3 potongan dari dokumen yang sama;
  - potongan yang bertumpang tindih dengan potongan terpilih dari dokumen yang sama dilewati;
  - jumlah akhir `k` bawaan 10, bisa diatur (`PENCARIAN_K`). Catat kenaikan token dibanding k = 8.
- **Pra-cek bukti (0 token):**
  - unsur tanpa kandidat sama sekali, atau semua kandidatnya di bawah ambang relevansi, diberi status awal
    `belum_ada_bukti` dan dikirim ke prompt sebagai "unsur tanpa bukti";
  - ambang relevansi bawaan **mati (0)**, diatur lewat `PENCARIAN_AMBANG_KOSINUS` setelah dikalibrasi dari label T2. Catat
    caranya;
  - bila **semua** unsur tanpa bukti dan tidak ada J, M, maupun T: **jangan panggil AI**. Buat draf deterministik berisi
    penanda [BELUM ADA BUKTI: unsur] per unsur dan daftar dokumen yang diharapkan (`DokumenDiharapkan`), dengan label
    versi "tanpa AI".
- Kandidat per unsur disimpan di `VersiDraf.pencarian` (T2).
- Uji:
  - setiap unsur mendapat potongan bila ada;
  - batas per dokumen berlaku;
  - sub-bagian tanpa bukti tidak memanggil LLM (hitung panggilan di model tiruan);
  - `kueriGenerate` lama tetap dipakai konfigurasi A dan B.

## T7. Generate berbasis kutipan

Sekarang AI menulis paragraf dan menyebut kode sumber, tetapi tidak menunjukkan **kalimat mana** di sumber yang
mendukungnya.

- **Skema keluaran baru** (`skemaKeluaran` di `llm-narasi.ts`):
  ```ts
  bukti: { id: string /* "B1" */, sumber: string /* "D3" */, kutipan: string /* ≤ 300 karakter, disalin persis */ }[]
  paragraf: { teks: string, sumber: string[], bukti: string[] }[]
  unsur: { butir, unsur, status, sumber?, bukti?: string[] }[]
  dokumenKurang: string[]
  catatanUntukPenyusun?: string
  ```
- **Aturan prompt tambahan** (`susunSistem`):
  - pilih dulu kutipan bukti dari POTONGAN atau JAWABAN PENYUSUN, salin **persis**, lalu tulis narasi hanya dari kutipan,
    METRIK, dan TABEL;
  - setiap kalimat faktual merujuk minimal satu bukti atau kode M/T;
  - jangan merangkum isi yang tidak ada di kutipan.

  Prinsip lama tetap: angka disalin dari METRIK/TABEL dan [BELUM ADA BUKTI].
- **Cek kode (0 token), dijalankan untuk semua keluaran:**
  - `kutipan` harus berupa potongan teks persis dari sumbernya. Normalkan spasi, tanda kutip, tanda hubung pemenggal kata,
    dan huruf besar/kecil sebelum dicocokkan. Tidak boleh ada penggabungan dengan "…";
  - kutipan yang tidak ditemukan → bukti **ditolak**;
  - kalimat yang hanya bersandar pada bukti ditolak → label `tidak_didukung`;
  - unsur berstatus `terpenuhi` tanpa bukti sah → diturunkan ke `belum_ada_bukti`, dan penanda disisipkan;
  - aturan angka yang ada (`angkaTidakBerdasar`) tetap berjalan; angka di kalimat harus ada di kutipan, M, T, atau J yang
    dirujuk.
- **Urutan prompt untuk *cache* implisit Gemini** (otomatis untuk Gemini 2.5 ke atas; minimum 4.096 token untuk 3.8 Flash):
  - bagian yang sama untuk semua sub-bagian satu kriteria diletakkan di depan: aturan, identitas prodi, dan tabel LKPS
    kriteria;
  - bagian khusus sub-bagian diletakkan di belakang;
  - catat `cachedTokens` (bila dilaporkan AI SDK) di `LogPemakaian`.
- **Antarmuka:**
  - di panel draf, setiap paragraf bisa menampilkan kutipan buktinya (sumber dan halaman);
  - bukti yang ditolak terlihat jelas.
- Simpan `bukti` dan hasil cek di versi draf. Data ini dipakai untuk audit dan tangkapan layar Bab IV.
- Uji (model tiruan):
  - kutipan rekaan ditolak dan kalimatnya `tidak_didukung`;
  - kutipan dengan beda spasi tetap diterima;
  - unsur `terpenuhi` tanpa bukti diturunkan;
  - ekspor Word tidak menampilkan kode bukti, kecuali di catatan rujukan seperti sekarang.

## T8. Pemeriksaan AI otomatis per bagian dan perbaikan terarah ⏸

Sekarang pemeriksaan otomatis hanya mencocokkan angka dan kata kunci. Pemeriksaan AI hanya berjalan lewat tombol
"Periksa dengan AI".

- **Langkah 1, aturan (0 token, semua kalimat):** cek angka, cek kutipan T7, dan setiap kalimat terpetakan ke bukti atau
  M/T.
- **Langkah 2, AI otomatis, digabung per bagian.** Satu panggilan memeriksa semua kalimat dari semua versi baru dalam satu
  bagian (kriteria).
  - Masukan: kalimat + kutipan bukti yang dirujuk + baris M/T terkait. **Bukan potongan utuh**, supaya token kecil.
  - Keluaran per kalimat: `sesuai | sebagian | tidak_didukung` + alasan singkat.
  - Model: model narasi aktif, *thinking* level terendah yang didukung.
  - Waktu jalan:
    - "Susun seluruh LED": setelah semua sub-bagian satu bagian selesai;
    - generate satu sub-bagian: setelah 60 detik tanpa generate lain di bagian yang sama (*debounce*), atau saat tombol
      ditekan.
  - Draf langsung tampil dengan lencana "sedang diperiksa" (tidak menunggu).
- **Langkah 3, perbaikan terarah, maksimal sekali, digabung per bagian.**
  - Hanya paragraf yang memuat kalimat `tidak_didukung`. AI diminta menulis ulang paragraf itu **hanya dari bukti yang
    sah**, atau menghapus kalimatnya.
  - Hasil perbaikan melewati Langkah 1 lagi. Langkah 2 dijalankan hanya untuk kalimat yang berubah, digabung dalam satu
    panggilan.
  - Sisa kalimat yang belum lolos ditandai merah untuk Tim Prodi. Tidak ada putaran kedua.
  - Perbaikan disimpan sebagai versi baru berlabel "perbaikan otomatis", sehingga versi asli tetap bisa dibandingkan.
- **Gerbang ekspor final:** sama seperti [BELUM ADA BUKTI]. Kalimat `tidak_didukung` yang belum disunting atau
  dikonfirmasi (dengan alasan) menahan ekspor final.
- Tombol "Periksa dengan AI" tetap ada untuk pemeriksaan ulang manual.
- Antarmuka menampilkan dua label: "Diperiksa aturan" dan "Diperiksa AI".
- Catat model dan token pemeriksaan di `LogPemakaian` (`subBagianKode` diisi kode bagian untuk panggilan gabungan).
- Uji (model tiruan):
  - satu panggilan per bagian;
  - perbaikan maksimal sekali;
  - gerbang ekspor;
  - lencana status;
  - antrean tidak mengulang pemeriksaan untuk versi yang sudah diperiksa.

⏸ Tunjukkan satu kriteria nyata (misalnya C.4) setelah Susun: jumlah panggilan AI, jumlah kalimat per label, dan contoh
satu perbaikan.

## T9. Hemat kuota dan cepat ⏸

### Prinsip: dokumen dibaca sekali, generate hanya mengambil dari basis data

Kondisi kode per 6 Nov 2026 (dicek Claude):

- **Sudah benar:**
  - Dokumen dibaca, dipotong, dan di-*embedding* satu kali saat diunggah (`proses/dokumen.ts`). Potongan dan vektornya
    disimpan di tabel `Potongan`.
  - Saat generate, `cariPotongan` hanya menjalankan kueri SQL atas `Potongan` (HNSW + indeks teks). PDF **tidak** dibaca
    ulang.
  - LKPS dibaca dari `TabelLKPS` (sudah diurai saat unggah), bukan dari berkas Excel.
- **Masih boros:**
  - Setiap generate dan setiap "Uji cari" membuat *embedding* kueri baru (`penyedia.embedKueri` di `pencarian.ts`).
    Padahal teks kuerinya (judul, instruksi, indikator, unsur skor 4) sama setiap kali.
  - Dokumen dengan berkas yang sama (kolom `Dokumen.hash`, SHA-256) tetap dipotong dan di-*embedding* ulang. Contohnya
    "Mulai periode berikutnya" (`data/periode.ts` mengirim semua salinan ke antrean `dokumen`) dan berkas yang sama
    diunggah ke beberapa LED. Setelah T3, OCR halaman pindaian juga ikut diulang.
  - Konteks yang sama untuk satu kriteria (tabel LKPS, nilai butir, capaian, identitas prodi) disusun ulang untuk setiap
    sub-bagian.

Perubahan berikut membuat generate **tidak memanggil *embedding* sama sekali**, dan dokumen yang sama **tidak pernah
diproses dua kali**.

1. **Vektor kueri disiapkan di muka dan disimpan.** Tabel dan pembacaannya sudah dibuat di T6. Di T9, tambahkan tugas
   penyiapan di muka dan pemakaian di "Uji cari".
   - Tabel `EmbeddingKueri(id, hash, model, taskType, dimensi, vektor vector(768), dibuatPada)`. `hash` = SHA-256 dari
     teks kueri yang sudah dirapikan + model + taskType. Unik per `hash`.
   - Dipakai untuk semua kueri: kueri umum, kueri per unsur (T6), `kueriGenerate` (konfigurasi A/B), dan "Uji cari".
   - **Disiapkan di muka** lewat tugas worker "Siapkan vektor kueri":
     - jalan setelah versi instrumen dikonfirmasi, saat LED baru dibuat untuk jenjang yang belum disiapkan, dan di awal
       "Susun seluruh LED";
     - membuat *embedding* semua kueri semua sub-bagian jenjang itu dalam *batch* 100 seperti dokumen;
     - kueri yang sudah ada dilewati.
   - Generate membaca vektor dari tabel ini. Bila tidak ada (misalnya instruksi baru diedit Admin), buat satu kali lalu
     simpan.
   - Ganti model *embedding* → `hash` berbeda → otomatis dibuat ulang. Baris model lama boleh dihapus oleh tugas
     pembersihan.
   - Uji: generate kedua untuk sub-bagian yang sama memanggil `embedKueri` 0 kali (hitung di penyedia tiruan).
2. **Dokumen yang sama tidak diproses ulang (pakai ulang potongan dan vektor).**
   - Tambahkan `Dokumen.versiPemrosesan`: teks gabungan dari versi pemotongan (`OPSI_POTONG`), format kepala (T4), versi
     OCR (T3), dan model *embedding*. Naikkan versinya bila salah satunya berubah.
   - Saat memproses dokumen, cari dokumen lain dengan `hash` sama, status `siap`, dan `versiPemrosesan` sama. Bila ada:
     - salin baris `Potongan` dengan ID baru (`teks`, `halaman`, `urutan`, `embedding`, teks OCR dan keyakinannya),
       tanpa memanggil AI dan tanpa OCR ulang;
     - `kepala` dan `teksIndeks` disusun ulang dari judul dokumen baru. Bila sama dengan sumber, `embeddingKonteks` ikut
       disalin. Bila berbeda (judul lain), hanya `embeddingKonteks` yang dibuat ulang;
     - catat `dokumenSumberPakaiUlangId` untuk jejak;
     - status langsung `siap` dengan pesan "Memakai hasil pemrosesan berkas yang sama".
   - Berlaku untuk:
     - "Mulai periode berikutnya";
     - unggah ulang berkas yang sama;
     - berkas yang sama di LED atau prodi lain;
     - dokumen bersama fakultas.
   - **Batas akses:** penyalinan hanya terjadi di server. Potongan milik LED lain tidak pernah ditampilkan ke pengguna
     yang tidak berhak. Yang disalin hanya hasil olahan berkas yang memang sudah diunggah pengguna itu sendiri.
   - Uji:
     - salin periode tidak memanggil `embedDokumen` (penyedia tiruan) untuk dokumen yang tidak berubah;
     - ganti `OPSI_POTONG` → diproses penuh;
     - judul berbeda → hanya `embeddingKonteks` dibuat ulang;
     - Tim Prodi prodi lain tidak bisa melihat dokumen sumber.
3. **Konteks per kriteria disusun sekali.**
   - Dalam satu tugas generate bagian, data yang sama untuk semua sub-bagian disusun sekali lalu dipakai ulang:
     - identitas prodi dan peta TS;
     - tabel LKPS terurai (`sumberLkps`);
     - `nilaiButirUntukProyek` dan `capaianButirUntukProyek`;
     - anggaran kata.

     Simpan di cache dalam memori per tugas, tidak di basis data.
   - Bagian ini sekaligus menjadi awalan prompt yang sama untuk *cache* implisit Gemini (T7).
   - Uji: hasil `susunKonteks` identik dengan dan tanpa cache (uji regresi pada C.1 dan C.4 fikstur).
4. **Mode hemat: gabung sub-bagian pendek (opsional, bawaan mati).**
   - Pengaturan Admin "Gabungkan sub-bagian pendek dalam satu panggilan". Bila aktif, sampai 3 sub-bagian berurutan dari
     kriteria yang sama dikirim dalam satu panggilan AI.
     - Syaratnya: target kata masing-masing ≤ 250 dan total potongan ≤ 20.
     - Pengecualian: sub-bagian IKU, AF, SWOT, dan bab penutup **tidak** digabung.
   - Keluaran berupa *array* per sub-bagian, masing-masing dengan `bukti`, `paragraf`, dan `unsur` sendiri (skema T7).
     Setiap sub-bagian disimpan sebagai versinya sendiri, dan T7–T8 tetap berjalan per sub-bagian.
   - Kutipan hanya sah bila berasal dari potongan sub-bagian itu sendiri. Ini mencegah bukti tertukar.
   - Catat `modeGenerate: "tunggal" | "gabung"` di versi draf.
   - Tujuannya mengurangi **jumlah permintaan** (batas harian). Waktu total belum tentu lebih cepat dari paralel, karena
     lama menulis bergantung pada jumlah token keluaran.
   - Bandingkan dengan mode tunggal di T11: jumlah panggilan, durasi, dan persentase kalimat `tidak_didukung`. **Jangan
     dijadikan bawaan** sebelum Adrianne melihat perbandingannya.

### Fakta Gemini API

Dicek 6 Nov 2026:

- batas dihitung **per proyek Google, bukan per kunci API** (RPM, TPM, RPD);
- RPD direset tengah malam waktu Pasifik (± 15.00 WIB saat PST, ± 14.00 WIB saat PDT);
- angka batas free tier hanya tampil di AI Studio;
- pada free tier, data "dipakai untuk meningkatkan produk Google"; pada tier berbayar tidak.

### Pengaturan pemakaian dan kecepatan

5. **Sidik jari konteks.**
   - Simpan *hash* masukan prompt di setiap versi: versi prompt, model, instruksi, butir, J, M, T, ID + teks potongan,
     dan konfigurasi pencarian.
   - "Susun seluruh LED" **melewati** sub-bagian yang sidik jarinya sama dengan versi terakhir dan statusnya bukan
     "belum".
   - Tombol "Generate ulang paksa" tetap tersedia.
6. **Perkiraan sebelum menjalankan "Susun seluruh LED".** Tampilkan:
   - jumlah sub-bagian yang akan dikirim ke AI, dilewati (sama), dan tanpa AI (tanpa bukti);
   - perkiraan permintaan AI (generate + pemeriksaan per bagian + perbaikan);
   - perkiraan token;
   - pemakaian hari ini dari `LogPemakaian` dan jam reset dalam WIB.
7. **Kunci API dan proyek Google.**
   - Kolom label "Proyek Google" (diisi manual) di halaman Kunci API.
   - Peringatan bila dua kunci berlabel sama: "kuota dihitung per proyek, menambah kunci dari proyek yang sama tidak
     menambah kuota".
   - Jangan membuat fitur untuk mengakali batas kuota.
8. **Paralel adaptif.**
   - Mulai dari `GENERATE_PARALEL` (bawaan 2).
   - Naik 1 sampai `GENERATE_PARALEL_MAKS` (bawaan 4) bila 20 panggilan terakhir tanpa 429.
   - Turun ke separuh saat ada 429 per menit.
   - Jeda `retryDelay` dari Google tetap dihormati.
9. **Pemeriksaan tidak menghalangi** (T8): draf tampil dulu, pemeriksaan menyusul.
10. **Model:**
    - generate dan pemeriksaan memakai model narasi aktif;
    - `gemini-3.5-flash-lite` hanya cadangan bila model utama kena kuota harian.

    Draf dari model cadangan berlabel jelas dan tetap melewati T7–T8.
11. **Tier berbayar untuk data asli.** Tulis di `docs/PANDUAN-SERVER.md`:
    - alasan privasi: data free tier dipakai Google, sedangkan data tier berbayar tidak;
    - cara menautkan penagihan (Tier 1, batas tagihan $250);
    - cara memperkirakan biaya dari `LogPemakaian`.

    Harga 3.8 Flash per 1 juta token, menurut halaman harga 6 Nov 2026:

    | | Sampai 31 Des 2026 | Mulai 1 Jan 2027 |
    |---|---|---|
    | Masukan | $0,75 | $1,50 |
    | Keluaran (termasuk *thinking*) | $3,75 | $7,50 |

    Halaman harga menampilkan tarif ini; jangan menuliskannya sebagai fakta permanen.
12. **Tidak dikerjakan sekarang (catat sebagai kemungkinan):** mode Batch API untuk susun semalam (harga ± separuh,
    hasil tidak langsung). Tanyakan Adrianne dulu.

Uji:

- sub-bagian dengan sidik jari sama tidak memanggil LLM;
- perkiraan permintaan cocok dengan jumlah panggilan pada model tiruan;
- paralel naik dan turun pada 429 tiruan.

⏸ Tunjukkan perbandingan sebelum dan sesudah T9 untuk satu kriteria (misalnya C.4, model tiruan dan satu kali dengan
kunci asli):
- jumlah panggilan *embedding* saat generate (harus 0);
- jumlah panggilan AI;
- rata-rata detik per sub-bagian;
- waktu total kriteria;
- hasil "Mulai periode berikutnya" untuk 5 dokumen (harus tanpa *embedding* ulang).

## T10. Rumus butir angka untuk semua jenjang ⏸ per jenjang

Sama dengan N3 di `docs/RENCANA-5NOV.md`, disalin di sini supaya rencana ini berdiri sendiri.

Saat ini rumus otomatis hanya untuk butir angka Sarjana (katalog 33 rumus, `metrik-lkps.ts`, `butir-angka.ts`). Jenjang
lain beralih ke nilai manual. Matriks Penilaian 2025 memakai metrik yang sama di banyak butir, tetapi **ambang skornya
berbeda per jenjang** dan sebagian tabel LKPS berbeda. Contoh:

| Metrik | Sarjana | Diploma Tiga | Magister |
| --- | --- | --- | --- |
| NDTPS | ≥ 12 | ≥ 9 | ≥ 8 |
| PGBLKL | ≥ 70% | ≥ 50% | tidak ada di matriks Magister |
| PKDTPS | (cek) | (cek) | ≥ 50%, skor = 1 + (6 × PKDTPS) bila < 50% |

Contoh tabel khusus jenjang: D3 memakai 4.e dan 4.g, PPI memakai 4.k.

Sumber resmi:

- matriks: `D:\Skripsi\Led Lamteknik\Instrumen_Akreditasi_LAM_Teknik_2025 (dari lamteknik.or.id)\01_Pasca Terakreditasi
  Pertama dan Unggul\Matrik Penilaian LED dan LKPS <Jenjang> ... 2025 ....pdf` (10 jenjang);
- template LKPS seluruh jenjang di folder yang sama.

Urutan jenjang:

1. Yang ada di FT Unila: Diploma Tiga, Sarjana Terapan, Magister, Program Profesi Insinyur.
2. Lalu Diploma Satu, Diploma Dua, Magister Terapan, Doktor, Doktor Terapan.

Tahapan:

- **R1. Inventaris per jenjang** → `docs/rumus/RUMUS-<JENJANG>.md`.
  - Untuk setiap butir angka di matriks, catat:
    - kode butir dan indikator;
    - tabel LKPS dan kolomnya;
    - definisi metrik (salin dari matriks, sebut halaman PDF);
    - aturan skor 4 sampai 0;
    - sama atau beda dengan Sarjana.
  - Tandai butir yang datanya **tidak ada di LKPS**. Hanya butir ini yang boleh tetap manual, dengan alasan tertulis.
  - Baca teks matriks dari PDF (`matriks.ts` sudah menyusun baris dari posisi teks). Jangan menebak ambang dari ingatan.
- **R2. Pisahkan metrik dan skor.**
  - Fungsi metrik menjadi pustaka bersama.
  - Aturan skor menjadi data per jenjang (`src/modules/led/domain/rumus/skor-<jenjang>.ts` atau JSON bervalidasi Zod).
  - Hasil Sarjana harus **identik** sebelum dan sesudah refaktor. Buat uji regresi dari `tests/fikstur/lkps-contoh-s1.xlsx`
    sebelum mulai.
- **R3. Implementasi per jenjang.**
  - Kode rumus baru berawalan jenjang bila aturannya beda.
  - Fikstur LKPS fiktif per jenjang.
  - Hitungan tangan `docs/uji/hitungan-manual-<jenjang>.md`.
  - Uji unit per butir.
  - Tabel "Asumsi perlu dikonfirmasi".
- **R4. Sambungkan ke instrumen:**
  - katalog rumus per jenjang dipakai ekstraksi instrumen saat AI mengusulkan `kodeRumus` (Admin tetap mengonfirmasi);
  - seed per jenjang mengisi `kodeRumus` instrumen resmi 2025;
  - halaman cek instrumen menampilkan "butir angka tanpa rumus: n" beserta alasannya.
- **R5. Antarmuka:**
  - Data LKPS dan Perkiraan nilai menampilkan sumber nilai per butir (rumus/manual) dengan alasan;
  - nilai manual tetap ada sebagai cadangan.
- **Kriteria selesai per jenjang:** setiap butir angka berstatus "dihitung otomatis" atau "manual karena data tidak ada di
  LKPS: …".

⏸ Setelah R1 setiap jenjang, tunjukkan ringkasan `RUMUS-<JENJANG>.md` dan tunggu "lanjut" sebelum implementasi.

## T11. Pengukuran akhir dan dokumentasi ⏸

- Jalankan `scripts/hitung-retrieval.ts` untuk `A-lama`, `B-bm25`, dan `C-unsur` pada CSV yang sudah dilabel Adrianne,
  bila ada. Bila belum ada label, siapkan perintahnya saja.
- Ringkas di `docs/uji/hasil-retrieval.md`:
  - *precision*@k dan *recall*@k per konfigurasi;
  - jumlah sub-bagian;
  - batasan *pool*.
- Ringkas pemakaian per Susun seluruh LED dari `LogPemakaian`:
  - panggilan AI dan panggilan *embedding*;
  - token;
  - durasi rata-rata per sub-bagian;
  - persentase sub-bagian yang dilewati (sidik jari sama atau tanpa bukti);
  - jumlah dokumen yang memakai ulang hasil pemrosesan.
- Bila mode gabung (T9 butir 4) sudah dicoba, buat tabel perbandingan tunggal vs gabung: jumlah panggilan, waktu total,
  dan persentase kalimat `tidak_didukung`.
- Perbarui:
  - `docs/SPESIFIKASI.md`: alur RAG baru;
  - `docs/PANDUAN-PENGGUNAAN.md`: kutipan bukti, lencana pemeriksaan, dan perkiraan kuota;
  - `docs/PANDUAN-SERVER.md`: *image* basis data, OCR, dan tier berbayar.
- Tulis daftar perbedaan alur lama dan baru (satu tabel) untuk Bab III dan IV skripsi.

⏸ Tunjukkan ringkasan akhir.

---

## Prompt untuk Claude Code (Selasa, 10 November 2026)

```
Baca docs/RENCANA-10NOV.md sampai habis. Rencana ini menggantikan docs/RENCANA-5NOV.md. Kerjakan T1 sampai T11
berurutan di branch revisi-31okt dengan "Aturan kerja" di rencana itu: lint, typecheck, test:unit, dan test:integrasi
lulus setiap tahap; satu commit atau lebih per tahap; catat di docs/CATATAN-PENGEMBANGAN.md bagian "Rencana 10 November
2026". Berhenti di setiap titik henti ⏸, tunjukkan ringkasannya, dan tunggu saya menulis "lanjut". Jangan commit folder
postman/ dan .postman/. Bila sintaks pg_textsearch atau perilaku Gemini API berbeda dari yang tertulis di rencana, ikuti
dokumentasi resmi versi yang dipakai dan catat perbedaannya.
```

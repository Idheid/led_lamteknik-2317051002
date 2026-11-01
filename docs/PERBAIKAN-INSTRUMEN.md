# Perbaikan unggah instrumen (2 November 2026)

Permintaan Adrianne setelah mencoba menambah instrumen jenjang selain Sarjana. Kerjakan berurutan **I1 → I5**, satu
commit per butir, dengan aturan kerja yang sama seperti `docs/RENCANA-REVISI-31OKT.md`: semua pemeriksaan lulus, catat
di `docs/CATATAN-PENGEMBANGAN.md` bagian "Perbaikan unggah instrumen (2 Nov 2026)".

## Temuan (diperiksa 1 Nov 2026 dengan pembaca template yang ada, pada berkas di `../Led Lamteknik/`)

| Berkas Template LED (.docx) | Kriteria terbaca | Sub-bagian per jenjang | Metadata Word (dibuat / diubah) |
| --- | --- | --- | --- |
| LAM Teknik 2025 "Seluruh Jenjang" (`01_Pasca ...`) | 7 | D3 98, S1 103, STr 107, S2 100, S3 98, PPI 96 | 2025-09-12 / 2025-11-12 |
| LAM Teknik 2025 Unggul Internasional (`03_...`) | 6 | D3 68, S1 68, STr 72, S2 63 | – |
| LAM Teknik 2025 PJJ (`04_...`) | 7 | D3 98, S1 104, S2 100, PPI 87 | – |
| LPMPP "APS Akademik dan Vokasi (LED Word)" (sama persis untuk D3 dan S1) | 0, ditolak | – | 2022-03-21 / 2022-03-24 |
| LPMPP "APS Profesi Insinyur (LED Word)" | 0, ditolak | – | 2023-08-28 / 2023-08-29 |

Kesimpulan:
- Sistem **tidak** khusus S1. Template LAM Teknik 2025 berlaku untuk semua jenjang dan terbaca untuk semua jenjang.
- Template dari LPMPP adalah struktur **lama** (2022, 9 kriteria: VMTS, Tata Pamong, Mahasiswa, SDM, ...). Template ini
  memakai gaya "heading 1/2/3" biasa, bukan "I. Judul Besar" / "II. Sub Judul" / "C.1. ...", jadi tidak ada kriteria
  yang terbaca. Matriks 2025 memakai 7 kriteria C.1–C.7, sehingga template lama itu memang tidak cocok.
- Pembaca template (`src/modules/led/domain/template-led.ts`, tanpa AI) dinamis untuk **isi** (jumlah kriteria,
  sub-bagian, instruksi, varian jenjang), tetapi **tidak** untuk **format**. Template baru dengan format berbeda akan
  ditolak, dan saat ini tidak ada jalan lain. Itulah yang diperbaiki di sini.
- Bukti tahun di **isi** berkas:
  - Template .docx **tidak** memuat angka tahun di isinya. Kolom metadata pada tabel di atas hanya untuk informasi,
    **tidak dipakai** dalam pemeriksaan, karena mudah berubah.
  - Matriks PDF memuat teks tahun dan jenjang, misalnya "MATRIKS PENILAIAN ... PROGRAM DIPLOMA TIGA IAPS-AV 2025 1.0".
  - Matriks 2025 memuat ketujuh nama kriteria template 2025 ("Diferensiasi Misi ...", "Akuntabilitas", ...).

## I1. Pemeriksaan berkas dan tahun instrumen saat diunggah (berdasarkan isi, tanpa metadata)

Tujuan: berkas yang salah, tahunnya tidak sesuai, atau sudah usang **ditolak saat diunggah** dengan alasan yang jelas,
tetapi instrumen tahun baru yang benar **tidak pernah ditolak**.

**Metadata berkas tidak dipakai** sama sekali (tanggal dibuat/diubah di Word atau PDF, maupun nama berkas): mudah
berubah saat berkas disimpan ulang atau diganti namanya. Semua keputusan diambil dari **isi berkas**.

### Data dan formulir
- `VersiInstrumen.tahunInstrumen Int`. Migrasi mengisi versi yang sudah ada dengan 2025.
- Formulir "Instrumen baru" mendapat isian wajib **Tahun instrumen**, misalnya 2025. Isian ini juga tampil dan bisa
  diubah di halaman versi selama versi belum aktif.
- Validasi: 2020 ≤ tahun ≤ tahun berjalan + 2. Di luar itu: "Tahun instrumen tidak masuk akal."
- `VersiInstrumen.sidikJari Json`: sidik jari berkas dan struktur (lihat lapis 3), diisi saat berkas diunggah.

### Tiga lapis pemeriksaan isi
Logika murninya ada di `src/modules/led/domain/periksa-berkas-instrumen.ts`, dengan uji.

**Lapis 1. Tahun dan jenjang dibaca dari teks Matriks dan Pedoman (PDF).** Ini jangkar tahunnya.
- Matriks resmi menulis tahun dan jenjang di setiap halaman, misalnya "MATRIKS PENILAIAN LAPORAN EVALUASI DIRI DAN
  LAPORAN KINERJA PROGRAM STUDI - PROGRAM DIPLOMA TIGA IAPS-AV 2025 1.0". Baca teks 3 halaman pertama, lalu ambil:
  - tahun: angka 4 digit di samping penanda instrumen (`IAPS-[A-Z]+ (\d{4})`, "Instrumen LAM Teknik (\d{4})",
    "Tahun (\d{4})" pada judul/peraturan);
  - jenjang: "PROGRAM DIPLOMA TIGA" → D3, "PROGRAM SARJANA" → S1, dan seterusnya, memakai
    `src/modules/bersama/domain/jenjang.ts`.
- Pedoman Penilaian dibaca dengan cara yang sama (tahun saja).
- Aturan:
  - Tahun di teks ≠ tahun isian → **tolak**: "Matriks ini instrumen tahun {x}, sedangkan tahun instrumen yang diisi {y}.
    Periksa berkasnya atau ubah tahun instrumen." Arahnya tidak penting: lebih baru atau lebih lama sama-sama ditolak,
    supaya admin membetulkan isian tahunnya.
  - Jenjang di matriks ≠ jenjang versi → **tolak**: "Matriks ini untuk Diploma Tiga, sedangkan instrumen ini untuk
    Sarjana."
  - Tahun tidak ditemukan di teks (format masa depan yang berbeda) → tidak ditolak, tetapi admin wajib mencentang
    "Saya sudah memastikan berkas ini instrumen tahun {y}" sebelum ekstraksi. Centang ini dicatat di `LogAktivitas`.

**Lapis 2. Template LED harus cocok dengan Matriks tahun itu.** Template .docx tidak mencantumkan tahun di isinya
(sudah diperiksa pada template resmi 2025 maupun template LPMPP), jadi tahunnya **mengikuti Matriks**.
- Ambil daftar kriteria dari template: aturan bawaan, atau Pemetaan judul (I3) bila formatnya lain.
- Ambil daftar kriteria dari matriks: hasil baca kolom Kriteria, atau cari setiap nama kriteria template di teks matriks.
- Cocok bila **jumlah kriteria sama** dan **setiap nama kriteria template ada di matriks**. Pembandingan memakai
  `kunciTeks` (abaikan huruf besar dan tanda baca). Contoh: 7 kriteria template 2025 ("Diferensiasi Misi (Visi, Misi,
  Tujuan, dan Strategi)", "Akuntabilitas", ...) semuanya ada di matriks Sarjana 2025.
- Tidak cocok → **tolak**: "Kriteria di Template LED ({daftar}) tidak sama dengan kriteria di Matriks {tahun}
  ({daftar}). Kemungkinan template dari tahun atau skema lain." Template LPMPP 2022 (Visi, Misi, Tujuan, dan Strategi;
  Tata Pamong, Tata Kelola dan Kerja sama; Mahasiswa; Sumber Daya Manusia; Keuangan, Sarana dan Prasarana;
  Pendidikan; Penelitian; Pengabdian kepada Masyarakat; ...) tertangkap di sini.
- Dijalankan setiap kali template atau matriks diunggah (bila keduanya sudah ada) dan sekali lagi sebelum ekstraksi.
  Ekstraksi tidak bisa dimulai sebelum lapis 1 dan 2 lulus.

**Lapis 3. Sidik jari berkas dan struktur yang sudah dikenal**, untuk pesan yang tepat dan untuk "belajar" versi baru.
- Berkas `data/instrumen/sidik-jari.json`:
  - `berkas`: SHA-256 isi berkas yang dikenal → `{ nama, tahun, skema, sumber, status: "resmi" | "usang" }`;
  - `struktur`: daftar kriteria per versi struktur → `{ tahun, skema, kriteria[] }`.

  Isi awalnya (SHA-256 sudah dihitung dari berkas di `../Led Lamteknik/`):

  | SHA-256 | Berkas | Tahun | Status |
  | --- | --- | --- | --- |
  | `0a8caea91326748bea48dc6c1c97eda997e3cb4c0557defb2d3a2a7e0cf1a8f5` | Template LEDPS LAM Teknik 2025 (Seluruh Jenjang), lamteknik.or.id; sama dengan `tests/fikstur/instrumen/template-ledps-2025.docx` | 2025 | resmi |
  | `5f5ccbf8cd5c5e799174bd4708879275628e78909b3487204d0f110e74b4fa82` | Template LEDPS LAM Teknik 2025 Unggul Internasional | 2025 | resmi (skema Unggul Internasional) |
  | `5f515d17e3ca849f98b1664aa66927bf90a2ae1da0569d7adb4c78761c0d2753` | Template LEDPS LAM Teknik 2025 PJJ | 2025 | resmi (skema PJJ) |
  | `58e897fe095a647a09acd20316256f26bb964fd373a69ba6817f4c5d229f3a72` | Template LED APS Akademik dan Vokasi (folder LPMPP, D3/S1/STr/S2/S3) | struktur lama | usang |
  | `72b8138727e25e903cec0a703e9a2ff52330663def30053d531f712a45dd1940` | Template LED APS Akademik Unggul Internasional (folder LPMPP) | struktur lama | usang |
  | `c40bb41bc207531c9823e97c9176bae2f0978fdb818e3147999e4e1dda2f16df` | Template LED APS Profesi Insinyur (folder LPMPP) | struktur lama | usang |

  Struktur: "2025" = 7 kriteria C.1–C.7 seperti di atas; "struktur lama" = kriteria Visi, Misi, Tujuan, dan Strategi
  sampai Pengabdian kepada Masyarakat (dan Luaran bila ada).
- Aturan:
  - Berkas berstatus **usang** → **tolak**, dengan nama berkas yang dikenali: "Berkas ini Template LED struktur lama
    (folder LPMPP). Gunakan Template LEDPS LAM Teknik {tahun} dari lamteknik.or.id."
  - Berkas **resmi** dengan tahun ≠ isian → **tidak ditolak** hanya karena itu. Template yang sama bisa saja dipakai lagi
    di instrumen tahun berikutnya. Tampilkan info: "Template ini sama persis dengan Template LAM Teknik 2025; dipakai
    untuk instrumen {y} bila kriterianya cocok dengan Matriks {y}." Keputusan tetap di lapis 1 dan 2.
  - Skema berbeda (misalnya template PJJ atau Unggul Internasional untuk versi reguler) → **peringatan** yang wajib
    dikonfirmasi admin.
  - Struktur **tidak dikenal** (kemungkinan instrumen baru) → **tidak ditolak**; keputusan di lapis 1 dan 2.
- **Belajar versi baru:** saat sebuah versi **diaktifkan**, SHA-256 berkas dan daftar kriterianya disimpan ke tabel
  sidik jari di basis data (model `SidikJariInstrumen`; isinya digabung dengan `sidik-jari.json`). Instrumen 2030 yang
  sudah diaktifkan akan langsung dikenali saat diunggah lagi untuk jenjang lain.
- Saat versi tahun yang lebih baru diaktifkan untuk suatu jenjang, Admin bisa menandai berkas versi lama sebagai
  **usang** lewat satu tombol di halaman versi lama. Setelah itu berkas lama ditolak dengan pesan yang tepat.

### Aturan tambahan
- Tahun isian lebih lama dari versi **aktif** jenjang yang sama → **tolak**: "Sudah ada instrumen aktif tahun {aktif}
  untuk {jenjang}; tahun {y} lebih lama."
- Salah jenis berkas, ditentukan dari isi:
  - Template LED: .docx dengan "LAPORAN EVALUASI DIRI" di halaman awal, dan bukan "Peringatan Pengisian" atau LKPS.
  - Matriks: PDF dengan "MATRIKS PENILAIAN" dan tabel No/Kriteria/Indikator/4/3/2/1/0.
  - Pedoman: PDF dengan "PEDOMAN PENILAIAN".

  Bila salah → **tolak** dengan nama jenis yang terdeteksi: "Berkas ini tampaknya Pedoman Penilaian, bukan Matriks
  Penilaian."
- **Tahun baru yang cocok tidak pernah ditolak**: isian 2030 + matriks bertuliskan 2030 + template yang kriterianya cocok
  dengan matriks 2030 → diterima, walaupun strukturnya belum dikenal.

### Alur unggah (`src/modules/led/data/unggah-instrumen.ts`, halaman versi)
- Pemeriksaan berjalan **sinkron saat berkas diunggah**: membaca paragraf .docx dan teks 3 halaman awal PDF cukup cepat.
  Berkas yang ditolak **tidak disimpan**.
- Penolakan tampil sebagai **kotak peringatan di halaman versi**, bukan hanya toast. Isinya:
  - judul ("Berkas ditolak: tahun tidak sesuai");
  - alasan;
  - **apa yang terbaca dari isi berkas** (jenis, tahun dan jenjang di teks, kriteria, berkas resmi/usang yang dikenali);
  - langkah berikutnya.
- Tiga penolakan terakhir disimpan di `VersiInstrumen.riwayatPeriksa Json` supaya tetap terlihat setelah halaman dimuat
  ulang.

## I2. Pesan galat diagnosis (bukan hanya "struktur lama")

Ganti galat umum "Tidak ada kriteria ... Pastikan berkas adalah Template LEDPS resmi" dengan **diagnosis** dari hasil
pembacaan. Logika murni `diagnosisTemplate(paragraf, hasilUrai)` diberi uji. Kemungkinan diagnosis:

| Diagnosis | Ciri yang dicek | Pesan dan langkah |
| --- | --- | --- |
| Berkas rusak / bukan .docx | gagal dibuka `JSZip` | "Berkas tidak bisa dibuka sebagai dokumen Word. Simpan ulang sebagai .docx lalu unggah lagi." |
| Bukan Template LED | tidak ada "LAPORAN EVALUASI DIRI" di awal; atau berisi "Peringatan Pengisian", "LKPS" | "Berkas ini bukan Template LED (terbaca: {judul awal}). Unggah Template LEDPS dari LAM Teknik." |
| Struktur LED lama | judul berisi kriteria lama (Visi, Misi, Tujuan, dan Strategi; Tata Pamong ...; 9 kriteria) dan tidak ada kriteria C.x | "Template ini memakai struktur LED lama (9 kriteria). Instrumen tahun {y} memakai kriteria pada Matriks." |
| Format judul tidak dikenali | ada judul bertingkat (gaya "heading 1/2/3" atau gaya lain), tetapi aturan bawaan tidak menemukan kriteria | "Format judul template ini berbeda dari template yang dikenal sistem. Tentukan sendiri judulnya lewat **Pemetaan judul** (I3), atau minta **usulan AI** (I4)." |
| Jenjang tidak ada | kriteria terbaca, tetapi tidak ada sub-bagian untuk jenjang versi | "Template terbaca ({n} kriteria), tetapi tidak ada bagian untuk {jenjang}. Jenjang yang ada: {daftar}." |
| Tahun / konsistensi | dari I1 | Pesan I1 |

- Setiap pesan menyertakan ringkasan yang terbaca: jumlah paragraf, BAB yang ditemukan, kriteria yang ditemukan,
  10 gaya judul terbanyak beserta contoh teksnya.
- Diagnosis "Format judul tidak dikenali" **tidak dianggap jalan buntu**. Halaman versi menampilkan dua tombol: "Pemetaan
  judul" (tanpa AI, tanpa token) dan "Minta usulan AI" (memakai token).

## I3. Pemetaan judul oleh admin (tanpa AI, tanpa token)

Untuk template yang formatnya tidak dikenali aturan bawaan, misalnya template baru dari LAM Teknik di masa depan.

- Halaman `/led/instrumen/[versiId]/pemetaan` (Admin UPPS) berisi tabel **gaya paragraf** yang dipakai di template,
  dengan kolom: nama gaya, jumlah paragraf, bernomor atau tidak, tingkat (ilvl), dan 3 contoh teks.
- Untuk tiap gaya, admin memilih **peran**:
  - BAB
  - Bagian Bab II (II.A, II.B, ...)
  - Penanda "Kriteria Akreditasi"
  - **Kriteria**
  - Judul sub-bagian tingkat 1, 2, atau 3
  - Instruksi
  - Abaikan

  Pengaturan tambahan:
  - Pola teks untuk catatan jenjang (bawaan: "disampaikan oleh pengusul ... pada program ...").
  - Pola untuk kotak isian (bawaan: tabel/kotak satu sel).
- Sistem memberi **usulan awal tanpa AI** dari aturan sederhana:
  - gaya "heading 1" dengan teks "BAB ..." → BAB;
  - gaya yang muncul tepat N kali di bawah "Kriteria Akreditasi" → Kriteria;
  - "heading 2/3" → sub-bagian.
- Di samping tabel ada **pratinjau langsung**: pohon BAB → kriteria → sub-bagian beserta jumlahnya per jenjang, dan
  peringatan bila jumlah kriteria tidak sama dengan matriks.
- Simpan sebagai `VersiInstrumen.pemetaanTemplate Json`.
  - `uraiTemplate(paragraf, pemetaan?)` menerima pemetaan opsional. Tanpa pemetaan, perilakunya **persis seperti
    sekarang**; uji lama harus tetap lulus.
  - Ekstraksi (`src/modules/led/proses/instrumen.ts`) dan **ekspor Word** (`src/modules/led/ekspor/template.ts`, yang
    menaruh narasi di bawah judul sub-bagian) wajib memakai pemetaan yang sama, supaya LED dari template ini juga bisa
    diekspor.
- Setelah disimpan, lanjut ke ekstraksi lalu halaman **Cek** yang sudah ada, tempat admin memeriksa hasil sebelum
  mengaktifkan.

## I4. Usulan struktur dari AI (hanya bila admin memilihnya)

- Tombol **"Minta usulan AI"** di hasil diagnosis (I2) dan di halaman Pemetaan (I3). **Tidak pernah berjalan
  otomatis.** Pembacaan tanpa AI dan pemetaan manual tidak memakai token sama sekali.
- Sebelum berjalan, tampilkan perkiraan ukuran ("±{n} judul dikirim, perkiraan {t} token") dan model yang dipakai
  (dari Pengaturan LLM), lalu minta konfirmasi.
- Yang dikirim hanya **kerangka**: untuk tiap paragraf judul atau calon judul, kirim nama gaya, bernomor/tidak, ilvl,
  dan 120 karakter pertama teks, ditambah daftar kriteria dari matriks bila sudah diunggah. Isi narasi tidak dikirim,
  dan template tidak berisi data pribadi.
- Panggil lewat `panggilTerstruktur` dengan skema Zod: peran per gaya dalam bentuk yang sama dengan `pemetaanTemplate`,
  ditambah alasan singkat. Catat di `LogPemakaian`. Saat kunci habis, berhenti dengan pesan yang jelas.
- Hasil AI **hanya mengisi usulan** di halaman Pemetaan; isian yang berubah ditandai "usulan AI". Admin tetap memeriksa
  dan menyimpan sendiri, lalu lanjut ke Cek.
- Dikerjakan lewat antrean worker LED (misalnya `struktur-template`) bila waktunya bisa lebih dari beberapa detik.

## I5. Fikstur, uji, dan dokumen

Fikstur di `tests/fikstur/instrumen/`:
- Salin template LPMPP 2022 (`../Led Lamteknik/Instrumen Akreditasi LAMTEKNIK (dari lpmpp.unila.ac.id)/INSTRUMEN SARJANA/06. .../02. .../Template Laporan Evaluasi Diri Program Studi APS Akademik dan Vokasi (LED Word).docx`)
  menjadi `template-led-lama-2022.docx`.
- Salin matriks D3 2025 resmi menjadi `matriks-d3-2025.pdf`.
- Buat dengan skrip (pustaka `docx`) `template-format-lain.docx`: template LED 2025 tiruan yang hanya memakai gaya
  "Heading 1/2/3", untuk menguji I3.

Uji yang dibutuhkan:
- Template 2025 resmi (yang sudah ada di fikstur) tetap terbaca untuk semua jenjang, dan diagnosisnya "cocok".
- Template LPMPP 2022 → diagnosis "struktur LED lama"; I1 menolak lewat sidik jari berkas (usang) **dan**, bila sidik jarinya dihapus dari daftar, lewat ketidakcocokan kriteria dengan matriks 2025. Metadata tidak dipakai di uji mana pun.
- Matriks D3 diunggah ke versi S1 → ditolak karena jenjang.
- Pedoman diunggah sebagai matriks → ditolak karena salah jenis.
- Tahun diisi 2025, teks matriks berkata 2030 → ditolak. Tahun diisi 2030, matriks berkata 2030, dan template kriterianya cocok → **diterima**, walaupun strukturnya belum dikenal.
- Template resmi 2025 (sidik jari dikenal) dipakai untuk isian 2030 dengan matriks 2030 berkriteria sama → diterima, dengan info "template sama dengan 2025".
- Setelah versi diaktifkan, sidik jarinya tersimpan dan berkas yang sama dikenali pada unggahan berikutnya.
- `template-format-lain.docx` + pemetaan → struktur sama dengan template resmi; ekspor Word menaruh narasi di judul
  yang benar.
- Usulan AI dengan `LLM_NARASI=uji` hanya mengisi usulan, tidak menyimpan pemetaan sendiri, dan tidak berjalan tanpa
  klik.

Dokumen:
- Perbarui `CLAUDE.md` keputusan butir 1 (unggah instrumen: tahun instrumen, pemeriksaan berkas, pemetaan judul, usulan
  AI opsional).
- Perbarui `docs/PANDUAN-PENGGUNAAN.md` bagian Admin UPPS → Instrumen: berkas yang benar per jenjang, dan apa yang
  dilakukan bila ditolak.

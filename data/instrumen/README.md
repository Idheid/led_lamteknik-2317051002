# Data awal instrumen

`lamteknik-2025-pasca.json` — Instrumen LAM Teknik 2025, skema Pasca Terakreditasi Pertama dan Unggul.

Dibuat 1–2 Oktober 2026 dari:
- Template LEDPS LAM Teknik Pasca Akreditasi Minimum dan Unggul Instrumen LAM Teknik 2025 (Seluruh Jenjang).docx
  (struktur bagian, sub-bagian, instruksi, jenjang yang wajib mengisi)
- Matrik Penilaian LED dan LKPS Sarjana APS Akademik dan Vokasi Teknik 2025 (deskriptor skor 4, rumus, tabel LKPS)
- Pedoman Penilaian, Lampiran 10 Peraturan LAM Teknik No. 6/2025 (bobot butir Sarjana)
- Template LKPS APS Vokasi dan Akademik 2025, lembar Daftar Tabel (kode tabel dan nama sheet)
Semua berkas sumber ada di `../Led Lamteknik/Instrumen_Akreditasi_LAM_Teknik_2025 (dari lamteknik.or.id)/01_Pasca Terakreditasi Pertama dan Unggul/`.

## Struktur

```
versi            { kode, nama, lembaga, peraturan[], catatan }
jenjang[]        { kode: D1|D2|D3|S1|STr|S2|S2Tr|S3|S3Tr|PPI, nama }
bagian[]         { kode: AWAL|I|II.A|II.B|C.1..C.7|III|IV|LAMPIRAN, nama, jenis, urutan, batasHalamanResmi?, pengantar?,
                   subBagian[] }
  subBagian      { kode (unik), label (nomor tampilan), judul, tipe: data|narasi|bersama|iku|otomatis, grup,
                   sumberInstruksi: template|sistem, varian[] { instruksi, jenjang[], catatanTemplate? },
                   berlakuUntuk[] (gabungan jenjang semua varian, atau penimpaan), jenjangOverride?, catatan? }
butir[]          { jenjang: S1, kode (1, 4-I, 4-II, ...), no, sub, urutan, bagian, subBagian (kode),
                   elemen, indikator, bobot, jenis: narasi|angka, tabelLkps[], deskriptorSkor4, unsurSkor4[],
                   pertanyaanPemandu, dokumenPendukung[], catatan }
tabelLkps[]      { kode, sheet, judul }
anggaranBawaan   { batasHalamanTotal, kataPerHalaman, faktorAngka, faktorNarasi, porsiIkuDalamKriteria,
                   halamanMinimumKriteria, kataMinimumButir, porsiBersama{LB,KEB,AF,SWOT},
                   halamanPerBagian{kode: halaman}, jenisBagianAnggaran{kode: jenis} }
statusAkreditasi { nilaiMaksimum, aturan[] }
```

Angka pemeriksaan: 14 bagian, 125 sub-bagian (110 berlaku untuk Sarjana), 72 baris butir Sarjana, total bobot 100,01
(pembulatan Pedoman Penilaian), anggaran 150 halaman.

## Catatan mutu data

- `deskriptorSkor4` adalah ringkasan yang setia pada matriks (bukan salinan kata per kata). Untuk tampilan rinci, salin
  teks lengkap dari PDF matriks saat dibutuhkan; `unsurSkor4` dipecah otomatis dari deskriptor bernomor.
- `pertanyaanPemandu` dan `dokumenPendukung` adalah usulan Claude, belum diperiksa pembimbing atau unit penjaminan mutu.
- Instruksi bersumber `sistem` (kata pengantar, ringkasan eksekutif, Bab I) dibuat karena template tidak memberi
  instruksi rinci; konfirmasi ke pembimbing.
- Bobot butir 58 (2,92) dibagi rata 58-I (Bab II.B) dan 58-II (Bab III.1) — asumsi.
- Butir 19 (basic sciences, ≥ 25 SKS) dihitung narasi agar sama dengan dokumen rencana.
- Sub-bagian "Kualifikasi akademik DTPS" ditandai khusus PPI di template, tetapi tetap berlaku untuk Sarjana karena
  dinilai butir 27.
- Jenjang selain Sarjana: struktur sub-bagian sudah lengkap, butir penilaiannya belum diisi (matriks jenjang lain ada di
  folder sumber yang sama).

# Perbedaan alur lama dan baru (untuk Bab III dan IV)

Alur lama = sebelum Rencana 10 November 2026 (revisi 22 Okt–9 Nov). Alur baru = setelah T1–T10. Rincian di
`docs/CATATAN-PENGEMBANGAN.md` dan `docs/SPESIFIKASI.md` bagian 3.

| Tahap | Alur lama | Alur baru | Tahap rencana |
| --- | --- | --- | --- |
| Model narasi | gemini-3-flash-preview (bawaan), tanpa cadangan | gemini-3.8-flash, cadangan 3.5-flash-lite berlabel | T1 |
| Ekstraksi dokumen | lapisan teks PDF/DOCX; PDF pindaian gagal | ditambah OCR lokal tesseract.js (ind+eng) untuk halaman tanpa teks; teks OCR bisa dikoreksi | T3 |
| Potongan | teks saja | kepala konteks tanpa AI (dokumen, jenis, halaman, bagian) + teks | T4 |
| Embedding dokumen | `embedding` teks | `embeddingKonteks` kepala + teks (HNSW); berkas sama dipakai ulang tanpa embedding | T4, T9 |
| Jalur kata kunci | tsvector + ts_rank | BM25 (`pg_textsearch` 1.5.1) atas kepala + teks | T5 |
| Kueri | satu kueri gabungan per sub-bagian, embedding setiap generate | satu kueri per unsur skor 4; vektor kueri disimpan dan disiapkan di muka (0 embedding saat generate) | T6, T9 |
| Pemilihan potongan | RRF, 6–8 teratas | RRF per unsur, k = 10, jaminan tiap unsur, maks. 3 per dokumen, lewati tumpang tindih | T6 |
| Unsur tanpa bukti | AI menulis penanda bila tidak menemukan bukti | pra-cek pencarian; semua unsur tanpa bukti → draf tanpa AI | T6 |
| Jejak pencarian | tidak disimpan | konfigurasi, kueri, kandidat, peringkat per jalur disimpan per versi; ekspor CSV untuk evaluasi | T2 |
| Keluaran AI | paragraf + kode sumber | kutipan bukti dipilih dulu, paragraf merujuk kutipan | T7 |
| Cek keluaran | angka dan sumber dikenal | + kutipan harus persis di sumber; paragraf berkutipan palsu tidak didukung; unsur terpenuhi tanpa bukti diturunkan | T7 |
| Verifikasi per kalimat | aturan otomatis; AI hanya lewat tombol | aturan + AI otomatis satu panggilan per bagian; perbaikan terarah sekali; versi "Perbaikan otomatis" | T8 |
| Gerbang ekspor final | penanda [BELUM ADA BUKTI] | + kalimat tidak didukung yang belum disunting/dikonfirmasi dengan alasan | T8 |
| Generate ulang | selalu memanggil AI | Susun melewati sub-bagian dengan sidik jari konteks sama | T9 |
| Kuota | tanpa perkiraan | perkiraan permintaan/token/jam reset; paralel adaptif terhadap 429; label project Google; token cache dicatat | T7, T9 |
| Konteks per kriteria | disusun ulang tiap sub-bagian | disusun sekali per tugas (cache memori) | T9 |
| Butir angka | rumus otomatis hanya Sarjana (33 rumus) | rumus per jenjang untuk 10 jenjang (262 rumus jenjang + 33 Sarjana); PPI 44 manual karena tabel tidak ada di LKPS | T10 |
| Evaluasi | faithfulness per kalimat | + precision@k/recall@k tiga konfigurasi pencarian; ringkasan pemakaian per Susun | T2, T11 |

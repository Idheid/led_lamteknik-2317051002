# Hasil evaluasi retrieval (Rencana 10 Nov T11)

**Status:** belum ada CSV yang dilabel (hanya `tests/fikstur/retrieval/label-contoh.csv` untuk uji). Angka precision@k dan
recall@k diisi setelah data uji dilabel.

## Langkah

1. Susun LED dengan dokumen asli (konfigurasi bawaan C-unsur), lalu ekspor data uji pencarian:
   halaman Basis Pengetahuan LED → **Unduh data uji pencarian**, atau Admin di Dokumen bersama → **Unduh data uji pencarian (semua LED)**.
   CSV berisi kandidat gabungan (pool) dari ketiga konfigurasi per sub-bagian.
2. Beri label kolom `relevan` (1/0) untuk setiap baris (panduan: `docs/uji/hitungan-manual-retrieval.md`).
3. Hitung:

```bash
npx tsx scripts/hitung-retrieval.ts --csv data-uji-berlabel.csv --konfigurasi A-lama,B-bm25,C-unsur --k 1,3,5 --keluaran docs/uji
```

   Tanpa basis data/kunci API (memakai peringkat yang tercatat saat ekspor):

```bash
npx tsx scripts/hitung-retrieval.ts --csv data-uji-berlabel.csv --dari-csv --keluaran docs/uji
```

   Keluaran: `docs/uji/ringkasan-retrieval.csv` dan `docs/uji/tabel-retrieval.md`.

## Tabel yang diisi

| Konfigurasi | k sistem | Precision@k | Recall@k | Sub-bagian |
| --- | --- | --- | --- | --- |
| A-lama (embedding teks + ts_rank, kueri gabungan) | 8 | | | |
| B-bm25 (embedding berkepala + BM25, kueri gabungan) | 8 | | | |
| C-unsur (embedding berkepala + BM25, kueri per unsur) | 10 | | | |

## Batasan pool

- Recall dihitung terhadap potongan relevan di dalam pool (gabungan kandidat ketiga konfigurasi, 30 kandidat per jalur
  per kueri), bukan seluruh Basis Pengetahuan; potongan relevan yang tidak pernah diambil konfigurasi mana pun tidak
  terhitung (pooling ala TREC).
- Label satu penilai; relevansi dinilai terhadap unsur skor 4 sub-bagian.
- C-unsur memakai k = 10, A/B k = 8; precision@k pada k yang sama (1, 3, 5) lebih adil untuk dibandingkan.

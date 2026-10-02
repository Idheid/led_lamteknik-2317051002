# Sistem Penyusun LED LAM Teknik

Website untuk membantu program studi menyusun draf Laporan Evaluasi Diri (LED) akreditasi LAM Teknik dengan LLM dan RAG.
Skripsi Adrianne Julian, Ilmu Komputer Universitas Lampung.

Status: **iterasi 4 selesai** (ekspor Word ke template LEDPS resmi); sebelumnya **iterasi 3** (iterasi 1: login dua peran, UPPS/prodi/akun, versi instrumen dinamis, proyek LED,
Beranda, form per kriteria; iterasi 2: unggah LKPS Excel/PDF dan metrik butir angka, dokumen pendukung, worker
pemrosesan dan embedding, pencarian gabungan, kunci API; iterasi 3: mesin penyusun narasi per kriteria/butir dengan
antrean, editor, riwayat versi, pemeriksaan otomatis, rotasi kunci dan model). Rincian dan hasil uji:
`docs/CATATAN-PENGEMBANGAN.md`. Cara pakai: `docs/PANDUAN-PENGGUNAAN.md`.

## Menjalankan di komputer lokal

Butuh Node.js 22.18+, Docker Desktop (lihat `docs/PANDUAN-INSTALASI-WINDOWS.md`).

```
npm install
copy .env.example .env      # lalu isi BETTER_AUTH_SECRET, ENCRYPTION_KEY, SUPERADMIN_*
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3000, masuk dengan SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD
npm run worker              # terminal kedua: membaca LKPS, memproses dokumen, menyusun narasi, ekspor Word
```

Pemeriksaan: `npm run lint`, `npm run typecheck`, `npm test` (uji integrasi memakai basis data `led_lamteknik_test`).

Mencoba tanpa kunci Gemini: isi `EMBEDDING_PENYEDIA="uji"` dan `LLM_NARASI="uji"` di `.env` (untuk aplikasi dan worker).
Narasi yang dihasilkan bertanda "[Mode uji]" dan bukan narasi asli; jangan dipakai di produksi.

Ekspor Word butuh template LEDPS (unggah di menu Instrumen → versi, atau `TEMPLATE_LEDPS_PATH`). Untuk menghitung
halaman secara tepat pasang LibreOffice (`winget install TheDocumentFoundation.LibreOffice`, atau isi `SOFFICE_PATH`);
tanpa LibreOffice jumlah halaman diperkirakan.

## Isi

- `CLAUDE.md` — konteks, keputusan, teknologi, dan aturan kerja untuk Claude Code
- `docs/RENCANA-ITERASI.md` — tugas dan kriteria selesai iterasi 1 sampai 4
- `docs/SPESIFIKASI.md` — aturan domain (RAG, anggaran halaman, ekspor Word, tampilan, keamanan)
- `docs/CATATAN-PENGEMBANGAN.md` — log per iterasi (bahan Bab 3/4)
- `docs/PANDUAN-PENGGUNAAN.md` — panduan untuk super admin dan penanggung jawab prodi
- `prisma/` — skema, migrasi, seed; `data/instrumen/` — data awal instrumen LAM Teknik 2025 (Sarjana)
- `src/lib/domain/` — logika inti teruji; `src/lib/data/` — akses data dengan pemeriksaan peran; `src/app/` — halaman

Dokumen rencana: https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

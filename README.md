# Sistem Penyusun LED LAM Teknik

Website untuk membantu program studi menyusun draf Laporan Evaluasi Diri (LED) akreditasi LAM Teknik dengan LLM dan RAG.
Skripsi Adrianne Julian, Ilmu Komputer Universitas Lampung.

Status: **revisi 19 Okt 2026 selesai** di atas iterasi 1–4: peran Admin (akun PJ dan kunci API) dan Penanggung jawab
fakultas (semua prodi), LED per periode 5 tahun, satu sub-bagian satu halaman, unggah instrumen per jenjang (template,
matriks, pedoman; ekstraksi dan halaman cek), butir angka dengan rumus atau nilai manual. Iterasi 1–4: login dan akun,
instrumen dinamis, unggah LKPS dan dokumen, RAG, mesin penyusun narasi dengan antrean dan riwayat versi, ekspor Word ke
template LEDPS resmi. Rincian dan hasil uji: `docs/CATATAN-PENGEMBANGAN.md`. Cara pakai: `docs/PANDUAN-PENGGUNAAN.md`.

## Menjalankan di komputer lokal

Butuh Node.js 22.18+, Docker Desktop (lihat `docs/PANDUAN-INSTALASI-WINDOWS.md`).

```
npm install
copy .env.example .env      # lalu isi BETTER_AUTH_SECRET, ENCRYPTION_KEY, SUPERADMIN_*
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3000, masuk dengan SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD
npm run worker              # terminal kedua: LKPS, dokumen, narasi, ekspor Word, ekstraksi instrumen
```

Pemeriksaan: `npm run lint`, `npm run typecheck`, `npm test` (uji integrasi memakai basis data `led_lamteknik_test`).

Mencoba tanpa kunci Gemini: isi `EMBEDDING_PENYEDIA="uji"` dan `LLM_NARASI="uji"` di `.env` (untuk aplikasi dan worker).
Narasi yang dihasilkan bertanda "[Mode uji]" dan bukan narasi asli; jangan dipakai di produksi.

Ekspor Word memakai Template LED yang diunggah bersama instrumen (menu Instrumen; cadangan `TEMPLATE_LEDPS_PATH`). Untuk menghitung
halaman secara tepat pasang LibreOffice (`winget install TheDocumentFoundation.LibreOffice`, atau isi `SOFFICE_PATH`);
tanpa LibreOffice jumlah halaman diperkirakan.

## Isi

- `CLAUDE.md` — konteks, keputusan, teknologi, dan aturan kerja untuk Claude Code
- `docs/RENCANA-ITERASI.md` — tugas dan kriteria selesai iterasi 1 sampai 4
- `docs/SPESIFIKASI.md` — aturan domain (RAG, anggaran halaman, ekspor Word, tampilan, keamanan)
- `docs/CATATAN-PENGEMBANGAN.md` — log per iterasi (bahan Bab 3/4)
- `docs/PANDUAN-PENGGUNAAN.md` — panduan untuk admin dan penanggung jawab fakultas
- `prisma/` — skema, migrasi, seed; `data/instrumen/` — data awal instrumen LAM Teknik 2025 (Sarjana; juga kerangka
  bawaan bila belum ada instrumen); `tests/fikstur/instrumen/` — template, matriks Sarjana, dan pedoman penilaian resmi
- `src/lib/domain/` — logika inti teruji; `src/lib/data/` — akses data dengan pemeriksaan peran; `src/app/` — halaman

Dokumen rencana: https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

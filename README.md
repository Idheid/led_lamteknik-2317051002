# Sistem Penyusun LED LAM Teknik

Website untuk membantu program studi menyusun draf Laporan Evaluasi Diri (LED) akreditasi LAM Teknik dengan LLM dan RAG.
Skripsi Adrianne Julian, Ilmu Komputer Universitas Lampung.

Status: **iterasi 1 selesai** (login dua peran, UPPS/prodi/akun, versi instrumen dinamis, proyek LED, Beranda dengan
anggaran halaman, halaman form per kriteria). Rincian dan hasil uji: `docs/CATATAN-PENGEMBANGAN.md`.

## Menjalankan di komputer lokal

Butuh Node.js 22.18+, Docker Desktop (lihat `docs/PANDUAN-INSTALASI-WINDOWS.md`).

```
npm install
copy .env.example .env      # lalu isi BETTER_AUTH_SECRET, ENCRYPTION_KEY, SUPERADMIN_*
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3000, masuk dengan SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD
```

Pemeriksaan: `npm run lint`, `npm run typecheck`, `npm test` (uji integrasi memakai basis data `led_lamteknik_test`).

## Isi

- `CLAUDE.md` — konteks, keputusan, teknologi, dan aturan kerja untuk Claude Code
- `docs/RENCANA-ITERASI.md` — tugas dan kriteria selesai iterasi 1 sampai 4
- `docs/SPESIFIKASI.md` — aturan domain (RAG, anggaran halaman, ekspor Word, tampilan, keamanan)
- `docs/CATATAN-PENGEMBANGAN.md` — log per iterasi (bahan Bab 3/4)
- `prisma/` — skema, migrasi, seed; `data/instrumen/` — data awal instrumen LAM Teknik 2025 (Sarjana)
- `src/lib/domain/` — logika inti teruji; `src/lib/data/` — akses data dengan pemeriksaan peran; `src/app/` — halaman

Dokumen rencana: https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

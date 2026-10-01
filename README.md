# Sistem Penyusun LED LAM Teknik

Website untuk membantu program studi menyusun draf Laporan Evaluasi Diri (LED) akreditasi LAM Teknik dengan LLM dan RAG.
Skripsi Adrianne Julian, Ilmu Komputer Universitas Lampung.

Status: **paket awal untuk Claude Code**. Kerangka aplikasi Next.js belum dibuat; iterasi 1 dimulai dari langkah
"Langkah pertama" di `CLAUDE.md`.

Isi saat ini:
- `CLAUDE.md` — konteks, keputusan, teknologi, dan aturan kerja untuk Claude Code
- `docs/PANDUAN-INSTALASI-WINDOWS.md` — program yang perlu dipasang dan cara membuka proyek di Claude Code
- `docs/RENCANA-ITERASI.md` — tugas dan kriteria selesai iterasi 1 sampai 4
- `docs/SPESIFIKASI.md` — aturan domain (RAG, anggaran halaman, ekspor Word, tampilan, keamanan)
- `docs/rancangan/schema.prisma` — draf model data
- `data/instrumen/lamteknik-2025-pasca.json` — data awal instrumen LAM Teknik 2025 (Sarjana)
- `src/lib/domain/` — logika inti yang sudah diuji: tahun akademik/TS, anggaran halaman, rotasi kunci API, teks, prompt

Menjalankan uji logika inti (butuh Node.js 22.18 atau lebih baru):

```
node --test "src/lib/domain/__tests__/*.test.ts"
```

Dokumen rencana: https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

# Sistem Penyusun LED LAM Teknik

Website untuk membantu program studi menyusun draf Laporan Evaluasi Diri (LED) akreditasi LAM Teknik dengan LLM dan RAG.
Skripsi Adrianne Julian, Ilmu Komputer Universitas Lampung.

Status: **revisi 22 Okt 2026** di atas revisi 19 Okt dan iterasi 1–4. Tiga peran: Admin (akun, penugasan asesor,
kunci API), Penanggung jawab fakultas (semua prodi dan LED), dan Asesor (review real time, skor 0–4, Layak diajukan).
Fitur 22 Okt: generate lebih cepat dan bertahap, deadline dan kesiapan LED dengan jadwal kerja mundur, rujukan sumber dan
Daftar Rujukan di Word (Lampiran tidak dihitung dalam 150 halaman), ekspor DRAF, target dan capaian dengan tren tiga
tahun, verifikasi per kalimat dan konsistensi angka, Basis Pengetahuan dengan uji cari, server produksi Docker dengan
HTTPS, dan cadangan harian. Sinkron One Data menunggu akses API (`docs/ONE-DATA-KEBUTUHAN.md`). Rincian dan hasil uji:
`docs/CATATAN-PENGEMBANGAN.md`. Cara pakai: `docs/PANDUAN-PENGGUNAAN.md`. Server dan cadangan: `docs/PANDUAN-SERVER.md`.

## Menjalankan di komputer lokal

Butuh Node.js 22.18+, Docker Desktop (lihat `docs/PANDUAN-INSTALASI-WINDOWS.md`).

```
npm install
copy .env.example .env      # lalu isi BETTER_AUTH_SECRET, ENCRYPTION_KEY, SUPERADMIN_*
docker compose up -d
npm run db:migrate
npm run dev                 # http://localhost:3000; pertama kali: isi formulir "Buat akun admin pertama"
npm run worker              # terminal kedua: LKPS, dokumen, narasi, ekspor Word, ekstraksi instrumen, cadangan harian
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
- `docs/PANDUAN-PENGGUNAAN.md` — panduan untuk admin, penanggung jawab fakultas, dan asesor
- `docs/PANDUAN-SERVER.md` — produksi Docker, HTTPS, akses jaringan lokal, cadangan dan pemulihan
- `docs/ONE-DATA-KEBUTUHAN.md` — daftar kebutuhan data untuk permintaan akses API One Data
- `prisma/` — skema, migrasi, seed; `data/instrumen/` — data awal instrumen LAM Teknik 2025 (Sarjana; juga kerangka
  bawaan bila belum ada instrumen); `tests/fikstur/instrumen/` — template, matriks Sarjana, dan pedoman penilaian resmi
- `src/modules/led/domain/` — logika inti teruji; `src/modules/led/data/` — akses data dengan pemeriksaan peran; `src/app/` — halaman

Dokumen rencana: https://claude.ai/code/artifact/ba67e45c-545f-4cd6-a0ee-1011eaf55dd5

# Catatan pengembangan

Catatan per iterasi: apa yang dibuat, keputusan teknis, versi pustaka, umpan balik pembimbing.
Catatan ini menjadi bahan Bab 3 (perancangan) dan Bab 4 (implementasi) skripsi.

## 2 Oktober 2026 — paket awal (disiapkan di Claude Cowork)

- Dibuat: CLAUDE.md, dokumen rencana iterasi, spesifikasi, panduan instalasi Windows, draf skema Prisma,
  docker-compose (PostgreSQL 17 + pgvector), data awal instrumen LAM Teknik 2025 (Sarjana).
- Logika inti murni di `src/lib/domain/` dengan 22 uji (`node --test`), semuanya lulus di Node.js 22.22:
  tahun akademik/TS, anggaran halaman dan kata (hasilnya sama dengan lembar kerja Matriks butir LED Sarjana),
  rotasi kunci API Gemini (reset tengah malam waktu Pasifik), utilitas teks Indonesia dan pemeriksaan angka, penyusun prompt.
- Uji coba ekspor (`docs/spike-ekspor/`): `docx` 9.7.1 `patchDocument` berhasil mengisi Template LEDPS asli dengan
  paragraf justify Arial, teks miring, tabel, dan gambar; header, logo, dan gaya template tetap. Temuan: setiap
  sub-bagian punya kotak teks kosong (60 kotak) yang harus dihapus saat penyiapan template.
- Keputusan Adrianne (2 Okt): narasi menggantikan kotak isian. Spike diperbarui: `siapkan-template.py` mengganti
  instruksi + catatan biru + kotak + paragraf kosong di bawah setiap judul dengan `{{kode}}`, mencatat indentasi, dan
  mempertahankan pemisah halaman. Diuji untuk Bab I, II.B, dan C.1; hasilnya rapi (lihat gambar di `docs/spike-ekspor/`).
- Kerangka Next.js belum dibuat karena registry npm tidak bisa diakses dari lingkungan Cowork; dilanjutkan di Claude Code.
- Keputusan terbuka: kunci cadangan super admin dipakai otomatis atau dipilih penanggung jawab (sementara: otomatis,
  bisa dimatikan lewat `pakaiCadanganAdmin`); usulan fitur U-01–U-09; server fakultas (Node.js/Docker); prodi uji.

## Iterasi 1 — (diisi Claude Code)

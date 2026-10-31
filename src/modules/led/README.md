# Modul LED

Penyusun draf Laporan Evaluasi Diri LAM Teknik (skripsi Adrianne Julian). Rute di `src/app/led/`:

- `src/app/led/(penyusun)/` penanggung jawab: `/led` (Semua LED), `/led/baru`, `/led/[proyekId]/...`, `/led/instrumen`,
  `/led/dokumen-bersama`. Grup rute `(penyusun)` hanya memisahkan pemeriksaan peran; alamatnya tetap `/led/...`.
- `src/app/led/asesor/` asesor: `/led/asesor`, `/led/asesor/[proyekId]/...`.
- Route Handler di `src/app/api/led/`.

Isi folder: `domain/` (logika murni + uji), `data/` (akses data), `proses/` (worker), `data-lkps/` (pembaca berkas
LKPS Excel/PDF yang diunggah ke LED), `ekspor/` (pengisi template Word), `instrumen/` (pembaca template dan PDF
instrumen), `komponen/` (editor narasi, review, Basis Pengetahuan, kesiapan, sidebar LED), `validasi.ts` (skema Zod
khusus LED), `tampil.ts` (format nilai metrik).

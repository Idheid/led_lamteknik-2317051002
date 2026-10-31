# Modul LED

Penyusun draf Laporan Evaluasi Diri LAM Teknik (skripsi Adrianne Julian). Rute di `src/app/led/`:

- `src/app/led/(tim-prodi)/` Tim Prodi: `/led` (LED prodi), `/led/baru`, `/led/identitas-prodi`, `/led/[proyekId]/...`.
- `src/app/led/(admin)/` Admin UPPS: `/led/pantau`, `/led/instrumen`, `/led/dokumen-bersama`. Grup rute hanya memisahkan
  pemeriksaan peran (revisi 31 Okt 2026); alamatnya tetap `/led/...`.
- `src/app/led/asesor/` asesor: `/led/asesor`, `/led/asesor/[proyekId]/...`. Admin UPPS memakai
  `/led/asesor/[proyekId]/...` sebagai tampilan baca LED (tanpa alat catatan dan skor).
- Route Handler di `src/app/api/led/`.

Isi folder: `domain/` (logika murni + uji), `data/` (akses data), `proses/` (worker), `data-lkps/` (pembaca berkas
LKPS Excel/PDF yang diunggah ke LED), `ekspor/` (pengisi template Word), `instrumen/` (pembaca template dan PDF
instrumen), `komponen/` (editor narasi, review, Basis Pengetahuan, kesiapan, sidebar LED), `validasi.ts` (skema Zod
khusus LED), `tampil.ts` (format nilai metrik).

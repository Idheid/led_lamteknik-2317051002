-- 31 Okt 2026: satu website untuk modul LKPS dan LED. Halaman LED pindah dari /proyek ke /led dan halaman asesor dari
-- /asesor ke /led/asesor. Tautan pemberitahuan lama di lonceng diperbarui (alamat lama juga diarahkan oleh
-- next.config.ts). Tidak ada perubahan tabel.
UPDATE "Pemberitahuan" SET "tautan" = '/led' || substr("tautan", length('/proyek') + 1)
WHERE "tautan" = '/proyek' OR "tautan" LIKE '/proyek/%' OR "tautan" LIKE '/proyek#%' OR "tautan" LIKE '/proyek?%';

UPDATE "Pemberitahuan" SET "tautan" = '/led/asesor' || substr("tautan", length('/asesor') + 1)
WHERE "tautan" = '/asesor' OR "tautan" LIKE '/asesor/%' OR "tautan" LIKE '/asesor#%' OR "tautan" LIKE '/asesor?%';

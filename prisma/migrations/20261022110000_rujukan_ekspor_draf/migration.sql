-- Revisi 22 Okt 2026: tahun terbit dokumen (rujukan di Word), ekspor DRAF/final, halaman tanpa lampiran
ALTER TABLE "Dokumen" ADD COLUMN "tahunTerbit" INTEGER;
ALTER TABLE "Ekspor" ADD COLUMN "jenis" TEXT NOT NULL DEFAULT 'final',
ADD COLUMN "jumlahHalamanTotal" INTEGER;

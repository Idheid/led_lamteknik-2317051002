-- Rencana 10 Nov T3: OCR lokal untuk PDF pindaian

-- AlterTable
ALTER TABLE "Dokumen" ADD COLUMN     "halamanTeks" JSONB,
ADD COLUMN     "versiOcr" TEXT;

-- AlterTable
ALTER TABLE "Potongan" ADD COLUMN     "keyakinanOcr" INTEGER,
ADD COLUMN     "sumberTeks" TEXT NOT NULL DEFAULT 'teks';


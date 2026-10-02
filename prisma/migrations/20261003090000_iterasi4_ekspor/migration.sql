-- AlterTable
ALTER TABLE "Ekspor" ADD COLUMN     "dibuatOlehId" TEXT,
ADD COLUMN     "halamanPerkiraan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "namaBerkas" TEXT,
ADD COLUMN     "pesan" TEXT,
ADD COLUMN     "ukuran" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "lokasi" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'antre';

-- AlterTable
ALTER TABLE "VersiInstrumen" ADD COLUMN     "templateLedLaporan" JSONB,
ADD COLUMN     "templateLedLokasi" TEXT,
ADD COLUMN     "templateLedNama" TEXT;

-- CreateIndex
CREATE INDEX "Ekspor_proyekId_idx" ON "Ekspor"("proyekId");


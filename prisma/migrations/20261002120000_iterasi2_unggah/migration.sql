-- AlterTable
ALTER TABLE "BerkasLKPS" ADD COLUMN     "aktif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diprosesPada" TIMESTAMP(3),
ADD COLUMN     "diunggahOlehId" TEXT,
ADD COLUMN     "identitas" JSONB,
ADD COLUMN     "masalah" JSONB,
ADD COLUMN     "ukuran" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Dokumen" ADD COLUMN     "diprosesPada" TIMESTAMP(3),
ADD COLUMN     "diunggahOlehId" TEXT,
ADD COLUMN     "dokumenDiharapkanId" TEXT,
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "jenis" TEXT NOT NULL DEFAULT 'pdf',
ADD COLUMN     "judul" TEXT,
ADD COLUMN     "jumlahPotongan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TabelLKPS" ADD COLUMN     "blok" TEXT,
ADD COLUMN     "dikoreksi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "judul" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kolom" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "kolomRumus" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "urutan" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "BerkasLKPS_proyekId_idx" ON "BerkasLKPS"("proyekId");

-- CreateIndex
CREATE INDEX "Dokumen_proyekId_subBagianKode_idx" ON "Dokumen"("proyekId", "subBagianKode");

-- CreateIndex
CREATE UNIQUE INDEX "TabelLKPS_berkasId_sheet_key" ON "TabelLKPS"("berkasId", "sheet");

-- AddForeignKey
ALTER TABLE "Dokumen" ADD CONSTRAINT "Dokumen_dokumenDiharapkanId_fkey" FOREIGN KEY ("dokumenDiharapkanId") REFERENCES "DokumenDiharapkan"("id") ON DELETE SET NULL ON UPDATE CASCADE;


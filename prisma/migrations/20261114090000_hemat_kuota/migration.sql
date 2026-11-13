-- Rencana 10 Nov T9: pakai ulang hasil pemrosesan dokumen, label project Google pada kunci, sidik jari konteks
-- AlterTable
ALTER TABLE "Dokumen" ADD COLUMN     "dokumenSumberPakaiUlangId" TEXT,
ADD COLUMN     "versiPemrosesan" TEXT;

-- AlterTable
ALTER TABLE "KunciAPI" ADD COLUMN     "proyekGoogle" TEXT;

-- AlterTable
ALTER TABLE "VersiDraf" ADD COLUMN     "modeGenerate" TEXT,
ADD COLUMN     "sidikJari" TEXT;

-- CreateIndex
CREATE INDEX "Dokumen_hash_versiPemrosesan_idx" ON "Dokumen"("hash", "versiPemrosesan");


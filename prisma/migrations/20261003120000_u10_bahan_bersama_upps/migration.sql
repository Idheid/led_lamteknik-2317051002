
-- AlterTable
ALTER TABLE "Dokumen" ADD COLUMN     "uppsId" TEXT,
ALTER COLUMN "proyekId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Dokumen_uppsId_idx" ON "Dokumen"("uppsId");

-- AddForeignKey
ALTER TABLE "Dokumen" ADD CONSTRAINT "Dokumen_uppsId_fkey" FOREIGN KEY ("uppsId") REFERENCES "Upps"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- dokumen milik tepat satu: proyek atau UPPS
ALTER TABLE "Dokumen" ADD CONSTRAINT "Dokumen_pemilik_check" CHECK (("proyekId" IS NULL) <> ("uppsId" IS NULL));

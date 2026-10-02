-- DropForeignKey
ALTER TABLE "KunciAPI" DROP CONSTRAINT "KunciAPI_pemilikId_fkey";

-- DropIndex
DROP INDEX "user_prodiId_key";

-- AlterTable
ALTER TABLE "BagianDraf" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "KunciAPI" ALTER COLUMN "pemilikId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LogPemakaian" ADD COLUMN     "durasiMs" INTEGER,
ADD COLUMN     "prodiId" TEXT,
ADD COLUMN     "tugasId" TEXT;

-- AlterTable
ALTER TABLE "PengaturanLLM" ADD COLUMN     "daftarModel" JSONB,
ADD COLUMN     "daftarModelDiperbarui" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VersiDraf" ADD COLUMN     "tugasId" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "wajibGantiSandi" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TugasGenerate" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "bagianKode" TEXT,
    "judul" TEXT NOT NULL,
    "subBagianKode" TEXT[],
    "indeks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'antre',
    "pesan" TEXT,
    "dilanjutkanPada" TIMESTAMP(3),
    "dibuatOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TugasGenerate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TugasGenerate_proyekId_status_idx" ON "TugasGenerate"("proyekId", "status");

-- AddForeignKey
ALTER TABLE "KunciAPI" ADD CONSTRAINT "KunciAPI_pemilikId_fkey" FOREIGN KEY ("pemilikId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TugasGenerate" ADD CONSTRAINT "TugasGenerate_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- model narasi bawaan lama (2.5) dibatasi Google untuk pengguna baru; diganti saat daftar model dimuat
UPDATE "PengaturanLLM" SET "modelNarasi" = 'gemini-3-flash-preview' WHERE "modelNarasi" LIKE 'gemini-2.5%';

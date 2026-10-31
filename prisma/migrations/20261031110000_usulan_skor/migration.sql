-- AlterTable
ALTER TABLE "ProyekLED" ADD COLUMN     "pesanSkorRubrik" TEXT,
ADD COLUMN     "statusSkorRubrik" TEXT;

-- CreateTable
CREATE TABLE "UsulanSkor" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "butirKode" TEXT NOT NULL,
    "skor" DOUBLE PRECISION NOT NULL,
    "alasan" TEXT NOT NULL,
    "unsurTerpenuhi" JSONB NOT NULL,
    "unsurKurang" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "versiDrafIds" JSONB NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsulanSkor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsulanSkor_proyekId_butirKode_key" ON "UsulanSkor"("proyekId", "butirKode");

-- AddForeignKey
ALTER TABLE "UsulanSkor" ADD CONSTRAINT "UsulanSkor_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;


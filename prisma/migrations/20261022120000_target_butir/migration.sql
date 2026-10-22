-- Revisi 22 Okt 2026: target per butir angka untuk evaluasi capaian

-- CreateTable
CREATE TABLE "TargetButir" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "butirKode" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "satuan" TEXT,
    "sumber" TEXT,
    "lebihKecil" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetButir_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TargetButir_proyekId_butirKode_key" ON "TargetButir"("proyekId", "butirKode");

-- AddForeignKey
ALTER TABLE "TargetButir" ADD CONSTRAINT "TargetButir_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterEnum
ALTER TYPE "Peran" ADD VALUE 'ASESOR';


-- AlterTable
ALTER TABLE "ProyekLED" ADD COLUMN     "asesorId" TEXT,
ADD COLUMN     "keputusanReview" JSONB;

-- CreateTable
CREATE TABLE "CatatanRevisi" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "bagianKode" TEXT NOT NULL,
    "subBagianKode" TEXT NOT NULL,
    "asesorId" TEXT,
    "teks" TEXT NOT NULL,
    "sebelum" TEXT NOT NULL DEFAULT '',
    "sesudah" TEXT NOT NULL DEFAULT '',
    "isi" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'terbuka',
    "versiAwalId" TEXT,
    "versiPerbaikanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatatanRevisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalasanCatatan" (
    "id" TEXT NOT NULL,
    "catatanId" TEXT NOT NULL,
    "penulisId" TEXT,
    "jenis" TEXT NOT NULL DEFAULT 'balasan',
    "isi" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalasanCatatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkorAsesor" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "butirKode" TEXT NOT NULL,
    "skor" DOUBLE PRECISION NOT NULL,
    "skorSistem" DOUBLE PRECISION,
    "alasan" TEXT,
    "asesorId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkorAsesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pemberitahuan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proyekId" TEXT,
    "pesan" TEXT NOT NULL,
    "tautan" TEXT,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pemberitahuan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatatanRevisi_proyekId_subBagianKode_idx" ON "CatatanRevisi"("proyekId", "subBagianKode");

-- CreateIndex
CREATE INDEX "BalasanCatatan_catatanId_idx" ON "BalasanCatatan"("catatanId");

-- CreateIndex
CREATE UNIQUE INDEX "SkorAsesor_proyekId_butirKode_key" ON "SkorAsesor"("proyekId", "butirKode");

-- CreateIndex
CREATE INDEX "Pemberitahuan_userId_dibaca_createdAt_idx" ON "Pemberitahuan"("userId", "dibaca", "createdAt");

-- AddForeignKey
ALTER TABLE "ProyekLED" ADD CONSTRAINT "ProyekLED_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanRevisi" ADD CONSTRAINT "CatatanRevisi_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanRevisi" ADD CONSTRAINT "CatatanRevisi_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalasanCatatan" ADD CONSTRAINT "BalasanCatatan_catatanId_fkey" FOREIGN KEY ("catatanId") REFERENCES "CatatanRevisi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalasanCatatan" ADD CONSTRAINT "BalasanCatatan_penulisId_fkey" FOREIGN KEY ("penulisId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkorAsesor" ADD CONSTRAINT "SkorAsesor_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pemberitahuan" ADD CONSTRAINT "Pemberitahuan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


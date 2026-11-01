-- L2 (2 Nov 2026): pengingat akreditasi berakhir yang sudah terkirim.

-- CreateTable
CREATE TABLE "PengingatTerkirim" (
    "id" TEXT NOT NULL,
    "prodiId" TEXT NOT NULL,
    "berlakuSampai" TIMESTAMP(3) NOT NULL,
    "ambang" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengingatTerkirim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PengingatTerkirim_prodiId_berlakuSampai_ambang_key" ON "PengingatTerkirim"("prodiId", "berlakuSampai", "ambang");


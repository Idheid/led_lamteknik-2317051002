-- CreateTable
CREATE TABLE "Cadangan" (
    "id" TEXT NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selesai" TIMESTAMP(3),
    "berhasil" BOOLEAN,
    "folder" TEXT,
    "ukuranMb" DOUBLE PRECISION,
    "pesan" TEXT,

    CONSTRAINT "Cadangan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cadangan_mulai_idx" ON "Cadangan"("mulai");


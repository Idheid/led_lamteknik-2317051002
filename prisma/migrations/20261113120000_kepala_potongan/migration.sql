-- Rencana 10 Nov T4: kepala konteks potongan, teks berkepala, embeddingKonteks, tugas indeks ulang

-- AlterTable
ALTER TABLE "Potongan" ADD COLUMN     "embeddingKonteks" vector(768),
ADD COLUMN     "kepala" TEXT,
ADD COLUMN     "teksIndeks" TEXT,
ADD COLUMN     "versiKepala" TEXT;

-- CreateTable
CREATE TABLE "TugasIndeksUlang" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'antre',
    "total" INTEGER NOT NULL DEFAULT 0,
    "selesai" INTEGER NOT NULL DEFAULT 0,
    "permintaan" INTEGER NOT NULL DEFAULT 0,
    "pesan" TEXT,
    "dibuatOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selesaiPada" TIMESTAMP(3),

    CONSTRAINT "TugasIndeksUlang_pkey" PRIMARY KEY ("id")
);


-- indeks HNSW untuk vektor potongan berkepala (jarak kosinus)
CREATE INDEX "Potongan_embeddingKonteks_hnsw_idx" ON "Potongan" USING hnsw ("embeddingKonteks" vector_cosine_ops);

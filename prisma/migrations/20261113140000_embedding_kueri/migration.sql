-- Rencana 10 Nov T6: vektor kueri pencarian yang disimpan



-- CreateTable
CREATE TABLE "EmbeddingKueri" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "dimensi" INTEGER NOT NULL,
    "teks" TEXT NOT NULL,
    "vektor" vector(768) NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmbeddingKueri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmbeddingKueri_hash_key" ON "EmbeddingKueri"("hash");

-- CreateIndex
CREATE INDEX "EmbeddingKueri_model_idx" ON "EmbeddingKueri"("model");


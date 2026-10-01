-- DropIndex
DROP INDEX "Potongan_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "Potongan_teksTsv_gin_idx";

-- AlterTable
ALTER TABLE "Potongan" ALTER COLUMN "teksTsv" DROP DEFAULT;

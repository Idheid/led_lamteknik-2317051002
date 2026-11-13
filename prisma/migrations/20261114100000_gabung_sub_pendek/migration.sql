-- Rencana 10 Nov T9: mode hemat gabung sub-bagian pendek (bawaan mati)
-- AlterTable
ALTER TABLE "PengaturanLLM" ADD COLUMN     "gabungSubPendek" BOOLEAN NOT NULL DEFAULT false;

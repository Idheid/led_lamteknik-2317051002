-- Rencana 10 Nov T7: token masukan dari cache implisit Gemini
-- AlterTable
ALTER TABLE "LogPemakaian" ADD COLUMN     "tokenCache" INTEGER NOT NULL DEFAULT 0;

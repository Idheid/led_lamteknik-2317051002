-- L5 (2 Nov 2026): salin bahan dari LED periode lalu.

-- AlterTable
ALTER TABLE "ProyekLED" ADD COLUMN     "asalProyekId" TEXT,
ADD COLUMN     "bahanBelumDipindah" JSONB,
ADD COLUMN     "pakaiNarasiLalu" BOOLEAN NOT NULL DEFAULT false;


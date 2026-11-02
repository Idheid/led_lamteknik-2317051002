-- AlterTable
ALTER TABLE "TugasGenerate" ADD COLUMN     "bagianBerikutnya" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rangkaianKe" INTEGER,
ADD COLUMN     "rangkaianTotal" INTEGER;


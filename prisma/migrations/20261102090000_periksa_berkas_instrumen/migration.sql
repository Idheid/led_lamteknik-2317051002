-- Perbaikan 2 Nov 2026 (I1): tahun instrumen, sidik jari, dan riwayat pemeriksaan berkas.
-- Versi yang sudah ada diisi tahun 2025.
ALTER TABLE "VersiInstrumen" ADD COLUMN     "riwayatPeriksa" JSONB,
ADD COLUMN     "sidikJari" JSONB,
ADD COLUMN     "tahunInstrumen" INTEGER NOT NULL DEFAULT 2025;
ALTER TABLE "VersiInstrumen" ALTER COLUMN "tahunInstrumen" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SidikJariInstrumen" (
    "id" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tahun" INTEGER,
    "skema" TEXT NOT NULL DEFAULT 'reguler',
    "status" TEXT NOT NULL,
    "kriteria" JSONB,
    "jenjang" TEXT,
    "versiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SidikJariInstrumen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SidikJariInstrumen_sha256_key" ON "SidikJariInstrumen"("sha256");

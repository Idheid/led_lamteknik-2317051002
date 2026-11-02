-- L1 (2 Nov 2026): riwayat akreditasi prodi dan label arsip LED.

-- AlterTable
ALTER TABLE "ProyekLED" ADD COLUMN     "labelArsip" TEXT;

-- CreateTable
CREATE TABLE "RiwayatAkreditasi" (
    "id" TEXT NOT NULL,
    "prodiId" TEXT NOT NULL,
    "lembaga" TEXT NOT NULL DEFAULT 'LAM Teknik',
    "peringkat" TEXT NOT NULL,
    "nomorSk" TEXT,
    "tanggalSk" TIMESTAMP(3),
    "berlakuMulai" TIMESTAMP(3),
    "berlakuSampai" TIMESTAMP(3),
    "proyekId" TEXT,
    "berkasSkLokasi" TEXT,
    "berkasSkNama" TEXT,
    "jenis" TEXT NOT NULL DEFAULT 'hasil',
    "alasan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'berlaku',
    "dicatatOlehId" TEXT,
    "dikonfirmasiOlehId" TEXT,
    "dikonfirmasiPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiwayatAkreditasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiwayatAkreditasi_prodiId_status_createdAt_idx" ON "RiwayatAkreditasi"("prodiId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "RiwayatAkreditasi" ADD CONSTRAINT "RiwayatAkreditasi_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data prodi yang sudah ada menjadi satu baris riwayat "awal" supaya tidak ada yang hilang.
INSERT INTO "RiwayatAkreditasi" ("id", "prodiId", "lembaga", "peringkat", "nomorSk", "berlakuSampai", "jenis", "status", "createdAt")
SELECT 'awal_' || p."id", p."id",
       COALESCE(NULLIF(p."identitas"->>'lembagaAkreditasi', ''), 'LAM Teknik'),
       COALESCE(p."identitas"->>'peringkatAkreditasi', ''),
       NULLIF(p."identitas"->>'nomorSkAkreditasi', ''),
       p."akreditasiBerlakuSampai", 'awal', 'berlaku', p."createdAt"
FROM "Prodi" p
WHERE p."akreditasiBerlakuSampai" IS NOT NULL
   OR COALESCE(p."identitas"->>'peringkatAkreditasi', '') <> ''
   OR COALESCE(p."identitas"->>'nomorSkAkreditasi', '') <> '';

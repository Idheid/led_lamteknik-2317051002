-- Revisi 22 Okt 2026: batas pengajuan, jadwal kerja mundur, status review asesor
ALTER TABLE "ProyekLED" ADD COLUMN "batasPengajuan" TIMESTAMP(3),
ADD COLUMN "jadwal" JSONB,
ADD COLUMN "statusReview" TEXT NOT NULL DEFAULT 'draf';

-- usulan awal batas pengajuan LED aktif: 6 bulan sebelum akreditasi prodi berakhir
UPDATE "ProyekLED" l
SET "batasPengajuan" = p."akreditasiBerlakuSampai" - INTERVAL '6 months'
FROM "Prodi" p
WHERE l."prodiId" = p.id AND l."diarsipkanPada" IS NULL AND p."akreditasiBerlakuSampai" IS NOT NULL;

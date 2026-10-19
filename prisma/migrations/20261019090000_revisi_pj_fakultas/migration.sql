-- Revisi 19 Oktober 2026 (docs/RENCANA-ITERASI.md, "Rencana Revisi Website LED LAM Teknik"):
-- PJ tingkat fakultas, UPPS diganti identitas fakultas, kunci API milik fakultas, LED per periode 5 tahun,
-- instrumen per jenjang diunggah PJ, butir dengan deskriptor 3-0 dan kode rumus, nilai manual butir angka.
-- Tidak ada data yang dihapus tanpa dipindah lebih dulu.

-- 1. Identitas fakultas (satu baris) dari UPPS pertama
CREATE TABLE "Fakultas" (
    "id" TEXT NOT NULL DEFAULT 'utama',
    "nama" TEXT NOT NULL,
    "perguruanTinggi" TEXT NOT NULL,
    "alamat" TEXT,
    "kota" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Fakultas_pkey" PRIMARY KEY ("id")
);
INSERT INTO "Fakultas" ("id", "nama", "perguruanTinggi", "alamat", "updatedAt")
SELECT 'utama', "nama", "perguruanTinggi", "alamat", CURRENT_TIMESTAMP
FROM "Upps" ORDER BY "createdAt" ASC LIMIT 1;

-- 2. LED per periode 5 tahun: tahun pengajuan dari tanggal LED dibuat; satu LED aktif per prodi
ALTER TABLE "ProyekLED" ADD COLUMN "tahunPengajuan" INTEGER;
UPDATE "ProyekLED" SET "tahunPengajuan" = EXTRACT(YEAR FROM "createdAt")::INTEGER;
ALTER TABLE "ProyekLED" ALTER COLUMN "tahunPengajuan" SET NOT NULL;
UPDATE "ProyekLED" p SET "diarsipkanPada" = CURRENT_TIMESTAMP
WHERE p."diarsipkanPada" IS NULL
  AND EXISTS (
    SELECT 1 FROM "ProyekLED" q
    WHERE q."prodiId" = p."prodiId" AND q."diarsipkanPada" IS NULL
      AND (q."createdAt" > p."createdAt" OR (q."createdAt" = p."createdAt" AND q."id" > p."id"))
  );

-- 3. Prodi: tanpa UPPS; akreditasi berlaku sampai sebagai tanggal (diambil bila isian lama berformat YYYY-MM-DD)
ALTER TABLE "Prodi" ADD COLUMN "akreditasiBerlakuSampai" TIMESTAMP(3);
UPDATE "Prodi" SET "akreditasiBerlakuSampai" = ("identitas"->>'akreditasiBerlakuSampai')::DATE
WHERE "identitas"->>'akreditasiBerlakuSampai' ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "Prodi" DROP CONSTRAINT "Prodi_uppsId_fkey";
ALTER TABLE "Prodi" DROP COLUMN "uppsId";

-- 4. Dokumen bersama UPPS menjadi dokumen bersama fakultas (proyekId null), dipindah apa adanya
ALTER TABLE "Dokumen" DROP CONSTRAINT IF EXISTS "Dokumen_pemilik_check";
ALTER TABLE "Dokumen" DROP CONSTRAINT "Dokumen_uppsId_fkey";
DROP INDEX "Dokumen_uppsId_idx";
ALTER TABLE "Dokumen" DROP COLUMN "uppsId";

-- 5. Akun dan kunci API tidak lagi terikat ke prodi
ALTER TABLE "user" DROP CONSTRAINT "user_prodiId_fkey";
ALTER TABLE "user" DROP COLUMN "prodiId";
ALTER TABLE "KunciAPI" DROP COLUMN "prodiId";

DROP TABLE "Upps";

-- 6. Instrumen per jenjang, diunggah PJ
ALTER TABLE "VersiInstrumen"
  ADD COLUMN "jenjangUtama" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'aktif',
  ADD COLUMN "matriksLokasi" TEXT,
  ADD COLUMN "matriksNama" TEXT,
  ADD COLUMN "pedomanLokasi" TEXT,
  ADD COLUMN "pedomanNama" TEXT,
  ADD COLUMN "halamanBobot" TEXT,
  ADD COLUMN "ekstraksi" JSONB,
  ADD COLUMN "dicekPada" TIMESTAMP(3),
  ADD COLUMN "dicekOlehId" TEXT;
-- instrumen bawaan LAMTEKNIK-2025-PASCA menjadi instrumen Sarjana (butirnya hanya Sarjana)
UPDATE "VersiInstrumen" v SET "jenjangUtama" = 'S1'
WHERE EXISTS (SELECT 1 FROM "ButirPenilaian" b WHERE b."versiId" = v."id" AND b."jenjang" = 'S1');
UPDATE "VersiInstrumen" SET "status" = CASE WHEN "aktif" THEN 'aktif' ELSE 'nonaktif' END;

-- 7. Butir: deskriptor skor 3-0, kode rumus lama, konfirmasi PJ; pertanyaan pemandu dan dokumen yang diharapkan
--    buatan sendiri tidak dipakai lagi (pertanyaan = instruksi resmi template)
ALTER TABLE "ButirPenilaian"
  ADD COLUMN "deskriptorSkor3" TEXT,
  ADD COLUMN "deskriptorSkor2" TEXT,
  ADD COLUMN "deskriptorSkor1" TEXT,
  ADD COLUMN "deskriptorSkor0" TEXT,
  ADD COLUMN "kodeRumus" TEXT,
  ADD COLUMN "dikonfirmasi" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "usulanAi" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "ButirPenilaian" SET "kodeRumus" = "kode"
WHERE "jenjang" = 'S1' AND "jenis" = 'angka' AND "kode" IN (
  '6-I','6-II','9','10','11','18','19','23','25','26','27','28','30','31','32','33','34','35','36','37','40','41',
  '42','43-I','43-II','44','45','46','47','49','50','51','52'
);
UPDATE "ButirPenilaian" SET "pertanyaanPemandu" = NULL;
DELETE FROM "DokumenDiharapkan";

-- 8. Nilai manual butir angka tanpa rumus, per LED
CREATE TABLE "NilaiManual" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "butirKode" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "keterangan" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NilaiManual_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NilaiManual_proyekId_butirKode_key" ON "NilaiManual"("proyekId", "butirKode");
ALTER TABLE "NilaiManual" ADD CONSTRAINT "NilaiManual_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

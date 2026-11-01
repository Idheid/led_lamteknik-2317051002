-- D7 (desain form 2): identitas institusi untuk LED dan LKPS; SK pendirian PT pindah dari identitas prodi
ALTER TABLE "Fakultas" ADD COLUMN     "kodePos" TEXT,
ADD COLUMN     "pejabatSkPendirian" TEXT,
ADD COLUMN     "skPendirian" TEXT,
ADD COLUMN     "statusPt" TEXT,
ADD COLUMN     "tanggalSkPendirian" TEXT,
ADD COLUMN     "telepon" TEXT;

-- salin SK pendirian PT yang sudah diisi di identitas salah satu prodi (yang terbaru diubah)
UPDATE "Fakultas" f SET
  "skPendirian" = s."skPendirian",
  "tanggalSkPendirian" = s."tanggalSkPendirian",
  "pejabatSkPendirian" = s."pejabatSkPendirian"
FROM (
  SELECT NULLIF(identitas->>'skPendirian', '') AS "skPendirian",
         NULLIF(identitas->>'tanggalSkPendirian', '') AS "tanggalSkPendirian",
         NULLIF(identitas->>'pejabatSkPendirian', '') AS "pejabatSkPendirian"
  FROM "Prodi"
  WHERE COALESCE(identitas->>'skPendirian', '') <> ''
  ORDER BY "updatedAt" DESC
  LIMIT 1
) s
WHERE f.id = 'utama';

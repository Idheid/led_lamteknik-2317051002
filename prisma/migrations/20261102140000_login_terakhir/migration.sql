-- L3 (2 Nov 2026): login terakhir akun; diisi dari sesi yang masih tersimpan.

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "loginTerakhir" TIMESTAMP(3);


UPDATE "user" u SET "loginTerakhir" = s.terakhir
FROM (SELECT "userId", MAX("createdAt") AS terakhir FROM "session" GROUP BY "userId") s
WHERE s."userId" = u."id";

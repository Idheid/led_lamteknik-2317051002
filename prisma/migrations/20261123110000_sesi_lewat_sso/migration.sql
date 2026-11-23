-- Rencana 18 Nov S5: sesi yang dibuat lewat SSO Unila (dipakai S6 untuk keluar dari SSO).
-- AlterTable
ALTER TABLE "session" ADD COLUMN     "lewatSso" BOOLEAN NOT NULL DEFAULT false;

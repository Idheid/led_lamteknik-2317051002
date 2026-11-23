-- Rencana 18 Nov S4: UNILA ID (username SSO) di akun, unik, opsional
ALTER TABLE "user" ADD COLUMN "usernameSso" TEXT;

CREATE UNIQUE INDEX "user_usernameSso_key" ON "user"("usernameSso");

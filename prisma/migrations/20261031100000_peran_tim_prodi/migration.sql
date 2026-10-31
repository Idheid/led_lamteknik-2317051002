-- Revisi 31 Okt 2026 (Pak Tris): peran Admin UPPS, Tim Prodi, Asesor.
-- Nilai enum diganti nama (bukan dibuat ulang) supaya data lama tetap utuh:
--   SUPER_ADMIN -> ADMIN, PENANGGUNG_JAWAB -> TIM_PRODI.
ALTER TYPE "Peran" RENAME VALUE 'SUPER_ADMIN' TO 'ADMIN';
ALTER TYPE "Peran" RENAME VALUE 'PENANGGUNG_JAWAB' TO 'TIM_PRODI';

-- Keputusan B2: akun PJ fakultas lama menjadi Admin UPPS (tugasnya kini milik admin). Saat migrasi ini belum ada Tim
-- Prodi sungguhan, jadi semua TIM_PRODI di sini adalah PJ lama.
UPDATE "user" SET "role" = 'ADMIN' WHERE "role" = 'TIM_PRODI';

ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'TIM_PRODI';

-- Prodi akun Tim Prodi (wajib untuk TIM_PRODI, kosong untuk peran lain).
ALTER TABLE "user" ADD COLUMN "prodiId" TEXT;
ALTER TABLE "user" ADD CONSTRAINT "user_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

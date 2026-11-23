-- Rencana 18 Nov S3: log login gagal untuk batas 3 kali gagal dalam 5 menit (kunci = SHA-256 email, bukan email asli)
CREATE TABLE "LogLoginGagal" (
    "id" TEXT NOT NULL,
    "kunci" TEXT NOT NULL,
    "ip" TEXT,
    "alasan" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogLoginGagal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LogLoginGagal_kunci_waktu_idx" ON "LogLoginGagal"("kunci", "waktu");

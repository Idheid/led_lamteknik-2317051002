-- D8 (desain form 2): logo perguruan tinggi untuk halaman muka LED

-- CreateTable
CREATE TABLE "LogoSampul" (
    "id" TEXT NOT NULL DEFAULT 'utama',
    "lokasi" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "lebar" INTEGER NOT NULL,
    "tinggi" INTEGER NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogoSampul_pkey" PRIMARY KEY ("id")
);


-- pgvector harus ada sebelum kolom vector(768) dibuat
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('SUPER_ADMIN', 'PENANGGUNG_JAWAB');

-- CreateEnum
CREATE TYPE "JenisBagian" AS ENUM ('awal', 'bab', 'butir', 'kriteria', 'lampiran');

-- CreateEnum
CREATE TYPE "TipeSubBagian" AS ENUM ('data', 'narasi', 'bersama', 'iku', 'otomatis');

-- CreateEnum
CREATE TYPE "JenisButir" AS ENUM ('narasi', 'angka');

-- CreateEnum
CREATE TYPE "StatusPengisian" AS ENUM ('belum', 'draf', 'disunting', 'selesai');

-- CreateEnum
CREATE TYPE "PemilikKunci" AS ENUM ('penanggung_jawab', 'super_admin');

-- CreateEnum
CREATE TYPE "StatusKunci" AS ENUM ('aktif', 'kuota_habis', 'tidak_valid', 'nonaktif');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Peran" NOT NULL DEFAULT 'PENANGGUNG_JAWAB',
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "prodiId" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upps" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "perguruanTinggi" TEXT NOT NULL,
    "alamat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prodi" (
    "id" TEXT NOT NULL,
    "kodePddikti" TEXT,
    "nama" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "uppsId" TEXT NOT NULL,
    "identitas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prodi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersiInstrumen" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "lembaga" TEXT NOT NULL DEFAULT 'LAM Teknik',
    "peraturan" JSONB NOT NULL,
    "catatan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "disalinDariId" TEXT,
    "jenjang" JSONB NOT NULL,
    "statusAkreditasi" JSONB,
    "anggaranBawaan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersiInstrumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bagian" (
    "id" TEXT NOT NULL,
    "versiId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "JenisBagian" NOT NULL,
    "urutan" INTEGER NOT NULL,
    "batasHalamanResmi" INTEGER,
    "pengantar" TEXT,

    CONSTRAINT "Bagian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubBagian" (
    "id" TEXT NOT NULL,
    "bagianId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "grup" TEXT,
    "tipe" "TipeSubBagian" NOT NULL,
    "varian" JSONB NOT NULL,
    "berlakuUntuk" TEXT[],
    "jenjangOverride" TEXT[],
    "sumberInstruksi" TEXT NOT NULL DEFAULT 'template',
    "catatan" TEXT,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "SubBagian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButirPenilaian" (
    "id" TEXT NOT NULL,
    "versiId" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "sub" TEXT,
    "urutan" INTEGER NOT NULL,
    "bagianKode" TEXT NOT NULL,
    "elemen" TEXT NOT NULL,
    "indikator" TEXT NOT NULL,
    "bobot" DECIMAL(5,2) NOT NULL,
    "jenis" "JenisButir" NOT NULL,
    "tabelLkps" TEXT[],
    "deskriptorSkor4" TEXT NOT NULL,
    "unsurSkor4" TEXT[],
    "pertanyaanPemandu" TEXT,
    "catatan" TEXT,

    CONSTRAINT "ButirPenilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButirSubBagian" (
    "butirId" TEXT NOT NULL,
    "subBagianId" TEXT NOT NULL,

    CONSTRAINT "ButirSubBagian_pkey" PRIMARY KEY ("butirId","subBagianId")
);

-- CreateTable
CREATE TABLE "DokumenDiharapkan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "butirId" TEXT,
    "subBagianId" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DokumenDiharapkan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelLkpsAcuan" (
    "id" TEXT NOT NULL,
    "versiId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "judul" TEXT NOT NULL,

    CONSTRAINT "TabelLkpsAcuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyekLED" (
    "id" TEXT NOT NULL,
    "prodiId" TEXT NOT NULL,
    "versiId" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tsTahunMulai" INTEGER NOT NULL,
    "anggaran" JSONB NOT NULL,
    "timPenyusun" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyekLED_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusKriteria" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "bagianKode" TEXT NOT NULL,
    "status" "StatusPengisian" NOT NULL DEFAULT 'belum',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusKriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JawabanForm" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "subBagianKode" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JawabanForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BerkasLKPS" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "namaBerkas" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'diunggah',
    "pesan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BerkasLKPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelLKPS" (
    "id" TEXT NOT NULL,
    "berkasId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "baris" JSONB NOT NULL,
    "perluDicek" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TabelLKPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokumen" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "subBagianKode" TEXT,
    "butirKode" TEXT,
    "namaBerkas" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "tautanBukti" TEXT,
    "status" TEXT NOT NULL DEFAULT 'diunggah',
    "pesan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Potongan" (
    "id" TEXT NOT NULL,
    "dokumenId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "teks" TEXT NOT NULL,
    "halaman" INTEGER,
    "modelEmbedding" TEXT NOT NULL,
    "embedding" vector(768),
    "teksTsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("teks", ''))) STORED,

    CONSTRAINT "Potongan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BagianDraf" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "subBagianId" TEXT NOT NULL,
    "status" "StatusPengisian" NOT NULL DEFAULT 'belum',
    "versiAktifId" TEXT,

    CONSTRAINT "BagianDraf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersiDraf" (
    "id" TEXT NOT NULL,
    "bagianDrafId" TEXT NOT NULL,
    "nomor" INTEGER NOT NULL,
    "asal" TEXT NOT NULL,
    "isi" JSONB NOT NULL,
    "sumber" JSONB,
    "unsur" JSONB,
    "dokumenKurang" TEXT[],
    "pemeriksaan" JSONB,
    "model" TEXT,
    "keluaranMentah" JSONB,
    "jumlahKata" INTEGER NOT NULL DEFAULT 0,
    "dibuatOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersiDraf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ekspor" (
    "id" TEXT NOT NULL,
    "proyekId" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "jumlahHalaman" INTEGER,
    "status" TEXT NOT NULL,
    "pemeriksaan" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ekspor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengaturanLLM" (
    "id" TEXT NOT NULL DEFAULT 'utama',
    "penyedia" TEXT NOT NULL DEFAULT 'google',
    "modelNarasi" TEXT NOT NULL,
    "modelCadangan" TEXT[],
    "modelEmbedding" TEXT NOT NULL,
    "suhu" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "maksTokenKeluaran" INTEGER NOT NULL DEFAULT 4096,
    "pakaiCadanganAdmin" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengaturanLLM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KunciAPI" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "penyedia" TEXT NOT NULL DEFAULT 'google',
    "kunciTerenkripsi" TEXT NOT NULL,
    "akhiran" TEXT NOT NULL,
    "pemilik" "PemilikKunci" NOT NULL,
    "pemilikId" TEXT NOT NULL,
    "prodiId" TEXT,
    "status" "StatusKunci" NOT NULL DEFAULT 'aktif',
    "habisSampai" TIMESTAMP(3),
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "batasHarian" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KunciAPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogPemakaian" (
    "id" TEXT NOT NULL,
    "kunciId" TEXT,
    "proyekId" TEXT,
    "subBagianKode" TEXT,
    "model" TEXT NOT NULL,
    "tokenMasuk" INTEGER NOT NULL DEFAULT 0,
    "tokenKeluar" INTEGER NOT NULL DEFAULT 0,
    "berhasil" BOOLEAN NOT NULL,
    "galat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogPemakaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAktivitas" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "objek" TEXT NOT NULL,
    "objekId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_prodiId_key" ON "user"("prodiId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Upps_kode_key" ON "Upps"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Prodi_kodePddikti_key" ON "Prodi"("kodePddikti");

-- CreateIndex
CREATE UNIQUE INDEX "VersiInstrumen_kode_key" ON "VersiInstrumen"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Bagian_versiId_kode_key" ON "Bagian"("versiId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "SubBagian_bagianId_kode_key" ON "SubBagian"("bagianId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "ButirPenilaian_versiId_jenjang_kode_key" ON "ButirPenilaian"("versiId", "jenjang", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "TabelLkpsAcuan_versiId_kode_key" ON "TabelLkpsAcuan"("versiId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "StatusKriteria_proyekId_bagianKode_key" ON "StatusKriteria"("proyekId", "bagianKode");

-- CreateIndex
CREATE UNIQUE INDEX "JawabanForm_proyekId_subBagianKode_key" ON "JawabanForm"("proyekId", "subBagianKode");

-- CreateIndex
CREATE INDEX "Potongan_dokumenId_idx" ON "Potongan"("dokumenId");

-- CreateIndex
CREATE UNIQUE INDEX "BagianDraf_proyekId_subBagianId_key" ON "BagianDraf"("proyekId", "subBagianId");

-- CreateIndex
CREATE UNIQUE INDEX "VersiDraf_bagianDrafId_nomor_key" ON "VersiDraf"("bagianDrafId", "nomor");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prodi" ADD CONSTRAINT "Prodi_uppsId_fkey" FOREIGN KEY ("uppsId") REFERENCES "Upps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bagian" ADD CONSTRAINT "Bagian_versiId_fkey" FOREIGN KEY ("versiId") REFERENCES "VersiInstrumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubBagian" ADD CONSTRAINT "SubBagian_bagianId_fkey" FOREIGN KEY ("bagianId") REFERENCES "Bagian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButirPenilaian" ADD CONSTRAINT "ButirPenilaian_versiId_fkey" FOREIGN KEY ("versiId") REFERENCES "VersiInstrumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButirSubBagian" ADD CONSTRAINT "ButirSubBagian_butirId_fkey" FOREIGN KEY ("butirId") REFERENCES "ButirPenilaian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ButirSubBagian" ADD CONSTRAINT "ButirSubBagian_subBagianId_fkey" FOREIGN KEY ("subBagianId") REFERENCES "SubBagian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenDiharapkan" ADD CONSTRAINT "DokumenDiharapkan_butirId_fkey" FOREIGN KEY ("butirId") REFERENCES "ButirPenilaian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenDiharapkan" ADD CONSTRAINT "DokumenDiharapkan_subBagianId_fkey" FOREIGN KEY ("subBagianId") REFERENCES "SubBagian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelLkpsAcuan" ADD CONSTRAINT "TabelLkpsAcuan_versiId_fkey" FOREIGN KEY ("versiId") REFERENCES "VersiInstrumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyekLED" ADD CONSTRAINT "ProyekLED_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyekLED" ADD CONSTRAINT "ProyekLED_versiId_fkey" FOREIGN KEY ("versiId") REFERENCES "VersiInstrumen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusKriteria" ADD CONSTRAINT "StatusKriteria_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JawabanForm" ADD CONSTRAINT "JawabanForm_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BerkasLKPS" ADD CONSTRAINT "BerkasLKPS_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelLKPS" ADD CONSTRAINT "TabelLKPS_berkasId_fkey" FOREIGN KEY ("berkasId") REFERENCES "BerkasLKPS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokumen" ADD CONSTRAINT "Dokumen_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Potongan" ADD CONSTRAINT "Potongan_dokumenId_fkey" FOREIGN KEY ("dokumenId") REFERENCES "Dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagianDraf" ADD CONSTRAINT "BagianDraf_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagianDraf" ADD CONSTRAINT "BagianDraf_subBagianId_fkey" FOREIGN KEY ("subBagianId") REFERENCES "SubBagian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersiDraf" ADD CONSTRAINT "VersiDraf_bagianDrafId_fkey" FOREIGN KEY ("bagianDrafId") REFERENCES "BagianDraf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersiDraf" ADD CONSTRAINT "VersiDraf_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ekspor" ADD CONSTRAINT "Ekspor_proyekId_fkey" FOREIGN KEY ("proyekId") REFERENCES "ProyekLED"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KunciAPI" ADD CONSTRAINT "KunciAPI_pemilikId_fkey" FOREIGN KEY ("pemilikId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPemakaian" ADD CONSTRAINT "LogPemakaian_kunciId_fkey" FOREIGN KEY ("kunciId") REFERENCES "KunciAPI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pencarian gabungan (iterasi 2): indeks HNSW untuk vektor (jarak kosinus) dan GIN untuk kata kunci
CREATE INDEX "Potongan_embedding_hnsw_idx" ON "Potongan" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "Potongan_teksTsv_gin_idx" ON "Potongan" USING gin ("teksTsv");

-- Gabung LKPS G3: skema modul LKPS (model Lkps*, kode asal Achmadghalib725/LKPS_LAM-TEKNIK@c718eff)



-- CreateTable
CREATE TABLE "lkps_tim_penyusun" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nidn" TEXT,
    "jabatan" TEXT NOT NULL,
    "berkasLokasi" TEXT,
    "berkasNama" TEXT,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_tim_penyusun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_kerjasama" (
    "id" TEXT NOT NULL,
    "namaLembaga" TEXT NOT NULL,
    "tingkat" TEXT NOT NULL,
    "judulKegiatan" TEXT NOT NULL,
    "manfaat" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalAkhir" TIMESTAMP(3) NOT NULL,
    "jenisKerjasama" TEXT NOT NULL,
    "berkasLokasi" TEXT,
    "berkasNama" TEXT,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_kerjasama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_seleksi_mahasiswa_baru" (
    "id" TEXT NOT NULL,
    "tahunSemester" TEXT NOT NULL,
    "dayaTampung" INTEGER NOT NULL DEFAULT 0,
    "jumlahPendaftar" INTEGER NOT NULL DEFAULT 0,
    "jumlahLulusSeleksi" INTEGER NOT NULL DEFAULT 0,
    "mahasiswaBaruReguler" INTEGER NOT NULL DEFAULT 0,
    "mahasiswaBaruTransfer" INTEGER NOT NULL DEFAULT 0,
    "mahasiswaAktifReguler" INTEGER NOT NULL DEFAULT 0,
    "mahasiswaAktifTransfer" INTEGER NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_seleksi_mahasiswa_baru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_mahasiswa_asing" (
    "id" TEXT NOT NULL,
    "tahunSemester" TEXT NOT NULL,
    "jumlahFullTime" INTEGER NOT NULL DEFAULT 0,
    "jumlahPartTime" INTEGER NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_mahasiswa_asing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_dosen_tetap" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nidn" TEXT NOT NULL,
    "pendidikanS2" BOOLEAN NOT NULL DEFAULT false,
    "pendidikanS3" BOOLEAN NOT NULL DEFAULT false,
    "prodiPascaS2" TEXT,
    "prodiPascaS3" TEXT,
    "bidangKeahlian" TEXT,
    "kesesuaianKompetensi" BOOLEAN NOT NULL DEFAULT true,
    "jabatanAkademik" TEXT NOT NULL,
    "sertifikasiDosen" BOOLEAN NOT NULL DEFAULT true,
    "noSertifikatPendidik" TEXT,
    "sertifikasiKompetensi" BOOLEAN NOT NULL DEFAULT false,
    "bidangSertifikasi" TEXT,
    "lembagaSertifikasi" TEXT,
    "mataKuliahDiampu" TEXT,
    "kesesuaianBidang" BOOLEAN NOT NULL DEFAULT true,
    "mataKuliahPSLain" TEXT,
    "bebanMengajar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_dosen_tetap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_bimbingan_ta" (
    "id" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "bimbinganPSSendiriTS" INTEGER NOT NULL DEFAULT 0,
    "bimbinganPSSendiriTS1" INTEGER NOT NULL DEFAULT 0,
    "bimbinganPSSendiriTS2" INTEGER NOT NULL DEFAULT 0,
    "bimbinganPSLainTS" INTEGER NOT NULL DEFAULT 0,
    "bimbinganPSLainTS1" INTEGER NOT NULL DEFAULT 0,
    "bimbinganPSLainTS2" INTEGER NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_bimbingan_ta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_ewmp" (
    "id" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "sksPendidikanPSSendiri" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sksPendidikanPSLain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sksPenelitian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sksPkm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sksTugasTambahan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_ewmp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_luaran_dosen" (
    "id" TEXT NOT NULL,
    "dosenId" TEXT,
    "namaDosen" TEXT,
    "jenis" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "detail" TEXT,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_luaran_dosen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_tenaga_kependidikan" (
    "id" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "jenjangPendidikan" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_tenaga_kependidikan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_penggunaan_dana" (
    "id" TEXT NOT NULL,
    "tahunSemester" TEXT NOT NULL,
    "biayaOperasionalPendidikan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaPenelitianDosen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaPkmDosen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investasiSdm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investasiSarana" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investasiPrasarana" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_penggunaan_dana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_laboratorium" (
    "id" TEXT NOT NULL,
    "namaLab" TEXT NOT NULL,
    "jenisPeralatan" TEXT NOT NULL,
    "kepemilikan" TEXT NOT NULL,
    "kondisi" TEXT NOT NULL,
    "jamPenggunaan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "luasRuangan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_laboratorium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_mata_kuliah" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sksTeori" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sksPraktikum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpl" TEXT NOT NULL,
    "linkRps" TEXT,
    "berkasLokasi" TEXT,
    "berkasNama" TEXT,
    "unitPenyelenggara" TEXT,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_mata_kuliah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_program_mbkm" (
    "id" TEXT NOT NULL,
    "namaMahasiswa" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "namaMitra" TEXT NOT NULL,
    "sksKonversi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dosenPembimbing" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_program_mbkm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_penelitian_dosen" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "namaDosen" TEXT NOT NULL,
    "mahasiswaTerlibat" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_penelitian_dosen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_ipk_lulusan" (
    "id" TEXT NOT NULL,
    "tahunSemester" TEXT NOT NULL,
    "ipkMinimum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipkRataRata" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipkMaksimum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_ipk_lulusan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_prestasi_mahasiswa" (
    "id" TEXT NOT NULL,
    "namaMahasiswa" TEXT NOT NULL,
    "namaKegiatan" TEXT NOT NULL,
    "tingkat" TEXT NOT NULL,
    "penghargaan" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_prestasi_mahasiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_efektivitas_studi" (
    "id" TEXT NOT NULL,
    "angkatan" INTEGER NOT NULL,
    "jumlahMasuk" INTEGER NOT NULL DEFAULT 0,
    "jumlahLulusTepat" INTEGER NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_efektivitas_studi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_tracer_study" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlahResponden" INTEGER NOT NULL DEFAULT 0,
    "rataWaktuTunggu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "persenSesuaiBidang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "persenTempatKerjaLokal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "persenTempatKerjaNasional" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "persenTempatKerjaInternasional" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skorKepuasanPengguna" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_tracer_study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_luaran_mahasiswa" (
    "id" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "namaMahasiswa" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "detail" TEXT,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_luaran_mahasiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_dokumen_spmi" (
    "id" TEXT NOT NULL,
    "jenisDokumen" TEXT NOT NULL,
    "tersedia" BOOLEAN NOT NULL DEFAULT false,
    "berkasLokasi" TEXT,
    "berkasNama" TEXT,
    "keterangan" TEXT,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_dokumen_spmi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_regulasi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tahunAkademik" TEXT NOT NULL,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_regulasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_kriteria_config" (
    "id" TEXT NOT NULL,
    "regulasiId" TEXT,
    "nomorUrut" INTEGER NOT NULL DEFAULT 1,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "levelWewenang" TEXT NOT NULL DEFAULT 'BERSAMA',
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_kriteria_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_tabel_config" (
    "id" TEXT NOT NULL,
    "kriteriaId" TEXT NOT NULL,
    "nomorTabel" TEXT NOT NULL,
    "namaTabel" TEXT NOT NULL,
    "deskripsi" TEXT,
    "levelPengisi" TEXT NOT NULL DEFAULT 'PRODI',
    "wajibUploadBukti" BOOLEAN NOT NULL DEFAULT true,
    "formatKolom" TEXT,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_tabel_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lkps_isian_tabel" (
    "id" TEXT NOT NULL,
    "tabelId" TEXT NOT NULL,
    "baris" JSONB NOT NULL DEFAULT '[]',
    "bukti" JSONB,
    "prodiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lkps_isian_tabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lkps_tim_penyusun_prodiId_idx" ON "lkps_tim_penyusun"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_kerjasama_prodiId_idx" ON "lkps_kerjasama"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_seleksi_mahasiswa_baru_prodiId_idx" ON "lkps_seleksi_mahasiswa_baru"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_mahasiswa_asing_prodiId_idx" ON "lkps_mahasiswa_asing"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_dosen_tetap_prodiId_idx" ON "lkps_dosen_tetap"("prodiId");

-- CreateIndex
CREATE UNIQUE INDEX "lkps_dosen_tetap_prodiId_nidn_key" ON "lkps_dosen_tetap"("prodiId", "nidn");

-- CreateIndex
CREATE INDEX "lkps_bimbingan_ta_prodiId_idx" ON "lkps_bimbingan_ta"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_ewmp_prodiId_idx" ON "lkps_ewmp"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_luaran_dosen_prodiId_idx" ON "lkps_luaran_dosen"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_tenaga_kependidikan_prodiId_idx" ON "lkps_tenaga_kependidikan"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_penggunaan_dana_prodiId_idx" ON "lkps_penggunaan_dana"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_laboratorium_prodiId_idx" ON "lkps_laboratorium"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_mata_kuliah_prodiId_idx" ON "lkps_mata_kuliah"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_program_mbkm_prodiId_idx" ON "lkps_program_mbkm"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_penelitian_dosen_prodiId_idx" ON "lkps_penelitian_dosen"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_ipk_lulusan_prodiId_idx" ON "lkps_ipk_lulusan"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_prestasi_mahasiswa_prodiId_idx" ON "lkps_prestasi_mahasiswa"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_efektivitas_studi_prodiId_idx" ON "lkps_efektivitas_studi"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_tracer_study_prodiId_idx" ON "lkps_tracer_study"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_luaran_mahasiswa_prodiId_idx" ON "lkps_luaran_mahasiswa"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_dokumen_spmi_prodiId_idx" ON "lkps_dokumen_spmi"("prodiId");

-- CreateIndex
CREATE INDEX "lkps_isian_tabel_prodiId_idx" ON "lkps_isian_tabel"("prodiId");

-- CreateIndex
CREATE UNIQUE INDEX "lkps_isian_tabel_prodiId_tabelId_key" ON "lkps_isian_tabel"("prodiId", "tabelId");

-- AddForeignKey
ALTER TABLE "lkps_tim_penyusun" ADD CONSTRAINT "lkps_tim_penyusun_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_kerjasama" ADD CONSTRAINT "lkps_kerjasama_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_seleksi_mahasiswa_baru" ADD CONSTRAINT "lkps_seleksi_mahasiswa_baru_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_mahasiswa_asing" ADD CONSTRAINT "lkps_mahasiswa_asing_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_dosen_tetap" ADD CONSTRAINT "lkps_dosen_tetap_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_bimbingan_ta" ADD CONSTRAINT "lkps_bimbingan_ta_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "lkps_dosen_tetap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_bimbingan_ta" ADD CONSTRAINT "lkps_bimbingan_ta_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_ewmp" ADD CONSTRAINT "lkps_ewmp_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "lkps_dosen_tetap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_ewmp" ADD CONSTRAINT "lkps_ewmp_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_luaran_dosen" ADD CONSTRAINT "lkps_luaran_dosen_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "lkps_dosen_tetap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_luaran_dosen" ADD CONSTRAINT "lkps_luaran_dosen_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_tenaga_kependidikan" ADD CONSTRAINT "lkps_tenaga_kependidikan_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_penggunaan_dana" ADD CONSTRAINT "lkps_penggunaan_dana_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_laboratorium" ADD CONSTRAINT "lkps_laboratorium_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_mata_kuliah" ADD CONSTRAINT "lkps_mata_kuliah_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_program_mbkm" ADD CONSTRAINT "lkps_program_mbkm_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_penelitian_dosen" ADD CONSTRAINT "lkps_penelitian_dosen_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_ipk_lulusan" ADD CONSTRAINT "lkps_ipk_lulusan_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_prestasi_mahasiswa" ADD CONSTRAINT "lkps_prestasi_mahasiswa_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_efektivitas_studi" ADD CONSTRAINT "lkps_efektivitas_studi_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_tracer_study" ADD CONSTRAINT "lkps_tracer_study_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_luaran_mahasiswa" ADD CONSTRAINT "lkps_luaran_mahasiswa_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_dokumen_spmi" ADD CONSTRAINT "lkps_dokumen_spmi_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_kriteria_config" ADD CONSTRAINT "lkps_kriteria_config_regulasiId_fkey" FOREIGN KEY ("regulasiId") REFERENCES "lkps_regulasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_tabel_config" ADD CONSTRAINT "lkps_tabel_config_kriteriaId_fkey" FOREIGN KEY ("kriteriaId") REFERENCES "lkps_kriteria_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_isian_tabel" ADD CONSTRAINT "lkps_isian_tabel_tabelId_fkey" FOREIGN KEY ("tabelId") REFERENCES "lkps_tabel_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lkps_isian_tabel" ADD CONSTRAINT "lkps_isian_tabel_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


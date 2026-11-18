import { z } from "zod";

/**
 * Skema masukan API LKPS (Gabung LKPS G4). Nama isian sama dengan isi permintaan API kode asal
 * (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff) supaya halaman cukup mengganti alamat fetch. Perbedaan yang disengaja:
 * - tanggal dan tahun kosong menjadi galat validasi (kode asal memakai tanggal/tahun hari ini, masalah 13 di peta);
 * - `prodiId` dari isi permintaan diabaikan; prodi selalu dari prodi aktif di server (masalah 12);
 * - angka kosong menjadi 0 seperti `parseFloat(x) || 0` kode asal, tetapi teks bukan angka ditolak.
 */

const kosong = (v: unknown) => v === "" || v === null || v === undefined;

export const angka = (label = "Angka") =>
  z.preprocess((v) => (kosong(v) ? 0 : v), z.coerce.number({ error: `${label} harus berupa angka.` }).refine(Number.isFinite, `${label} harus berupa angka.`));

export const bulat = (label = "Angka") => angka(label).transform((v) => Math.trunc(v));

export const tahun = (label = "Tahun") =>
  z.preprocess(
    (v) => (kosong(v) ? undefined : v),
    z.coerce
      .number({ error: `${label} wajib diisi.` })
      .int(`${label} harus bilangan bulat.`)
      .min(1900, `${label} tidak masuk akal.`)
      .max(2200, `${label} tidak masuk akal.`),
  );

export const tanggal = (label: string) =>
  z.preprocess(
    (v) => (kosong(v) ? undefined : v),
    z.coerce.date({ error: `${label} wajib diisi.` }).refine((d) => !Number.isNaN(d.getTime()), `${label} tidak valid.`),
  );

export const teks = (label: string, maks = 2000) =>
  z.preprocess((v) => (v === null || v === undefined ? "" : v), z.string().trim().min(1, `${label} wajib diisi.`).max(maks, `${label} terlalu panjang.`));

/** Teks tidak wajib; kosong menjadi "" seperti `x || ''` kode asal. */
export const teksBebas = (maks = 2000) =>
  z.preprocess((v) => (v === null || v === undefined ? "" : v), z.string().trim().max(maks, "Teks terlalu panjang."));

/** Teks tidak wajib; kosong menjadi null (kolom opsional). */
export const teksNull = (maks = 2000) => teksBebas(maks).transform((v) => (v === "" ? null : v));

export const benar = z.preprocess((v) => v === true || v === "true" || v === 1 || v === "1" || v === "on", z.boolean());
/** Boolean dengan bawaan `true` bila tidak dikirim (`x ?? true` kode asal). */
export const benarBawaanYa = z.preprocess((v) => (v === undefined || v === null ? true : v === true || v === "true" || v === 1 || v === "1" || v === "on"), z.boolean());

/** id baris: kosong atau berawalan `temp_` berarti baris baru (aturan kode asal). */
export const idBaris = z.preprocess((v) => (typeof v === "string" && v !== "" ? v : undefined), z.string().max(64).optional());

export function barisBaru(id: string | undefined): id is undefined {
  return !id || id.startsWith("temp_");
}

/** Alamat atau kunci bukti; diperiksa milik prodi di lapisan data. */
export const alamatBerkas = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(1000).nullable());

export const daftar = <T extends z.ZodType>(skema: T, maks = 2000) => z.array(skema).max(maks, "Terlalu banyak baris sekaligus.");

// ─── Kriteria 1 ─────────────────────────────────────────────

export const skemaKerjasama = z.object({
  namaLembaga: teks("Nama lembaga mitra", 300),
  tingkat: teks("Tingkat", 50),
  judulKegiatan: teks("Judul kegiatan", 1000),
  manfaat: teksBebas(2000),
  tanggalMulai: tanggal("Tanggal mulai kerja sama"),
  tanggalAkhir: tanggal("Tanggal akhir kerja sama"),
  jenisKerjasama: teks("Jenis kerja sama", 50),
  fileMou: alamatBerkas.optional(),
});
export const skemaGantiKerjasama = z.object({ rows: daftar(skemaKerjasama) });

// ─── Kriteria 2 ─────────────────────────────────────────────

export const skemaMahasiswa = z.object({
  seleksi: daftar(
    z.object({
      tahun: teks("Tahun semester", 20),
      dayaTampung: bulat(),
      jumlahPendaftar: bulat(),
      jumlahLulusSeleksi: bulat(),
      mbReguler: bulat(),
      mbTransfer: bulat(),
      maReguler: bulat(),
      maTransfer: bulat(),
    }),
    20,
  ).default([]),
  asing: daftar(z.object({ tahun: teks("Tahun semester", 20), fullTime: bulat(), partTime: bulat() }), 20).default([]),
});

// ─── Kriteria 3 ─────────────────────────────────────────────

export const skemaDosen = z.object({
  id: idBaris,
  nama: teks("Nama dosen", 300),
  nidn: teks("NIDN/NIDK", 30),
  pendidikanS2: benar,
  pendidikanS3: benar,
  prodiPascaS2: teksBebas(300),
  prodiPascaS3: teksBebas(300),
  bidangKeahlian: teksBebas(300),
  kesesuaianKompetensi: benarBawaanYa,
  jabatanAkademik: teksBebas(100).transform((v) => v || "Lektor"),
  sertifikasiDosen: benar,
  noSertifikatPendidik: teksBebas(100),
  sertifikasiKompetensi: benar,
  bidangSertifikasi: teksBebas(300),
  lembagaSertifikasi: teksBebas(300),
  mataKuliahDiampu: teksBebas(2000),
  kesesuaianBidang: benarBawaanYa,
  mataKuliahPSLain: teksBebas(2000),
  bebanMengajar: angka("Beban mengajar"),
});

export const skemaBimbingan = z.object({
  id: idBaris,
  dosenId: teks("Dosen", 64),
  bimbinganPSSendiriTS: bulat(),
  bimbinganPSSendiriTS1: bulat(),
  bimbinganPSSendiriTS2: bulat(),
  bimbinganPSLainTS: bulat(),
  bimbinganPSLainTS1: bulat(),
  bimbinganPSLainTS2: bulat(),
});

export const skemaEwmp = z.object({
  id: idBaris,
  dosenId: teks("Dosen", 64),
  sksPendidikanPSSendiri: angka(),
  sksPendidikanPSLain: angka(),
  sksPenelitian: angka(),
  sksPkm: angka(),
  sksTugasTambahan: angka(),
});

export const skemaLuaranDosen = z.object({
  id: idBaris,
  dosenId: z.preprocess((v) => (typeof v === "string" && v !== "" ? v : null), z.string().max(64).nullable()),
  namaDosen: teksNull(300),
  jenis: teks("Jenis luaran", 100),
  judul: teks("Judul", 1000),
  tahun: tahun(),
  detail: teksNull(2000),
});

export const skemaTendik = z.object({
  id: idBaris,
  jenis: teks("Jenis tenaga kependidikan", 100),
  jenjangPendidikan: teks("Jenjang pendidikan", 20),
  jumlah: bulat("Jumlah"),
});

// ─── Kriteria 4 ─────────────────────────────────────────────

export const skemaDana = z.object({
  id: idBaris,
  tahunSemester: teks("Tahun semester", 20),
  biayaOperasionalPendidikan: angka(),
  biayaPenelitianDosen: angka(),
  biayaPkmDosen: angka(),
  investasiSdm: angka(),
  investasiSarana: angka(),
  investasiPrasarana: angka(),
});
export const skemaSimpanDana = z.object({ rows: daftar(skemaDana) });

export const skemaLab = z.object({
  id: idBaris,
  namaLab: teks("Nama laboratorium", 300),
  jenisPeralatan: teks("Peralatan utama", 1000),
  kepemilikan: teks("Kepemilikan", 50),
  kondisi: teks("Kondisi", 50),
  jamPenggunaan: angka(),
  luasRuangan: angka(),
});

// ─── Kriteria 5 ─────────────────────────────────────────────

export const skemaMataKuliah = z.object({
  id: idBaris,
  kode: teks("Kode mata kuliah", 50),
  nama: teks("Nama mata kuliah", 300),
  sksTeori: angka(),
  sksPraktikum: angka(),
  cpl: teksBebas(2000),
  linkRps: teksNull(1000),
  fileRps: alamatBerkas.optional(),
  unitPenyelenggara: teksBebas(300).transform((v) => v || "Prodi"),
});

export const skemaMbkm = z.object({
  id: idBaris,
  namaMahasiswa: teks("Nama mahasiswa", 300),
  nim: teks("NIM", 30),
  namaMitra: teks("Nama mitra", 300),
  sksKonversi: angka(),
  dosenPembimbing: teks("Dosen pembimbing", 300),
  tahun: tahun(),
});

// ─── Kriteria 6 dan 7 ───────────────────────────────────────

export const skemaPenelitian = z.object({
  id: idBaris,
  judul: teks("Judul", 1000),
  namaDosen: teks("Nama dosen", 300),
  mahasiswaTerlibat: teksBebas(2000),
  tahun: tahun(),
});

// ─── Kriteria 8 ─────────────────────────────────────────────

export const skemaIpk = z.object({
  id: idBaris,
  tahunSemester: teks("Tahun semester", 20),
  ipkMinimum: angka(),
  ipkRataRata: angka(),
  ipkMaksimum: angka(),
});
export const skemaSimpanIpk = z.object({ rows: daftar(skemaIpk, 50) });

export const skemaPrestasi = z.object({
  id: idBaris,
  namaMahasiswa: teks("Nama mahasiswa", 300),
  namaKegiatan: teks("Nama kegiatan", 1000),
  tingkat: teks("Tingkat", 50),
  penghargaan: teks("Penghargaan", 300),
  tahun: tahun(),
  jenis: teks("Jenis prestasi", 50),
});

export const skemaEfektivitas = z.object({
  id: idBaris,
  angkatan: tahun("Angkatan"),
  jumlahMasuk: bulat(),
  jumlahLulusTepat: bulat(),
});

export const skemaTracer = z.object({
  id: idBaris,
  tahun: tahun(),
  jumlahResponden: bulat(),
  rataWaktuTunggu: angka(),
  persenSesuaiBidang: angka(),
  persenTempatKerjaLokal: angka(),
  persenTempatKerjaNasional: angka(),
  persenTempatKerjaInternasional: angka(),
  skorKepuasanPengguna: angka(),
});

export const skemaLuaranMahasiswa = z.object({
  id: idBaris,
  jenis: teks("Jenis luaran", 100),
  judul: teks("Judul", 1000),
  namaMahasiswa: teks("Nama mahasiswa", 300),
  tahun: tahun(),
  detail: teksNull(2000),
});

// ─── Kriteria 9 ─────────────────────────────────────────────

export const skemaDokumenSpmi = z.object({
  id: idBaris,
  jenisDokumen: teks("Jenis dokumen", 100),
  tersedia: benar,
  fileDokumen: alamatBerkas.optional(),
  keterangan: teksBebas(2000),
});
export const skemaSimpanDokumenSpmi = z.object({ rows: daftar(skemaDokumenSpmi, 200) });

// ─── Identitas dan tim penyusun ─────────────────────────────

export const skemaTim = z.object({
  nama: teksBebas(300),
  nidn: teksNull(30),
  jabatan: teksBebas(100).transform((v) => v || "Anggota Tim"),
  fotoTtd: alamatBerkas.optional(),
});
export const skemaIdentitas = z.object({ timList: daftar(skemaTim, 100).default([]) });

// ─── Isian tabel kriteria dinamis ───────────────────────────

export const skemaIsianTabel = z.object({
  tabelId: teks("Tabel", 64),
  rows: z.array(z.record(z.string(), z.unknown())).max(5000, "Terlalu banyak baris sekaligus.").nullish().transform((v) => v ?? []),
  buktiList: z.array(z.unknown()).max(500).optional(),
});

// ─── Aksi { action, payload } ───────────────────────────────

export const skemaAksi = z.object({
  action: z.string({ error: "Aksi wajib diisi." }).min(1, "Aksi wajib diisi.").max(60),
  payload: z.unknown().optional(),
});

export const skemaId = z.object({ id: teks("ID", 64) });

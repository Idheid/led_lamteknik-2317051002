import { z } from "zod";
import { KODE_JENJANG } from "@/lib/domain/instrumen";

/** Skema Zod bersama klien dan server. Pesan galat dalam Bahasa Indonesia. */

const teksWajib = (label: string, maks = 300) =>
  z.string().trim().min(1, `${label} wajib diisi.`).max(maks, `${label} terlalu panjang.`);
const teksOpsional = (maks = 300) =>
  z
    .string()
    .trim()
    .max(maks, "Teks terlalu panjang.")
    .nullish()
    .transform((v) => (v ? v : null));

/** Identitas fakultas (pengganti UPPS, revisi 19 Okt 2026): diisi sekali oleh PJ. */
export const skemaFakultas = z.object({
  nama: teksWajib("Nama fakultas"),
  perguruanTinggi: teksWajib("Nama perguruan tinggi"),
  alamat: teksOpsional(500),
  kota: teksOpsional(80),
});
export type MasukanFakultas = z.input<typeof skemaFakultas>;

export const skemaIdentitasProdi = z.object({
  skPendirian: teksOpsional(),
  tanggalSkPendirian: teksOpsional(40),
  pejabatSkPendirian: teksOpsional(160),
  skPembukaan: teksOpsional(),
  tanggalSkPembukaan: teksOpsional(40),
  pejabatSkPembukaan: teksOpsional(160),
  tahunPertamaMenerima: teksOpsional(10),
  kota: teksOpsional(80),
  peringkatAkreditasi: teksOpsional(80),
  nomorSkAkreditasi: teksOpsional(),
  lembagaAkreditasi: teksOpsional(120),
  alamat: teksOpsional(500),
  telepon: teksOpsional(60),
  email: teksOpsional(120),
  laman: teksOpsional(200),
});
export type IdentitasProdi = z.output<typeof skemaIdentitasProdi>;

const tanggalOpsional = z.string().trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Tanggal tidak valid.")
  .nullish()
  .transform((v) => (v ? v : null));

export const skemaProdi = z.object({
  nama: teksWajib("Nama program studi"),
  /** Tanggal akreditasi terakhir berakhir (YYYY-MM-DD), untuk mengurutkan prodi yang LED-nya paling dekat. */
  akreditasiBerlakuSampai: tanggalOpsional,
  jenjang: z.enum(KODE_JENJANG, { message: "Pilih jenjang." }),
  kodePddikti: teksOpsional(20),
  identitas: skemaIdentitasProdi,
});
export type MasukanProdi = z.input<typeof skemaProdi>;

const kataSandi = z.string().min(8, "Kata sandi minimal 8 karakter.").max(128, "Kata sandi terlalu panjang.");

/** Akun PJ fakultas (revisi 19 Okt 2026: tidak terikat ke satu prodi). */
export const skemaAkunPenanggungJawab = z.object({
  nama: teksWajib("Nama", 120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  kataSandi,
});
export type MasukanAkun = z.input<typeof skemaAkunPenanggungJawab>;

export const skemaAkunSuperAdmin = skemaAkunPenanggungJawab;
export type MasukanAkunSuperAdmin = z.input<typeof skemaAkunSuperAdmin>;

export const skemaGantiSandi = z
  .object({
    sandiLama: z.string().min(1, "Kata sandi lama wajib diisi."),
    sandiBaru: kataSandi,
    ulangi: z.string(),
  })
  .refine((v) => v.sandiBaru === v.ulangi, { message: "Ulangan kata sandi baru tidak sama.", path: ["ulangi"] })
  .refine((v) => v.sandiBaru !== v.sandiLama, { message: "Kata sandi baru harus berbeda dari yang lama.", path: ["sandiBaru"] });
export type MasukanGantiSandi = z.input<typeof skemaGantiSandi>;

export const skemaAturUlangSandi = z.object({ userId: teksWajib("Akun", 60), kataSandi });

export const skemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  kataSandi: z.string().min(1, "Kata sandi wajib diisi."),
});

// ---------------------------------------------------------------- Instrumen

export const skemaVersiUbah = z.object({
  nama: teksWajib("Nama versi"),
  kode: teksWajib("Kode versi", 60).regex(/^[A-Z0-9._-]+$/, "Kode hanya huruf kapital, angka, titik, garis bawah, atau tanda hubung."),
  catatan: teksOpsional(2000),
});

export const skemaBagianUbah = z.object({
  nama: teksWajib("Nama bagian"),
  urutan: z.coerce.number().int().min(0).max(999),
  batasHalamanResmi: z.coerce.number().int().min(0).max(999).nullable(),
  pengantar: teksOpsional(5000),
});

export const skemaVarian = z.object({
  instruksi: z.string().trim().min(1, "Instruksi wajib diisi.").max(10000),
  jenjang: z.array(z.enum(KODE_JENJANG)).min(1, "Pilih minimal satu jenjang."),
  catatanTemplate: teksOpsional(2000),
});

export const TIPE_SUB_BAGIAN = ["data", "narasi", "bersama", "iku", "otomatis"] as const;

export const skemaSubBagian = z.object({
  kode: teksWajib("Kode sub-bagian", 60),
  label: z.string().trim().max(40),
  judul: teksWajib("Judul", 500),
  grup: teksOpsional(300),
  tipe: z.enum(TIPE_SUB_BAGIAN),
  urutan: z.coerce.number().int().min(0).max(9999),
  varian: z.array(skemaVarian).min(1, "Minimal satu varian instruksi."),
  berlakuUntuk: z.array(z.enum(KODE_JENJANG)).min(1, "Pilih minimal satu jenjang."),
  catatan: teksOpsional(2000),
});
export type MasukanSubBagian = z.input<typeof skemaSubBagian>;

const daftarTeks = z.array(z.string().trim().min(1).max(1000)).max(50);

export const skemaButir = z.object({
  jenjang: z.enum(KODE_JENJANG),
  kode: teksWajib("Kode butir", 20),
  no: z.coerce.number().int().min(0).max(999),
  sub: teksOpsional(10),
  urutan: z.coerce.number().int().min(0).max(9999),
  bagianKode: teksWajib("Bagian", 20),
  elemen: teksWajib("Elemen", 500),
  indikator: teksWajib("Indikator", 2000),
  bobot: z.coerce.number().min(0, "Bobot tidak boleh negatif.").max(100, "Bobot maksimal 100."),
  jenis: z.enum(["narasi", "angka"]),
  tabelLkps: z.array(z.string().trim().min(1).max(20)).max(20),
  deskriptorSkor4: teksWajib("Deskriptor skor 4", 5000),
  unsurSkor4: daftarTeks,
  // revisi 19 Okt 2026: pertanyaan pemandu dan dokumen yang diharapkan buatan sendiri tidak dipakai lagi
  pertanyaanPemandu: teksOpsional(3000).optional(),
  dokumenPendukung: daftarTeks.default([]),
  subBagianIds: z.array(z.string().min(1)).max(20),
  catatan: teksOpsional(2000),
});
export type MasukanButir = z.input<typeof skemaButir>;

// ---------------------------------------------------------------- Proyek

/** LED baru (revisi 19 Okt 2026): pilih prodi, tahun pengajuan, dan nama; instrumen = instrumen aktif jenjang prodi. */
export const skemaProyek = z.object({
  prodiId: teksWajib("Program studi", 40),
  nama: teksWajib("Nama LED", 200),
  tahunPengajuan: z.coerce.number().int().min(2000, "Tahun pengajuan tidak masuk akal.").max(2100, "Tahun pengajuan tidak masuk akal."),
});
export const skemaTahunTs = z.coerce.number().int().min(2000, "Tahun TS tidak masuk akal.").max(2100, "Tahun TS tidak masuk akal.");
export type MasukanProyek = z.input<typeof skemaProyek>;

export const skemaJawabanForm = z.object({
  proyekId: teksWajib("Proyek", 40),
  subBagianKode: teksWajib("Sub-bagian", 60),
  isi: z.string().max(20000, "Jawaban terlalu panjang (maksimal 20.000 karakter)."),
});

/** Ubah galat Zod menjadi satu pesan yang ramah. */
export function pesanGalatZod(e: z.ZodError): string {
  return e.issues.map((i) => i.message).filter((m, idx, arr) => arr.indexOf(m) === idx).join(" ");
}

// ---------------------------------------------------------------- Tim penyusun (F-23, Tabel 2.1/2.2)

const anggotaTim = z.object({
  nama: teksWajib("Nama anggota tim", 160),
  nomorInduk: teksOpsional(60),
  jabatan: teksOpsional(160),
  tugas: teksOpsional(600),
});

export const skemaTimPenyusun = z.object({
  dosen: z.array(anggotaTim).max(30, "Paling banyak 30 dosen."),
  tendik: z.array(anggotaTim).max(30, "Paling banyak 30 tenaga kependidikan."),
});
export type MasukanTimPenyusun = z.input<typeof skemaTimPenyusun>;
export type TimPenyusun = z.output<typeof skemaTimPenyusun>;

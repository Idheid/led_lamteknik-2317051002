import { z } from "zod";
import { KODE_JENJANG } from "@/modules/bersama/domain/jenjang";

/**
 * Skema Zod bersama klien dan server untuk data yang dipakai semua modul (fakultas, prodi, akun, login).
 * Skema khusus LED (instrumen, LED baru, jawaban, tim penyusun) ada di src/modules/led/validasi.ts.
 * Pesan galat dalam Bahasa Indonesia.
 */

export const teksWajib = (label: string, maks = 300) =>
  z.string().trim().min(1, `${label} wajib diisi.`).max(maks, `${label} terlalu panjang.`);
export const teksOpsional = (maks = 300) =>
  z
    .string()
    .trim()
    .max(maks, "Teks terlalu panjang.")
    .nullish()
    .transform((v) => (v ? v : null));

/** Status perguruan tinggi sesuai pilihan sheet Menu LKPS LAM Teknik. */
export const STATUS_PT = [
  "Perguruan Tinggi Negeri - Satker",
  "Perguruan Tinggi Negeri - Badan Layanan Umum",
  "Perguruan Tinggi Negeri - Badan Hukum",
  "Perguruan Tinggi Swasta",
] as const;

/**
 * Identitas institusi (UPPS dan perguruan tinggi; revisi 19 Okt 2026, D7 2 Nov 2026): diisi sekali oleh Admin UPPS,
 * dipakai identitas pengusul LED dan sheet Menu LKPS. SK pendirian PT di sini, bukan di identitas tiap prodi.
 */
export const skemaFakultas = z.object({
  nama: teksWajib("Nama UPPS"),
  perguruanTinggi: teksWajib("Nama perguruan tinggi"),
  statusPt: z.enum(STATUS_PT).nullish().or(z.literal("")).transform((v) => (v ? v : null)),
  alamat: teksOpsional(500),
  kota: teksOpsional(80),
  kodePos: teksOpsional(10),
  telepon: teksOpsional(60),
  skPendirian: teksOpsional(),
  tanggalSkPendirian: teksOpsional(40),
  pejabatSkPendirian: teksOpsional(160),
});
export type MasukanFakultas = z.input<typeof skemaFakultas>;

/**
 * Identitas pengusul satu prodi (Tim Prodi). D7: skPendirian, tanggalSkPendirian, pejabatSkPendirian, dan kota kini
 * milik identitas institusi; kuncinya tetap diterima untuk data lama (dipakai sebagai cadangan saat ekspor).
 */
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
  /** L1: wajib bila tanggal berakhir, peringkat, atau nomor SK akreditasi diubah langsung (koreksi manual) */
  alasanKoreksi: teksOpsional(500),
});
export type MasukanProdi = z.input<typeof skemaProdi>;

const kataSandi = z.string().min(8, "Kata sandi minimal 8 karakter.").max(128, "Kata sandi terlalu panjang.");

/** Akun Admin UPPS atau Asesor (tidak terikat prodi). */
export const skemaAkun = z.object({
  nama: teksWajib("Nama", 120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  kataSandi,
});
export type MasukanAkun = z.input<typeof skemaAkun>;

/** Akun Tim Prodi (revisi 31 Okt 2026): wajib memilih program studi; satu prodi boleh beberapa akun. */
export const skemaAkunTimProdi = skemaAkun.extend({
  prodiId: z.string().trim().min(1, "Pilih program studi."),
});
export type MasukanAkunTimProdi = z.input<typeof skemaAkunTimProdi>;

/** Perbaikan 1 Nov 2026 (P1): ubah nama dan peran akun oleh Admin UPPS. Tim Prodi wajib memilih program studi. */
export const skemaUbahNamaAkun = z.object({ nama: teksWajib("Nama", 120) });
export const skemaUbahPeranAkun = z.object({
  peran: z.enum(["ADMIN", "TIM_PRODI", "ASESOR"]),
  prodiId: z.string().trim().nullish(),
}).refine((x) => x.peran !== "TIM_PRODI" || Boolean(x.prodiId), { path: ["prodiId"], message: "Pilih program studi." });
export type MasukanUbahPeranAkun = z.input<typeof skemaUbahPeranAkun>;

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

/** Ubah galat Zod menjadi satu pesan yang ramah. */
export function pesanGalatZod(e: z.ZodError): string {
  return e.issues.map((i) => i.message).filter((m, idx, arr) => arr.indexOf(m) === idx).join(" ");
}

/** L1 (2 Nov 2026): hasil akreditasi dari SK. Tanggal YYYY-MM-DD. */
const tanggalWajib = (label: string) => z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, `Isi ${label}.`);
export const skemaHasilAkreditasi = z.object({
  prodiId: z.string().min(1),
  proyekId: z.string().trim().nullish().transform((v) => v || null),
  lembaga: z.string().trim().max(120).default("LAM Teknik"),
  peringkat: teksWajib("Peringkat", 80),
  nomorSk: teksOpsional(),
  tanggalSk: tanggalOpsional,
  berlakuMulai: tanggalOpsional,
  berlakuSampai: tanggalWajib("tanggal berlaku sampai"),
}).refine((x) => !x.berlakuMulai || x.berlakuMulai < x.berlakuSampai, { message: "Tanggal berlaku sampai harus sesudah tanggal mulai.", path: ["berlakuSampai"] });
export type MasukanHasilAkreditasi = z.input<typeof skemaHasilAkreditasi>;


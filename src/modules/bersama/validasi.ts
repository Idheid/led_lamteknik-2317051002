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

/** Ubah galat Zod menjadi satu pesan yang ramah. */
export function pesanGalatZod(e: z.ZodError): string {
  return e.issues.map((i) => i.message).filter((m, idx, arr) => arr.indexOf(m) === idx).join(" ");
}

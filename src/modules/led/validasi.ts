import { z } from "zod";
import { pilihanTs } from "@/modules/bersama/domain/tahun-akademik";
import { KODE_JENJANG } from "@/modules/bersama/domain/jenjang";
import { teksOpsional, teksWajib } from "@/modules/bersama/validasi";

/** Skema Zod khusus modul LED (instrumen, LED baru, jawaban penyusun, tim penyusun). Pesan galat dalam Bahasa Indonesia. */

// ---------------------------------------------------------------- Instrumen

export const skemaVersiUbah = z.object({
  nama: teksWajib("Nama versi"),
  kode: teksWajib("Kode versi", 60).regex(/^[A-Z0-9._-]+$/, "Kode hanya huruf kapital, angka, titik, garis bawah, atau tanda hubung."),
  catatan: teksOpsional(2000),
});

/** Versi instrumen baru untuk satu jenjang (revisi 19 Okt 2026): berkasnya diunggah setelah dibuat. */
export const skemaVersiJenjang = z.object({
  nama: teksWajib("Nama instrumen"),
  kode: teksWajib("Kode versi", 60).regex(/^[A-Z0-9._-]+$/, "Kode hanya huruf kapital, angka, titik, garis bawah, atau tanda hubung."),
  jenjang: z.enum(KODE_JENJANG),
  peraturan: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  catatan: teksOpsional(2000),
});
export type MasukanVersiJenjang = z.input<typeof skemaVersiJenjang>;

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
  deskriptorSkor3: teksOpsional(5000).optional(),
  deskriptorSkor2: teksOpsional(5000).optional(),
  deskriptorSkor1: teksOpsional(5000).optional(),
  deskriptorSkor0: teksOpsional(5000).optional(),
  // kunci rumus metrik lama (katalog di src/modules/led/domain/metrik-lkps.ts); kosong = nilai butir angka diisi manual
  kodeRumus: z.string().trim().max(20).nullable().optional(),
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
// revisi 31 Okt 2026: prodi tidak lagi dipilih (LED selalu untuk prodi akun Tim Prodi); TS dipilih dari dua pilihan
// pilihanTs(tahun pengajuan). TS kosong = (P−1)/P.
export const skemaProyek = z.object({
  nama: teksWajib("Nama LED", 200),
  tahunPengajuan: z.coerce.number().int().min(2000, "Tahun pengajuan tidak masuk akal.").max(2100, "Tahun pengajuan tidak masuk akal."),
  tsTahunMulai: z.coerce.number().int().optional(),
}).refine((x) => x.tsTahunMulai === undefined || pilihanTs(x.tahunPengajuan).some((p) => p.tsTahunMulai === x.tsTahunMulai), {
  path: ["tsTahunMulai"],
  message: "Pilih salah satu TS yang ditawarkan untuk tahun pengajuan ini.",
});
export const skemaTahunTs = z.coerce.number().int().min(2000, "Tahun TS tidak masuk akal.").max(2100, "Tahun TS tidak masuk akal.");
export type MasukanProyek = z.input<typeof skemaProyek>;

export const skemaJawabanForm = z.object({
  proyekId: teksWajib("Proyek", 40),
  subBagianKode: teksWajib("Sub-bagian", 60),
  isi: z.string().max(20000, "Jawaban terlalu panjang (maksimal 20.000 karakter)."),
});

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

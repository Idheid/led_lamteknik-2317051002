import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import { antreUlangMenungguKunci } from "@/lib/data/dokumen";
import { antreUlangTugasTertunda } from "@/lib/data/tugas-generate";
import { akhiranKunci, dekripsi, enkripsi } from "@/lib/kripto";
import {
  klasifikasiGalat, pesanKunciHabis, pilihKunci, statusEfektif, tandaiSetelahGalat,
  type JenisGalat, type KunciAPI as KunciDomain,
} from "@/lib/domain/kunci-api";
import { galatPenyedia, pakaiPenyediaUji, penyediaGemini, penyediaUji, type PenyediaEmbedding } from "@/lib/llm/embedding";

/**
 * Kunci API Gemini (F-19). Revisi 19 Okt 2026: kunci milik fakultas, dipakai semua LED. PJ fakultas bisa menambah
 * kunci kapan saja (misalnya saat kuota kunci lama habis); admin mengisi kunci cadangan. Kunci dienkripsi AES-256-GCM dan tidak pernah dikirim ke browser. Pemilihan kunci
 * dan penandaan kuota habis memakai src/lib/domain/kunci-api.ts.
 */

export const MODEL_EMBEDDING_BAWAAN = "gemini-embedding-001";
// model 2.5 dibatasi Google untuk pengguna baru; diganti otomatis saat daftar model dimuat (data/pengaturan.ts)
export const MODEL_NARASI_BAWAAN = "gemini-3-flash-preview";

export async function pengaturanLlm() {
  return prisma.pengaturanLLM.upsert({
    where: { id: "utama" },
    create: { id: "utama", modelNarasi: MODEL_NARASI_BAWAAN, modelCadangan: [], modelEmbedding: MODEL_EMBEDDING_BAWAAN },
    update: {},
  });
}

const skemaKunci = z.object({
  label: z.string().trim().min(1, "Label wajib diisi.").max(80, "Label terlalu panjang."),
  kunci: z.string().trim().min(20, "Kunci API terlalu pendek. Salin utuh dari Google AI Studio.").max(200, "Kunci API terlalu panjang.")
    // format kunci Google bisa berubah ("AIza...", "AQ.xxx", ...): terima semua karakter ASCII yang terlihat;
    // keabsahan kunci dipastikan lewat Uji koneksi, bukan lewat pola
    .regex(/^[!-~]+$/, "Kunci API tidak boleh berisi spasi, baris baru, atau huruf non-ASCII. Salin ulang dari Google AI Studio."),
});

/** Kunci admin = cadangan; kunci PJ = kunci fakultas. */
function pemilikDari(p: Pengguna) {
  return { pemilik: p.peran === "SUPER_ADMIN" ? ("super_admin" as const) : ("penanggung_jawab" as const) };
}

/** Daftar kunci milik pengguna (tanpa isi kunci; hanya 4 karakter terakhir). */
export async function daftarKunci(p: Pengguna) {
  const { pemilik } = pemilikDari(p);
  const daftar = await prisma.kunciAPI.findMany({
    where: { pemilik },
    orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, akhiran: true, status: true, habisSampai: true, createdAt: true, urutan: true },
  });
  const sekarang = new Date();
  return daftar.map((k) => ({ ...k, statusEfektif: statusEfektif({ ...k, pemilik, dibuatPada: k.createdAt } as KunciDomain, sekarang) }));
}

export async function tambahKunci(p: Pengguna, masukan: { label: string; kunci: string }) {
  const { pemilik } = pemilikDari(p);
  const data = skemaKunci.parse(masukan);
  const jumlah = await prisma.kunciAPI.count({ where: { pemilik } });
  const k = await prisma.kunciAPI.create({
    data: {
      label: data.label,
      kunciTerenkripsi: enkripsi(data.kunci),
      akhiran: akhiranKunci(data.kunci),
      pemilik,
      pemilikId: p.id,
      urutan: jumlah,
    },
    select: { id: true, label: true, akhiran: true },
  });
  await catatAktivitas(p, "tambah", "kunci_api", k.id, { label: k.label, akhiran: k.akhiran });
  // dokumen dan penyusunan yang tertahan karena kunci habis/belum ada dilanjutkan
  const diantre = await antreUlangMenungguKunci();
  const tugasDilanjutkan = await antreUlangTugasTertunda();
  // ekstraksi instrumen yang tertunda karena kunci (impor dinamis: menghindari impor melingkar)
  const { antreUlangEkstraksiTertunda } = await import("@/lib/data/unggah-instrumen");
  const ekstraksiDilanjutkan = await antreUlangEkstraksiTertunda();
  return { ...k, diantre, tugasDilanjutkan, ekstraksiDilanjutkan };
}

async function kunciMilik(p: Pengguna, id: string) {
  const k = await prisma.kunciAPI.findUnique({ where: { id } });
  const { pemilik } = pemilikDari(p);
  if (!k || k.pemilik !== pemilik) {
    throw new GalatAkses("Kunci API tidak ditemukan.");
  }
  return k;
}

export async function hapusKunci(p: Pengguna, id: string) {
  const k = await kunciMilik(p, id);
  await prisma.kunciAPI.delete({ where: { id: k.id } });
  await catatAktivitas(p, "hapus", "kunci_api", id, { label: k.label });
}

/** Uji koneksi: satu panggilan embedding kecil. Status kunci diperbarui sesuai hasil. */
export async function ujiKunci(p: Pengguna, id: string): Promise<{ ok: boolean; pesan: string }> {
  const k = await kunciMilik(p, id);
  const { modelEmbedding } = await pengaturanLlm();
  try {
    await penyediaGemini(dekripsi(k.kunciTerenkripsi), modelEmbedding).embedKueri("uji koneksi");
    await prisma.kunciAPI.update({ where: { id }, data: { status: "aktif", habisSampai: null } });
    return { ok: true, pesan: "Kunci API berfungsi." };
  } catch (e) {
    const jenis = await catatGalatKunci(id, e);
    const pesan = jenis === "tidak_valid"
      ? "Kunci API ditolak Google. Periksa kembali kunci yang disalin."
      : jenis === "kuota_harian"
        ? "Kuota harian kunci ini habis. Coba lagi setelah reset kuota (14.00–15.00 WIB) atau pakai kunci dari project Google lain."
        : "Tidak bisa menghubungi layanan Gemini. Periksa koneksi internet lalu coba lagi.";
    return { ok: false, pesan };
  }
}

/** Tandai status kunci setelah galat penyedia; mengembalikan jenis galat. */
export async function catatGalatKunci(id: string, e: unknown): Promise<JenisGalat> {
  const jenis = klasifikasiGalat(galatPenyedia(e));
  const k = await prisma.kunciAPI.findUnique({ where: { id } });
  if (k) {
    const baru = tandaiSetelahGalat(
      { id: k.id, label: k.label, pemilik: k.pemilik, status: k.status, habisSampai: k.habisSampai, urutan: k.urutan, dibuatPada: k.createdAt },
      jenis,
      new Date(),
    );
    if (baru.status !== k.status) await prisma.kunciAPI.update({ where: { id }, data: { status: baru.status, habisSampai: baru.habisSampai } });
  }
  return jenis;
}

/** Galat bila tidak ada kunci yang bisa dipakai; dokumen ditandai menunggu kunci. */
export class GalatTanpaKunci extends GalatPengguna {
  constructor(pesan: string) {
    super(pesan);
    this.name = "GalatTanpaKunci";
  }
}

export interface PenyediaTerpilih {
  penyedia: PenyediaEmbedding;
  kunciId: string | null;
}

/**
 * Penyedia embedding: penyedia uji (EMBEDDING_PENYEDIA=uji) atau Gemini dengan kunci terpilih (kunci fakultas dulu,
 * lalu cadangan admin bila diizinkan pengaturan). Dipakai dokumen LED maupun dokumen bersama fakultas.
 */
export async function penyediaEmbedding(): Promise<PenyediaTerpilih> {
  if (pakaiPenyediaUji()) return { penyedia: penyediaUji(), kunciId: null };
  const { atur, semua, domain } = await kunciFakultas();
  const sekarang = new Date();
  const k = pilihKunci(domain, sekarang, { pakaiCadanganAdmin: atur.pakaiCadanganAdmin });
  if (!k) {
    throw new GalatTanpaKunci(
      domain.length === 0
        ? "Belum ada kunci API Gemini. Tambahkan kunci di menu Kunci API agar dokumen bisa diindeks."
        : pesanKunciHabis(domain, sekarang),
    );
  }
  const asli = semua.find((x) => x.id === k.id)!;
  return { penyedia: penyediaGemini(dekripsi(asli.kunciTerenkripsi), atur.modelEmbedding), kunciId: k.id };
}

/** Model embedding yang berlaku sekarang (untuk menyaring potongan saat pencarian). */
export async function modelEmbeddingAktif(): Promise<string> {
  if (pakaiPenyediaUji()) return penyediaUji().model;
  return (await pengaturanLlm()).modelEmbedding;
}

function keDomain(k: { id: string; label: string; pemilik: "penanggung_jawab" | "super_admin"; status: KunciDomain["status"]; habisSampai: Date | null; urutan: number; createdAt: Date }): KunciDomain {
  return { id: k.id, label: k.label, pemilik: k.pemilik, status: k.status, habisSampai: k.habisSampai, urutan: k.urutan, dibuatPada: k.createdAt };
}

/**
 * Kunci aktif apa saja untuk keperluan administrasi (memuat daftar model, uji model): kunci cadangan super admin
 * lebih dulu, lalu kunci penanggung jawab. Hanya dipakai di server.
 */
export async function kunciUntukAdministrasi(): Promise<{ id: string; kunci: string } | null> {
  const sekarang = new Date();
  const semua = await prisma.kunciAPI.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }] });
  const siap = semua.filter((k) => statusEfektif(keDomain(k), sekarang) === "aktif");
  const k = siap.find((x) => x.pemilik === "super_admin") ?? siap[0];
  return k ? { id: k.id, kunci: dekripsi(k.kunciTerenkripsi) } : null;
}

/** Kunci yang boleh dipakai (kunci fakultas + cadangan admin bila diizinkan), dalam bentuk domain. */
export async function kunciFakultas() {
  const atur = await pengaturanLlm();
  const semua = await prisma.kunciAPI.findMany({
    where: { OR: [{ pemilik: "penanggung_jawab" }, ...(atur.pakaiCadanganAdmin ? [{ pemilik: "super_admin" as const }] : [])] },
  });
  return { atur, semua, domain: semua.map(keDomain) };
}

/** Isi kunci (didekripsi) untuk dipakai worker. */
export async function isiKunci(id: string): Promise<string> {
  const k = await prisma.kunciAPI.findUniqueOrThrow({ where: { id } });
  return dekripsi(k.kunciTerenkripsi);
}

/** Status kunci untuk Beranda: jumlah kunci fakultas dan apakah ada kunci yang bisa dipakai (termasuk cadangan admin). */
export async function ringkasanKunci() {
  const { domain } = await kunciFakultas();
  const sekarang = new Date();
  const milikFakultas = domain.filter((k) => k.pemilik === "penanggung_jawab");
  return {
    milikFakultas: milikFakultas.length,
    aktifFakultas: milikFakultas.filter((k) => statusEfektif(k, sekarang) === "aktif").length,
    adaYangBisaDipakai: pilihKunci(domain, sekarang) !== null,
  };
}

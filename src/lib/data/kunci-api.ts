import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import { antreUlangMenungguKunci } from "@/lib/data/dokumen";
import { akhiranKunci, dekripsi, enkripsi } from "@/lib/kripto";
import {
  klasifikasiGalat, pesanKunciHabis, pilihKunci, statusEfektif, tandaiSetelahGalat,
  type JenisGalat, type KunciAPI as KunciDomain,
} from "@/lib/domain/kunci-api";
import { galatPenyedia, pakaiPenyediaUji, penyediaGemini, penyediaUji, type PenyediaEmbedding } from "@/lib/llm/embedding";

/**
 * Kunci API Gemini versi sederhana (iterasi 2): penanggung jawab mengisi kunci untuk prodinya; kunci dienkripsi
 * AES-256-GCM dan tidak pernah dikirim ke browser. Pemilihan kunci dan penandaan kuota habis memakai
 * src/lib/domain/kunci-api.ts; rotasi penuh dan kunci cadangan super admin di iterasi 3.
 */

export const MODEL_EMBEDDING_BAWAAN = "gemini-embedding-001";
export const MODEL_NARASI_BAWAAN = "gemini-2.5-flash";

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
    .regex(/^[A-Za-z0-9_\-]+$/, "Kunci API hanya berisi huruf, angka, garis bawah, atau tanda hubung."),
});

function pemilikDari(p: Pengguna) {
  return p.peran === "SUPER_ADMIN"
    ? { pemilik: "super_admin" as const, prodiId: null }
    : { pemilik: "penanggung_jawab" as const, prodiId: p.prodiId };
}

/** Daftar kunci milik pengguna (tanpa isi kunci; hanya 4 karakter terakhir). */
export async function daftarKunci(p: Pengguna) {
  const { pemilik, prodiId } = pemilikDari(p);
  const daftar = await prisma.kunciAPI.findMany({
    where: pemilik === "super_admin" ? { pemilik } : { pemilik, prodiId },
    orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, akhiran: true, status: true, habisSampai: true, createdAt: true, urutan: true },
  });
  const sekarang = new Date();
  return daftar.map((k) => ({ ...k, statusEfektif: statusEfektif({ ...k, pemilik, dibuatPada: k.createdAt } as KunciDomain, sekarang) }));
}

export async function tambahKunci(p: Pengguna, masukan: { label: string; kunci: string }) {
  const { pemilik, prodiId } = pemilikDari(p);
  if (pemilik === "penanggung_jawab" && !prodiId) throw new GalatAkses("Akun Anda belum terhubung ke program studi.");
  const data = skemaKunci.parse(masukan);
  const jumlah = await prisma.kunciAPI.count({ where: { pemilik, prodiId } });
  const k = await prisma.kunciAPI.create({
    data: {
      label: data.label,
      kunciTerenkripsi: enkripsi(data.kunci),
      akhiran: akhiranKunci(data.kunci),
      pemilik,
      pemilikId: p.id,
      prodiId,
      urutan: jumlah,
    },
    select: { id: true, label: true, akhiran: true },
  });
  await catatAktivitas(p, "tambah", "kunci_api", k.id, { label: k.label, akhiran: k.akhiran });
  // dokumen yang tertahan karena kunci habis/belum ada diproses lagi
  const diantre = await antreUlangMenungguKunci(prodiId);
  return { ...k, diantre };
}

async function kunciMilik(p: Pengguna, id: string) {
  const k = await prisma.kunciAPI.findUnique({ where: { id } });
  const { pemilik, prodiId } = pemilikDari(p);
  if (!k || k.pemilik !== pemilik || (pemilik === "penanggung_jawab" && k.prodiId !== prodiId)) {
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
 * Penyedia embedding untuk prodi: penyedia uji (EMBEDDING_PENYEDIA=uji) atau Gemini dengan kunci terpilih
 * (kunci penanggung jawab dulu, lalu cadangan super admin bila diizinkan pengaturan).
 */
export async function penyediaUntukProdi(prodiId: string): Promise<PenyediaTerpilih> {
  if (pakaiPenyediaUji()) return { penyedia: penyediaUji(), kunciId: null };
  const atur = await pengaturanLlm();
  const semua = await prisma.kunciAPI.findMany({
    where: { OR: [{ pemilik: "penanggung_jawab", prodiId }, { pemilik: "super_admin" }] },
  });
  const domain: KunciDomain[] = semua.map((k) => ({
    id: k.id, label: k.label, pemilik: k.pemilik, status: k.status, habisSampai: k.habisSampai, urutan: k.urutan, dibuatPada: k.createdAt,
  }));
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

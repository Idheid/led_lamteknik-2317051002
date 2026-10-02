"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import * as org from "@/lib/data/organisasi";
import * as ins from "@/lib/data/instrumen";
import * as pengaturan from "@/lib/data/pengaturan";
import type { MasukanAkun, MasukanButir, MasukanProdi, MasukanSubBagian, MasukanUpps } from "@/lib/validasi";

// ---------------------------------------------------------------- UPPS, prodi, akun

export async function aksiSimpanUpps(masukan: MasukanUpps, id?: string) {
  const r = await jalankanAksi(async (p) => (await org.simpanUpps(p, masukan, id)).id);
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiHapusUpps(id: string) {
  const r = await jalankanAksi((p) => org.hapusUpps(p, id).then(() => null));
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiSimpanProdi(masukan: MasukanProdi, id?: string) {
  const r = await jalankanAksi(async (p) => (await org.simpanProdi(p, masukan, id)).id);
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiHapusProdi(id: string) {
  const r = await jalankanAksi((p) => org.hapusProdi(p, id).then(() => null));
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiBuatAkun(masukan: MasukanAkun) {
  const r = await jalankanAksi(async (p) => (await org.buatAkunPenanggungJawab(p, masukan)).id);
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiAturAktifAkun(userId: string, aktif: boolean) {
  const r = await jalankanAksi((p) => org.aturAktifAkun(p, userId, aktif).then(() => null));
  revalidatePath("/admin/akun");
  return r;
}

export async function aksiAturUlangSandi(userId: string, kataSandi: string) {
  return jalankanAksi((p) => org.aturUlangKataSandi(p, { userId, kataSandi }).then(() => null));
}

export async function aksiHapusAkun(userId: string) {
  const r = await jalankanAksi((p) => org.hapusAkun(p, userId).then(() => null));
  revalidatePath("/admin", "layout");
  return r;
}

// ---------------------------------------------------------------- Instrumen

export async function aksiSalinVersi(id: string) {
  const r = await jalankanAksi(async (p) => (await ins.salinVersi(p, id)).id);
  revalidatePath("/admin/instrumen");
  return r;
}

export async function aksiAturAktifVersi(id: string, aktif: boolean) {
  const r = await jalankanAksi((p) => ins.aturAktifVersi(p, id, aktif).then(() => null));
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

export async function aksiHapusVersi(id: string) {
  const r = await jalankanAksi((p) => ins.hapusVersi(p, id).then(() => null));
  revalidatePath("/admin/instrumen");
  return r;
}

export async function aksiUbahVersi(id: string, masukan: { nama: string; kode: string; catatan: string }) {
  const r = await jalankanAksi((p) => ins.ubahVersi(p, id, masukan).then(() => null));
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

export async function aksiUbahBagian(
  bagianId: string,
  masukan: { nama: string; urutan: number; batasHalamanResmi: number | null; pengantar: string },
) {
  const r = await jalankanAksi((p) => ins.ubahBagian(p, bagianId, masukan).then(() => null));
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

export async function aksiSimpanSubBagian(bagianId: string, masukan: MasukanSubBagian, id?: string) {
  const r = await jalankanAksi(async (p) => (await ins.simpanSubBagian(p, bagianId, masukan, id)).id);
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

export async function aksiHapusSubBagian(id: string) {
  const r = await jalankanAksi((p) => ins.hapusSubBagian(p, id).then(() => null));
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

export async function aksiSimpanButir(versiId: string, masukan: MasukanButir, id?: string) {
  const r = await jalankanAksi(async (p) => (await ins.simpanButir(p, versiId, masukan, id)).id);
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

export async function aksiHapusButir(id: string) {
  const r = await jalankanAksi((p) => ins.hapusButir(p, id).then(() => null));
  revalidatePath("/admin/instrumen", "layout");
  return r;
}

// ---------------------------------------------------------------- Model LLM

export async function aksiSimpanPengaturan(masukan: { modelNarasi: string; modelEmbedding: string }) {
  const r = await jalankanAksi((p) => pengaturan.simpanPengaturan(p, masukan));
  revalidatePath("/admin/model");
  return r;
}

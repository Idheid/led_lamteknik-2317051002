"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import * as ins from "@/lib/data/instrumen";
import type { MasukanButir, MasukanSubBagian } from "@/lib/validasi";

// ---------------------------------------------------------------- Instrumen

export async function aksiSalinVersi(id: string) {
  const r = await jalankanAksi(async (p) => (await ins.salinVersi(p, id)).id);
  revalidatePath("/proyek/instrumen");
  return r;
}

export async function aksiAturAktifVersi(id: string, aktif: boolean) {
  const r = await jalankanAksi((p) => ins.aturAktifVersi(p, id, aktif).then(() => null));
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

export async function aksiHapusVersi(id: string) {
  const r = await jalankanAksi((p) => ins.hapusVersi(p, id).then(() => null));
  revalidatePath("/proyek/instrumen");
  return r;
}

export async function aksiUbahVersi(id: string, masukan: { nama: string; kode: string; catatan: string }) {
  const r = await jalankanAksi((p) => ins.ubahVersi(p, id, masukan).then(() => null));
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

export async function aksiUbahBagian(
  bagianId: string,
  masukan: { nama: string; urutan: number; batasHalamanResmi: number | null; pengantar: string },
) {
  const r = await jalankanAksi((p) => ins.ubahBagian(p, bagianId, masukan).then(() => null));
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

export async function aksiSimpanSubBagian(bagianId: string, masukan: MasukanSubBagian, id?: string) {
  const r = await jalankanAksi(async (p) => (await ins.simpanSubBagian(p, bagianId, masukan, id)).id);
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

export async function aksiHapusSubBagian(id: string) {
  const r = await jalankanAksi((p) => ins.hapusSubBagian(p, id).then(() => null));
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

export async function aksiSimpanButir(versiId: string, masukan: MasukanButir, id?: string) {
  const r = await jalankanAksi(async (p) => (await ins.simpanButir(p, versiId, masukan, id)).id);
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

export async function aksiHapusButir(id: string) {
  const r = await jalankanAksi((p) => ins.hapusButir(p, id).then(() => null));
  revalidatePath("/proyek/instrumen", "layout");
  return r;
}

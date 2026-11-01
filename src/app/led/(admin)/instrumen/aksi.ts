"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/modules/bersama/aksi";
import * as ins from "@/modules/led/data/instrumen";
import * as unggah from "@/modules/led/data/unggah-instrumen";
import type { MasukanButir, MasukanPemetaan, MasukanSubBagian, MasukanVersiJenjang } from "@/modules/led/validasi";

// ---------------------------------------------------------------- Instrumen

export async function aksiSalinVersi(id: string) {
  const r = await jalankanAksi(async (p) => (await ins.salinVersi(p, id)).id);
  revalidatePath("/led/instrumen");
  return r;
}

export async function aksiAturAktifVersi(id: string, aktif: boolean) {
  const r = await jalankanAksi((p) => ins.aturAktifVersi(p, id, aktif).then(() => null));
  revalidatePath("/led/instrumen", "layout");
  return r;
}

export async function aksiHapusVersi(id: string) {
  const r = await jalankanAksi((p) => ins.hapusVersi(p, id).then(() => null));
  revalidatePath("/led/instrumen");
  return r;
}

export async function aksiUbahVersi(id: string, masukan: { nama: string; kode: string; catatan: string; tahunInstrumen?: number }) {
  const r = await jalankanAksi((p) => ins.ubahVersi(p, id, masukan).then(() => null));
  revalidatePath("/led/instrumen", "layout");
  return r;
}

export async function aksiUbahBagian(
  bagianId: string,
  masukan: { nama: string; urutan: number; batasHalamanResmi: number | null; pengantar: string },
) {
  const r = await jalankanAksi((p) => ins.ubahBagian(p, bagianId, masukan).then(() => null));
  revalidatePath("/led/instrumen", "layout");
  return r;
}

export async function aksiSimpanSubBagian(bagianId: string, masukan: MasukanSubBagian, id?: string) {
  const r = await jalankanAksi(async (p) => (await ins.simpanSubBagian(p, bagianId, masukan, id)).id);
  revalidatePath("/led/instrumen", "layout");
  return r;
}

export async function aksiHapusSubBagian(id: string) {
  const r = await jalankanAksi((p) => ins.hapusSubBagian(p, id).then(() => null));
  revalidatePath("/led/instrumen", "layout");
  return r;
}

export async function aksiSimpanButir(versiId: string, masukan: MasukanButir, id?: string) {
  const r = await jalankanAksi(async (p) => (await ins.simpanButir(p, versiId, masukan, id)).id);
  revalidatePath("/led/instrumen", "layout");
  return r;
}

export async function aksiHapusButir(id: string) {
  const r = await jalankanAksi((p) => ins.hapusButir(p, id).then(() => null));
  revalidatePath("/led/instrumen", "layout");
  return r;
}

// ---------------------------------------------------------------- Unggah instrumen per jenjang (revisi 19 Okt 2026)

export async function aksiBuatVersiJenjang(masukan: MasukanVersiJenjang) {
  const r = await jalankanAksi(async (p) => (await unggah.buatVersiJenjang(p, masukan)).id);
  revalidatePath("/led/instrumen");
  return r;
}

export async function aksiAturHalamanBobot(versiId: string, teks: string) {
  const r = await jalankanAksi((p) => unggah.aturHalamanBobot(p, versiId, teks).then(() => null));
  revalidatePath(`/led/instrumen/${versiId}`);
  return r;
}

export async function aksiMulaiEkstraksi(versiId: string, ulang: boolean) {
  const r = await jalankanAksi((p) => unggah.mulaiEkstraksi(p, versiId, { ulang }).then(() => null));
  revalidatePath(`/led/instrumen/${versiId}`, "layout");
  return r;
}

export async function aksiKonfirmasiBerkas(versiId: string, jenis: "tahun" | "skema") {
  const r = await jalankanAksi((p) => unggah.konfirmasiBerkasInstrumen(p, versiId, jenis).then(() => null));
  revalidatePath(`/led/instrumen/${versiId}`);
  return r;
}

export async function aksiSimpanPemetaan(versiId: string, masukan: MasukanPemetaan) {
  const r = await jalankanAksi((p) => unggah.simpanPemetaan(p, versiId, masukan));
  revalidatePath(`/led/instrumen/${versiId}`, "layout");
  return r;
}

export async function aksiTandaiBerkasUsang(versiId: string) {
  const r = await jalankanAksi((p) => unggah.tandaiBerkasUsang(p, versiId));
  revalidatePath(`/led/instrumen/${versiId}`);
  return r;
}

export async function aksiSimpanButirCek(versiId: string, butirId: string, masukan: MasukanButir) {
  const r = await jalankanAksi((p) => unggah.simpanButirCek(p, versiId, butirId, masukan).then(() => null));
  revalidatePath(`/led/instrumen/${versiId}`, "layout");
  return r;
}

export async function aksiKonfirmasiButir(versiId: string, butirId: string) {
  const r = await jalankanAksi((p) => unggah.konfirmasiButir(p, versiId, butirId).then(() => null));
  revalidatePath(`/led/instrumen/${versiId}`, "layout");
  return r;
}

export async function aksiAktifkanVersiCek(versiId: string) {
  const r = await jalankanAksi((p) => unggah.aktifkanVersiCek(p, versiId).then(() => null));
  revalidatePath("/led", "layout");
  return r;
}

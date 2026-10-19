"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import * as org from "@/lib/data/organisasi";
import * as pengaturan from "@/lib/data/pengaturan";
import type { MasukanAkun, MasukanAkunSuperAdmin } from "@/lib/validasi";

// ---------------------------------------------------------------- Akun (admin)

export async function aksiBuatAkun(masukan: MasukanAkun) {
  const r = await jalankanAksi(async (p) => (await org.buatAkunPenanggungJawab(p, masukan)).id);
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiBuatSuperAdmin(masukan: MasukanAkunSuperAdmin) {
  const r = await jalankanAksi(async (p) => (await org.buatAkunSuperAdmin(p, masukan)).id);
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

// ---------------------------------------------------------------- Model LLM

export async function aksiSimpanPengaturan(masukan: pengaturan.MasukanPengaturan) {
  const r = await jalankanAksi((p) => pengaturan.simpanPengaturan(p, masukan));
  revalidatePath("/admin", "layout");
  return r;
}

export async function aksiMuatDaftarModel() {
  const r = await jalankanAksi((p) => pengaturan.muatDaftarModel(p));
  revalidatePath("/admin/kunci-api");
  return r;
}

export async function aksiUjiModel(jenis: "narasi" | "embedding", kode: string) {
  return jalankanAksi((p) => pengaturan.ujiModel(p, jenis, kode));
}

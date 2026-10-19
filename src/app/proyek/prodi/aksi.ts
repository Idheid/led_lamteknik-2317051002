"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import * as org from "@/lib/data/organisasi";
import type { MasukanFakultas, MasukanProdi } from "@/lib/validasi";

export async function aksiSimpanFakultas(masukan: MasukanFakultas) {
  const r = await jalankanAksi((p) => org.simpanFakultas(p, masukan).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}

export async function aksiSimpanProdi(masukan: MasukanProdi, id?: string) {
  const r = await jalankanAksi(async (p) => (await org.simpanProdi(p, masukan, id)).id);
  revalidatePath("/proyek", "layout");
  return r;
}

export async function aksiHapusProdi(id: string) {
  const r = await jalankanAksi((p) => org.hapusProdi(p, id).then(() => null));
  revalidatePath("/proyek", "layout");
  return r;
}

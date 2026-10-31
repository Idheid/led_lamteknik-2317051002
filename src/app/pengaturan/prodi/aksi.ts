"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/modules/bersama/aksi";
import * as org from "@/modules/bersama/data/organisasi";
import type { MasukanFakultas, MasukanProdi } from "@/modules/bersama/validasi";

export async function aksiSimpanFakultas(masukan: MasukanFakultas) {
  const r = await jalankanAksi((p) => org.simpanFakultas(p, masukan).then(() => null));
  revalidatePath("/led", "layout");
  return r;
}

export async function aksiSimpanProdi(masukan: MasukanProdi, id?: string) {
  const r = await jalankanAksi(async (p) => (await org.simpanProdi(p, masukan, id)).id);
  revalidatePath("/led", "layout");
  return r;
}

export async function aksiHapusProdi(id: string) {
  const r = await jalankanAksi((p) => org.hapusProdi(p, id).then(() => null));
  revalidatePath("/led", "layout");
  return r;
}

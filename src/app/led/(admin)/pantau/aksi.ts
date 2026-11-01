"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/modules/bersama/aksi";
import { ingatkanTimProdi } from "@/modules/bersama/data/pengingat-akreditasi";

/** L2: Admin UPPS mengingatkan Tim Prodi satu prodi untuk memulai LED periode berikutnya. */
export async function aksiIngatkanTimProdi(prodiId: string) {
  const r = await jalankanAksi((p) => ingatkanTimProdi(p, prodiId));
  revalidatePath("/led/pantau");
  return r;
}

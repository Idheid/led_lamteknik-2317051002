"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/modules/bersama/aksi";
import { mulaiIndeksUlang } from "@/modules/led/data/indeks-ulang";

/** Rencana 10 Nov T4: jalankan "Indeks ulang potongan" (Admin UPPS). */
export async function aksiMulaiIndeksUlang() {
  const r = await jalankanAksi((p) => mulaiIndeksUlang(p).then(() => null));
  revalidatePath("/led/dokumen-bersama");
  return r;
}

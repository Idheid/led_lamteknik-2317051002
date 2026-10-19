"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import * as kunciApi from "@/lib/data/kunci-api";

/** Aksi kunci API (PJ: kunci fakultas; admin: kunci cadangan). Tidak terikat proyek. */

function segarkan() {
  revalidatePath("/proyek", "layout");
  revalidatePath("/admin", "layout");
}

export async function aksiTambahKunci(label: string, kunci: string) {
  const r = await jalankanAksi(async (p) => {
    const k = await kunciApi.tambahKunci(p, { label, kunci });
    return { dokumen: k.diantre, tugas: k.tugasDilanjutkan };
  });
  segarkan();
  return r;
}

export async function aksiHapusKunci(id: string) {
  const r = await jalankanAksi((p) => kunciApi.hapusKunci(p, id).then(() => null));
  segarkan();
  return r;
}

export async function aksiUjiKunci(id: string) {
  const r = await jalankanAksi((p) => kunciApi.ujiKunci(p, id));
  segarkan();
  return r;
}

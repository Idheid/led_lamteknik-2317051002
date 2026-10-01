"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import { buatProyek, simpanJawaban, ubahTsProyek } from "@/lib/data/proyek";
import type { MasukanProyek } from "@/lib/validasi";

export async function aksiBuatProyek(masukan: MasukanProyek) {
  const r = await jalankanAksi(async (p) => (await buatProyek(p, masukan)).id);
  revalidatePath("/proyek");
  return r;
}

export async function aksiUbahTs(proyekId: string, tsTahunMulai: number) {
  const r = await jalankanAksi((p) => ubahTsProyek(p, proyekId, tsTahunMulai).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

/** Simpan otomatis jawaban form; tidak memuat ulang halaman. */
export async function aksiSimpanJawaban(proyekId: string, subBagianKode: string, isi: string) {
  return jalankanAksi(async (p) => (await simpanJawaban(p, { proyekId, subBagianKode, isi })).updatedAt.toISOString());
}

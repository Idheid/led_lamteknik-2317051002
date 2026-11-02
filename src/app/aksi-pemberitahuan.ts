"use server";

import { jalankanAksi } from "@/modules/bersama/aksi";
import { tandaiDibaca } from "@/modules/bersama/data/pemberitahuan";

/** Aksi lonceng pemberitahuan (dipakai semua modul). */
export async function aksiTandaiDibaca(id: string | null) {
  return jalankanAksi((p) => tandaiDibaca(p, id).then(() => null));
}

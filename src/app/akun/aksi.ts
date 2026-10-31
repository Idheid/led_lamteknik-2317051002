"use server";

import { headers } from "next/headers";
import { jalankanAksi } from "@/modules/bersama/aksi";
import { gantiKataSandiSendiri } from "@/modules/bersama/data/organisasi";
import { berandaPeran } from "@/modules/bersama/peran";
import type { MasukanGantiSandi } from "@/modules/bersama/validasi";

/** Ganti kata sandi sendiri; mengembalikan halaman tujuan sesudahnya. */
export async function aksiGantiSandi(masukan: MasukanGantiSandi) {
  const h = await headers();
  return jalankanAksi(async (p) => {
    await gantiKataSandiSendiri(p, masukan, h);
    return berandaPeran(p.peran);
  }, { bolehBelumGantiSandi: true });
}

"use server";

import { headers } from "next/headers";
import { jalankanAksi } from "@/lib/aksi";
import { gantiKataSandiSendiri } from "@/lib/data/organisasi";
import { berandaPeran } from "@/lib/peran";
import type { MasukanGantiSandi } from "@/lib/validasi";

/** Ganti kata sandi sendiri; mengembalikan halaman tujuan sesudahnya. */
export async function aksiGantiSandi(masukan: MasukanGantiSandi) {
  const h = await headers();
  return jalankanAksi(async (p) => {
    await gantiKataSandiSendiri(p, masukan, h);
    return berandaPeran(p.peran);
  }, { bolehBelumGantiSandi: true });
}

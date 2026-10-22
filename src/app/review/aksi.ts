"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import * as review from "@/lib/data/review";
import type { AksiCatatan } from "@/lib/domain/review";

/** Aksi review asesor (revisi 22 Okt 2026); hak akses diperiksa di src/lib/data/review.ts. */

export async function aksiBuatCatatan(proyekId: string, masukan: { subBagianKode: string; teks: string; sebelum: string; sesudah: string; isi: string }) {
  return jalankanAksi(async (p) => (await review.buatCatatan(p, proyekId, masukan)).id);
}

export async function aksiUbahStatusCatatan(catatanId: string, aksi: AksiCatatan, isi = "") {
  return jalankanAksi((p) => review.ubahStatusCatatan(p, catatanId, aksi, isi));
}

export async function aksiBalasCatatan(catatanId: string, isi: string) {
  return jalankanAksi((p) => review.balasCatatan(p, catatanId, isi).then(() => null));
}

export async function aksiHapusCatatan(catatanId: string) {
  return jalankanAksi((p) => review.hapusCatatan(p, catatanId).then(() => null));
}

export async function aksiBandingkanCatatan(catatanId: string) {
  return jalankanAksi((p) => review.bandingkanCatatan(p, catatanId));
}

export async function aksiAjukanReview(proyekId: string) {
  const r = await jalankanAksi((p) => review.ajukanReview(p, proyekId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiSimpanSkor(proyekId: string, butirKode: string, skor: number | null, alasan: string | null) {
  const r = await jalankanAksi((p) => review.simpanSkor(p, proyekId, { butirKode, skor, alasan }).then(() => null));
  revalidatePath(`/asesor/${proyekId}/penilaian`);
  return r;
}

export async function aksiPutuskanReview(proyekId: string, keputusan: "layak" | "perlu_revisi", catatan: string) {
  const r = await jalankanAksi((p) => review.putuskanReview(p, proyekId, { keputusan, catatan }));
  revalidatePath(`/asesor/${proyekId}`, "layout");
  return r;
}

export async function aksiTandaiDibaca(id: string | null) {
  return jalankanAksi((p) => review.tandaiDibaca(p, id).then(() => null));
}

export async function aksiTugaskanAsesor(proyekId: string, asesorId: string | null) {
  const r = await jalankanAksi((p) => review.tugaskanAsesor(p, proyekId, asesorId).then(() => null));
  revalidatePath("/admin/penugasan");
  return r;
}

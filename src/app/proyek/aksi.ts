"use server";

import { revalidatePath } from "next/cache";
import { jalankanAksi } from "@/lib/aksi";
import { buatProyek, simpanJawaban, ubahTsProyek } from "@/lib/data/proyek";
import type { MasukanProyek } from "@/lib/validasi";
import * as lkps from "@/lib/data/lkps";
import * as dokumen from "@/lib/data/dokumen";
import * as pencarian from "@/lib/data/pencarian";
import * as kunciApi from "@/lib/data/kunci-api";

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

// ---------------------------------------------------------------- LKPS (F-08, F-09)

export async function aksiJadikanAktif(proyekId: string, berkasId: string) {
  const r = await jalankanAksi((p) => lkps.jadikanAktif(p, berkasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiBacaUlangLkps(proyekId: string, berkasId: string) {
  const r = await jalankanAksi((p) => lkps.bacaUlangLkps(p, berkasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}/lkps`);
  return r;
}

export async function aksiHapusLkps(proyekId: string, berkasId: string) {
  const r = await jalankanAksi((p) => lkps.hapusBerkasLkps(p, berkasId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiSimpanKoreksi(proyekId: string, tabelId: string, baris: unknown, sudahDicek: boolean) {
  const r = await jalankanAksi((p) => lkps.simpanKoreksiTabel(p, tabelId, baris, sudahDicek).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

// ---------------------------------------------------------------- Dokumen (F-10, F-11, F-12)

export async function aksiUbahDokumen(proyekId: string, dokumenId: string, masukan: { judul?: string; tautanBukti?: string; dokumenDiharapkanId?: string | null }) {
  const r = await jalankanAksi((p) => dokumen.ubahDokumen(p, dokumenId, masukan).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiHapusDokumen(proyekId: string, dokumenId: string) {
  const r = await jalankanAksi((p) => dokumen.hapusDokumen(p, dokumenId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiProsesUlangDokumen(proyekId: string, dokumenId: string) {
  const r = await jalankanAksi((p) => dokumen.prosesUlangDokumen(p, dokumenId).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiCariDokumen(proyekId: string, kueri: string, subBagianKode: string | null) {
  return jalankanAksi(async (p) => {
    const q = kueri.trim().slice(0, 500);
    if (q.length < 2) return { hasil: [], catatan: ["Ketik minimal 2 huruf."] };
    return pencarian.cariPotongan(p, proyekId, q, { subBagianKode });
  });
}

// ---------------------------------------------------------------- Kunci API (sederhana)

export async function aksiTambahKunci(proyekId: string, label: string, kunci: string) {
  const r = await jalankanAksi(async (p) => (await kunciApi.tambahKunci(p, { label, kunci })).diantre);
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiHapusKunci(proyekId: string, id: string) {
  const r = await jalankanAksi((p) => kunciApi.hapusKunci(p, id).then(() => null));
  revalidatePath(`/proyek/${proyekId}`, "layout");
  return r;
}

export async function aksiUjiKunci(proyekId: string, id: string) {
  const r = await jalankanAksi((p) => kunciApi.ujiKunci(p, id));
  revalidatePath(`/proyek/${proyekId}/kunci-api`);
  return r;
}

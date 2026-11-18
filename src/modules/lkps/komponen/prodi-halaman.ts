import "server-only";
import { cookies } from "next/headers";
import type { Pengguna } from "@/modules/bersama/akses";
import { COOKIE_PRODI_LKPS, prodiAktifLkps } from "@/modules/lkps/data/prodi-aktif";

/** Prodi aktif halaman LKPS dari cookie `lkps_prodi` (Gabung LKPS G5); diperiksa ulang oleh prodiAktifLkps. */
export async function prodiAktifHalaman(p: Pengguna): Promise<string | null> {
  const nilai = (await cookies()).get(COOKIE_PRODI_LKPS)?.value;
  let pilihan: string | null = null;
  try {
    pilihan = nilai ? decodeURIComponent(nilai).trim() || null : null;
  } catch {
    pilihan = null;
  }
  return prodiAktifLkps(p, pilihan);
}

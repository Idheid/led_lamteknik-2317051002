import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { prodiDitugaskanAsesor } from "@/modules/bersama/data/penugasan-asesor";
import { pastikanBukaLkps } from "@/modules/lkps/domain/akses";

/**
 * Prodi aktif modul LKPS (Gabung LKPS G4), pengganti `src/lib/active-prodi.ts` kode asal:
 * - Tim Prodi selalu memakai prodinya sendiri (pilihan di cookie/URL diabaikan);
 * - Admin dan Asesor memakai prodi yang dipilih (`?prodiId=` atau cookie `lkps_prodi`) setelah dicek prodi itu ada;
 *   Asesor hanya prodi yang LED-nya ditugaskan kepadanya (keputusan Adrianne di ⏸ G4);
 * - belum memilih → null ("Pilih program studi"); tidak jatuh ke prodi pertama di basis data (masalah 8).
 */

export const COOKIE_PRODI_LKPS = "lkps_prodi";
export const PESAN_PILIH_PRODI = "Pilih program studi terlebih dahulu.";

/** Pilihan prodi dari permintaan: `?prodiId=` lebih dulu, lalu cookie `lkps_prodi`. */
export function pilihanProdiDari(req: Request): string | null {
  const q = new URL(req.url).searchParams.get("prodiId");
  if (q && q.trim()) return q.trim();
  const kue = req.headers.get("cookie") ?? "";
  for (const bagian of kue.split(";")) {
    const [k, ...v] = bagian.trim().split("=");
    if (k === COOKIE_PRODI_LKPS && v.length) {
      const nilai = decodeURIComponent(v.join("=")).trim();
      return nilai || null;
    }
  }
  return null;
}

export async function prodiAktifLkps(p: Pengguna, pilihan: string | null): Promise<string | null> {
  pastikanBukaLkps(p);
  if (p.peran === "TIM_PRODI") {
    if (!p.prodiId) throw new GalatAkses("Akun Tim Prodi Anda belum terhubung ke program studi.");
    return p.prodiId;
  }
  if (!pilihan || pilihan.length > 64) return null;
  if (p.peran === "ASESOR" && !(await prodiDitugaskanAsesor(p.id)).includes(pilihan)) return null;
  const ada = await prisma.prodi.findUnique({ where: { id: pilihan }, select: { id: true } });
  return ada?.id ?? null;
}

/** Untuk Route Handler: prodi aktif wajib; tanpa pilihan → galat 400 "Pilih program studi". */
export async function prodiAktifWajib(p: Pengguna, req: Request): Promise<string> {
  pastikanBukaLkps(p);
  const id = await prodiAktifLkps(p, pilihanProdiDari(req));
  if (!id) throw new GalatPengguna(PESAN_PILIH_PRODI);
  return id;
}

import { GalatPengguna } from "@/modules/bersama/akses";
import { skemaAksi } from "@/modules/lkps/domain/validasi";

/** Pembantu Route Handler /api/lkps/* (Gabung LKPS G4). Galat menjadi JSON { pesan } lewat jalankanRute. */

export async function bacaJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new GalatPengguna("Isi permintaan bukan JSON yang sah.");
  }
}

/** Isi `{ action, payload }` kode asal. */
export async function bacaAksi(req: Request): Promise<{ action: string; payload: unknown }> {
  const { action, payload } = skemaAksi.parse(await bacaJson(req));
  return { action, payload: payload ?? {} };
}

export function aksiTidakDikenal(): never {
  throw new GalatPengguna("Aksi tidak dikenal.");
}

/** Pilih fungsi aksi dari peta; aksi di luar peta → galat 400. */
export function pilihAksi<T extends Record<string, unknown>>(peta: T, action: string): T[keyof T] {
  return Object.hasOwn(peta, action) ? peta[action as keyof T] : aksiTidakDikenal();
}

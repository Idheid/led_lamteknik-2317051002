import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { prodiDitugaskanAsesor } from "@/modules/bersama/data/penugasan-asesor";
import { pastikanBacaLkps, pastikanEksporLkps, type AreaLkps } from "@/modules/lkps/domain/akses";

/**
 * Hak baca LKPS satu prodi di lapisan data (Gabung LKPS G4). Selain matriks di domain/akses.ts, Asesor hanya membaca
 * LKPS prodi yang LED-nya ditugaskan kepadanya (keputusan Adrianne di ⏸ G4, 18 Nov 2026; rancangan Ghalib: semua prodi).
 */

export const PESAN_BUKAN_TUGAS_ASESOR = "LKPS program studi ini tidak ditugaskan kepada Anda.";

async function pastikanTugasAsesor(p: Pengguna, prodiId: string | null): Promise<void> {
  if (p.peran !== "ASESOR") return;
  if (!prodiId || !(await prodiDitugaskanAsesor(p.id)).includes(prodiId)) throw new GalatAkses(PESAN_BUKAN_TUGAS_ASESOR);
}

export async function pastikanBacaProdiLkps(p: Pengguna, area: Exclude<AreaLkps, "konfigurasi">, prodiId: string | null): Promise<void> {
  pastikanBacaLkps(p, area, prodiId);
  await pastikanTugasAsesor(p, prodiId);
}

export async function pastikanEksporProdiLkps(p: Pengguna, prodiId: string): Promise<void> {
  pastikanEksporLkps(p, prodiId);
  await pastikanTugasAsesor(p, prodiId);
}

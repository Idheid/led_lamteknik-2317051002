import { PengaturParalel } from "@/modules/led/domain/paralel-adaptif";

/**
 * Rencana 10 Nov T9 (8): satu pengatur paralel per proses worker. Batas per menit dihitung per project Google, jadi
 * semua tugas generate di worker ini berbagi pengatur yang sama. llm-narasi melaporkan panggilan berhasil dan 429.
 */

function angkaEnv(nama: string, bawaan: number): number {
  const n = Number(process.env[nama]);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 8) : bawaan;
}

const globalParalel = globalThis as unknown as { pengaturParalel?: PengaturParalel };

export function pengaturParalel(): PengaturParalel {
  globalParalel.pengaturParalel ??= new PengaturParalel(angkaEnv("GENERATE_PARALEL", 2), angkaEnv("GENERATE_PARALEL_MAKS", 4));
  return globalParalel.pengaturParalel;
}

/** Untuk uji: buat ulang pengatur dari variabel lingkungan saat ini. */
export function setelUlangParalel(): void {
  globalParalel.pengaturParalel = undefined;
}

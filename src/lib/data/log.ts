import { prisma } from "@/lib/db";
import type { Pengguna } from "@/lib/akses";

/** Jejak audit (LogAktivitas). Gagal mencatat tidak boleh menggagalkan aksi utama. */
export async function catatAktivitas(
  p: Pengguna | null,
  aksi: string,
  objek: string,
  objekId?: string | null,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.logAktivitas.create({
      data: { userId: p?.id ?? null, aksi, objek, objekId: objekId ?? null, detail: detail as object | undefined },
    });
  } catch (e) {
    console.error("Gagal mencatat aktivitas:", aksi, objek, e instanceof Error ? e.message : e);
  }
}

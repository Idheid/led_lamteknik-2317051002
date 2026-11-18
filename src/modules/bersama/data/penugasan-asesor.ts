import { prisma } from "@/modules/bersama/db";

/**
 * Gabung LKPS G4 (keputusan Adrianne di ⏸ G4, 18 Nov 2026): prodi yang LED-nya ditugaskan kepada seorang asesor.
 * Ada di modul bersama karena modul LKPS dipakai untuk membatasi baca Asesor tetapi tidak boleh mengimpor modul LED.
 */
export async function prodiDitugaskanAsesor(asesorId: string): Promise<string[]> {
  const led = await prisma.proyekLED.findMany({ where: { asesorId }, select: { prodiId: true }, distinct: ["prodiId"] });
  return led.map((l) => l.prodiId);
}

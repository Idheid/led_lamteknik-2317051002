import { prisma } from "@/modules/bersama/db";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";

/**
 * Tugas generate yang tertunda karena kunci habis dikirim ulang setelah kunci baru ditambahkan (F-19). Revisi 31 Okt
 * 2026: usulan skor rubrik yang menunggu kunci ikut dilanjutkan dan dihitung.
 */
export async function antreUlangTugasTertunda(): Promise<number> {
  const daftar = await prisma.tugasGenerate.findMany({
    where: { status: "tertunda" },
    select: { id: true },
  });
  for (const t of daftar) {
    await prisma.tugasGenerate.update({ where: { id: t.id }, data: { status: "antre", pesan: null, dilanjutkanPada: null } });
    await kirimTugas(ANTREAN.generate, { tugasId: t.id });
  }
  const skor = await prisma.proyekLED.findMany({ where: { statusSkorRubrik: "menunggu_kunci" }, select: { id: true } });
  for (const p of skor) {
    await prisma.proyekLED.update({ where: { id: p.id }, data: { statusSkorRubrik: "antre", pesanSkorRubrik: null } });
    await kirimTugas(ANTREAN.skorRubrik, { proyekId: p.id });
  }
  return daftar.length + skor.length;
}

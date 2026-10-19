import { prisma } from "@/lib/db";
import { ANTREAN, kirimTugas } from "@/lib/antrean";

/** Tugas generate yang tertunda karena kunci habis dikirim ulang setelah kunci baru ditambahkan (F-19). */
export async function antreUlangTugasTertunda(): Promise<number> {
  const daftar = await prisma.tugasGenerate.findMany({
    where: { status: "tertunda" },
    select: { id: true },
  });
  for (const t of daftar) {
    await prisma.tugasGenerate.update({ where: { id: t.id }, data: { status: "antre", pesan: null, dilanjutkanPada: null } });
    await kirimTugas(ANTREAN.generate, { tugasId: t.id });
  }
  return daftar.length;
}

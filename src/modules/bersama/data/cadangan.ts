import { prisma } from "@/modules/bersama/db";
import { pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";

/** Status cadangan untuk admin (revisi 22 Okt 2026): cadangan terakhir dan cadangan berhasil terakhir. */
export async function statusCadangan(p: Pengguna) {
  pastikanAdmin(p);
  const [terakhir, berhasil] = await Promise.all([
    prisma.cadangan.findFirst({ orderBy: { mulai: "desc" } }),
    prisma.cadangan.findFirst({ where: { berhasil: true }, orderBy: { mulai: "desc" } }),
  ]);
  return { terakhir, terakhirBerhasil: berhasil };
}

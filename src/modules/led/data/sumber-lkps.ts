import { prisma } from "@/modules/bersama/db";
import { gabungTabelLkps } from "@/modules/led/data-lkps/gabung";

/**
 * Sumber data LKPS satu LED (revisi 31 Okt 2026): semua berkas sumber (aktif), terbaru dulu, dan tabel gabungannya
 * (satu tabel per sheet, berkas terbaru menang). Excel LKPS lengkap yang terbaca menggantikan semua berkas lama; PDF
 * per tabel ditambahkan ke sumber yang sudah ada. null bila belum ada berkas terbaca.
 */
export async function sumberLkps(proyekId: string) {
  const berkas = await prisma.berkasLKPS.findMany({
    where: { proyekId, aktif: true },
    orderBy: { createdAt: "desc" },
    include: { tabel: { orderBy: { urutan: "asc" } } },
  });
  if (!berkas.length) return null;
  return { berkas, tabel: gabungTabelLkps(berkas) };
}

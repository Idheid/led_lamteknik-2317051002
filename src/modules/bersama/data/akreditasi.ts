import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { riwayatBerlakuTerbaru } from "@/modules/bersama/domain/akreditasi";

/**
 * Riwayat akreditasi prodi (L1, 2 Nov 2026). Tanggal berakhir, peringkat, dan nomor SK di data prodi diturunkan dari
 * riwayat berlaku terbaru; jangan diubah langsung tanpa membuat baris riwayat.
 */

type Tx = Prisma.TransactionClient | typeof prisma;

/** Turunkan Prodi.akreditasiBerlakuSampai dan identitas (peringkat, nomor SK, lembaga) dari riwayat berlaku terbaru. */
export async function terapkanRiwayatTerbaru(tx: Tx, prodiId: string): Promise<void> {
  const [prodi, riwayat] = await Promise.all([
    tx.prodi.findUniqueOrThrow({ where: { id: prodiId }, select: { identitas: true } }),
    tx.riwayatAkreditasi.findMany({ where: { prodiId, status: "berlaku" } }),
  ]);
  const r = riwayatBerlakuTerbaru(riwayat);
  const identitas = { ...((prodi.identitas ?? {}) as Record<string, unknown>) };
  if (r) {
    identitas.peringkatAkreditasi = r.peringkat || undefined;
    identitas.nomorSkAkreditasi = r.nomorSk ?? undefined;
    identitas.lembagaAkreditasi = r.lembaga || undefined;
  }
  await tx.prodi.update({
    where: { id: prodiId },
    data: { akreditasiBerlakuSampai: r?.berlakuSampai ?? null, identitas: JSON.parse(JSON.stringify(identitas)) as Prisma.InputJsonValue },
  });
}

/** Riwayat akreditasi satu prodi (terbaru di atas). Admin UPPS semua prodi; Tim Prodi hanya prodinya. */
export async function riwayatAkreditasiProdi(p: Pengguna, prodiId: string) {
  if (p.peran === "TIM_PRODI" ? p.prodiId !== prodiId : p.peran !== "ADMIN") throw new GalatAkses();
  const riwayat = await prisma.riwayatAkreditasi.findMany({ where: { prodiId }, orderBy: { createdAt: "desc" } });
  const id = [...new Set(riwayat.flatMap((r) => [r.dicatatOlehId, r.dikonfirmasiOlehId]).filter((x): x is string => Boolean(x)))];
  const nama = new Map((await prisma.user.findMany({ where: { id: { in: id } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  return riwayat.map((r) => ({
    ...r,
    dicatatOleh: r.dicatatOlehId ? nama.get(r.dicatatOlehId) ?? null : null,
    dikonfirmasiOleh: r.dikonfirmasiOlehId ? nama.get(r.dikonfirmasiOlehId) ?? null : null,
  }));
}

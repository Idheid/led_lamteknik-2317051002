import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";

/**
 * Pemberitahuan di ikon lonceng (dipakai semua modul). Modul mengirim pemberitahuan lewat beritahu(); tautan diisi
 * alamat halaman modul itu (misalnya /led/...). Dipisah dari data review LED (31 Okt 2026).
 */

export async function beritahu(userIds: (string | null | undefined)[], data: { proyekId: string; pesan: string; tautan: string }) {
  const id = [...new Set(userIds.filter((x): x is string => Boolean(x)))];
  if (id.length) await prisma.pemberitahuan.createMany({ data: id.map((userId) => ({ userId, ...data })) });
}

export async function daftarPemberitahuan(p: Pengguna) {
  const [belumDibaca, daftar] = await Promise.all([
    prisma.pemberitahuan.count({ where: { userId: p.id, dibaca: false } }),
    prisma.pemberitahuan.findMany({ where: { userId: p.id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  return {
    belumDibaca,
    daftar: daftar.map((x) => ({ id: x.id, pesan: x.pesan, tautan: x.tautan, dibaca: x.dibaca, waktu: x.createdAt.toISOString() })),
  };
}

/** Tandai satu pemberitahuan (atau semua, id null) sudah dibaca. */
export async function tandaiDibaca(p: Pengguna, id: string | null) {
  await prisma.pemberitahuan.updateMany({ where: { userId: p.id, dibaca: false, ...(id ? { id } : {}) }, data: { dibaca: true } });
}

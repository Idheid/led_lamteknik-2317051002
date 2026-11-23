import { createHash } from "node:crypto";
import { prisma } from "@/modules/bersama/db";
import { normalisasiEmail, statusKunci, type StatusKunci } from "@/modules/bersama/domain/login-gagal";

/**
 * Penyimpanan login gagal (Rencana 18 Nov S3). Yang disimpan hanya hash SHA-256 email yang dinormalisasi, IP, alasan,
 * dan waktu; email asli dan kata sandi tidak pernah disimpan atau dicatat.
 */

export function kunciLogin(email: string): string {
  return createHash("sha256").update(normalisasiEmail(email)).digest("hex");
}

export async function statusKunciLogin(email: string, sekarang = new Date()): Promise<StatusKunci> {
  const sejak = new Date(sekarang.getTime() - 300_000);
  const gagal = await prisma.logLoginGagal.findMany({ where: { kunci: kunciLogin(email), waktu: { gt: sejak } }, select: { waktu: true } });
  return statusKunci(gagal.map((g) => g.waktu), sekarang);
}

export async function catatLoginGagal(email: string, ip: string | null, alasan: string): Promise<void> {
  await prisma.logLoginGagal.create({ data: { kunci: kunciLogin(email), ip: ip?.slice(0, 64) ?? null, alasan: alasan.slice(0, 100) } });
}

/** Login berhasil menghapus hitungan gagal untuk email itu. */
export async function hapusLoginGagal(email: string): Promise<void> {
  await prisma.logLoginGagal.deleteMany({ where: { kunci: kunciLogin(email) } });
}

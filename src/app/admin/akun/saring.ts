/**
 * Penyaring daftar akun Kelola akun. L3: akun satu prodi (`?prodi=`). Rencana 18 Nov S4: "Tamu baru" (`?saring=tamu`),
 * yaitu akun ber-peran Tamu, urut dari yang terbaru dibuat.
 */
export function saringAkun<T extends { role: string | null; createdAt: Date; prodi: { id: string } | null }>(
  akun: T[],
  saring: { prodiId?: string; tamu?: boolean },
): T[] {
  if (saring.prodiId) return akun.filter((a) => a.prodi?.id === saring.prodiId);
  if (saring.tamu) return akun.filter((a) => a.role === "TAMU").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return akun;
}

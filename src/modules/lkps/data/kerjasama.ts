import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaGantiKerjasama } from "@/modules/lkps/domain/validasi";
import { berkasDariAlamat, denganAlamat } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/kerjasama/route.ts.
// Gabung LKPS G4: bentuk data sama; "ganti semua baris" dibatasi prodi (masalah 4), tanggal wajib (masalah 13),
// dan berkas MoU disimpan di baris (masalah 15).

/** Kriteria 1, Tabel 1 kerja sama: daftar kerja sama prodi (GET kode asal: array baris dengan `fileMou`). */
export async function bacaKerjasama(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const baris = await prisma.lkpsKerjasama.findMany({ where: { prodiId }, orderBy: { createdAt: "asc" } });
  return baris.map((b) => denganAlamat(b, "fileMou"));
}

/** POST kode asal `{ rows }`: hapus semua kerja sama prodi ini lalu buat ulang, dalam satu transaksi. */
export async function gantiKerjasama(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { rows } = skemaGantiKerjasama.parse(masukan);
  const data = rows.map(({ fileMou, ...r }) => ({ ...r, ...(berkasDariAlamat(fileMou, prodiId) ?? {}), prodiId }));
  const [, dibuat] = await prisma.$transaction([
    prisma.lkpsKerjasama.deleteMany({ where: { prodiId } }),
    prisma.lkpsKerjasama.createMany({ data }),
  ]);
  return { success: true, count: dibuat.count };
}

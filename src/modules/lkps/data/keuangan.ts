import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaId, skemaLab, skemaSimpanDana } from "@/modules/lkps/domain/validasi";
import { pastikanTerhapus, simpanPerBaris } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/keuangan/route.ts.
// Gabung LKPS G4: ubah/hapus memakai `where: { id, prodiId }` (masalah 10).

/** Kriteria 4: `{ dana, lab }`. */
export async function bacaKeuangan(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const [dana, lab] = await Promise.all([
    prisma.lkpsPenggunaanDana.findMany({ where: { prodiId }, orderBy: { tahunSemester: "asc" } }),
    prisma.lkpsLaboratorium.findMany({ where: { prodiId }, orderBy: { namaLab: "asc" } }),
  ]);
  return { dana, lab };
}

/** Aksi `saveDana { rows }`: simpan per baris dalam satu transaksi. */
export async function simpanDana(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { rows } = skemaSimpanDana.parse(masukan);
  await prisma.$transaction(async (tx) => {
    for (const { id, ...data } of rows) {
      await simpanPerBaris(id, {
        ubah: (i) => tx.lkpsPenggunaanDana.updateMany({ where: { id: i, prodiId }, data }),
        ambil: (i) => tx.lkpsPenggunaanDana.findFirst({ where: { id: i, prodiId } }),
        buat: () => tx.lkpsPenggunaanDana.create({ data: { ...data, prodiId } }),
      });
    }
  });
  return { success: true };
}

export async function simpanLab(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaLab.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsLaboratorium.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsLaboratorium.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsLaboratorium.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusLab(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsLaboratorium.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

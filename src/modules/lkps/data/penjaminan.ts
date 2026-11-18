import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaSimpanDokumenSpmi } from "@/modules/lkps/domain/validasi";
import { berkasDariAlamat, denganAlamat, simpanPerBaris } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/penjaminan/route.ts.
// Gabung LKPS G4: berkas dokumen (asal: fileDokumen) lewat bukti LKPS; ubah dibatasi prodi.

/** Kriteria 9: array dokumen SPMI dengan `fileDokumen` (alamat unduh bukti). */
export async function bacaPenjaminan(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const baris = await prisma.lkpsDokumenSpmi.findMany({ where: { prodiId }, orderBy: { jenisDokumen: "asc" } });
  return baris.map((b) => denganAlamat(b, "fileDokumen"));
}

/** Aksi `saveDokumen { rows }`. */
export async function simpanDokumenSpmi(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { rows } = skemaSimpanDokumenSpmi.parse(masukan);
  await prisma.$transaction(async (tx) => {
    for (const { id, fileDokumen, ...isi } of rows) {
      const data = { ...isi, ...(berkasDariAlamat(fileDokumen, prodiId) ?? {}) };
      await simpanPerBaris(id, {
        ubah: (i) => tx.lkpsDokumenSpmi.updateMany({ where: { id: i, prodiId }, data }),
        ambil: (i) => tx.lkpsDokumenSpmi.findFirst({ where: { id: i, prodiId } }),
        buat: () => tx.lkpsDokumenSpmi.create({ data: { ...data, prodiId } }),
      });
    }
  });
  return { success: true };
}

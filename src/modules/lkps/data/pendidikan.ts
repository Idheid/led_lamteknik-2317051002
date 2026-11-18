import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaId, skemaMataKuliah, skemaMbkm } from "@/modules/lkps/domain/validasi";
import { berkasDariAlamat, denganAlamat, pastikanTerhapus, simpanPerBaris } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/pendidikan/route.ts.
// Gabung LKPS G4: MBKM kini menyimpan prodiId (kode asal tidak), ubah/hapus dibatasi prodi (masalah 10), tahun MBKM
// wajib (kode asal: tahun ini bila kosong, masalah 13). Berkas RPS (asal: fileRps) lewat bukti LKPS.

/** Kriteria 5: `{ mk, mbkm }`; mata kuliah membawa `fileRps` (alamat unduh bukti). */
export async function bacaPendidikan(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const [mk, mbkm] = await Promise.all([
    prisma.lkpsMataKuliah.findMany({ where: { prodiId }, orderBy: { kode: "asc" } }),
    prisma.lkpsProgramMbkm.findMany({ where: { prodiId }, orderBy: { namaMahasiswa: "asc" } }),
  ]);
  return { mk: mk.map((m) => denganAlamat(m, "fileRps")), mbkm };
}

export async function simpanMataKuliah(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, fileRps, ...isi } = skemaMataKuliah.parse(masukan);
  const data = { ...isi, ...(berkasDariAlamat(fileRps, prodiId) ?? {}) };
  const mk = await simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsMataKuliah.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsMataKuliah.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsMataKuliah.create({ data: { ...data, prodiId } }),
  });
  return denganAlamat(mk, "fileRps");
}

export async function hapusMataKuliah(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsMataKuliah.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

export async function simpanMbkm(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaMbkm.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsProgramMbkm.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsProgramMbkm.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsProgramMbkm.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusMbkm(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsProgramMbkm.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

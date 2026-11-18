import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaBimbingan, skemaDosen, skemaEwmp, skemaId, skemaLuaranDosen, skemaTendik } from "@/modules/lkps/domain/validasi";
import { galatUnik, pastikanTerhapus, simpanPerBaris } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/sdm/route.ts.
// Gabung LKPS G4: semua baris dibatasi prodi aktif, termasuk anak dosen (keputusan G0 no. 3); dosen yang dirujuk
// bimbingan/EWMP/luaran harus dosen prodi yang sama. Kode asal melarang operator menyimpan tendik; di sini isian
// kriteria (termasuk tendik) hanya ditulis Tim Prodi (RENCANA-GABUNG-LKPS G4), jadi Tim Prodi boleh.

/** Kriteria 3: `{ dosen, bimbingan, ewmp, luaranDosen, tendik }` seperti GET kode asal. */
export async function bacaSdm(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const [dosen, bimbingan, ewmp, luaranDosen, tendik] = await Promise.all([
    prisma.lkpsDosenTetap.findMany({
      where: { prodiId },
      include: { bimbinganTA: true, ewmp: true, luaranDosen: true },
      orderBy: { nama: "asc" },
    }),
    prisma.lkpsBimbinganTa.findMany({ where: { prodiId }, include: { dosen: true } }),
    prisma.lkpsEwmp.findMany({ where: { prodiId }, include: { dosen: true } }),
    prisma.lkpsLuaranDosen.findMany({ where: { prodiId }, include: { dosen: true }, orderBy: { tahun: "desc" } }),
    prisma.lkpsTenagaKependidikan.findMany({ where: { prodiId }, orderBy: { jenis: "asc" } }),
  ]);
  return { dosen, bimbingan, ewmp, luaranDosen, tendik };
}

async function pastikanDosenProdi(dosenId: string, prodiId: string): Promise<void> {
  const d = await prisma.lkpsDosenTetap.findFirst({ where: { id: dosenId, prodiId }, select: { id: true } });
  if (!d) throw new GalatAkses("Dosen ini tidak terdaftar di program studi ini.");
}

export async function simpanDosen(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaDosen.parse(masukan);
  try {
    return await simpanPerBaris(id, {
      ubah: (i) => prisma.lkpsDosenTetap.updateMany({ where: { id: i, prodiId }, data }),
      ambil: (i) => prisma.lkpsDosenTetap.findFirst({ where: { id: i, prodiId } }),
      buat: () => prisma.lkpsDosenTetap.create({ data: { ...data, prodiId } }),
    });
  } catch (e) {
    galatUnik(e, `NIDN/NIDK ${data.nidn} sudah tercatat di program studi ini.`);
  }
}

export async function hapusDosen(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsDosenTetap.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

export async function simpanBimbingan(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaBimbingan.parse(masukan);
  await pastikanDosenProdi(data.dosenId, prodiId);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsBimbinganTa.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsBimbinganTa.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsBimbinganTa.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusBimbingan(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsBimbinganTa.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

export async function simpanEwmp(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaEwmp.parse(masukan);
  await pastikanDosenProdi(data.dosenId, prodiId);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsEwmp.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsEwmp.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsEwmp.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusEwmp(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsEwmp.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

export async function simpanLuaranDosen(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaLuaranDosen.parse(masukan);
  if (data.dosenId) await pastikanDosenProdi(data.dosenId, prodiId);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsLuaranDosen.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsLuaranDosen.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsLuaranDosen.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusLuaranDosen(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsLuaranDosen.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

export async function simpanTendik(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaTendik.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsTenagaKependidikan.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsTenagaKependidikan.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsTenagaKependidikan.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusTendik(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsTenagaKependidikan.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

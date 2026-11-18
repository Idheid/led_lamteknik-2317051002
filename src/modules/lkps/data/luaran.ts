import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import {
  skemaEfektivitas,
  skemaId,
  skemaLuaranMahasiswa,
  skemaPrestasi,
  skemaSimpanIpk,
  skemaTracer,
} from "@/modules/lkps/domain/validasi";
import { pastikanTerhapus, simpanPerBaris } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/luaran/route.ts.
// Gabung LKPS G4: ubah/hapus dibatasi prodi (masalah 10); tahun wajib (kode asal: tahun ini bila kosong, masalah 13).

/** Kriteria 8: `{ ipk, prestasi, efektivitas, tracer, luaranMhs }`. */
export async function bacaLuaran(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const [ipk, prestasi, efektivitas, tracer, luaranMhs] = await Promise.all([
    prisma.lkpsIpkLulusan.findMany({ where: { prodiId }, orderBy: { tahunSemester: "asc" } }),
    prisma.lkpsPrestasiMahasiswa.findMany({ where: { prodiId }, orderBy: { tahun: "desc" } }),
    prisma.lkpsEfektivitasStudi.findMany({ where: { prodiId }, orderBy: { angkatan: "desc" } }),
    prisma.lkpsTracerStudy.findMany({ where: { prodiId }, orderBy: { tahun: "desc" } }),
    prisma.lkpsLuaranMahasiswa.findMany({ where: { prodiId }, orderBy: { tahun: "desc" } }),
  ]);
  return { ipk, prestasi, efektivitas, tracer, luaranMhs };
}

/** Aksi `saveIpk { rows }`. */
export async function simpanIpk(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { rows } = skemaSimpanIpk.parse(masukan);
  await prisma.$transaction(async (tx) => {
    for (const { id, ...data } of rows) {
      await simpanPerBaris(id, {
        ubah: (i) => tx.lkpsIpkLulusan.updateMany({ where: { id: i, prodiId }, data }),
        ambil: (i) => tx.lkpsIpkLulusan.findFirst({ where: { id: i, prodiId } }),
        buat: () => tx.lkpsIpkLulusan.create({ data: { ...data, prodiId } }),
      });
    }
  });
  return { success: true };
}

export async function simpanPrestasi(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaPrestasi.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsPrestasiMahasiswa.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsPrestasiMahasiswa.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsPrestasiMahasiswa.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusPrestasi(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsPrestasiMahasiswa.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

export async function simpanEfektivitas(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaEfektivitas.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsEfektivitasStudi.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsEfektivitasStudi.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsEfektivitasStudi.create({ data: { ...data, prodiId } }),
  });
}

export async function simpanTracer(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaTracer.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsTracerStudy.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsTracerStudy.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsTracerStudy.create({ data: { ...data, prodiId } }),
  });
}

export async function simpanLuaranMahasiswa(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id, ...data } = skemaLuaranMahasiswa.parse(masukan);
  return simpanPerBaris(id, {
    ubah: (i) => prisma.lkpsLuaranMahasiswa.updateMany({ where: { id: i, prodiId }, data }),
    ambil: (i) => prisma.lkpsLuaranMahasiswa.findFirst({ where: { id: i, prodiId } }),
    buat: () => prisma.lkpsLuaranMahasiswa.create({ data: { ...data, prodiId } }),
  });
}

export async function hapusLuaranMahasiswa(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { id } = skemaId.parse(masukan);
  pastikanTerhapus(await prisma.lkpsLuaranMahasiswa.deleteMany({ where: { id, prodiId } }));
  return { success: true };
}

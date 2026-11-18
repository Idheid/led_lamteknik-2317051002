import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanBukaLkps } from "@/modules/lkps/domain/akses";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/dashboard/page.tsx dan
// src/components/layout/sidebar.tsx. Gabung LKPS G5: rumus progres per kriteria sama dengan kode asal, tetapi selalu
// untuk satu prodi aktif (kode asal: semua prodi bila prodi aktif kosong) dan EWMP/bimbingan memakai prodiId baris.

export interface KriteriaTambahan {
  id: string;
  nomorUrut: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  jumlahTabel: number;
}

/**
 * Kriteria dari regulasi aktif di luar kriteria baku 1–9 (nomor urut di luar 1–9), untuk sidebar dan beranda LKPS. Seperti
 * kode asal: regulasi aktif, atau regulasi pertama bila tidak ada yang aktif.
 */
export async function kriteriaTambahanAktif(p: Pengguna): Promise<KriteriaTambahan[]> {
  pastikanBukaLkps(p);
  const reg =
    (await prisma.lkpsRegulasi.findFirst({ where: { statusAktif: true }, orderBy: { createdAt: "desc" }, select: { id: true } })) ??
    (await prisma.lkpsRegulasi.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } }));
  if (!reg) return [];
  const kriteria = await prisma.lkpsKriteriaConfig.findMany({
    where: { regulasiId: reg.id, OR: [{ nomorUrut: { gt: 9 } }, { nomorUrut: { lt: 1 } }] },
    orderBy: { nomorUrut: "asc" },
    include: { _count: { select: { tabelList: true } } },
  });
  return kriteria.map((k) => ({
    id: k.id, nomorUrut: k.nomorUrut, kode: k.kode, nama: k.nama, deskripsi: k.deskripsi, jumlahTabel: k._count.tabelList,
  }));
}

/** Progres pengisian kriteria 1–9 (0–100) satu prodi, dengan bobot bagian yang sama dengan kode asal. */
export async function progresLkps(p: Pengguna, prodiId: string): Promise<Record<number, number>> {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const where = { prodiId };
  const [
    kerjasama, pmb, asing, dtps, ewmp, bimbingan, luaranDosen, tendik, dana, lab, mk, mbkm, penelitian, pkm, ipk, prestasi,
    efektivitas, tracer, spmi,
  ] = await Promise.all([
    prisma.lkpsKerjasama.count({ where }),
    prisma.lkpsSeleksiMahasiswaBaru.count({ where }),
    prisma.lkpsMahasiswaAsing.count({ where }),
    prisma.lkpsDosenTetap.count({ where }),
    prisma.lkpsEwmp.count({ where }),
    prisma.lkpsBimbinganTa.count({ where }),
    prisma.lkpsLuaranDosen.count({ where }),
    prisma.lkpsTenagaKependidikan.count({ where }),
    prisma.lkpsPenggunaanDana.count({ where }),
    prisma.lkpsLaboratorium.count({ where }),
    prisma.lkpsMataKuliah.count({ where }),
    prisma.lkpsProgramMbkm.count({ where }),
    prisma.lkpsPenelitianDosen.count({ where: { ...where, jenis: "Penelitian" } }),
    prisma.lkpsPenelitianDosen.count({ where: { ...where, jenis: "PkM" } }),
    prisma.lkpsIpkLulusan.count({ where }),
    prisma.lkpsPrestasiMahasiswa.count({ where }),
    prisma.lkpsEfektivitasStudi.count({ where }),
    prisma.lkpsTracerStudy.count({ where }),
    prisma.lkpsDokumenSpmi.count({ where: { ...where, tersedia: true } }),
  ]);
  const ada = (n: number, bobot: number) => (n > 0 ? bobot : 0);
  return {
    1: ada(kerjasama, 100),
    2: pmb > 0 ? (asing > 0 ? 100 : 70) : 0,
    3: Math.min(100, ada(dtps, 40) + ada(luaranDosen, 30) + ada(ewmp, 10) + ada(bimbingan, 10) + ada(tendik, 10)),
    4: ada(dana, 50) + ada(lab, 50),
    5: mk > 0 ? (mbkm > 0 ? 100 : 80) : 0,
    6: ada(penelitian, 100),
    7: ada(pkm, 100),
    8: Math.min(100, ada(ipk, 25) + ada(prestasi, 25) + ada(efektivitas, 25) + ada(tracer, 25)),
    9: Math.min(100, Math.round((spmi / 5) * 100)),
  };
}

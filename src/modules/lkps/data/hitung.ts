import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";

import {
  hitungIndikatorKeuangan,
  hitungIndikatorLuaran,
  hitungIndikatorPenelitian,
  hitungIndikatorPkM,
  hitungIndikatorRK,
  hitungIndikatorRMD,
  hitungIndikatorSDM,
  hitungIndikatorSPMI,
  hitungTotalAkreditasi,
  type IndikatorScore,
} from "@/modules/lkps/domain/hitung";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/computation/route.ts.
// Gabung LKPS G4: isi sama dengan kode asal (termasuk nilai cadangan bila tabel kosong, mis. 250 mahasiswa aktif,
// 24 penelitian, 15 PkM; ditanyakan di ⏸ G4), tetapi selalu untuk satu prodi aktif (kode asal: semua prodi bila prodi
// aktif kosong, masalah 9) dan EWMP/bimbingan memakai prodiId baris (keputusan G0 no. 3).

/** GET `/api/lkps/computation` → `{ success: true, data: HasilKomputasiAkreditasi }`. */
export async function hitungSkorLkps(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const where = { prodiId };

  // 1. Kriteria 1 (Kerjasama)
  const kerjasamaList = await prisma.lkpsKerjasama.findMany({ where });
  const n1 = kerjasamaList.filter((k) => k.jenisKerjasama === "N1" || k.jenisKerjasama.toLowerCase().includes("pendidikan")).length;
  const n2 = kerjasamaList.filter((k) => k.jenisKerjasama === "N2" || k.jenisKerjasama.toLowerCase().includes("penelitian")).length;
  const n3 = kerjasamaList.filter(
    (k) => k.jenisKerjasama === "N3" || k.jenisKerjasama.toLowerCase().includes("pkm") || k.jenisKerjasama.toLowerCase().includes("pengabdian"),
  ).length;

  // 2. Kriteria 3 (SDM / DTPS)
  const dosenTetapList = await prisma.lkpsDosenTetap.findMany({ where });
  const ndtps = dosenTetapList.length || 1;
  const dosenS3 = dosenTetapList.filter((d) => d.pendidikanS3).length;

  const ewmpList = await prisma.lkpsEwmp.findMany({ where });
  const rataEwmp =
    ewmpList.length > 0
      ? ewmpList.reduce((acc, c) => acc + c.sksPendidikanPSSendiri + c.sksPendidikanPSLain + c.sksPenelitian + c.sksPkm + c.sksTugasTambahan, 0) /
        ewmpList.length
      : 14.0;

  const bimbinganList = await prisma.lkpsBimbinganTa.findMany({ where });
  const rataBimbingan =
    bimbinganList.length > 0
      ? bimbinganList.reduce((acc, c) => acc + (c.bimbinganPSSendiriTS + c.bimbinganPSSendiriTS1 + c.bimbinganPSSendiriTS2) / 3, 0) / bimbinganList.length
      : 4.5;

  // 3. Kriteria 2 (Mahasiswa)
  const mhsBaru = await prisma.lkpsSeleksiMahasiswaBaru.findMany({ where, orderBy: { createdAt: "desc" }, take: 1 });
  const totalMahasiswaAktif = mhsBaru[0] ? mhsBaru[0].mahasiswaAktifReguler + mhsBaru[0].mahasiswaAktifTransfer : 250;

  // 4. Kriteria 8 (Luaran)
  const ipkList = await prisma.lkpsIpkLulusan.findMany({ where, orderBy: { createdAt: "desc" }, take: 3 });
  const rataIpk = ipkList.length > 0 ? ipkList.reduce((acc, c) => acc + c.ipkRataRata, 0) / ipkList.length : 3.4;

  const efektivitas = await prisma.lkpsEfektivitasStudi.findMany({ where, orderBy: { angkatan: "desc" }, take: 1 });
  const masaStudiTahun = efektivitas[0]?.jumlahLulusTepat ? 3.5 : 3.8;

  const tracer = await prisma.lkpsTracerStudy.findMany({ where, orderBy: { tahun: "desc" }, take: 1 });
  const waktuTungguBulan = tracer[0]?.rataWaktuTunggu || 4.2;

  // 5. Kriteria 4 (Keuangan)
  const danaList = await prisma.lkpsPenggunaanDana.findMany({ where });
  const biayaOperasionalTahunan =
    danaList.length > 0 ? danaList.reduce((acc, c) => acc + c.biayaOperasionalPendidikan, 0) / danaList.length : 9200000000;

  // 6. Kriteria 6 (Penelitian) dan 7 (PkM)
  const penList = await prisma.lkpsPenelitianDosen.findMany({ where: { ...where, jenis: "Penelitian" } });
  const pkmList = await prisma.lkpsPenelitianDosen.findMany({ where: { ...where, jenis: "PkM" } });
  const jumlahPenelitian3Tahun = penList.length > 0 ? penList.length : 24;
  const jumlahPkm3Tahun = pkmList.length > 0 ? pkmList.length : 15;

  // 7. Kriteria 9 (SPMI)
  const spmiList = await prisma.lkpsDokumenSpmi.findMany({ where });
  const dokumenTersediaCount = spmiList.filter((s) => s.tersedia).length || 5;

  const indikatorScores: IndikatorScore[] = [
    hitungIndikatorRK(n1, n2, n3, ndtps),
    hitungIndikatorRMD(totalMahasiswaAktif, ndtps),
    ...hitungIndikatorSDM({ ndtps, dosenS3, ndtt: 0, ndt: ndtps, rataEwmp, rataBimbingan }),
    hitungIndikatorKeuangan(biayaOperasionalTahunan, totalMahasiswaAktif),
    hitungIndikatorPenelitian(jumlahPenelitian3Tahun, ndtps),
    hitungIndikatorPkM(jumlahPkm3Tahun, ndtps),
    ...hitungIndikatorLuaran({ rataIpk, masaStudiTahun, waktuTungguBulan }),
    hitungIndikatorSPMI(dokumenTersediaCount),
  ];

  return { success: true, data: hitungTotalAkreditasi(indikatorScores) };
}

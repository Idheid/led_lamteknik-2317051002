import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaMahasiswa } from "@/modules/lkps/domain/validasi";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/mahasiswa/route.ts.
// Gabung LKPS G4: id baris tetap `seleksi-<prodiId>-<tahun>` / `asing-<prodiId>-<tahun>` seperti kode asal, tetapi
// prodi selalu prodi aktif (kode asal: tanpa prodi untuk peran selain operator).

/** Kriteria 2: `{ seleksi, asing }`. */
export async function bacaMahasiswa(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const [seleksi, asing] = await Promise.all([
    prisma.lkpsSeleksiMahasiswaBaru.findMany({ where: { prodiId }, orderBy: { tahunSemester: "asc" } }),
    prisma.lkpsMahasiswaAsing.findMany({ where: { prodiId }, orderBy: { tahunSemester: "asc" } }),
  ]);
  return { seleksi, asing };
}

/** POST kode asal `{ seleksi, asing }`: upsert per tahun semester. */
export async function simpanMahasiswa(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { seleksi, asing } = skemaMahasiswa.parse(masukan);
  await prisma.$transaction([
    ...seleksi.map((row) => {
      const isi = {
        dayaTampung: row.dayaTampung,
        jumlahPendaftar: row.jumlahPendaftar,
        jumlahLulusSeleksi: row.jumlahLulusSeleksi,
        mahasiswaBaruReguler: row.mbReguler,
        mahasiswaBaruTransfer: row.mbTransfer,
        mahasiswaAktifReguler: row.maReguler,
        mahasiswaAktifTransfer: row.maTransfer,
      };
      const id = `seleksi-${prodiId}-${row.tahun}`;
      return prisma.lkpsSeleksiMahasiswaBaru.upsert({
        where: { id, prodiId },
        update: isi,
        create: { id, tahunSemester: row.tahun, ...isi, prodiId },
      });
    }),
    ...asing.map((row) => {
      const id = `asing-${prodiId}-${row.tahun}`;
      return prisma.lkpsMahasiswaAsing.upsert({
        where: { id, prodiId },
        update: { jumlahFullTime: row.fullTime, jumlahPartTime: row.partTime },
        create: { id, tahunSemester: row.tahun, jumlahFullTime: row.fullTime, jumlahPartTime: row.partTime, prodiId },
      });
    }),
  ]);
  return { success: true };
}

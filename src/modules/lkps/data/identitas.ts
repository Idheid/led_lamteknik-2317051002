import type { Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { jenisProgramDariJenjang, pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaIdentitas } from "@/modules/lkps/domain/validasi";
import { berkasDariAlamat, denganAlamat } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/identitas/route.ts.
// Gabung LKPS G4 (peta bagian 5): identitas PT/UPPS dibaca dari identitas institusi LED (Fakultas) dan identitas
// prodi LED; `prodiList` hanya prodi aktif dan dikelola Admin di /pengaturan/prodi. POST hanya menulis tim penyusun
// prodi aktif (kode asal menghapus SEMUA prodi dan SEMUA tim penyusun lalu membuat ulang, masalah 4).

function teksIdentitas(identitas: unknown, kunci: string): string | null {
  if (!identitas || typeof identitas !== "object") return null;
  const v = (identitas as Record<string, unknown>)[kunci];
  return typeof v === "string" && v ? v : null;
}

/** `{ identitas, prodiList, timList }` dengan nama isian kode asal. */
export async function bacaIdentitas(p: Pengguna, prodiId: string) {
  await pastikanBacaProdiLkps(p, "identitas", prodiId);
  const [fakultas, prodi, tim] = await Promise.all([
    prisma.fakultas.findFirst(),
    prisma.prodi.findUniqueOrThrow({ where: { id: prodiId }, select: { id: true, nama: true, jenjang: true, identitas: true } }),
    prisma.lkpsTimPenyusun.findMany({ where: { prodiId }, orderBy: { createdAt: "asc" } }),
  ]);
  const identitas = {
    namaPT: fakultas?.perguruanTinggi ?? "",
    namaUPPS: fakultas?.nama ?? "",
    jenisProgram: jenisProgramDariJenjang(prodi.jenjang),
    namaProdi: prodi.nama,
    alamat: fakultas?.alamat ?? "",
    noSkPendirianPT: fakultas?.skPendirian ?? null,
    tanggalSkPT: fakultas?.tanggalSkPendirian ?? null,
    noSkPembukaanPS: teksIdentitas(prodi.identitas, "skPembukaan"),
    tanggalSkPS: teksIdentitas(prodi.identitas, "tanggalSkPembukaan"),
  };
  const prodiList = [
    { id: prodi.id, namaProdi: prodi.nama, jenjang: prodi.jenjang, peringkatAkreditasi: teksIdentitas(prodi.identitas, "peringkatAkreditasi") },
  ];
  return { identitas, prodiList, timList: tim.map((t) => denganAlamat(t, "fotoTtd")) };
}

/** POST kode asal `{ identitas, prodiList, timList }`: hanya `timList` yang disimpan (ganti semua, prodi aktif). */
export async function simpanIdentitas(p: Pengguna, prodiId: string, masukan: unknown) {
  pastikanTulisLkps(p, "identitas", prodiId);
  const { timList } = skemaIdentitas.parse(masukan);
  const data = timList
    .filter((t) => t.nama)
    .map(({ fotoTtd, ...t }) => ({ ...t, ...(berkasDariAlamat(fotoTtd, prodiId) ?? {}), prodiId }));
  await prisma.$transaction([
    prisma.lkpsTimPenyusun.deleteMany({ where: { prodiId } }),
    prisma.lkpsTimPenyusun.createMany({ data }),
  ]);
  return { success: true };
}

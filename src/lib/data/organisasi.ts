import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GalatPengguna, pastikanSuperAdmin, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import {
  skemaAkunPenanggungJawab,
  skemaAturUlangSandi,
  skemaProdi,
  skemaUpps,
  type MasukanAkun,
  type MasukanProdi,
  type MasukanUpps,
} from "@/lib/validasi";

/** F-02: UPPS dan prodi. F-01: akun penanggung jawab (dibuat, dinonaktifkan, diatur ulang sandinya oleh super admin). */

export async function daftarUpps(p: Pengguna) {
  pastikanSuperAdmin(p);
  return prisma.upps.findMany({
    orderBy: { nama: "asc" },
    include: {
      prodi: {
        orderBy: { nama: "asc" },
        include: { penanggungJawab: { select: { id: true, name: true, email: true, banned: true } }, _count: { select: { proyek: true } } },
      },
    },
  });
}

export async function simpanUpps(p: Pengguna, masukan: MasukanUpps, id?: string) {
  pastikanSuperAdmin(p);
  const data = skemaUpps.parse(masukan);
  const bentrok = await prisma.upps.findFirst({ where: { kode: data.kode, NOT: id ? { id } : undefined } });
  if (bentrok) throw new GalatPengguna(`Kode UPPS ${data.kode} sudah dipakai.`);
  const upps = id
    ? await prisma.upps.update({ where: { id }, data })
    : await prisma.upps.create({ data });
  await catatAktivitas(p, id ? "ubah" : "buat", "upps", upps.id, { kode: upps.kode });
  return upps;
}

export async function hapusUpps(p: Pengguna, id: string) {
  pastikanSuperAdmin(p);
  const jumlahProdi = await prisma.prodi.count({ where: { uppsId: id } });
  if (jumlahProdi > 0) throw new GalatPengguna("UPPS masih punya program studi. Hapus atau pindahkan prodinya dulu.");
  await prisma.upps.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "upps", id);
}

export async function simpanProdi(p: Pengguna, masukan: MasukanProdi, id?: string) {
  pastikanSuperAdmin(p);
  const data = skemaProdi.parse(masukan);
  if (data.kodePddikti) {
    const bentrok = await prisma.prodi.findFirst({ where: { kodePddikti: data.kodePddikti, NOT: id ? { id } : undefined } });
    if (bentrok) throw new GalatPengguna(`Kode PDDikti ${data.kodePddikti} sudah dipakai ${bentrok.nama}.`);
  }
  if (id) {
    const lama = await prisma.prodi.findUniqueOrThrow({ where: { id }, include: { _count: { select: { proyek: true } } } });
    if (lama.jenjang !== data.jenjang && lama._count.proyek > 0) {
      throw new GalatPengguna("Jenjang tidak bisa diubah karena prodi sudah punya proyek LED.");
    }
  }
  const isi = { ...data, identitas: data.identitas };
  const prodi = id ? await prisma.prodi.update({ where: { id }, data: isi }) : await prisma.prodi.create({ data: isi });
  await catatAktivitas(p, id ? "ubah" : "buat", "prodi", prodi.id, { nama: prodi.nama, jenjang: prodi.jenjang });
  return prodi;
}

export async function hapusProdi(p: Pengguna, id: string) {
  pastikanSuperAdmin(p);
  const prodi = await prisma.prodi.findUniqueOrThrow({
    where: { id },
    include: { penanggungJawab: true, _count: { select: { proyek: true } } },
  });
  if (prodi._count.proyek > 0) throw new GalatPengguna("Prodi sudah punya proyek LED dan tidak bisa dihapus.");
  if (prodi.penanggungJawab) throw new GalatPengguna("Hapus atau lepaskan akun penanggung jawab prodi ini dulu.");
  await prisma.prodi.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "prodi", id, { nama: prodi.nama });
}

export async function ambilProdi(p: Pengguna, id: string) {
  pastikanSuperAdmin(p);
  return prisma.prodi.findUnique({ where: { id }, include: { upps: true, penanggungJawab: true } });
}

// ---------------------------------------------------------------- Akun

export async function daftarAkun(p: Pengguna) {
  pastikanSuperAdmin(p);
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, email: true, role: true, banned: true, createdAt: true,
      prodi: { select: { id: true, nama: true, jenjang: true, upps: { select: { kode: true } } } },
    },
  });
}

/** Buat akun penanggung jawab untuk satu prodi (satu akun per prodi). */
export async function buatAkunPenanggungJawab(p: Pengguna, masukan: MasukanAkun) {
  pastikanSuperAdmin(p);
  const data = skemaAkunPenanggungJawab.parse(masukan);
  const prodi = await prisma.prodi.findUnique({ where: { id: data.prodiId }, include: { penanggungJawab: true } });
  if (!prodi) throw new GalatPengguna("Program studi tidak ditemukan.");
  if (prodi.penanggungJawab) throw new GalatPengguna(`${prodi.nama} sudah punya akun penanggung jawab (${prodi.penanggungJawab.email}).`);
  const emailDipakai = await prisma.user.findUnique({ where: { email: data.email } });
  if (emailDipakai) throw new GalatPengguna(`Email ${data.email} sudah dipakai akun lain.`);

  const hasil = await auth.api.createUser({
    body: { email: data.email, password: data.kataSandi, name: data.nama, role: "PENANGGUNG_JAWAB", data: { prodiId: prodi.id } },
  });
  await catatAktivitas(p, "buat", "akun", hasil.user.id, { email: data.email, prodi: prodi.nama });
  return hasil.user;
}

/** Nonaktifkan atau aktifkan kembali akun. Menonaktifkan juga mencabut semua sesinya. */
export async function aturAktifAkun(p: Pengguna, userId: string, aktif: boolean) {
  pastikanSuperAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menonaktifkan akun sendiri.");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: aktif ? { banned: false, banReason: null, banExpires: null } : { banned: true, banReason: "Dinonaktifkan super admin" },
    }),
    ...(aktif ? [] : [prisma.session.deleteMany({ where: { userId } })]),
  ]);
  await catatAktivitas(p, aktif ? "aktifkan" : "nonaktifkan", "akun", userId);
}

/** Atur ulang kata sandi akun (sesi lama dicabut supaya harus login ulang). */
export async function aturUlangKataSandi(p: Pengguna, masukan: { userId: string; kataSandi: string }) {
  pastikanSuperAdmin(p);
  const data = skemaAturUlangSandi.parse(masukan);
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(data.kataSandi);
  const akun = await prisma.account.findFirst({ where: { userId: data.userId, providerId: "credential" } });
  if (!akun) throw new GalatPengguna("Akun ini tidak memakai login email dan kata sandi.");
  await prisma.$transaction([
    prisma.account.update({ where: { id: akun.id }, data: { password: hash } }),
    prisma.session.deleteMany({ where: { userId: data.userId } }),
  ]);
  await catatAktivitas(p, "atur_ulang_sandi", "akun", data.userId);
}

export async function hapusAkun(p: Pengguna, userId: string) {
  pastikanSuperAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menghapus akun sendiri.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.role === "SUPER_ADMIN") throw new GalatPengguna("Akun super admin tidak dihapus dari sini.");
  await prisma.user.delete({ where: { id: userId } });
  await catatAktivitas(p, "hapus", "akun", userId, { email: u.email });
}

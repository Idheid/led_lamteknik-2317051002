import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GalatPengguna, pastikanSuperAdmin, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import {
  skemaAkunPenanggungJawab,
  skemaAkunSuperAdmin,
  skemaGantiSandi,
  skemaAturUlangSandi,
  skemaProdi,
  skemaUpps,
  type MasukanAkun,
  type MasukanAkunSuperAdmin,
  type MasukanGantiSandi,
  type MasukanProdi,
  type MasukanUpps,
} from "@/lib/validasi";

/**
 * F-02: UPPS dan prodi. F-01: akun (dibuat, dinonaktifkan, diatur ulang sandinya, dihapus) hanya oleh super admin.
 * Aturan akun: satu akun penanggung jawab AKTIF per prodi; super admin tidak bisa menonaktifkan atau menghapus akunnya
 * sendiri; minimal satu super admin aktif. Proyek, kunci API, dan versi draf terikat ke prodi sehingga tetap ada saat
 * akun penanggung jawab diganti.
 */

/** Akun aktif = tidak di-ban (banned false/null). */
export const AKTIF = { OR: [{ banned: false }, { banned: null }] };

export async function daftarUpps(p: Pengguna) {
  pastikanSuperAdmin(p);
  return prisma.upps.findMany({
    orderBy: { nama: "asc" },
    include: {
      prodi: {
        orderBy: { nama: "asc" },
        include: {
          akun: { select: { id: true, name: true, email: true, banned: true }, orderBy: { createdAt: "desc" } },
          _count: { select: { proyek: true } },
        },
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
    include: { _count: { select: { proyek: true, akun: true } } },
  });
  if (prodi._count.proyek > 0) throw new GalatPengguna("Prodi sudah punya proyek LED dan tidak bisa dihapus.");
  if (prodi._count.akun > 0) throw new GalatPengguna("Hapus dulu akun penanggung jawab prodi ini.");
  await prisma.prodi.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "prodi", id, { nama: prodi.nama });
}

export async function ambilProdi(p: Pengguna, id: string) {
  pastikanSuperAdmin(p);
  return prisma.prodi.findUnique({ where: { id }, include: { upps: true, akun: { where: AKTIF } } });
}

// ---------------------------------------------------------------- Akun

export async function daftarAkun(p: Pengguna) {
  pastikanSuperAdmin(p);
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, email: true, role: true, banned: true, createdAt: true, wajibGantiSandi: true,
      prodi: { select: { id: true, nama: true, jenjang: true, upps: { select: { kode: true } } } },
    },
  });
}

async function pastikanEmailBaru(email: string) {
  const dipakai = await prisma.user.findUnique({ where: { email } });
  if (dipakai) throw new GalatPengguna(`Email ${email} sudah dipakai akun lain.`);
}

async function jumlahSuperAdminAktif(kecuali?: string) {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", ...AKTIF, ...(kecuali ? { NOT: { id: kecuali } } : {}) } });
}

/** Buat akun penanggung jawab untuk satu prodi (hanya bila prodi belum punya akun aktif). Wajib ganti sandi saat login. */
export async function buatAkunPenanggungJawab(p: Pengguna, masukan: MasukanAkun) {
  pastikanSuperAdmin(p);
  const data = skemaAkunPenanggungJawab.parse(masukan);
  const prodi = await prisma.prodi.findUnique({ where: { id: data.prodiId }, include: { akun: { where: AKTIF } } });
  if (!prodi) throw new GalatPengguna("Program studi tidak ditemukan.");
  if (prodi.akun.length > 0) {
    throw new GalatPengguna(`${prodi.nama} sudah punya akun penanggung jawab aktif (${prodi.akun[0].email}). Nonaktifkan dulu akun itu untuk mengganti penanggung jawab.`);
  }
  await pastikanEmailBaru(data.email);
  const hasil = await auth.api.createUser({
    body: { email: data.email, password: data.kataSandi, name: data.nama, role: "PENANGGUNG_JAWAB", data: { prodiId: prodi.id } },
  });
  await prisma.user.update({ where: { id: hasil.user.id }, data: { wajibGantiSandi: true, prodiId: prodi.id } });
  await catatAktivitas(p, "buat", "akun", hasil.user.id, { email: data.email, prodi: prodi.nama });
  return hasil.user;
}

/** Super admin membuat super admin lain (misalnya untuk serah terima ke fakultas). */
export async function buatAkunSuperAdmin(p: Pengguna, masukan: MasukanAkunSuperAdmin) {
  pastikanSuperAdmin(p);
  const data = skemaAkunSuperAdmin.parse(masukan);
  await pastikanEmailBaru(data.email);
  const hasil = await auth.api.createUser({ body: { email: data.email, password: data.kataSandi, name: data.nama, role: "SUPER_ADMIN" } });
  await prisma.user.update({ where: { id: hasil.user.id }, data: { wajibGantiSandi: true } });
  await catatAktivitas(p, "buat", "akun_super_admin", hasil.user.id, { email: data.email });
  return hasil.user;
}

/** Nonaktifkan atau aktifkan kembali akun. Menonaktifkan juga mencabut semua sesinya. */
export async function aturAktifAkun(p: Pengguna, userId: string, aktif: boolean) {
  pastikanSuperAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menonaktifkan akun sendiri.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!aktif && u.role === "SUPER_ADMIN" && (await jumlahSuperAdminAktif(userId)) === 0) {
    throw new GalatPengguna("Minimal harus ada satu super admin aktif.");
  }
  if (aktif && u.role === "PENANGGUNG_JAWAB" && u.prodiId) {
    const lain = await prisma.user.findFirst({ where: { prodiId: u.prodiId, ...AKTIF, NOT: { id: userId } } });
    if (lain) throw new GalatPengguna(`Prodi ini sudah punya akun aktif (${lain.email}). Nonaktifkan dulu akun itu.`);
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: aktif ? { banned: false, banReason: null, banExpires: null } : { banned: true, banReason: "Dinonaktifkan super admin" },
    }),
    ...(aktif ? [] : [prisma.session.deleteMany({ where: { userId } })]),
  ]);
  await catatAktivitas(p, aktif ? "aktifkan" : "nonaktifkan", "akun", userId);
}

/** Atur ulang kata sandi akun lain; sesi lama dicabut dan pemilik akun wajib mengganti sandi saat login. */
export async function aturUlangKataSandi(p: Pengguna, masukan: { userId: string; kataSandi: string }) {
  pastikanSuperAdmin(p);
  const data = skemaAturUlangSandi.parse(masukan);
  if (data.userId === p.id) throw new GalatPengguna("Ganti kata sandi Anda sendiri lewat menu akun (perlu kata sandi lama).");
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(data.kataSandi);
  const akun = await prisma.account.findFirst({ where: { userId: data.userId, providerId: "credential" } });
  if (!akun) throw new GalatPengguna("Akun ini tidak memakai login email dan kata sandi.");
  await prisma.$transaction([
    prisma.account.update({ where: { id: akun.id }, data: { password: hash } }),
    prisma.user.update({ where: { id: data.userId }, data: { wajibGantiSandi: true } }),
    prisma.session.deleteMany({ where: { userId: data.userId } }),
  ]);
  await catatAktivitas(p, "atur_ulang_sandi", "akun", data.userId);
}

/**
 * Hapus akun. Data prodi (proyek, kunci API, versi draf, log) tetap ada; kolom pembuatnya dikosongkan.
 * Akun sendiri tidak bisa dihapus dan super admin aktif terakhir tidak bisa dihapus.
 */
export async function hapusAkun(p: Pengguna, userId: string) {
  pastikanSuperAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menghapus akun sendiri.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.role === "SUPER_ADMIN" && (await jumlahSuperAdminAktif(userId)) === 0) {
    throw new GalatPengguna("Minimal harus ada satu super admin aktif.");
  }
  await prisma.user.delete({ where: { id: userId } });
  await catatAktivitas(p, "hapus", "akun", userId, { email: u.email, peran: u.role });
}

/**
 * Pengguna mengganti kata sandinya sendiri (wajib kata sandi lama, lewat Better Auth). Sesi lain dicabut.
 * `headers` = header permintaan pengguna (sesi aktif).
 */
export async function gantiKataSandiSendiri(p: Pengguna, masukan: MasukanGantiSandi, headers: Headers) {
  const data = skemaGantiSandi.parse(masukan);
  try {
    await auth.api.changePassword({ body: { currentPassword: data.sandiLama, newPassword: data.sandiBaru, revokeOtherSessions: true }, headers });
  } catch (e) {
    const pesan = e instanceof Error ? e.message : "";
    if (/invalid password|password/i.test(pesan)) throw new GalatPengguna("Kata sandi lama salah.");
    throw e;
  }
  await prisma.user.update({ where: { id: p.id }, data: { wajibGantiSandi: false } });
  await catatAktivitas(p, "ganti_sandi", "akun", p.id);
}

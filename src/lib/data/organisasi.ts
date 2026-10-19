import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GalatPengguna, pastikanPenanggungJawab, pastikanSuperAdmin, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import {
  skemaAkunPenanggungJawab,
  skemaAkunSuperAdmin,
  skemaFakultas,
  skemaGantiSandi,
  skemaAturUlangSandi,
  skemaProdi,
  type MasukanAkun,
  type MasukanAkunSuperAdmin,
  type MasukanFakultas,
  type MasukanGantiSandi,
  type MasukanProdi,
} from "@/lib/validasi";

/**
 * Revisi 19 Okt 2026: satu instalasi website dipakai satu fakultas.
 * - Identitas fakultas (pengganti UPPS) dan daftar program studi dikelola penanggung jawab (PJ) fakultas.
 * - Akun hanya dikelola admin: membuat akun PJ (tidak terikat prodi) dan admin lain, menonaktifkan, mengatur ulang
 *   sandi, menghapus. Admin tidak bisa menonaktifkan/menghapus dirinya sendiri; minimal satu admin aktif.
 *   LED, kunci API, dan riwayat versi milik fakultas, jadi tetap ada saat akun PJ diganti.
 */

/** Akun aktif = tidak di-ban (banned false/null). */
export const AKTIF = { OR: [{ banned: false }, { banned: null }] };

// ---------------------------------------------------------------- Fakultas dan program studi (PJ)

/** Identitas fakultas (satu baris); null bila belum diisi. Boleh dibaca semua peran. */
export async function ambilFakultas() {
  return prisma.fakultas.findUnique({ where: { id: "utama" } });
}

export async function simpanFakultas(p: Pengguna, masukan: MasukanFakultas) {
  pastikanPenanggungJawab(p);
  const data = skemaFakultas.parse(masukan);
  const f = await prisma.fakultas.upsert({ where: { id: "utama" }, create: { id: "utama", ...data }, update: data });
  await catatAktivitas(p, "ubah", "fakultas", f.id, { nama: f.nama });
  return f;
}

/**
 * Daftar prodi, diurutkan menurut tanggal akreditasi berakhir (paling dekat di atas, yang belum diisi di bawah),
 * beserta LED aktif dan jumlah LED-nya.
 */
export async function daftarProdi(p: Pengguna) {
  pastikanPenanggungJawab(p);
  const prodi = await prisma.prodi.findMany({
    orderBy: [{ akreditasiBerlakuSampai: { sort: "asc", nulls: "last" } }, { nama: "asc" }],
    include: {
      proyek: { orderBy: { tahunPengajuan: "desc" }, select: { id: true, nama: true, tahunPengajuan: true, diarsipkanPada: true } },
    },
  });
  return prodi;
}

function keTanggal(v: string | null): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null;
}

export async function simpanProdi(p: Pengguna, masukan: MasukanProdi, id?: string) {
  pastikanPenanggungJawab(p);
  const data = skemaProdi.parse(masukan);
  if (data.kodePddikti) {
    const bentrok = await prisma.prodi.findFirst({ where: { kodePddikti: data.kodePddikti, NOT: id ? { id } : undefined } });
    if (bentrok) throw new GalatPengguna(`Kode PDDikti ${data.kodePddikti} sudah dipakai ${bentrok.nama}.`);
  }
  if (id) {
    const lama = await prisma.prodi.findUniqueOrThrow({ where: { id }, include: { _count: { select: { proyek: true } } } });
    if (lama.jenjang !== data.jenjang && lama._count.proyek > 0) {
      throw new GalatPengguna("Jenjang tidak bisa diubah karena prodi sudah punya LED.");
    }
  }
  const isi = {
    nama: data.nama,
    jenjang: data.jenjang,
    kodePddikti: data.kodePddikti,
    identitas: data.identitas,
    akreditasiBerlakuSampai: keTanggal(data.akreditasiBerlakuSampai),
  };
  const prodi = id ? await prisma.prodi.update({ where: { id }, data: isi }) : await prisma.prodi.create({ data: isi });
  await catatAktivitas(p, id ? "ubah" : "buat", "prodi", prodi.id, { nama: prodi.nama, jenjang: prodi.jenjang });
  return prodi;
}

export async function hapusProdi(p: Pengguna, id: string) {
  pastikanPenanggungJawab(p);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id }, include: { _count: { select: { proyek: true } } } });
  if (prodi._count.proyek > 0) throw new GalatPengguna("Prodi sudah punya LED dan tidak bisa dihapus.");
  await prisma.prodi.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "prodi", id, { nama: prodi.nama });
}

export async function ambilProdi(p: Pengguna, id: string) {
  pastikanPenanggungJawab(p);
  return prisma.prodi.findUnique({ where: { id } });
}

// ---------------------------------------------------------------- Akun

export async function daftarAkun(p: Pengguna) {
  pastikanSuperAdmin(p);
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, email: true, role: true, banned: true, createdAt: true, wajibGantiSandi: true,
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

/**
 * Buat akun PJ fakultas (wajib ganti sandi saat login). Biasanya cukup satu; saat petugas berganti, admin membuat
 * akun pengganti lalu menonaktifkan akun lama.
 */
export async function buatAkunPenanggungJawab(p: Pengguna, masukan: MasukanAkun) {
  pastikanSuperAdmin(p);
  const data = skemaAkunPenanggungJawab.parse(masukan);
  await pastikanEmailBaru(data.email);
  const hasil = await auth.api.createUser({ body: { email: data.email, password: data.kataSandi, name: data.nama, role: "PENANGGUNG_JAWAB" } });
  await prisma.user.update({ where: { id: hasil.user.id }, data: { wajibGantiSandi: true } });
  await catatAktivitas(p, "buat", "akun", hasil.user.id, { email: data.email });
  return hasil.user;
}

/** Admin membuat admin lain (misalnya untuk serah terima). */
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
    throw new GalatPengguna("Minimal harus ada satu admin aktif.");
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: aktif ? { banned: false, banReason: null, banExpires: null } : { banned: true, banReason: "Dinonaktifkan admin" },
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
 * Hapus akun. Data fakultas (LED, kunci API, versi draf, log) tetap ada; kolom pembuatnya dikosongkan.
 * Akun sendiri tidak bisa dihapus dan admin aktif terakhir tidak bisa dihapus.
 */
export async function hapusAkun(p: Pengguna, userId: string) {
  pastikanSuperAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menghapus akun sendiri.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.role === "SUPER_ADMIN" && (await jumlahSuperAdminAktif(userId)) === 0) {
    throw new GalatPengguna("Minimal harus ada satu admin aktif.");
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

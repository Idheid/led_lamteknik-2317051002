import { auth } from "@/modules/bersama/auth";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, pastikanAdmin, pastikanProdiSendiri, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import type { Peran } from "@/modules/bersama/peran";
import {
  skemaAkun,
  skemaAkunTimProdi,
  skemaFakultas,
  skemaGantiSandi,
  skemaAturUlangSandi,
  skemaIdentitasProdi,
  skemaProdi,
  type MasukanAkun,
  type MasukanAkunTimProdi,
  type MasukanFakultas,
  type MasukanGantiSandi,
  type MasukanProdi,
} from "@/modules/bersama/validasi";

/**
 * Organisasi dan akun. Revisi 31 Okt 2026 (Pak Tris): Admin UPPS mengelola identitas fakultas, daftar program studi,
 * dan semua akun (Admin UPPS, Tim Prodi beserta prodinya, Asesor). Tim Prodi boleh mengubah identitas prodinya
 * sendiri (SK, alamat, kontak) tetapi tidak nama dan jenjang (keputusan B4). Admin tidak bisa menonaktifkan/menghapus
 * dirinya sendiri; minimal satu admin aktif. LED, kunci API, dan riwayat versi milik fakultas/prodi, bukan akun.
 */

/** Akun aktif = tidak di-ban (banned false/null). */
export const AKTIF = { OR: [{ banned: false }, { banned: null }] };

// ---------------------------------------------------------------- Fakultas dan program studi (Admin UPPS)

/** Identitas fakultas (satu baris); null bila belum diisi. Boleh dibaca semua peran. */
export async function ambilFakultas() {
  return prisma.fakultas.findUnique({ where: { id: "utama" } });
}

export async function simpanFakultas(p: Pengguna, masukan: MasukanFakultas) {
  pastikanAdmin(p);
  const data = skemaFakultas.parse(masukan);
  const f = await prisma.fakultas.upsert({ where: { id: "utama" }, create: { id: "utama", ...data }, update: data });
  await catatAktivitas(p, "ubah", "fakultas", f.id, { nama: f.nama });
  return f;
}

/**
 * Daftar prodi, diurutkan menurut tanggal akreditasi berakhir (paling dekat di atas, yang belum diisi di bawah),
 * beserta LED dan jumlah akun Tim Prodi. Admin UPPS: semua prodi; Tim Prodi: hanya prodinya.
 */
export async function daftarProdi(p: Pengguna) {
  if (p.peran !== "ADMIN" && p.peran !== "TIM_PRODI") throw new GalatAkses();
  return prisma.prodi.findMany({
    where: p.peran === "TIM_PRODI" ? { id: p.prodiId ?? "-" } : {},
    orderBy: [{ akreditasiBerlakuSampai: { sort: "asc", nulls: "last" } }, { nama: "asc" }],
    include: {
      proyek: { orderBy: { tahunPengajuan: "desc" }, select: { id: true, nama: true, tahunPengajuan: true, diarsipkanPada: true } },
      _count: { select: { anggota: true } },
    },
  });
}

function keTanggal(v: string | null): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null;
}

export async function simpanProdi(p: Pengguna, masukan: MasukanProdi, id?: string) {
  pastikanAdmin(p);
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

/** Tim Prodi mengubah identitas prodinya sendiri (SK, alamat, kontak); nama, jenjang, dan kode tetap milik admin (B4). */
export async function simpanIdentitasProdi(p: Pengguna, prodiId: string, identitas: unknown) {
  pastikanProdiSendiri(p, prodiId);
  const data = skemaIdentitasProdi.parse(identitas);
  const prodi = await prisma.prodi.update({ where: { id: prodiId }, data: { identitas: data } });
  await catatAktivitas(p, "ubah_identitas", "prodi", prodi.id, { nama: prodi.nama });
  return prodi;
}

/** Hapus prodi; ditolak bila masih punya LED atau akun Tim Prodi (akun dipindah/dihapus dulu). */
export async function hapusProdi(p: Pengguna, id: string) {
  pastikanAdmin(p);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id }, include: { _count: { select: { proyek: true, anggota: true } } } });
  if (prodi._count.proyek > 0) throw new GalatPengguna(`${prodi.nama} sudah punya LED dan tidak bisa dihapus.`);
  if (prodi._count.anggota > 0) {
    throw new GalatPengguna(`${prodi.nama} masih punya ${prodi._count.anggota} akun Tim Prodi. Pindahkan atau hapus akunnya dulu di Kelola akun.`);
  }
  await prisma.prodi.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "prodi", id, { nama: prodi.nama });
}

/** Satu prodi: Admin UPPS semua prodi, Tim Prodi hanya prodinya. */
export async function ambilProdi(p: Pengguna, id: string) {
  if (p.peran === "TIM_PRODI") pastikanProdiSendiri(p, id);
  else pastikanAdmin(p);
  return prisma.prodi.findUnique({ where: { id } });
}

// ---------------------------------------------------------------- Akun (Admin UPPS)

export async function daftarAkun(p: Pengguna) {
  pastikanAdmin(p);
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, email: true, role: true, banned: true, createdAt: true, wajibGantiSandi: true,
      prodi: { select: { id: true, nama: true, jenjang: true } },
    },
  });
}

async function pastikanEmailBaru(email: string) {
  const dipakai = await prisma.user.findUnique({ where: { email } });
  if (dipakai) throw new GalatPengguna(`Email ${email} sudah dipakai akun lain.`);
}

async function jumlahAdminAktif(kecuali?: string) {
  return prisma.user.count({ where: { role: "ADMIN", ...AKTIF, ...(kecuali ? { NOT: { id: kecuali } } : {}) } });
}

async function pastikanProdiAda(prodiId: string) {
  const prodi = await prisma.prodi.findUnique({ where: { id: prodiId } });
  if (!prodi) throw new GalatPengguna("Program studi tidak ditemukan.");
  return prodi;
}

/** Buat akun baru (wajib ganti sandi saat login pertama). */
async function buatAkun(p: Pengguna, peran: Peran, data: { nama: string; email: string; kataSandi: string }, prodiId: string | null) {
  await pastikanEmailBaru(data.email);
  const hasil = await auth.api.createUser({ body: { email: data.email, password: data.kataSandi, name: data.nama, role: peran } });
  await prisma.user.update({ where: { id: hasil.user.id }, data: { wajibGantiSandi: true, prodiId } });
  await catatAktivitas(p, "buat", "akun", hasil.user.id, { email: data.email, peran, prodiId });
  return hasil.user;
}

/** Akun Tim Prodi untuk satu prodi; satu prodi boleh punya beberapa akun (setiap anggota tim login sendiri). */
export async function buatAkunTimProdi(p: Pengguna, masukan: MasukanAkunTimProdi) {
  pastikanAdmin(p);
  const data = skemaAkunTimProdi.parse(masukan);
  await pastikanProdiAda(data.prodiId);
  return buatAkun(p, "TIM_PRODI", data, data.prodiId);
}

/** Akun asesor (revisi 22 Okt 2026): reviewer internal; ditugaskan admin ke LED di menu Penugasan asesor. */
export async function buatAkunAsesor(p: Pengguna, masukan: MasukanAkun) {
  pastikanAdmin(p);
  return buatAkun(p, "ASESOR", skemaAkun.parse(masukan), null);
}

/** Admin UPPS membuat admin lain (misalnya untuk serah terima). */
export async function buatAkunAdmin(p: Pengguna, masukan: MasukanAkun) {
  pastikanAdmin(p);
  return buatAkun(p, "ADMIN", skemaAkun.parse(masukan), null);
}

/** Pindahkan akun Tim Prodi ke prodi lain (sesinya dicabut supaya prodi baru langsung berlaku). */
export async function pindahProdiAkun(p: Pengguna, userId: string, prodiId: string) {
  pastikanAdmin(p);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.role !== "TIM_PRODI") throw new GalatPengguna("Hanya akun Tim Prodi yang terikat ke program studi.");
  const prodi = await pastikanProdiAda(prodiId);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { prodiId } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  await catatAktivitas(p, "pindah_prodi", "akun", userId, { dari: u.prodiId, ke: prodiId, prodi: prodi.nama });
}

/** Nonaktifkan atau aktifkan kembali akun. Menonaktifkan juga mencabut semua sesinya. */
export async function aturAktifAkun(p: Pengguna, userId: string, aktif: boolean) {
  pastikanAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menonaktifkan akun sendiri.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!aktif && u.role === "ADMIN" && (await jumlahAdminAktif(userId)) === 0) {
    throw new GalatPengguna("Minimal harus ada satu Admin UPPS aktif.");
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
  pastikanAdmin(p);
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
 * Hapus akun. Data fakultas/prodi (LED, kunci API, versi draf, log) tetap ada; kolom pembuatnya dikosongkan.
 * Akun sendiri tidak bisa dihapus dan admin aktif terakhir tidak bisa dihapus.
 */
export async function hapusAkun(p: Pengguna, userId: string) {
  pastikanAdmin(p);
  if (userId === p.id) throw new GalatPengguna("Anda tidak bisa menghapus akun sendiri.");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.role === "ADMIN" && (await jumlahAdminAktif(userId)) === 0) {
    throw new GalatPengguna("Minimal harus ada satu Admin UPPS aktif.");
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

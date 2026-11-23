import { randomUUID } from "node:crypto";
import { prisma } from "@/modules/bersama/db";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { beritahu } from "@/modules/bersama/data/pemberitahuan";
import type { Pengguna } from "@/modules/bersama/akses";
import type { Peran } from "@/modules/bersama/peran";
import { putuskan, type AkunCocok } from "./aturan";
import { PENYEDIA_SSO, type HasilSso } from "./penyedia";
import type { KodeGalatSso } from "./pesan";

/**
 * Langkah basis data login SSO (Rencana 18 Nov S5). Data pribadi SSO (UNILA ID, email) hanya disimpan di tabel User
 * dan Account; log aktivitas tidak memuat email atau UNILA ID.
 */

/**
 * Pencocokan lewat email untuk akun yang belum punya UNILA ID (rencana S5 butir 5). MENUNGGU KONFIRMASI Adrianne di
 * ⏸ S5; bila tidak disetujui, ubah ke false (uji `sso.test.ts` ikut menyesuaikan).
 */
export const COCOKKAN_LEWAT_EMAIL = true;

const AKTIF = { OR: [{ banned: false }, { banned: null }] };

interface AkunDitemukan extends AkunCocok {
  role: string | null;
  usernameSso: string | null;
}

/** Cari akun: UNILA ID dulu; bila tidak ada, email (huruf kecil) pada akun yang belum punya UNILA ID. */
export async function cariAkunSso(hasil: HasilSso): Promise<{ akun: AkunDitemukan | null; lewatEmail: boolean }> {
  const pilih = { id: true, banned: true, role: true, usernameSso: true } as const;
  const lewatUsername = await prisma.user.findUnique({ where: { usernameSso: hasil.username }, select: pilih });
  if (lewatUsername) return { akun: lewatUsername, lewatEmail: false };
  if (COCOKKAN_LEWAT_EMAIL && hasil.email) {
    const lewatEmail = await prisma.user.findFirst({ where: { email: hasil.email.toLowerCase(), usernameSso: null }, select: pilih });
    if (lewatEmail) return { akun: lewatEmail, lewatEmail: true };
  }
  return { akun: null, lewatEmail: false };
}

async function pastikanAccountSso(userId: string, username: string) {
  const ada = await prisma.account.findFirst({ where: { userId, providerId: PENYEDIA_SSO }, select: { id: true, accountId: true } });
  if (!ada) await prisma.account.create({ data: { id: randomUUID(), userId, providerId: PENYEDIA_SSO, accountId: username } });
  else if (ada.accountId !== username) await prisma.account.update({ where: { id: ada.id }, data: { accountId: username } });
}

/** Email akun Tamu: email SSO bila belum dipakai akun lain; selain itu `<username>@sso.invalid`. */
async function emailTamu(hasil: HasilSso): Promise<string> {
  if (hasil.email && !(await prisma.user.findUnique({ where: { email: hasil.email }, select: { id: true } }))) return hasil.email;
  return `${hasil.username}@sso.invalid`;
}

async function buatTamu(hasil: HasilSso): Promise<string> {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id, name: hasil.nama, email: await emailTamu(hasil), emailVerified: true, role: "TAMU", usernameSso: hasil.username,
      wajibGantiSandi: false,
      accounts: { create: { id: randomUUID(), providerId: PENYEDIA_SSO, accountId: hasil.username } },
    },
  });
  const admin = await prisma.user.findMany({ where: { role: "ADMIN", ...AKTIF }, select: { id: true } });
  await beritahu(admin.map((a) => a.id), { pesan: `Tamu baru masuk lewat SSO: ${hasil.nama}.`, tautan: "/admin/akun?saring=tamu" });
  return id;
}

/** Pengguna minimal untuk `catatAktivitas` (hanya id yang dipakai). */
function penggunaLog(id: string, peran: string | null): Pengguna {
  return { id, nama: "", email: "", peran: (peran ?? "TAMU") as Peran, prodiId: null };
}

export type HasilProsesSso =
  | { jenis: "masuk"; userId: string; peran: string | null; tamuBaru: boolean }
  | { jenis: "tolak"; kode: KodeGalatSso };

/** Putuskan lalu jalankan: tolak (tanpa membuat akun), masuk, atau buat Tamu lalu masuk. Sesi dibuat pemanggil. */
export async function prosesSso(hasil: HasilSso, konfigurasi: { domainEmailDitolak: string[] }): Promise<HasilProsesSso> {
  const { akun, lewatEmail } = await cariAkunSso(hasil);
  const k = putuskan(hasil, akun, konfigurasi);
  if (k.jenis === "tolak") {
    await catatSsoDitolak(k.kode, akun?.id ?? null);
    return k;
  }
  if (k.jenis === "buatTamu") {
    const userId = await buatTamu(hasil);
    await catatAktivitas(penggunaLog(userId, "TAMU"), "masuk_sso", "akun", userId, { tamuBaru: true, lewatEmail: false });
    return { jenis: "masuk", userId, peran: "TAMU", tamuBaru: true };
  }
  if (lewatEmail) await prisma.user.update({ where: { id: k.userId }, data: { usernameSso: hasil.username } });
  await pastikanAccountSso(k.userId, hasil.username);
  const peran = akun?.role ?? null;
  await catatAktivitas(penggunaLog(k.userId, peran), "masuk_sso", "akun", k.userId, { tamuBaru: false, lewatEmail });
  return { jenis: "masuk", userId: k.userId, peran, tamuBaru: false };
}

/** Log "SSO ditolak (<kode>)" tanpa email atau UNILA ID. */
export async function catatSsoDitolak(kode: KodeGalatSso | "state", userId: string | null = null) {
  await catatAktivitas(null, "sso_ditolak", "akun", userId, { kode });
}

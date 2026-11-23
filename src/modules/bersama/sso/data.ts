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

const AKTIF = { OR: [{ banned: false }, { banned: null }] };

interface AkunDitemukan extends AkunCocok {
  role: string | null;
}

/**
 * Cari akun lewat UNILA ID saja (`usernameSso` = username SSO). Keputusan Adrianne di ⏸ S5 (23 Nov 2026), sesuai arahan
 * Pak Tris (transkrip 7 dan 8): "Username itu ada di aplikasi nggak? Kalau ada, berarti login." Tidak ada pencocokan
 * lewat email; UNILA ID akun lama diisi admin di Kelola akun.
 */
export async function cariAkunSso(hasil: HasilSso): Promise<AkunDitemukan | null> {
  return prisma.user.findUnique({ where: { usernameSso: hasil.username }, select: { id: true, banned: true, role: true } });
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
  const akun = await cariAkunSso(hasil);
  const k = putuskan(hasil, akun, konfigurasi);
  if (k.jenis === "tolak") {
    await catatSsoDitolak(k.kode, akun?.id ?? null);
    return k;
  }
  if (k.jenis === "buatTamu") {
    const userId = await buatTamu(hasil);
    await catatAktivitas(penggunaLog(userId, "TAMU"), "masuk_sso", "akun", userId, { tamuBaru: true });
    return { jenis: "masuk", userId, peran: "TAMU", tamuBaru: true };
  }
  await pastikanAccountSso(k.userId, hasil.username);
  const peran = akun?.role ?? null;
  await catatAktivitas(penggunaLog(k.userId, peran), "masuk_sso", "akun", k.userId, { tamuBaru: false });
  return { jenis: "masuk", userId: k.userId, peran, tamuBaru: false };
}

/** Log "SSO ditolak (<kode>)" tanpa email atau UNILA ID. */
export async function catatSsoDitolak(kode: KodeGalatSso | "state", userId: string | null = null) {
  await catatAktivitas(null, "sso_ditolak", "akun", userId, { kode });
}

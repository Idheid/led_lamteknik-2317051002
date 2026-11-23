import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/bersama/auth";
import type { Pengguna } from "@/modules/bersama/akses";
import { PERAN, berandaPeran, type Peran } from "@/modules/bersama/peran";
import { prisma } from "@/modules/bersama/db";
import { PENYEDIA_SANDI } from "@/modules/bersama/sso/penyedia";

export const HALAMAN_GANTI_SANDI = "/akun/ganti-sandi";

/** Pengguna yang sedang login (sekali per permintaan), atau null. */
export const ambilPengguna = cache(async (): Promise<Pengguna | null> => {
  const sesi = await auth.api.getSession({ headers: await headers() });
  if (!sesi) return null;
  const u = sesi.user;
  if (u.banned) return null;
  const peran = PERAN.includes(u.role as Peran) ? (u.role as Peran) : null;
  if (!peran) return null;
  const sandi = await prisma.account.count({ where: { userId: u.id, providerId: PENYEDIA_SANDI } });
  return {
    id: u.id, nama: u.name, email: u.email, peran,
    prodiId: typeof u.prodiId === "string" ? u.prodiId : null,
    // akun tanpa sandi tidak bisa dipaksa ganti sandi (tidak ada sandi lama)
    wajibGantiSandi: sandi > 0 && Boolean(u.wajibGantiSandi),
    punyaSandi: sandi > 0,
  };
});

/** Wajib login; akun yang wajib mengganti kata sandi diarahkan ke halaman ganti sandi lebih dulu. */
export async function wajibLogin(opsi: { bolehBelumGantiSandi?: boolean } = {}): Promise<Pengguna> {
  const p = await ambilPengguna();
  if (!p) redirect("/login");
  if (p.wajibGantiSandi && !opsi.bolehBelumGantiSandi) redirect(HALAMAN_GANTI_SANDI);
  return p;
}

/** Wajib salah satu peran; peran lain diarahkan ke halaman awal (revisi 31 Okt 2026). */
export async function wajibPeran(...peran: Peran[]): Promise<Pengguna> {
  const p = await wajibLogin();
  if (!peran.includes(p.peran)) redirect(berandaPeran(p.peran));
  return p;
}

export async function wajibAdmin(): Promise<Pengguna> {
  return wajibPeran("ADMIN");
}

/** Tim Prodi; akun Tim Prodi tanpa prodi (tidak semestinya terjadi) juga diarahkan ke halaman awal. */
export async function wajibTimProdi(): Promise<Pengguna & { prodiId: string }> {
  const p = await wajibPeran("TIM_PRODI");
  if (!p.prodiId) redirect("/");
  return p as Pengguna & { prodiId: string };
}

export async function wajibAsesor(): Promise<Pengguna> {
  return wajibPeran("ASESOR");
}

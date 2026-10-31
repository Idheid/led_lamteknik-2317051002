import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/bersama/auth";
import type { Pengguna } from "@/modules/bersama/akses";
import { PERAN, berandaPeran, type Peran } from "@/modules/bersama/peran";

export const HALAMAN_GANTI_SANDI = "/akun/ganti-sandi";

/** Pengguna yang sedang login (sekali per permintaan), atau null. */
export const ambilPengguna = cache(async (): Promise<Pengguna | null> => {
  const sesi = await auth.api.getSession({ headers: await headers() });
  if (!sesi) return null;
  const u = sesi.user;
  if (u.banned) return null;
  const peran = PERAN.includes(u.role as Peran) ? (u.role as Peran) : null;
  if (!peran) return null;
  return {
    id: u.id, nama: u.name, email: u.email, peran,
    wajibGantiSandi: Boolean(u.wajibGantiSandi),
  };
});

/** Wajib login; akun yang wajib mengganti kata sandi diarahkan ke halaman ganti sandi lebih dulu. */
export async function wajibLogin(opsi: { bolehBelumGantiSandi?: boolean } = {}): Promise<Pengguna> {
  const p = await ambilPengguna();
  if (!p) redirect("/login");
  if (p.wajibGantiSandi && !opsi.bolehBelumGantiSandi) redirect(HALAMAN_GANTI_SANDI);
  return p;
}

export async function wajibSuperAdmin(): Promise<Pengguna> {
  const p = await wajibLogin();
  if (p.peran !== "SUPER_ADMIN") redirect(berandaPeran(p.peran));
  return p;
}

export async function wajibPenanggungJawab(): Promise<Pengguna> {
  const p = await wajibLogin();
  if (p.peran !== "PENANGGUNG_JAWAB") redirect(berandaPeran(p.peran));
  return p;
}

export async function wajibAsesor(): Promise<Pengguna> {
  const p = await wajibLogin();
  if (p.peran !== "ASESOR") redirect(berandaPeran(p.peran));
  return p;
}

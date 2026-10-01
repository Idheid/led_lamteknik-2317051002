import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Pengguna } from "@/lib/akses";
import { PERAN, type Peran } from "@/lib/peran";

/** Pengguna yang sedang login (sekali per permintaan), atau null. */
export const ambilPengguna = cache(async (): Promise<Pengguna | null> => {
  const sesi = await auth.api.getSession({ headers: await headers() });
  if (!sesi) return null;
  const u = sesi.user;
  if (u.banned) return null;
  const peran = PERAN.includes(u.role as Peran) ? (u.role as Peran) : null;
  if (!peran) return null;
  return { id: u.id, nama: u.name, email: u.email, peran, prodiId: u.prodiId ?? null };
});

export async function wajibLogin(): Promise<Pengguna> {
  const p = await ambilPengguna();
  if (!p) redirect("/login");
  return p;
}

export async function wajibSuperAdmin(): Promise<Pengguna> {
  const p = await wajibLogin();
  if (p.peran !== "SUPER_ADMIN") redirect("/proyek");
  return p;
}

export async function wajibPenanggungJawab(): Promise<Pengguna> {
  const p = await wajibLogin();
  if (p.peran !== "PENANGGUNG_JAWAB") redirect("/admin");
  return p;
}

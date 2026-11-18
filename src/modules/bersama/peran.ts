import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

/**
 * Peran (nilainya sama dengan enum Prisma `Peran`). Revisi 31 Okt 2026 (Pak Tris): Admin UPPS (yang
 * "nyetting-nyetting": akun, prodi, instrumen, kunci API), Tim Prodi (penyusun satu prodi; boleh beberapa akun per
 * prodi), dan Asesor (reviewer internal). Gabung LKPS G1 (= Rencana 18 Nov S1, bimbingan ke-8): Tamu hanya melihat
 * dashboard akreditasi; peran bawaan akun yang dibuat tanpa peran (dan nanti pengguna SSO yang belum terdaftar).
 */
export const PERAN = ["ADMIN", "TIM_PRODI", "ASESOR", "TAMU"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  ADMIN: "Admin UPPS",
  TIM_PRODI: "Tim Prodi",
  // desain form 2 (2 Nov 2026): reviewer internal = LPMPP; nilai enum tetap ASESOR
  ASESOR: "Reviewer LPMPP",
  TAMU: "Tamu",
};

export const ac = createAccessControl(defaultStatements);

export const peranAkses = {
  ADMIN: ac.newRole({ ...adminAc.statements }),
  TIM_PRODI: ac.newRole({ ...userAc.statements }),
  ASESOR: ac.newRole({ ...userAc.statements }),
  // tanpa satu pun hak plugin admin
  TAMU: ac.newRole({}),
};

/** Beranda LED menurut peran (tombol LED): Admin UPPS Pantau LED prodi, reviewer LED ditugaskan, Tim Prodi LED prodinya. */
export function berandaLed(peran?: string | null): string {
  if (peran === "ADMIN") return "/led/pantau";
  return peran === "ASESOR" ? "/led/asesor" : "/led";
}

/**
 * Halaman awal setelah login (satu-satunya fungsi beranda; dipakai sesi, login, dan sidebar): Admin UPPS dan Tamu ke
 * Dashboard akreditasi, peran lain ke beranda LED.
 */
export function berandaPeran(peran?: string | null): string {
  if (peran === "ADMIN" || peran === "TAMU") return "/dashboard";
  if (peran === "TIM_PRODI" || peran === "ASESOR") return berandaLed(peran);
  return "/";
}

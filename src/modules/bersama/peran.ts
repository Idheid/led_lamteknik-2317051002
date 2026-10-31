import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

/**
 * Peran (nilainya sama dengan enum Prisma `Peran`). Revisi 31 Okt 2026 (Pak Tris): hanya tiga peran, yaitu Admin UPPS
 * (yang "nyetting-nyetting": akun, prodi, instrumen, kunci API), Tim Prodi (penyusun satu prodi; boleh beberapa akun
 * per prodi), dan Asesor (reviewer internal).
 */
export const PERAN = ["ADMIN", "TIM_PRODI", "ASESOR"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  ADMIN: "Admin UPPS",
  TIM_PRODI: "Tim Prodi",
  ASESOR: "Asesor (reviewer)",
};

export const ac = createAccessControl(defaultStatements);

export const peranAkses = {
  ADMIN: ac.newRole({ ...adminAc.statements }),
  TIM_PRODI: ac.newRole({ ...userAc.statements }),
  ASESOR: ac.newRole({ ...userAc.statements }),
};

/** Halaman awal setelah login. Revisi 31 Okt 2026: semua peran masuk ke halaman awal "/" (pilih modul LKPS atau LED). */
export function berandaPeran(_peran?: string | null): string {
  return "/";
}

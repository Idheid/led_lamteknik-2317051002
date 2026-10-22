import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

/** Peran (nilainya sama dengan enum Prisma `Peran`). Revisi 22 Okt 2026: ditambah asesor (reviewer internal). */
export const PERAN = ["SUPER_ADMIN", "PENANGGUNG_JAWAB", "ASESOR"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  SUPER_ADMIN: "Admin",
  PENANGGUNG_JAWAB: "Penanggung jawab fakultas",
  ASESOR: "Asesor",
};

export const ac = createAccessControl(defaultStatements);

export const peranAkses = {
  SUPER_ADMIN: ac.newRole({ ...adminAc.statements }),
  PENANGGUNG_JAWAB: ac.newRole({ ...userAc.statements }),
  ASESOR: ac.newRole({ ...userAc.statements }),
};

/** Halaman awal setelah login, per peran. */
export function berandaPeran(peran: string | null | undefined): string {
  return peran === "SUPER_ADMIN" ? "/admin/akun" : peran === "ASESOR" ? "/asesor" : "/proyek";
}

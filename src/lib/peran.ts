import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

/** Dua peran (keputusan terkunci no. 2). Nilainya sama dengan enum Prisma `Peran`. */
export const PERAN = ["SUPER_ADMIN", "PENANGGUNG_JAWAB"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  SUPER_ADMIN: "Super admin",
  PENANGGUNG_JAWAB: "Penanggung jawab prodi",
};

export const ac = createAccessControl(defaultStatements);

export const peranAkses = {
  SUPER_ADMIN: ac.newRole({ ...adminAc.statements }),
  PENANGGUNG_JAWAB: ac.newRole({ ...userAc.statements }),
};

/** Halaman awal setelah login, per peran. */
export function berandaPeran(peran: string | null | undefined): string {
  return peran === "SUPER_ADMIN" ? "/admin" : "/proyek";
}

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { ac, peranAkses } from "@/lib/peran";

/**
 * Better Auth: email + kata sandi, sesi di basis data.
 * - Pendaftaran mandiri dimatikan; akun dibuat super admin lewat plugin admin (createUser).
 * - "Nonaktifkan akun" = ban plugin admin: login ditolak dan sesi yang ada dicabut.
 */
export const auth = betterAuth({
  appName: "Penyusun LED LAM Teknik",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      prodiId: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    admin({
      ac,
      roles: peranAkses,
      defaultRole: "PENANGGUNG_JAWAB",
      adminRoles: ["SUPER_ADMIN"],
      bannedUserMessage: "Akun Anda dinonaktifkan. Hubungi super admin.",
    }),
    nextCookies(),
  ],
});

export type SesiAuth = typeof auth.$Infer.Session;

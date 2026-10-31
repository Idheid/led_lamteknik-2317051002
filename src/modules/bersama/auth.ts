import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { prisma } from "@/modules/bersama/db";
import { ac, peranAkses } from "@/modules/bersama/peran";

/**
 * Better Auth: email + kata sandi, sesi di basis data.
 * - Pendaftaran mandiri dimatikan; akun dibuat Admin UPPS lewat plugin admin (createUser).
 * - "Nonaktifkan akun" = ban plugin admin: login ditolak dan sesi yang ada dicabut.
 */
export const auth = betterAuth({
  appName: "Akreditasi LAM Teknik",
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
      wajibGantiSandi: { type: "boolean", required: false, input: false, defaultValue: false },
      // revisi 31 Okt 2026: prodi akun Tim Prodi; diisi lewat Kelola akun, tidak dari masukan pengguna
      prodiId: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    admin({
      ac,
      roles: peranAkses,
      defaultRole: "TIM_PRODI",
      adminRoles: ["ADMIN"],
      bannedUserMessage: "Akun Anda dinonaktifkan. Hubungi Admin UPPS.",
    }),
    nextCookies(),
  ],
});

export type SesiAuth = typeof auth.$Infer.Session;

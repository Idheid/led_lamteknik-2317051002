import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { prisma } from "@/modules/bersama/db";
import { ac, peranAkses } from "@/modules/bersama/peran";
import { catatLoginGagal, hapusLoginGagal, statusKunciLogin } from "@/modules/bersama/data/login-gagal";
import { KODE_LOGIN_TERKUNCI, pesanTerkunci } from "@/modules/bersama/domain/login-gagal";
import { ssoUnila } from "@/modules/bersama/sso/plugin";

const JALUR_MASUK_EMAIL = "/sign-in/email";

function emailDari(body: unknown): string | null {
  const e = (body as { email?: unknown } | undefined)?.email;
  return typeof e === "string" && e.trim() ? e : null;
}

function ipDari(headers: Headers | undefined): string | null {
  const xf = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xf || headers?.get("x-real-ip") || null;
}

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
    // Rencana 18 Nov S5: sesi dari SSO Unila (diisi plugin ssoUnila, bukan dari masukan pengguna)
    additionalFields: {
      lewatSso: { type: "boolean", required: false, input: false, defaultValue: false },
    },
  },
  user: {
    additionalFields: {
      wajibGantiSandi: { type: "boolean", required: false, input: false, defaultValue: false },
      // revisi 31 Okt 2026: prodi akun Tim Prodi; diisi lewat Kelola akun, tidak dari masukan pengguna
      prodiId: { type: "string", required: false, input: false },
    },
  },
  // L3 (2 Nov 2026): catat login terakhir setiap kali sesi baru dibuat (kata sandi atau SSO)
  databaseHooks: {
    session: {
      create: {
        after: async (sesi) => {
          await prisma.user.update({ where: { id: sesi.userId }, data: { loginTerakhir: new Date() } }).catch(() => undefined);
        },
      },
    },
  },
  // Rencana 18 Nov S3: batas login gagal (3 kali dalam 5 menit per email), meniru LoginController contoh Pak Ihsan.
  // Hook sesuai dokumentasi Better Auth 1.7: `before` menolak saat terkunci, `after` membaca `ctx.context.returned`
  // (APIError 401 = email/kata sandi salah → dicatat; berhasil → hitungan dihapus). Akun dinonaktifkan (403) tidak dihitung.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== JALUR_MASUK_EMAIL) return;
      const email = emailDari(ctx.body);
      if (!email) return;
      const s = await statusKunciLogin(email);
      if (s.terkunci) throw new APIError("TOO_MANY_REQUESTS", { message: pesanTerkunci(s.sisaDetik), code: KODE_LOGIN_TERKUNCI });
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== JALUR_MASUK_EMAIL) return;
      const email = emailDari(ctx.body);
      if (!email) return;
      const hasil = ctx.context.returned;
      if (isAPIError(hasil)) {
        if (hasil.statusCode === 401) await catatLoginGagal(email, ipDari(ctx.headers), "email_atau_sandi_salah");
        return;
      }
      await hapusLoginGagal(email);
    }),
  },
  plugins: [
    admin({
      ac,
      roles: peranAkses,
      // Gabung LKPS G1: akun yang dibuat tanpa peran mendapat hak paling kecil (pembuatan oleh admin selalu menyebut peran)
      defaultRole: "TAMU",
      adminRoles: ["ADMIN"],
      bannedUserMessage: "Akun Anda dinonaktifkan. Hubungi Admin UPPS.",
    }),
    ssoUnila(),
    nextCookies(),
  ],
});

export type SesiAuth = typeof auth.$Infer.Session;

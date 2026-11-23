import { z } from "zod";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

/** Lama sesi aplikasi dari login SSO (keputusan Adrianne ⏸ S5, 23 Nov 2026): 8 jam, tanpa perpanjangan. */
export const LAMA_SESI_SSO_DETIK = 8 * 60 * 60;

/**
 * Plugin Better Auth kecil untuk login SSO Unila (Rencana 18 Nov S5). Endpoint `masukSsoUnila` membuat sesi untuk akun
 * yang sudah diputuskan rute `/api/sso/kembali`, lalu memasang cookie sesi lewat `setSessionCookie` (bukan ditulis
 * manual). `SERVER_ONLY`: tidak dipasang di router HTTP `/api/auth/*`, hanya bisa dipanggil `auth.api` di server.
 * Sesi ditandai `lewatSso` (S6: keluar juga dari SSO) dan berlaku 8 jam tanpa perpanjangan. Hook `session.create` (login terakhir, cek akun dinonaktifkan
 * plugin admin) tetap berjalan.
 */
export const ssoUnila = () =>
  ({
    id: "sso-unila",
    endpoints: {
      masukSsoUnila: createAuthEndpoint(
        "/sso-unila/masuk",
        { method: "POST", body: z.object({ userId: z.string().min(1) }), metadata: { SERVER_ONLY: true } },
        async (ctx) => {
          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          if (!user) throw new APIError("NOT_FOUND", { message: "Akun tidak ditemukan." });
          // Keputusan ⏸ S5: sesi SSO 8 jam, tidak diperpanjang. dontRememberMe=true → Better Auth tidak memperbarui sesi
          // (getSession melewati refresh bila cookie dont_remember ada) dan cookie sesi berakhir saat browser ditutup.
          // overrideAll=true: tanpa itu nilai bawaan isian tambahan (lewatSso=false) menimpa override, dan expiresAt
          // 1 hari bawaan dontRememberMe tidak bisa diganti (Better Auth 1.7.7).
          const expiresAt = new Date(Date.now() + LAMA_SESI_SSO_DETIK * 1000);
          const session = await ctx.context.internalAdapter.createSession(user.id, true, { lewatSso: true, expiresAt }, true);
          if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Sesi gagal dibuat." });
          await setSessionCookie(ctx, { session, user }, true);
          return ctx.json({ userId: user.id });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;

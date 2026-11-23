import { z } from "zod";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

/**
 * Plugin Better Auth kecil untuk login SSO Unila (Rencana 18 Nov S5). Endpoint `masukSsoUnila` membuat sesi untuk akun
 * yang sudah diputuskan rute `/api/sso/kembali`, lalu memasang cookie sesi lewat `setSessionCookie` (bukan ditulis
 * manual). `SERVER_ONLY`: tidak dipasang di router HTTP `/api/auth/*`, hanya bisa dipanggil `auth.api` di server.
 * Sesi ditandai `lewatSso` (S6: keluar juga dari SSO). Hook `session.create` (login terakhir, cek akun dinonaktifkan
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
          // overrideAll=true: tanpa itu nilai bawaan isian tambahan (lewatSso=false) menimpa override (Better Auth 1.7.7)
          const session = await ctx.context.internalAdapter.createSession(user.id, false, { lewatSso: true }, true);
          if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Sesi gagal dibuat." });
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ userId: user.id });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;

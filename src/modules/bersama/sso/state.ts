import { randomBytes, timingSafeEqual } from "node:crypto";

/** Cookie sementara alur SSO (Rencana 18 Nov S5): `state` acak dan tujuan sesudah login, berlaku 10 menit. */
export const COOKIE_STATE = "sso_state";
export const COOKIE_KE = "sso_ke";
export const LAMA_STATE_DETIK = 600;

export function buatState(): string {
  return randomBytes(32).toString("base64url");
}

/** Bandingkan state dari penyedia dengan cookie (waktu konstan). Kosong = tidak cocok. */
export function stateCocok(dariPenyedia: string | null | undefined, dariCookie: string | null | undefined): boolean {
  if (!dariPenyedia || !dariCookie) return false;
  const a = Buffer.from(dariPenyedia);
  const b = Buffer.from(dariCookie);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tujuan setelah login hanya jalur di dalam aplikasi (cegah open redirect), sama dengan form login. */
export function tujuanAman(ke: string | null | undefined): string | null {
  return ke && ke.startsWith("/") && !ke.startsWith("//") && !ke.startsWith("/\\") && !ke.startsWith("/login") && !ke.startsWith("/api/") ? ke : null;
}

export function opsiCookieSso(produksi = process.env.NODE_ENV === "production") {
  return { httpOnly: true, secure: produksi, sameSite: "lax" as const, path: "/api/sso", maxAge: LAMA_STATE_DETIK };
}

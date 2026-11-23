import { NextResponse, type NextRequest } from "next/server";
import type { KodeGalatSso } from "@/modules/bersama/sso/pesan";
import { COOKIE_KE, COOKIE_STATE, opsiCookieSso } from "@/modules/bersama/sso/state";

/** Alamat absolut di aplikasi ini; `BETTER_AUTH_URL` dipakai bila ada (di balik reverse proxy `req.url` bisa internal). */
export function alamat(req: NextRequest, jalur: string): URL {
  return new URL(jalur, process.env.BETTER_AUTH_URL || req.url);
}

/** Hapus cookie sementara alur SSO. */
export function hapusCookieSso(res: NextResponse) {
  const { path } = opsiCookieSso();
  res.cookies.delete({ name: COOKIE_STATE, path });
  res.cookies.delete({ name: COOKIE_KE, path });
  return res;
}

/** Kembali ke halaman login dengan kode galat SSO (teksnya dipetakan di halaman login). */
export function keLogin(req: NextRequest, kode: KodeGalatSso) {
  return hapusCookieSso(NextResponse.redirect(alamat(req, `/login?galat=${kode}`), 303));
}

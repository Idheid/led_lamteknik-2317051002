import { NextResponse, type NextRequest } from "next/server";
import { konfigurasiSso, ssoAktif } from "@/modules/bersama/sso/konfigurasi";
import { penyediaSso } from "@/modules/bersama/sso";
import { COOKIE_KE, COOKIE_STATE, buatState, opsiCookieSso, tujuanAman } from "@/modules/bersama/sso/state";
import { alamat, keLogin } from "../bantu";

/**
 * Mulai login SSO Unila (Rencana 18 Nov S5): buat `state` acak (cookie httpOnly 10 menit), simpan tujuan `ke` (hanya
 * jalur di dalam aplikasi), lalu alihkan ke penyedia. SSO mati → `/login?galat=sso_mati`.
 */
export async function GET(req: NextRequest) {
  if (!ssoAktif()) return keLogin(req, "sso_mati");
  let tujuan: string;
  const state = buatState();
  try {
    tujuan = penyediaSso(konfigurasiSso()).urlMasuk(state);
  } catch (e) {
    console.error("SSO mulai gagal:", e instanceof Error ? e.message : "galat");
    return keLogin(req, "sso_gagal");
  }
  const res = NextResponse.redirect(alamat(req, tujuan), 303);
  const opsi = opsiCookieSso();
  res.cookies.set(COOKIE_STATE, state, opsi);
  const ke = tujuanAman(req.nextUrl.searchParams.get("ke"));
  if (ke) res.cookies.set(COOKIE_KE, ke, opsi);
  else res.cookies.delete({ name: COOKIE_KE, path: opsi.path });
  return res;
}

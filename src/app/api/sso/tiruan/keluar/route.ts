import { NextResponse, type NextRequest } from "next/server";
import { konfigurasiSso, ssoAktif } from "@/modules/bersama/sso/konfigurasi";
import { alamat } from "../../bantu";

/**
 * Alamat keluar penyedia SSO tiruan (Rencana 18 Nov S6), hanya untuk pengembangan dan uji. Tiruan tidak punya sesi SSO,
 * jadi cukup kembali ke `kembali` (hanya alamat di aplikasi ini) dengan penanda `?keluar=sso`. Mati di produksi.
 */
export async function GET(req: NextRequest) {
  let hidup = process.env.NODE_ENV !== "production" && ssoAktif();
  try {
    hidup = hidup && konfigurasiSso().mode === "tiruan";
  } catch {
    hidup = false;
  }
  if (!hidup) return new NextResponse("Tidak ditemukan.", { status: 404 });
  const login = alamat(req, "/login");
  let kembali: URL;
  try {
    kembali = new URL(req.nextUrl.searchParams.get("kembali") ?? "", login);
  } catch {
    kembali = login;
  }
  if (kembali.origin !== login.origin) kembali = login;
  kembali.searchParams.set("keluar", "sso");
  return NextResponse.redirect(kembali, 303);
}

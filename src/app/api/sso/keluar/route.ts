import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/modules/bersama/auth";
import { konfigurasiSso, ssoAktif } from "@/modules/bersama/sso/konfigurasi";
import { penyediaSso } from "@/modules/bersama/sso";
import { alamat } from "../bantu";

/**
 * Keluar (Rencana 18 Nov S6). Sesi Better Auth selalu dihapus (`signOut`, cookie dihapus lewat header Better Auth).
 * Sesi yang dibuat lewat SSO (`lewatSso`) lalu diarahkan ke alamat keluar penyedia SSO dengan alamat kembali halaman
 * login, supaya sesi SSO di browser ikut mati (setara `SSO::cookieClear()` contoh PHP Pak Ihsan; transkrip Pak Tris 8
 * baris 327–331). Login biasa → `/login`. Balasan JSON `{ alamat }`; klien yang berpindah halaman.
 */
export async function POST(req: NextRequest) {
  const sesi = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  const lewatSso = Boolean((sesi?.session as { lewatSso?: boolean } | undefined)?.lewatSso);

  let setCookie: string[] = [];
  if (sesi) {
    try {
      const r = await auth.api.signOut({ headers: req.headers, returnHeaders: true });
      setCookie = r.headers.getSetCookie();
    } catch (e) {
      console.error("Keluar: sesi gagal dihapus:", e instanceof Error ? e.message : "galat");
      return NextResponse.json({ pesan: "Gagal keluar. Coba lagi." }, { status: 500 });
    }
  }

  let tujuan = "/login";
  if (lewatSso && ssoAktif()) {
    try {
      tujuan = penyediaSso(konfigurasiSso()).urlKeluar(alamat(req, "/login").toString());
    } catch (e) {
      // penyedia Access belum dikonfigurasi: sesi aplikasi tetap terhapus, sesi SSO di browser tidak bisa dimatikan
      console.error("Keluar: alamat keluar SSO tidak tersedia:", e instanceof Error ? e.message : "galat");
    }
  }
  const res = NextResponse.json({ alamat: tujuan }, { headers: { "cache-control": "no-store" } });
  for (const c of setCookie) res.headers.append("set-cookie", c);
  return res;
}

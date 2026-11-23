import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/modules/bersama/auth";
import { berandaPeran } from "@/modules/bersama/peran";
import { konfigurasiSso, ssoAktif } from "@/modules/bersama/sso/konfigurasi";
import { penyediaSso } from "@/modules/bersama/sso";
import { catatSsoDitolak, prosesSso } from "@/modules/bersama/sso/data";
import { COOKIE_KE, COOKIE_STATE, stateCocok, tujuanAman } from "@/modules/bersama/sso/state";
import { alamat, hapusCookieSso, keLogin } from "../bantu";

/**
 * Alamat kembali SSO Unila (Rencana 18 Nov S5), GET atau POST (metode Access belum diketahui; tiruan memakai POST).
 * 1. Penyedia membaca dan memvalidasi kiriman. 2. `state` harus sama dengan cookie. 3. `putuskan` → tolak / masuk /
 * buat Tamu. 4. Sesi dibuat plugin Better Auth `ssoUnila` (cookie lewat `setSessionCookie`), lalu ke tujuan atau beranda.
 * Galat apa pun → `/login?galat=...`; isi kiriman, email, dan UNILA ID tidak dicetak ke log.
 */
async function tangani(req: NextRequest) {
  if (!ssoAktif()) return keLogin(req, "sso_mati");
  let konfigurasi;
  let dibaca;
  try {
    konfigurasi = konfigurasiSso();
    dibaca = await penyediaSso(konfigurasi).bacaHasil(req);
  } catch (e) {
    console.error("SSO kembali: kiriman penyedia tidak sah:", e instanceof Error ? e.message : "galat");
    await catatSsoDitolak("sso_gagal");
    return keLogin(req, "sso_gagal");
  }
  if (!stateCocok(dibaca.state, req.cookies.get(COOKIE_STATE)?.value)) {
    await catatSsoDitolak("state");
    return keLogin(req, "sso_gagal");
  }

  const hasil = await prosesSso(dibaca.hasil, konfigurasi);
  if (hasil.jenis === "tolak") return keLogin(req, hasil.kode);

  let setCookie: string[];
  try {
    const r = await auth.api.masukSsoUnila({ body: { userId: hasil.userId }, returnHeaders: true });
    setCookie = r.headers.getSetCookie();
  } catch (e) {
    // mis. akun dinonaktifkan di sela langkah (hook plugin admin menolak sesi)
    console.error("SSO kembali: sesi gagal dibuat:", e instanceof Error ? e.message : "galat");
    return keLogin(req, "sso_gagal");
  }
  const ke = tujuanAman(req.cookies.get(COOKIE_KE)?.value) ?? berandaPeran(hasil.peran);
  const res = hapusCookieSso(NextResponse.redirect(alamat(req, ke), 303));
  for (const c of setCookie) res.headers.append("set-cookie", c);
  return res;
}

export const GET = tangani;
export const POST = tangani;

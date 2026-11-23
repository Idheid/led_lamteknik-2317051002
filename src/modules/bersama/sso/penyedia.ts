/** ID penyedia akun Better Auth (`Account.providerId`) untuk login SSO Unila (Rencana 18 Nov S4–S5). */
export const PENYEDIA_SSO = "sso-unila";

/** ID penyedia bawaan Better Auth untuk login email dan kata sandi. */
export const PENYEDIA_SANDI = "credential";

/** Cara masuk satu akun dari daftar `Account`-nya (kolom "Cara masuk" di Kelola akun): sandi, SSO, atau keduanya. */
export function caraMasukAkun(akun: { providerId: string }[]): { sandi: boolean; sso: boolean } {
  return { sandi: akun.some((a) => a.providerId === PENYEDIA_SANDI), sso: akun.some((a) => a.providerId === PENYEDIA_SSO) };
}

/** Label kolom "Cara masuk". */
export function labelCaraMasuk(c: { sandi: boolean; sso: boolean }): string {
  return c.sandi && c.sso ? "Sandi dan SSO" : c.sso ? "SSO" : c.sandi ? "Sandi" : "-";
}

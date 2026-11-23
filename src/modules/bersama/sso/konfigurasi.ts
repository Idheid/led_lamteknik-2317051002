/**
 * Saklar SSO Unila (Rencana 18 Nov S3/S5). Bawaan mati: tombol "Masuk dengan SSO Unila" hanya tampil dan rute SSO hanya
 * berjalan bila `SSO_AKTIF=true`. Nilai variabel lain (app_key dsb.) tidak pernah dicetak.
 */
export function ssoAktif(env: Record<string, string | undefined> = process.env): boolean {
  return (env.SSO_AKTIF ?? "").trim().toLowerCase() === "true";
}

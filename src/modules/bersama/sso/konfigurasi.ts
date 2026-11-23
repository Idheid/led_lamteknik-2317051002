/**
 * Konfigurasi SSO Unila (Rencana 18 Nov S3/S5). Bawaan mati: tombol "Masuk dengan SSO Unila" hanya tampil dan rute SSO
 * hanya berjalan bila `SSO_AKTIF=true`. Nilai variabel (app_key dsb.) tidak pernah dicetak atau dicatat.
 */

type Env = Record<string, string | undefined>;

export function ssoAktif(env: Env = process.env): boolean {
  return (env.SSO_AKTIF ?? "").trim().toLowerCase() === "true";
}

export type ModeSso = "akses" | "tiruan";

export interface KonfigurasiSso {
  aktif: boolean;
  mode: ModeSso;
  /** Rahasia; hanya dipakai penyedia Access. */
  appKey: string | null;
  urlMulai: string;
  urlKembali: string | null;
  urlKeluar: string | null;
  /** Domain email mahasiswa (huruf kecil, tanpa "@"). */
  domainEmailDitolak: string[];
}

export const URL_MULAI_BAWAAN = "https://akses.unila.ac.id/api/live/v1/auth/login/sso";

/**
 * Baca konfigurasi dari env. `SSO_MODE` bawaan `akses`; `tiruan` ditolak di produksi (galat, bukan diam-diam akses),
 * supaya penyedia palsu tidak pernah bisa dipakai masuk di server sungguhan.
 */
export function konfigurasiSso(env: Env = process.env): KonfigurasiSso {
  const modeMentah = (env.SSO_MODE ?? "akses").trim().toLowerCase();
  if (modeMentah !== "akses" && modeMentah !== "tiruan") throw new Error("SSO_MODE harus 'akses' atau 'tiruan'.");
  const mode = modeMentah as ModeSso;
  if (mode === "tiruan" && env.NODE_ENV === "production") {
    throw new Error("SSO_MODE=tiruan tidak boleh dipakai di produksi.");
  }
  const kosongNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    aktif: ssoAktif(env),
    mode,
    appKey: kosongNull(env.SSO_APP_KEY),
    urlMulai: kosongNull(env.SSO_URL_MULAI) ?? URL_MULAI_BAWAAN,
    urlKembali: kosongNull(env.SSO_URL_KEMBALI),
    urlKeluar: kosongNull(env.SSO_URL_KELUAR),
    domainEmailDitolak: (env.SSO_DOMAIN_EMAIL_DITOLAK ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  };
}

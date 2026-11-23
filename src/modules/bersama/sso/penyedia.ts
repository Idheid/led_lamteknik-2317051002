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

/**
 * Hasil login SSO yang sudah dinormalkan penyedia (Rencana 18 Nov S5). `status` dinormalkan penyedia menjadi
 * "dosen", "tendik", "mahasiswa", atau nilai lain apa adanya; `username` (UNILA ID) huruf kecil.
 */
export interface HasilSso {
  username: string;
  nama: string;
  email: string | null;
  aktif: boolean;
  status: string | null;
}

/** Penyedia SSO: Access (sungguhan) atau tiruan (pengembangan dan uji). */
export interface PenyediaSso {
  /** Alamat untuk memulai login di penyedia, membawa `state`. */
  urlMasuk(state: string): string;
  /**
   * Baca dan validasi kiriman di alamat kembali. Penyedia Access memvalidasi kiriman server-ke-server, bukan sekadar
   * membaca query. Mengembalikan `state` bila penyedia meneruskannya. Galat = login gagal (`sso_gagal`).
   */
  bacaHasil(permintaan: Request): Promise<{ hasil: HasilSso; state: string | null }>;
  /** Alamat keluar dari SSO, lalu kembali ke `kembaliKe` (S6). */
  urlKeluar(kembaliKe: string): string;
}

/** Galat penyedia SSO; pesannya untuk log server, bukan untuk pengguna. */
export class GalatSso extends Error {}

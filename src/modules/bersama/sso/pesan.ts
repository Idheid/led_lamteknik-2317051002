/**
 * Pesan galat SSO di halaman login (Rencana 18 Nov S3). `?galat=<kode>` dipetakan ke teks tetap; isi parameter tidak
 * pernah ditampilkan mentah. Kode tak dikenal → tanpa pesan.
 */
export const PESAN_GALAT_SSO = {
  sso_mahasiswa: "Akun mahasiswa tidak dapat masuk ke aplikasi ini.",
  sso_nonaktif: "Akun SSO Anda tidak aktif. Hubungi Helpdesk UPA TIK.",
  sso_dinonaktifkan: "Akun Anda dinonaktifkan. Hubungi Admin UPPS.",
  sso_gagal: "Masuk lewat SSO gagal. Coba lagi.",
  sso_mati: "Login SSO belum tersedia. Gunakan email dan kata sandi.",
} as const;

export type KodeGalatSso = keyof typeof PESAN_GALAT_SSO;

export function pesanGalatSso(kode: unknown): string | null {
  return typeof kode === "string" && Object.hasOwn(PESAN_GALAT_SSO, kode) ? PESAN_GALAT_SSO[kode as KodeGalatSso] : null;
}

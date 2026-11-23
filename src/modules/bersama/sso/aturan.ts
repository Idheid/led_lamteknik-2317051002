import type { HasilSso } from "./penyedia";
import type { KodeGalatSso } from "./pesan";

/** Akun aplikasi yang cocok dengan hasil SSO (pencarian di `data.ts`). */
export interface AkunCocok {
  id: string;
  banned: boolean | null;
}

export type KeputusanSso =
  | { jenis: "masuk"; userId: string }
  | { jenis: "buatTamu" }
  | { jenis: "tolak"; kode: KodeGalatSso };

/** Domain email (huruf kecil) atau null. */
export function domainEmail(email: string | null): string | null {
  const i = email?.lastIndexOf("@") ?? -1;
  return email && i > 0 ? email.slice(i + 1).trim().toLowerCase() : null;
}

/**
 * Keputusan login SSO (Rencana 18 Nov S5), domain murni. Urutan:
 * 1. akun SSO tidak aktif → `sso_nonaktif`;
 * 2. mahasiswa (status atau domain email di daftar tolak) → `sso_mahasiswa`;
 * 3. akun aplikasi ditemukan tetapi dinonaktifkan → `sso_dinonaktifkan`;
 * 4. akun ditemukan → masuk dengan peran apa adanya (SSO tidak pernah mengubah peran);
 * 5. tidak ditemukan → buat akun Tamu.
 */
export function putuskan(hasil: HasilSso, akun: AkunCocok | null, konfigurasi: { domainEmailDitolak: string[] }): KeputusanSso {
  if (!hasil.aktif) return { jenis: "tolak", kode: "sso_nonaktif" };
  const domain = domainEmail(hasil.email);
  if (hasil.status?.trim().toLowerCase() === "mahasiswa" || (domain !== null && konfigurasi.domainEmailDitolak.includes(domain))) {
    return { jenis: "tolak", kode: "sso_mahasiswa" };
  }
  if (akun?.banned) return { jenis: "tolak", kode: "sso_dinonaktifkan" };
  if (akun) return { jenis: "masuk", userId: akun.id };
  return { jenis: "buatTamu" };
}

import type { Peran } from "@/lib/peran";

/** Identitas pengguna yang dipakai lapisan data untuk memeriksa hak akses. */
export interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  prodiId: string | null;
  /** Akun baru atau sandi diatur ulang: wajib mengganti kata sandi sebelum memakai aplikasi. */
  wajibGantiSandi?: boolean;
}

/** Galat hak akses; pesan aman ditampilkan ke pengguna. */
export class GalatAkses extends Error {
  constructor(pesan = "Anda tidak berhak melakukan aksi ini.") {
    super(pesan);
    this.name = "GalatAkses";
  }
}

/** Galat yang pesannya aman ditampilkan apa adanya (validasi bisnis). */
export class GalatPengguna extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "GalatPengguna";
  }
}

export function pastikanSuperAdmin(p: Pengguna): void {
  if (p.peran !== "SUPER_ADMIN") throw new GalatAkses();
}

/** Penanggung jawab hanya boleh mengakses prodinya sendiri; mengembalikan prodiId-nya. */
export function pastikanPenanggungJawab(p: Pengguna): string {
  if (p.peran !== "PENANGGUNG_JAWAB") throw new GalatAkses();
  if (!p.prodiId) throw new GalatAkses("Akun Anda belum terhubung ke program studi. Hubungi super admin.");
  return p.prodiId;
}

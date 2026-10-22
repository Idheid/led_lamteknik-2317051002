import type { Peran } from "@/lib/peran";

/** Identitas pengguna yang dipakai lapisan data untuk memeriksa hak akses. */
export interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
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

/**
 * Penanggung jawab (PJ) fakultas: satu instalasi website dipakai satu fakultas, jadi PJ mengelola semua prodi, LED,
 * instrumen, dokumen bersama, dan kunci API fakultas (revisi 19 Okt 2026). Admin hanya mengurus akun dan kunci API.
 */
export function pastikanPenanggungJawab(p: Pengguna): void {
  if (p.peran !== "PENANGGUNG_JAWAB") throw new GalatAkses();
}

/** Asesor (revisi 22 Okt 2026): hanya membaca LED yang ditugaskan, memberi catatan revisi, dan memberi skor. */
export function pastikanAsesor(p: Pengguna): void {
  if (p.peran !== "ASESOR") throw new GalatAkses();
}

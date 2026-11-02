import type { Peran } from "@/modules/bersama/peran";

/** Identitas pengguna yang dipakai lapisan data untuk memeriksa hak akses. */
export interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  /** Prodi akun Tim Prodi (revisi 31 Okt 2026); null untuk Admin UPPS dan Asesor. */
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

/**
 * Admin UPPS (revisi 31 Okt 2026): akun, program studi dan identitas fakultas, instrumen, Basis Pengetahuan fakultas,
 * kunci API dan model, penugasan asesor; melihat semua LED hanya baca.
 */
export function pastikanAdmin(p: Pengguna): void {
  if (p.peran !== "ADMIN") throw new GalatAkses();
}

/** Tim Prodi (revisi 31 Okt 2026): menyusun LED prodinya sendiri. Akun Tim Prodi selalu terikat ke satu prodi. */
export function pastikanTimProdi(p: Pengguna): asserts p is Pengguna & { prodiId: string } {
  if (p.peran !== "TIM_PRODI" || !p.prodiId) throw new GalatAkses();
}

/** Tim Prodi hanya boleh memakai data prodinya sendiri. */
export function pastikanProdiSendiri(p: Pengguna, prodiId: string): void {
  pastikanTimProdi(p);
  if (p.prodiId !== prodiId) throw new GalatAkses("Data ini milik program studi lain.");
}

/** Salah satu peran yang disebut. */
export function pastikanPeran(p: Pengguna, ...peran: Peran[]): void {
  if (!peran.includes(p.peran)) throw new GalatAkses();
}

/** Asesor (revisi 22 Okt 2026): hanya membaca LED yang ditugaskan, memberi catatan revisi, dan memberi skor. */
export function pastikanAsesor(p: Pengguna): void {
  if (p.peran !== "ASESOR") throw new GalatAkses();
}

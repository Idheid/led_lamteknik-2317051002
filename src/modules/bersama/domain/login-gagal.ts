/**
 * Batas login gagal (Rencana 18 Nov S3), meniru LoginController contoh Pak Ihsan: `MAX_LOGIN_ATTEMPTS = 3`,
 * `LOCKOUT_SECONDS = 300`. Jendela bergeser: bila dalam 300 detik terakhir ada 3 kegagalan atau lebih untuk email yang
 * sama, percobaan ditolak sampai kegagalan tertua di jendela itu berumur 300 detik. Percobaan yang ditolak tidak dicatat.
 */

export const BATAS_LOGIN_GAGAL = 3;
export const LAMA_KUNCI_DETIK = 300;

export interface StatusKunci {
  terkunci: boolean;
  /** Detik tersisa sampai boleh mencoba lagi (0 bila tidak terkunci). */
  sisaDetik: number;
}

/** Waktu kegagalan (sembarang urutan) → status kunci pada `sekarang`. */
export function statusKunci(waktuGagal: readonly Date[], sekarang: Date): StatusKunci {
  const batasBawah = sekarang.getTime() - LAMA_KUNCI_DETIK * 1000;
  const dalamJendela = waktuGagal.map((w) => w.getTime()).filter((t) => t > batasBawah).sort((a, b) => a - b);
  if (dalamJendela.length < BATAS_LOGIN_GAGAL) return { terkunci: false, sisaDetik: 0 };
  const bebasPada = dalamJendela[0] + LAMA_KUNCI_DETIK * 1000;
  return { terkunci: true, sisaDetik: Math.max(1, Math.ceil((bebasPada - sekarang.getTime()) / 1000)) };
}

/** Pesan untuk pengguna; menit dibulatkan ke atas (minimal 1). */
export function pesanTerkunci(sisaDetik: number): string {
  return `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(sisaDetik / 60))} menit.`;
}

/** Kode galat yang dikirim hook Better Auth saat login terkunci (dibaca form login). */
export const KODE_LOGIN_TERKUNCI = "LOGIN_TERKUNCI";

/** Email dinormalisasi sebelum di-hash (huruf kecil, dipangkas). */
export function normalisasiEmail(email: string): string {
  return email.trim().toLowerCase();
}

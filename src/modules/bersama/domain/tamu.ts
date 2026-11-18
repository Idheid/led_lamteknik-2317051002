/**
 * Gabung LKPS G1 (= Rencana 18 Nov S1): peran Tamu hanya melihat dashboard akreditasi. Pembungkus aksi server dan Route
 * Handler menolak Tamu sebelum lapisan data dijalankan (lapis kedua; lapisan data tetap memeriksa peran sendiri).
 * `bolehTamu` hanya dipakai aksi yang memang untuk semua akun (ganti kata sandi sendiri).
 */
export function tamuDitolak(peran: string, opsi: { bolehTamu?: boolean } = {}): boolean {
  return peran === "TAMU" && !opsi.bolehTamu;
}

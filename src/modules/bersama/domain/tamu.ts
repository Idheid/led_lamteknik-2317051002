/**
 * Gabung LKPS G1 (= Rencana 18 Nov S1): peran Tamu hanya melihat dashboard akreditasi. Pembungkus aksi server dan Route
 * Handler menolak Tamu sebelum lapisan data dijalankan (lapis kedua; lapisan data tetap memeriksa peran sendiri).
 * `bolehTamu` hanya dipakai aksi yang memang untuk semua akun (ganti kata sandi sendiri).
 */
export function tamuDitolak(peran: string, opsi: { bolehTamu?: boolean } = {}): boolean {
  return peran === "TAMU" && !opsi.bolehTamu;
}

/**
 * Gabung LKPS G4: penolakan awal Route Handler sebelum fungsi rute dijalankan (dipakai `jalankanRute`), dipisah supaya
 * bisa diuji tanpa server Next: tanpa sesi → 401, Tamu → 403, wajib ganti sandi → 403.
 */
export function penolakanRute(
  p: { peran: string; wajibGantiSandi?: boolean } | null,
): { status: 401 | 403; pesan: string } | null {
  if (!p) return { status: 401, pesan: "Sesi Anda berakhir. Silakan masuk lagi." };
  if (tamuDitolak(p.peran)) return { status: 403, pesan: "Anda tidak berhak melakukan aksi ini." };
  if (p.wajibGantiSandi) return { status: 403, pesan: "Ganti kata sandi Anda terlebih dahulu." };
  return null;
}

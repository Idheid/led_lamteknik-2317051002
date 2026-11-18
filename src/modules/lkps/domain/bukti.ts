/**
 * Berkas bukti LKPS (Gabung LKPS G4). Kode asal menulis unggahan ke `public/uploads/bukti` (terbuka tanpa login) dan
 * menyimpan alamatnya di kolom fileMou/fileRps/fileDokumen/fotoTtd. Di sini berkas disimpan di penyimpanan LED dengan
 * kunci `lkps/<prodiId>/bukti/<uuid>-<nama>`; alamat yang dipakai halaman adalah rute unduh `/api/lkps/bukti?kunci=…`
 * yang memeriksa hak baca prodi. Bentuk respons unggah sama dengan kode asal: { success, message, url, fileName, size }.
 */

export const UKURAN_MAKS_BUKTI = 10 * 1024 * 1024;
export const ALAMAT_UNDUH_BUKTI = "/api/lkps/bukti";

const POLA_KUNCI = /^lkps\/([A-Za-z0-9_-]+)\/bukti\/([0-9a-f-]{36})-([\w.\- ]+)$/;

export function folderBukti(prodiId: string): string {
  return `lkps/${prodiId}/bukti`;
}

export function alamatBukti(kunci: string | null | undefined): string | null {
  return kunci ? `${ALAMAT_UNDUH_BUKTI}?kunci=${encodeURIComponent(kunci)}` : null;
}

/** Kunci penyimpanan dari alamat unduh (atau kunci mentah). null bila bukan bukti LKPS yang sah. */
export function kunciDariAlamat(nilai: string): string | null {
  let kunci = nilai.trim();
  if (kunci.startsWith(ALAMAT_UNDUH_BUKTI)) {
    const q = kunci.indexOf("?");
    kunci = q < 0 ? "" : (new URLSearchParams(kunci.slice(q + 1)).get("kunci") ?? "");
  }
  return POLA_KUNCI.test(kunci) ? kunci : null;
}

/** Prodi pemilik dan nama asli berkas dari kunci; null bila kunci tidak sah (mis. memuat `..`). */
export function uraiKunci(kunci: string): { prodiId: string; nama: string } | null {
  const m = POLA_KUNCI.exec(kunci);
  return m ? { prodiId: m[1], nama: m[3] } : null;
}

export type JenisBukti = { ekstensi: string; mime: string };

/** Jenis berkas bukti dari ekstensi DAN tanda tangan isi (kode asal hanya memeriksa ekstensi). */
export function kenaliBukti(nama: string, isi: Buffer): JenisBukti | null {
  const n = nama.toLowerCase();
  const awal = isi.subarray(0, 8);
  if (n.endsWith(".pdf") && awal.subarray(0, 5).toString("latin1") === "%PDF-") return { ekstensi: ".pdf", mime: "application/pdf" };
  if (n.endsWith(".png") && awal.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ekstensi: ".png", mime: "image/png" };
  }
  if (/\.jpe?g$/.test(n) && awal[0] === 0xff && awal[1] === 0xd8) return { ekstensi: ".jpg", mime: "image/jpeg" };
  if (n.endsWith(".xlsx") && awal.subarray(0, 2).toString("latin1") === "PK") {
    return { ekstensi: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }
  return null;
}

export function mimeDariNama(nama: string): string {
  const n = nama.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/.test(n)) return "image/jpeg";
  if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

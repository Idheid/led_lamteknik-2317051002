import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { bacaBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { pastikanBacaLkps, pastikanUnggahBukti } from "@/modules/lkps/domain/akses";
import { UKURAN_MAKS_BUKTI, alamatBukti, folderBukti, kenaliBukti, mimeDariNama, uraiKunci } from "@/modules/lkps/domain/bukti";

import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/upload/route.ts.
// Gabung LKPS G4 (masalah 5): berkas tidak lagi ditulis ke public/; disimpan di penyimpanan LED per prodi dan diunduh
// lewat rute yang memeriksa hak baca prodi. Jenis berkas sama (PDF, PNG, JPG, XLSX), batas 10 MB, dan kini isi berkas
// diperiksa (bukan hanya ekstensi).

/** POST formData `file` → `{ success, message, url, fileName, size }` seperti kode asal. */
export async function unggahBukti(p: Pengguna, prodiId: string, berkas: { nama: string; isi: Buffer } | null) {
  pastikanUnggahBukti(p, prodiId);
  if (!berkas) throw new GalatPengguna("Berkas tidak ditemukan.");
  if (berkas.isi.length > UKURAN_MAKS_BUKTI) throw new GalatPengguna("Ukuran berkas melebihi batas 10MB.");
  if (!kenaliBukti(berkas.nama, berkas.isi)) {
    throw new GalatPengguna("Format berkas tidak diizinkan. Harap unggah berkas PDF/Gambar (PNG, JPG)/Excel (XLSX).");
  }
  const { lokasi } = await simpanBerkas(folderBukti(prodiId), berkas.nama, berkas.isi);
  return {
    success: true,
    message: "Berkas bukti fisik berhasil diunggah",
    url: alamatBukti(lokasi)!,
    fileName: berkas.nama,
    size: berkas.isi.length,
  };
}

/** Unduh bukti: prodi pemilik dibaca dari kunci, lalu hak baca prodi itu diperiksa. */
export async function berkasBukti(p: Pengguna, kunci: string) {
  const urai = typeof kunci === "string" ? uraiKunci(kunci) : null;
  if (!urai) {
    // hak dasar dulu supaya Tamu selalu mendapat GalatAkses, bukan pesan validasi
    pastikanBacaLkps(p, "kriteria", p.prodiId);
    throw new GalatPengguna("Alamat berkas bukti tidak dikenal.");
  }
  await pastikanBacaProdiLkps(p, "kriteria", urai.prodiId);
  let isi: Buffer;
  try {
    isi = await bacaBerkas(kunci);
  } catch {
    throw new GalatPengguna("Berkas bukti tidak ditemukan.");
  }
  return { nama: urai.nama, mime: mimeDariNama(urai.nama), isi };
}

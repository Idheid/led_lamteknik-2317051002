import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { infoGambar, type InfoGambar } from "@/modules/led/ekspor/logo";

/**
 * D8 (desain form 2, 2 Nov 2026): logo perguruan tinggi untuk halaman muka LED. Khusus LED (LKPS berupa tabel Excel
 * tanpa sampul), satu logo untuk semua prodi, diunggah Admin UPPS. Semua peran boleh membaca (pratinjau halaman muka).
 */

export const UKURAN_LOGO_MAKS = 2 * 1024 * 1024;

export async function ambilLogo() {
  return prisma.logoSampul.findUnique({ where: { id: "utama" } });
}

export async function simpanLogo(p: Pengguna, berkas: { nama: string; isi: Buffer }) {
  pastikanAdmin(p);
  if (berkas.isi.length > UKURAN_LOGO_MAKS) throw new GalatPengguna("Logo terlalu besar; maksimal 2 MB.");
  const info = infoGambar(berkas.isi);
  if (!info) throw new GalatPengguna("Logo harus berupa gambar PNG atau JPEG.");
  if (info.lebar < 100 || info.tinggi < 100) throw new GalatPengguna("Logo terlalu kecil; minimal 100 × 100 piksel supaya tajam saat dicetak.");
  const lama = await ambilLogo();
  const simpan = await simpanBerkas("logo", berkas.nama, berkas.isi);
  const data = { lokasi: simpan.lokasi, nama: berkas.nama, jenis: info.jenis, lebar: info.lebar, tinggi: info.tinggi, ukuran: simpan.ukuran };
  const logo = await prisma.logoSampul.upsert({ where: { id: "utama" }, create: { id: "utama", ...data }, update: data });
  if (lama && lama.lokasi !== logo.lokasi) await hapusBerkas(lama.lokasi);
  await catatAktivitas(p, "unggah", "logo_sampul", logo.id, { nama: logo.nama });
  return logo;
}

export async function hapusLogo(p: Pengguna) {
  pastikanAdmin(p);
  const lama = await ambilLogo();
  if (!lama) return;
  await prisma.logoSampul.delete({ where: { id: "utama" } });
  await hapusBerkas(lama.lokasi);
  await catatAktivitas(p, "hapus", "logo_sampul", lama.id, { nama: lama.nama });
}

/** Isi dan ukuran logo untuk ekspor; null bila belum diunggah atau berkasnya hilang. */
export async function berkasLogo(): Promise<{ isi: Buffer; info: InfoGambar } | null> {
  const logo = await ambilLogo();
  if (!logo) return null;
  try {
    const isi = await bacaBerkas(logo.lokasi);
    const info = infoGambar(isi);
    return info ? { isi, info } : null;
  } catch {
    return null;
  }
}

/** Data URL untuk pratinjau di halaman (logo kecil, jadi disematkan langsung). */
export async function logoDataUrl(): Promise<string | null> {
  const b = await berkasLogo();
  return b ? `data:image/${b.info.jenis};base64,${b.isi.toString("base64")}` : null;
}

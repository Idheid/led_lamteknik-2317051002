import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, pastikanTimProdi, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { ambangPengingat } from "@/modules/bersama/domain/akreditasi";
import { syaratPeriodeBerikutnya } from "@/modules/led/domain/periode";
import { dataLedBaru, instrumenAktifUntuk, instrumenWajibAktif } from "@/modules/led/data/proyek";
import { skemaProyek, type MasukanProyek } from "@/modules/led/validasi";

/**
 * Mulai LED periode berikutnya (L4, 2 Nov 2026): satu tombol untuk Tim Prodi. Dalam satu transaksi LED lama diarsipkan
 * dan LED baru dibuat (bahan yang dipilih disalin, L5). Bila gagal di tengah, semuanya dibatalkan sehingga LED lama
 * tidak terlanjur diarsipkan. Tetap satu LED aktif per prodi.
 */

const GENERATE_AKTIF = ["antre", "berjalan", "tertunda"];

/** Keadaan untuk Menu LED dan Pengaturan LED: LED aktif, syarat, dan instrumen yang akan dipakai. */
export async function infoPeriodeBerikutnya(p: Pengguna, hariIni = new Date()) {
  pastikanTimProdi(p);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id: p.prodiId } });
  const lama = await prisma.proyekLED.findFirst({ where: { prodiId: prodi.id, diarsipkanPada: null }, orderBy: { createdAt: "desc" } });
  if (!lama) return null;
  const [hasil, final, versi] = await Promise.all([
    prisma.riwayatAkreditasi.count({ where: { proyekId: lama.id, status: { in: ["menunggu", "berlaku"] } } }),
    prisma.ekspor.count({ where: { proyekId: lama.id, jenis: "final", status: "siap" } }),
    instrumenAktifUntuk(prodi.jenjang),
  ]);
  const syarat = syaratPeriodeBerikutnya({
    ambang: ambangPengingat(prodi.akreditasiBerlakuSampai, hariIni), hasilTercatat: hasil > 0, statusReview: lama.statusReview, eksporFinal: final > 0,
  });
  return { prodi, lama, syarat, versi: versi ? { kode: versi.kode, nama: versi.nama } : null };
}

export async function mulaiLedPeriodeBerikutnya(p: Pengguna, masukan: MasukanProyek) {
  pastikanTimProdi(p);
  const data = skemaProyek.parse(masukan);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id: p.prodiId } });
  const versi = await instrumenWajibAktif(prodi.jenjang);
  const hasil = await prisma.$transaction(async (tx) => {
    const lama = await tx.proyekLED.findFirst({ where: { prodiId: prodi.id, diarsipkanPada: null }, orderBy: { createdAt: "desc" } });
    if (!lama) throw new GalatPengguna("Belum ada LED aktif. Gunakan kartu Mulai LED.");
    if (await tx.tugasGenerate.count({ where: { proyekId: lama.id, status: { in: GENERATE_AKTIF } } })) {
      throw new GalatPengguna(`Masih ada penyusunan berjalan di ${lama.nama}. Tunggu selesai atau batalkan dulu; LED lama tidak diarsipkan.`);
    }
    await tx.proyekLED.update({ where: { id: lama.id }, data: { diarsipkanPada: new Date() } });
    const baru = await tx.proyekLED.create({ data: dataLedBaru(prodi, versi, data) });
    return { lama, baru };
  });
  await catatAktivitas(p, "mulai_periode_berikutnya", "proyek", hasil.baru.id, { lama: hasil.lama.nama, baru: hasil.baru.nama, versi: versi.kode });
  return hasil;
}

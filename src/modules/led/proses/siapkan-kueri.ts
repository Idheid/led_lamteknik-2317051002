import { prisma } from "@/modules/bersama/db";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { modelEmbeddingAktif } from "@/modules/bersama/data/kunci-api";
import { vektorKueri } from "@/modules/led/data/vektor-kueri";
import { kueriPerUnsur } from "@/modules/led/domain/kueri-unsur";
import { kueriGenerate } from "@/modules/led/domain/rrf";
import { bacaVarian, berlakuUntukJenjang, varianUntukJenjang } from "@/modules/led/domain/instrumen";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";

/**
 * Rencana 10 Nov T9 (1): vektor kueri disiapkan di muka (tugas worker "siapkan-vektor-kueri"), supaya generate dan
 * "Uji cari" tidak memanggil embedding sama sekali. Kueri bergantung pada teks instrumen dan label TS proyek, jadi
 * disiapkan per LED: saat LED dibuat, saat versi instrumen diaktifkan, dan di awal "Susun seluruh LED".
 * Kueri yang sudah tersimpan dilewati (vektorKueri hanya meng-embedding yang belum ada, batch 100).
 */

/** Semua teks kueri satu LED: kueri per unsur (C-unsur) dan kueri gabungan (A/B), untuk semua sub-bagian bernarasi. */
export async function kueriProyek(proyekId: string): Promise<string[]> {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const sub = await prisma.subBagian.findMany({
    where: { bagian: { versiId: proyek.versiId }, tipe: { notIn: ["data", "otomatis"] } },
    include: { butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: true } } },
  });
  const teks = new Set<string>();
  for (const s of sub) {
    if (!berlakuUntukJenjang(s, proyek.jenjang)) continue;
    const instruksi = gantiLabelTS(varianUntukJenjang(bacaVarian(s.varian), proyek.jenjang)?.instruksi ?? "", proyek.tsTahunMulai);
    const butir = s.butir.map((r) => r.butir).sort((a, b) => a.urutan - b.urutan);
    for (const q of kueriPerUnsur(s.judul, instruksi, butir)) teks.add(q.teks);
    teks.add(kueriGenerate(s.judul, instruksi, butir));
  }
  return [...teks].filter((t) => t.trim());
}

export interface HasilSiapkanKueri {
  kueri: number;
  baru: number;
  permintaan: number;
}

export async function prosesSiapkanKueri(proyekId: string): Promise<HasilSiapkanKueri> {
  const teks = await kueriProyek(proyekId);
  const r = await vektorKueri(teks, { model: await modelEmbeddingAktif() });
  return { kueri: teks.length, baru: r.baru, permintaan: r.permintaan };
}

/** Kirim tugas penyiapan (gagal kirim tidak menghentikan aksi pengguna). */
export async function jadwalkanSiapkanKueri(proyekId: string): Promise<void> {
  await kirimTugas(ANTREAN.siapkanKueri, { proyekId }).catch((e) => console.error(`[siapkan-kueri] ${proyekId}:`, e instanceof Error ? e.message : e));
}

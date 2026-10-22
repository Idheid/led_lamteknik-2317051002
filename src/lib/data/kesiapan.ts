import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatPengguna, pastikanPenanggungJawab, type Pengguna } from "@/lib/akses";
import { ambilProyekUbah } from "@/lib/data/proyek";
import { catatAktivitas } from "@/lib/data/log";
import { berlakuUntukJenjang } from "@/lib/domain/instrumen";
import {
  bacaStatusReview, jadwalMundur, sisaBulan, statusTonggak, warnaKesiapan, TONGGAK,
  type KodeTonggak, type StatusReview, type StatusTonggak, type Tonggak, type WarnaKesiapan,
} from "@/lib/domain/kesiapan";
import { persenTerisi } from "@/lib/lkps/periksa";
import { CATATAN_BELUM_SELESAI } from "@/lib/domain/review";
import type { TabelBaca } from "@/lib/lkps/jenis";

/**
 * Kesiapan LED (revisi 22 Okt 2026): persentase LKPS terisi, sub-bagian berdraf/selesai, catatan asesor terbuka,
 * status review, sisa waktu sampai akreditasi berakhir, tanda warna, dan tonggak jadwal kerja mundur.
 */

export interface KesiapanLed {
  proyekId: string;
  lkpsPersen: number | null;
  sub: { total: number; draf: number; selesai: number };
  catatanTerbuka: number;
  review: StatusReview;
  sisaBulan: number | null;
  warna: WarnaKesiapan;
  batasPengajuan: string | null;
  tonggak: (Tonggak & { status: StatusTonggak })[];
}

export async function kesiapanLed(proyekId: string, hariIni = new Date()): Promise<KesiapanLed> {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId }, include: { prodi: true } });
  const [berkas, sub, draf, status, dokumen, ekspor] = await Promise.all([
    prisma.berkasLKPS.findFirst({ where: { proyekId, aktif: true }, include: { tabel: { select: { sheet: true, baris: true } } } }),
    prisma.subBagian.findMany({
      where: { bagian: { versiId: proyek.versiId }, tipe: { in: ["iku", "narasi", "bersama"] } },
      select: { id: true, berlakuUntuk: true, jenjangOverride: true, bagian: { select: { kode: true, jenis: true } } },
    }),
    prisma.bagianDraf.findMany({ where: { proyekId, versiAktifId: { not: null } }, select: { subBagianId: true, status: true } }),
    prisma.statusKriteria.findMany({ where: { proyekId }, select: { bagianKode: true, status: true } }),
    prisma.dokumen.count({ where: { proyekId } }),
    prisma.ekspor.count({ where: { proyekId, status: "siap" } }),
  ]);
  const berlaku = sub.filter((s) => berlakuUntukJenjang(s, proyek.jenjang));
  const idBerlaku = new Set(berlaku.map((s) => s.id));
  const drafBerlaku = draf.filter((d) => idBerlaku.has(d.subBagianId));
  const lkps = berkas ? persenTerisi(berkas.tabel as unknown as Pick<TabelBaca, "sheet" | "baris">[], proyek.jenjang).persen : null;

  const statusBagian = new Map(status.map((s) => [s.bagianKode, s.status]));
  const bagianKriteria = [...new Set(berlaku.filter((s) => s.bagian.jenis === "kriteria").map((s) => s.bagian.kode))];
  const bagianLain = [...new Set(berlaku.filter((s) => s.bagian.jenis !== "kriteria").map((s) => s.bagian.kode))];
  const semuaSelesai = (kode: string[]) => kode.length > 0 && kode.every((k) => statusBagian.get(k) === "selesai");
  const review = bacaStatusReview(proyek.statusReview);
  const tercapai: Record<KodeTonggak, boolean> = {
    lkps: (lkps ?? 0) >= 100 && dokumen > 0,
    kriteria: semuaSelesai(bagianKriteria),
    bab: semuaSelesai(bagianLain),
    review: review === "layak",
    ekspor: ekspor > 0 && review === "layak",
  };
  const ubahan = (proyek.jadwal ?? {}) as Record<string, string>;
  const tonggak = proyek.batasPengajuan
    ? jadwalMundur(proyek.batasPengajuan, ubahan).map((t) => ({ ...t, status: statusTonggak(t.tanggal, tercapai[t.kode], hariIni) }))
    : [];
  const sisa = sisaBulan(proyek.prodi.akreditasiBerlakuSampai, hariIni);
  return {
    proyekId,
    lkpsPersen: lkps,
    sub: { total: berlaku.length, draf: drafBerlaku.length, selesai: drafBerlaku.filter((d) => d.status === "selesai").length },
    // catatan revisi asesor yang masih terbuka (diisi setelah fitur asesor ada)
    catatanTerbuka: await hitungCatatanTerbuka(proyekId),
    review,
    sisaBulan: sisa,
    warna: proyek.diarsipkanPada ? null : warnaKesiapan(sisa, review),
    batasPengajuan: proyek.batasPengajuan?.toISOString().slice(0, 10) ?? null,
    tonggak,
  };
}

/** Jumlah catatan revisi asesor yang belum diterima. */
async function hitungCatatanTerbuka(proyekId: string): Promise<number> {
  return prisma.catatanRevisi.count({ where: { proyekId, status: { in: CATATAN_BELUM_SELESAI } } });
}

export async function kesiapanSemua(p: Pengguna, proyekIds: string[]): Promise<Map<string, KesiapanLed>> {
  pastikanPenanggungJawab(p);
  const hasil = await Promise.all(proyekIds.map((id) => kesiapanLed(id)));
  return new Map(hasil.map((k) => [k.proyekId, k]));
}

const skemaJadwal = z.object({
  batasPengajuan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak sah.").nullable(),
  jadwal: z.partialRecord(z.enum(TONGGAK.map((t) => t.kode) as [KodeTonggak, ...KodeTonggak[]]), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()).default({}),
});

/** PJ mengisi batas pengajuan dan (opsional) mengubah tanggal tonggak; tonggak kosong = dihitung mundur otomatis. */
export async function simpanJadwal(p: Pengguna, proyekId: string, masukan: z.input<typeof skemaJadwal>) {
  const data = skemaJadwal.parse(masukan);
  const proyek = await ambilProyekUbah(p, proyekId);
  const jadwal = Object.fromEntries(Object.entries(data.jadwal).filter(([, v]) => v));
  if (data.batasPengajuan) {
    for (const [k, v] of Object.entries(jadwal)) {
      if (v! > data.batasPengajuan) throw new GalatPengguna(`Tanggal tonggak "${TONGGAK.find((t) => t.kode === k)?.nama}" melewati batas pengajuan.`);
    }
  }
  await prisma.proyekLED.update({
    where: { id: proyek.id },
    data: { batasPengajuan: data.batasPengajuan ? new Date(`${data.batasPengajuan}T00:00:00Z`) : null, jadwal },
  });
  await catatAktivitas(p, "ubah_jadwal", "proyek", proyek.id, { batasPengajuan: data.batasPengajuan });
}

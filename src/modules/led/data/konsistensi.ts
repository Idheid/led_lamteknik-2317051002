import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { type Pengguna } from "@/modules/bersama/akses";
import { ambilProyek, ambilProyekUbah } from "@/modules/led/data/proyek";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { nilaiButirUntukProyek } from "@/modules/led/data/nilai-butir";
import { angkaTeks } from "@/modules/led/domain/capaian";
import { kodeSumberManual } from "@/modules/led/domain/butir-angka";
import { periksaKonsistensi, type MetrikAcuan, type PerbedaanAngka } from "@/modules/led/domain/konsistensi";
import { bacaDokumen } from "@/modules/led/domain/narasi";

/**
 * Cek konsistensi angka antar kriteria untuk pemeriksaan ekspor (revisi 22 Okt 2026). Perbedaan yang disengaja
 * (mis. jumlah DTPS pada tahun berbeda) bisa diberi alasan supaya ekspor final tidak ditahan.
 */

export type PerbedaanBeralasan = PerbedaanAngka & { alasan: string | null };

export async function konsistensiUntukProyek(proyek: { id: string; versiId: string; jenjang: string; tsTahunMulai: number; alasanKonsistensi: unknown }): Promise<PerbedaanBeralasan[]> {
  const metrik = new Map<string, MetrikAcuan>();
  for (const n of (await nilaiButirUntukProyek(proyek)).daftar) {
    for (const m of n.hasil?.metrik ?? []) {
      if (m.nilai === null || metrik.has(m.kode)) continue;
      metrik.set(m.kode, { kode: m.kode, nama: m.nama, nilai: m.satuan === "persen" ? Math.round(m.nilai * 10_000) / 100 : m.nilai });
    }
    const v = n.manual ? angkaTeks(n.manual.nilai) : null;
    if (v !== null) metrik.set(kodeSumberManual(n.butir), { kode: kodeSumberManual(n.butir), nama: `Nilai hitung butir ${n.butir}`, nilai: v });
  }
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId: proyek.id, versiAktifId: { not: null } },
    select: { versiAktifId: true, subBagian: { select: { kode: true, label: true, judul: true, bagian: { select: { kode: true } } } } },
  });
  const versi = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } }, select: { id: true, isi: true } });
  const hasil = periksaKonsistensi(
    draf.map((d) => ({
      subKode: d.subBagian.kode,
      label: `${d.subBagian.bagian.kode} ${d.subBagian.label || d.subBagian.judul}`.trim(),
      bagianKode: d.subBagian.bagian.kode,
      doc: bacaDokumen(versi.find((v) => v.id === d.versiAktifId)?.isi),
    })),
    metrik,
  );
  const alasan = (proyek.alasanKonsistensi ?? {}) as Record<string, string>;
  return hasil.map((p) => ({ ...p, alasan: alasan[p.kunci]?.trim() || null }));
}

export async function konsistensiProyek(p: Pengguna, proyekId: string) {
  return konsistensiUntukProyek(await ambilProyek(p, proyekId));
}

const skema = z.object({ kunci: z.string().trim().min(1).max(200), alasan: z.string().trim().max(500) });

/** Beri (atau hapus, bila kosong) alasan untuk satu perbedaan angka yang disengaja. */
export async function simpanAlasanKonsistensi(p: Pengguna, proyekId: string, masukan: z.input<typeof skema>) {
  const data = skema.parse(masukan);
  const proyek = await ambilProyekUbah(p, proyekId);
  const lama = (proyek.alasanKonsistensi ?? {}) as Record<string, string>;
  const { [data.kunci]: _hapus, ...sisa } = lama;
  const baru = data.alasan ? { ...sisa, [data.kunci]: data.alasan } : sisa;
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { alasanKonsistensi: baru as Prisma.InputJsonValue } });
  await catatAktivitas(p, "alasan_konsistensi", "proyek", proyek.id, { kunci: data.kunci });
}

import "server-only";
import type { Pengguna } from "@/lib/akses";
import { bagianProyek, butirAnggaranProyek, halamanBagian } from "@/lib/data/proyek";
import { drafBagian, tugasProyek, STATUS_TUGAS_AKTIF } from "@/lib/data/generate";
import { bacaAnggaran, targetKataSubBagian } from "@/lib/domain/anggaran-proyek";
import { hitungAnggaran } from "@/lib/domain/anggaran";
import { statusSubBagian, subDigenerate, type StatusSub } from "@/lib/domain/navigasi";

/**
 * Data bersama ringkasan kriteria dan halaman sub-bagian (revisi 19 Okt 2026: satu sub-bagian satu halaman):
 * sub-bagian berurutan beserta status, target kata, draf, dan urutan bagian untuk navigasi lintas kriteria.
 */
export async function muatKriteria(p: Pengguna, proyekId: string, kode: string) {
  const data = await halamanBagian(p, proyekId, kode);
  if (!data) return null;
  const { proyek, bagian, jawaban } = data;
  const [{ butir: butirAnggaran }, draf, tugas, { bagian: semuaBagian }] = await Promise.all([
    butirAnggaranProyek(p, proyekId), drafBagian(p, proyekId, kode), tugasProyek(p, proyekId), bagianProyek(p, proyekId),
  ]);
  const { pengaturan, bagian: bagianAnggaran } = bacaAnggaran(proyek.anggaran);
  const anggaran = hitungAnggaran(bagianAnggaran, butirAnggaran, pengaturan);
  const target = targetKataSubBagian(
    anggaran,
    bagian.kode,
    bagian.subBagian.map((s) => ({ kode: s.kode, tipe: s.tipe, butir: s.butir.map((b) => b.kode) })),
  );
  const tugasAktif = tugas.filter((t) => STATUS_TUGAS_AKTIF.includes(t.status));
  const statusSub: Record<string, StatusSub> = Object.fromEntries(bagian.subBagian.map((s) => [
    s.kode,
    statusSubBagian({ tipe: s.tipe, jawaban: jawaban[s.kode], adaDraf: Boolean(draf[s.kode]?.aktif), statusDraf: draf[s.kode]?.status }),
  ]));
  const subGenerate = bagian.subBagian.filter((s) => subDigenerate(s.tipe));
  const semuaButir = bagian.subBagian.flatMap((s) => s.butir);
  return {
    proyek,
    bagian,
    jawaban,
    draf,
    target,
    statusSub,
    subGenerate,
    jumlahDraf: subGenerate.filter((s) => draf[s.kode]?.aktif).length,
    jumlahDrafIku: bagian.subBagian.filter((s) => s.tipe === "iku" && draf[s.kode]?.aktif).length,
    // butir bisa terkait ke lebih dari satu sub-bagian; bobot dihitung sekali per butir
    bobot: [...new Map(semuaButir.map((b) => [b.kode, Number(b.bobot)])).values()].reduce((n, x) => n + x, 0),
    jumlahButir: new Set(semuaButir.map((b) => b.kode)).size,
    anggaranBagian: anggaran.bagian.find((b) => b.kode === bagian.kode) ?? null,
    status: proyek.status.find((s) => s.bagianKode === bagian.kode)?.status ?? "belum",
    tugasAktif,
    sedangDisusun: tugasAktif.some((t) => t.bagianKode === bagian.kode),
    urutanBagian: semuaBagian.map((b) => ({ kode: b.kode, nama: b.nama })),
  };
}

export type DataKriteria = NonNullable<Awaited<ReturnType<typeof muatKriteria>>>;

export function hrefSub(proyekId: string, bagianKode: string, subKode: string) {
  return `/proyek/${proyekId}/bagian/${encodeURIComponent(bagianKode)}/${encodeURIComponent(subKode)}`;
}

export function hrefKriteria(proyekId: string, bagianKode: string) {
  return `/proyek/${proyekId}/bagian/${encodeURIComponent(bagianKode)}`;
}

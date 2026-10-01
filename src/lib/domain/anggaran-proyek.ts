/**
 * Membaca pengaturan anggaran yang disimpan per proyek (salinan `anggaranBawaan` versi instrumen)
 * menjadi masukan `hitungAnggaran`. Nilai yang hilang diisi dari PENGATURAN_BAWAAN.
 */
import { PENGATURAN_BAWAAN } from './anggaran.ts';
import type { BagianAnggaran, JenisBagian, KodeBersama, PengaturanAnggaran } from './anggaran.ts';

const JENIS_SAH: JenisBagian[] = ['awal', 'bab', 'butir', 'kriteria', 'cadangan', 'lampiran'];

export interface AnggaranTersimpan {
  pengaturan: PengaturanAnggaran;
  bagian: BagianAnggaran[];
}

function angka(v: unknown, cadangan: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : cadangan;
}

function objek(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function bacaAnggaran(json: unknown): AnggaranTersimpan {
  const a = objek(json);
  const b = PENGATURAN_BAWAAN;
  const pb = objek(a.porsiBersama);
  const porsiBersama = Object.fromEntries(
    (Object.keys(b.porsiBersama) as KodeBersama[]).map((k) => [k, angka(pb[k], b.porsiBersama[k])]),
  ) as Record<KodeBersama, number>;
  const pengaturan: PengaturanAnggaran = {
    batasHalamanTotal: angka(a.batasHalamanTotal, b.batasHalamanTotal),
    kataPerHalaman: angka(a.kataPerHalaman, b.kataPerHalaman),
    faktorAngka: angka(a.faktorAngka, b.faktorAngka),
    faktorNarasi: angka(a.faktorNarasi, b.faktorNarasi),
    porsiIkuDalamKriteria: angka(a.porsiIkuDalamKriteria, b.porsiIkuDalamKriteria),
    halamanMinimumKriteria: angka(a.halamanMinimumKriteria, b.halamanMinimumKriteria),
    kataMinimumButir: angka(a.kataMinimumButir, b.kataMinimumButir),
    porsiBersama,
  };
  const halaman = objek(a.halamanPerBagian);
  const jenis = objek(a.jenisBagianAnggaran);
  const bagian: BagianAnggaran[] = Object.keys(halaman).map((kode) => {
    const j = jenis[kode];
    return {
      kode,
      jenis: JENIS_SAH.includes(j as JenisBagian) ? (j as JenisBagian) : 'bab',
      halaman: angka(halaman[kode], 0),
    };
  });
  return { pengaturan, bagian };
}

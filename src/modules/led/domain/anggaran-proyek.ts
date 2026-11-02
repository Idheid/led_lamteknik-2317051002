/**
 * Membaca pengaturan anggaran yang disimpan per proyek (salinan `anggaranBawaan` versi instrumen)
 * menjadi masukan `hitungAnggaran`. Nilai yang hilang diisi dari PENGATURAN_BAWAAN.
 */
import { bulatkan, PENGATURAN_BAWAAN } from './anggaran.ts';
import type { BagianAnggaran, HasilAnggaran, JenisBagian, KodeBersama, PengaturanAnggaran } from './anggaran.ts';

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

export interface SubBagianTarget {
  kode: string;
  tipe: string;
  butir: string[];
}

/**
 * Target kata per sub-bagian di satu bagian:
 * - sub-bagian bersama kriteria (LB, KEB, AF, SWOT) dari `kataBersama`;
 * - sub-bagian yang punya butir = jumlah target kata butirnya;
 * - sub-bagian narasi di bab tanpa butir = kata bagian dibagi rata (perkiraan);
 * - sub-bagian data/otomatis tidak punya target (null).
 */
export function targetKataSubBagian(
  hasil: HasilAnggaran,
  kodeBagian: string,
  sub: SubBagianTarget[],
): Record<string, number | null> {
  const bagian = hasil.bagian.find((b) => b.kode === kodeBagian);
  const kataButir = new Map(hasil.butir.map((b) => [b.kode, b.targetKata]));
  const tanpaButir = sub.filter((s) => s.butir.length === 0 && (s.tipe === 'narasi' || s.tipe === 'iku'));
  const kataNarasiRata = bagian && bagian.kataUntukButir === 0 && tanpaButir.length > 0
    ? bulatkan(bagian.kataTotal / tanpaButir.length, 10)
    : null;
  const hasilSub: Record<string, number | null> = {};
  for (const s of sub) {
    const bersama = kodeBersamaDari(s.kode);
    if (s.tipe === 'bersama' && bersama && bagian?.kataBersama) hasilSub[s.kode] = bagian.kataBersama[bersama];
    else if (s.butir.length > 0) hasilSub[s.kode] = s.butir.reduce((n, k) => n + (kataButir.get(k) ?? 0), 0);
    else if (s.tipe === 'narasi' || s.tipe === 'iku') hasilSub[s.kode] = kataNarasiRata;
    else hasilSub[s.kode] = null;
  }
  return hasilSub;
}

function kodeBersamaDari(kode: string): KodeBersama | null {
  const akhir = kode.split('-').pop();
  return akhir === 'LB' || akhir === 'KEB' || akhir === 'AF' || akhir === 'SWOT' ? akhir : null;
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

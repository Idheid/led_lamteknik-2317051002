/**
 * Anggaran halaman dan kata.
 *
 * Aturan (dokumen rencana, bagian "Anggaran halaman dan panjang narasi"; lembar kerja
 * "Matriks butir LED Sarjana.xlsx" memakai rumus yang sama):
 * - Total LED maksimal 150 halaman, sudah termasuk cover dan kata pengantar.
 * - Kriteria (C.1-C.7): 35% jatah untuk sub-bagian bersama (latar belakang, kebijakan,
 *   analisis faktor, SWOT), 65% untuk butir IKU.
 * - Bagian berjenis "butir" (II.B, Bab III) seluruhnya dibagi ke butirnya.
 * - Di dalam satu bagian: kata butir i = kataUntukButir x (b_i x f_i) / jumlah(b x f),
 *   f = 1 untuk narasi, 0,5 untuk angka.
 * - Target kata dibulatkan ke puluhan terdekat.
 */

export type JenisBagian = 'awal' | 'bab' | 'butir' | 'kriteria' | 'cadangan' | 'lampiran';
export type JenisButir = 'narasi' | 'angka';
export type KodeBersama = 'LB' | 'KEB' | 'AF' | 'SWOT';

export interface PengaturanAnggaran {
  batasHalamanTotal: number;
  kataPerHalaman: number;
  faktorAngka: number;
  faktorNarasi: number;
  porsiIkuDalamKriteria: number;
  halamanMinimumKriteria: number;
  kataMinimumButir: number;
  porsiBersama: Record<KodeBersama, number>;
}

export const PENGATURAN_BAWAAN: PengaturanAnggaran = {
  batasHalamanTotal: 150,
  kataPerHalaman: 425,
  faktorAngka: 0.5,
  faktorNarasi: 1,
  porsiIkuDalamKriteria: 0.65,
  halamanMinimumKriteria: 4,
  kataMinimumButir: 150,
  porsiBersama: { LB: 0.2, KEB: 0.2, AF: 0.3, SWOT: 0.3 },
};

export interface BagianAnggaran {
  kode: string;
  jenis: JenisBagian;
  /** Halaman yang dipakai (diisi pengguna atau dari usulan). */
  halaman: number;
}

export interface ButirAnggaran {
  kode: string;
  bagian: string;
  bobot: number;
  jenis: JenisButir;
}

export interface HasilBagian {
  kode: string;
  jenis: JenisBagian;
  halaman: number;
  bobot: number;
  bobotEfektif: number;
  kataTotal: number;
  kataUntukButir: number;
  /** Hanya untuk kriteria: kata per sub-bagian bersama. */
  kataBersama: Record<KodeBersama, number> | null;
}

export interface HasilButir {
  kode: string;
  bagian: string;
  bobotEfektif: number;
  porsi: number;
  targetKata: number;
  setaraHalaman: number;
  /** Target di bawah kata minimum: butir angka cukup tabel + 1 paragraf, butir narasi perlu dicek. */
  pendek: boolean;
}

export interface HasilAnggaran {
  bagian: HasilBagian[];
  butir: HasilButir[];
  totalHalaman: number;
  halamanUntukKriteria: number;
  melebihiBatas: boolean;
}

/** Pembulatan setengah ke atas seperti ROUND di Excel (untuk bilangan positif). */
export function bulatkan(n: number, kelipatan = 1): number {
  return Math.round(n / kelipatan + 1e-9) * kelipatan;
}

export function faktorJenis(jenis: JenisButir, p: PengaturanAnggaran = PENGATURAN_BAWAAN): number {
  return jenis === 'angka' ? p.faktorAngka : p.faktorNarasi;
}

function porsiButirBagian(jenis: JenisBagian, p: PengaturanAnggaran): number {
  if (jenis === 'kriteria') return p.porsiIkuDalamKriteria;
  if (jenis === 'butir') return 1;
  return 0;
}

/**
 * Usulan halaman per kriteria: halaman yang tersisa untuk kriteria dibagi menurut bobot efektif,
 * kriteria di bawah minimum dinaikkan ke minimum, sisanya dibagi lagi (satu langkah, sama dengan lembar kerja).
 * Mengembalikan nilai pecahan; pembulatan diserahkan ke pemanggil.
 */
export function usulanHalamanKriteria(
  bagian: BagianAnggaran[],
  butir: ButirAnggaran[],
  p: PengaturanAnggaran = PENGATURAN_BAWAAN,
): Record<string, number> {
  const kriteria = bagian.filter((b) => b.jenis === 'kriteria');
  const halamanLain = bagian.filter((b) => b.jenis !== 'kriteria').reduce((s, b) => s + b.halaman, 0);
  const tersedia = p.batasHalamanTotal - halamanLain;
  const efektif: Record<string, number> = {};
  for (const k of kriteria) {
    efektif[k.kode] = butir
      .filter((t) => t.bagian === k.kode)
      .reduce((s, t) => s + t.bobot * faktorJenis(t.jenis, p), 0);
  }
  const totalEfektif = Object.values(efektif).reduce((s, v) => s + v, 0);
  if (totalEfektif === 0) return Object.fromEntries(kriteria.map((k) => [k.kode, 0]));
  const mentah: Record<string, number> = {};
  for (const k of kriteria) mentah[k.kode] = (tersedia * efektif[k.kode]) / totalEfektif;
  const diMinimum = kriteria.filter((k) => mentah[k.kode] < p.halamanMinimumKriteria);
  const efektifSisa = kriteria
    .filter((k) => mentah[k.kode] >= p.halamanMinimumKriteria)
    .reduce((s, k) => s + efektif[k.kode], 0);
  const sisa = tersedia - p.halamanMinimumKriteria * diMinimum.length;
  const hasil: Record<string, number> = {};
  for (const k of kriteria) {
    hasil[k.kode] = mentah[k.kode] < p.halamanMinimumKriteria
      ? p.halamanMinimumKriteria
      : efektifSisa === 0 ? 0 : (sisa * efektif[k.kode]) / efektifSisa;
  }
  return hasil;
}

export function hitungAnggaran(
  bagian: BagianAnggaran[],
  butir: ButirAnggaran[],
  p: PengaturanAnggaran = PENGATURAN_BAWAAN,
): HasilAnggaran {
  const hasilBagian: HasilBagian[] = bagian.map((b) => {
    const isi = butir.filter((t) => t.bagian === b.kode);
    const bobot = isi.reduce((s, t) => s + t.bobot, 0);
    const bobotEfektif = isi.reduce((s, t) => s + t.bobot * faktorJenis(t.jenis, p), 0);
    const kataTotal = b.halaman * p.kataPerHalaman;
    const kataUntukButir = kataTotal * porsiButirBagian(b.jenis, p);
    let kataBersama: Record<KodeBersama, number> | null = null;
    if (b.jenis === 'kriteria') {
      const kataSisa = kataTotal * (1 - p.porsiIkuDalamKriteria);
      kataBersama = {
        LB: bulatkan(kataSisa * p.porsiBersama.LB, 10),
        KEB: bulatkan(kataSisa * p.porsiBersama.KEB, 10),
        AF: bulatkan(kataSisa * p.porsiBersama.AF, 10),
        SWOT: bulatkan(kataSisa * p.porsiBersama.SWOT, 10),
      };
    }
    return { kode: b.kode, jenis: b.jenis, halaman: b.halaman, bobot, bobotEfektif, kataTotal, kataUntukButir, kataBersama };
  });

  const peta = new Map(hasilBagian.map((h) => [h.kode, h]));
  const hasilButir: HasilButir[] = butir.map((t) => {
    const hb = peta.get(t.bagian);
    if (!hb) throw new Error(`Butir ${t.kode} menunjuk bagian yang tidak ada: ${t.bagian}`);
    const bobotEfektif = t.bobot * faktorJenis(t.jenis, p);
    const porsi = hb.bobotEfektif === 0 ? 0 : bobotEfektif / hb.bobotEfektif;
    const targetKata = bulatkan(hb.kataUntukButir * porsi, 10);
    return {
      kode: t.kode,
      bagian: t.bagian,
      bobotEfektif,
      porsi,
      targetKata,
      setaraHalaman: bulatkan((targetKata / p.kataPerHalaman) * 10) / 10,
      pendek: targetKata < p.kataMinimumButir,
    };
  });

  const totalHalaman = bagian.reduce((s, b) => s + b.halaman, 0);
  const halamanUntukKriteria = p.batasHalamanTotal - bagian.filter((b) => b.jenis !== 'kriteria').reduce((s, b) => s + b.halaman, 0);
  return { bagian: hasilBagian, butir: hasilButir, totalHalaman, halamanUntukKriteria, melebihiBatas: totalHalaman > p.batasHalamanTotal };
}

/** Rentang panjang yang diterima pemeriksaan otomatis (target +/- toleransi). */
export function rentangKata(target: number, toleransi = 0.15): { min: number; maks: number } {
  return { min: Math.floor(target * (1 - toleransi)), maks: Math.ceil(target * (1 + toleransi)) };
}

/**
 * Aturan instrumen yang tidak bergantung pada basis data.
 * - Sub-bagian ditampilkan hanya bila berlaku untuk jenjang proyek (`berlakuUntuk`, kecuali ditimpa `jenjangOverride`).
 * - Instruksi diambil dari varian yang memuat jenjang proyek.
 * - Kode versi salinan dibuat unik dari kode asal.
 */

export const JENJANG = [
  { kode: 'D1', nama: 'Diploma Satu' },
  { kode: 'D2', nama: 'Diploma Dua' },
  { kode: 'D3', nama: 'Diploma Tiga' },
  { kode: 'S1', nama: 'Sarjana' },
  { kode: 'STr', nama: 'Sarjana Terapan' },
  { kode: 'S2', nama: 'Magister' },
  { kode: 'S2Tr', nama: 'Magister Terapan' },
  { kode: 'S3', nama: 'Doktor' },
  { kode: 'S3Tr', nama: 'Doktor Terapan' },
  { kode: 'PPI', nama: 'Program Profesi Insinyur' },
] as const;

export type KodeJenjang = (typeof JENJANG)[number]['kode'];
export const KODE_JENJANG = JENJANG.map((j) => j.kode) as [KodeJenjang, ...KodeJenjang[]];

export function namaJenjang(kode: string): string {
  return JENJANG.find((j) => j.kode === kode)?.nama ?? kode;
}

export interface VarianInstruksi {
  instruksi: string;
  jenjang: string[];
  catatanTemplate?: string | null;
}

export interface SubBagianBerjenjang {
  berlakuUntuk: string[];
  jenjangOverride?: string[] | null;
}

/** Jenjang yang benar-benar berlaku: penimpaan (bila diisi) mengalahkan `berlakuUntuk`. */
export function jenjangBerlaku(s: SubBagianBerjenjang): string[] {
  return s.jenjangOverride && s.jenjangOverride.length > 0 ? s.jenjangOverride : s.berlakuUntuk;
}

export function berlakuUntukJenjang(s: SubBagianBerjenjang, jenjang: string): boolean {
  return jenjangBerlaku(s).includes(jenjang);
}

/** Varian instruksi untuk jenjang; bila tidak ada yang cocok, varian pertama (sub-bagian yang ditimpa jenjangnya). */
export function varianUntukJenjang(varian: VarianInstruksi[], jenjang: string): VarianInstruksi | null {
  return varian.find((v) => v.jenjang.includes(jenjang)) ?? varian[0] ?? null;
}

/** Baca kolom JSON `varian` dengan aman. */
export function bacaVarian(nilai: unknown): VarianInstruksi[] {
  if (!Array.isArray(nilai)) return [];
  return nilai.flatMap((v) => {
    if (typeof v !== 'object' || v === null) return [];
    const o = v as Record<string, unknown>;
    if (typeof o.instruksi !== 'string' || !Array.isArray(o.jenjang)) return [];
    return [{
      instruksi: o.instruksi,
      jenjang: o.jenjang.filter((x): x is string => typeof x === 'string'),
      catatanTemplate: typeof o.catatanTemplate === 'string' ? o.catatanTemplate : null,
    }];
  });
}

/** Kode versi salinan yang belum dipakai: KODE-SALINAN, KODE-SALINAN-2, ... */
export function kodeSalinan(kodeAsal: string, kodeTerpakai: Iterable<string>): string {
  const pakai = new Set(kodeTerpakai);
  const dasar = `${kodeAsal}-SALINAN`;
  if (!pakai.has(dasar)) return dasar;
  for (let i = 2; ; i++) {
    const k = `${dasar}-${i}`;
    if (!pakai.has(k)) return k;
  }
}

/** Kode sub-bagian bersama di setiap kriteria (akhiran kode, misalnya C.3-LB). */
export const SUB_BERSAMA = ['LB', 'KEB', 'AF', 'SWOT'] as const;
export type KodeSubBersama = (typeof SUB_BERSAMA)[number];

export function kodeBersama(kodeSubBagian: string): KodeSubBersama | null {
  const akhir = kodeSubBagian.split('-').pop();
  return SUB_BERSAMA.find((k) => k === akhir) ?? null;
}

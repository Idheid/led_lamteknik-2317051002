/**
 * Jenjang program studi LAM Teknik (10 jenjang). Dipakai bersama: data prodi (modul bersama), instrumen dan LED
 * (modul LED), dan nanti tabel LKPS (modul LKPS). Dipisah dari domain instrumen LED (31 Okt 2026).
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

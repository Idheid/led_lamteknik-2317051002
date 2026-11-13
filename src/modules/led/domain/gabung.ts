import { perluRingkasanIku, perluRingkasanSemua } from './narasi.ts';

/**
 * Rencana 10 Nov T9 (4): mode hemat (opsional, bawaan mati). Sampai 3 sub-bagian berurutan dari kriteria yang sama
 * dikirim dalam satu panggilan AI bila target kata masing-masing ≤ 250 dan total potongan ≤ 20. Indikator kinerja (IKU),
 * analisis faktor (AF), SWOT, serta bab penutup/ringkasan (kata pengantar, ringkasan, Bab III, Bab IV) tidak digabung.
 * Tujuannya mengurangi jumlah permintaan (batas harian), bukan mempercepat.
 */

export const MAKS_GABUNG = 3;
export const MAKS_KATA_GABUNG = 250;
export const MAKS_POTONGAN_GABUNG = 20;

export function bolehDigabung(kode: string): boolean {
  return !/-IKU-/.test(kode) && !perluRingkasanIku(kode) && !perluRingkasanSemua(kode);
}

export interface CalonGabung {
  kode: string;
  targetKata: number;
  potongan: number;
}

/**
 * Jumlah sub-bagian terdepan yang digabung (0 atau 1 = tidak digabung). Calon sudah berurutan dalam satu kriteria;
 * pengumpulan berhenti pada sub-bagian pertama yang tidak memenuhi syarat.
 */
export function jumlahGabung(calon: CalonGabung[]): number {
  let n = 0;
  let potongan = 0;
  for (const c of calon.slice(0, MAKS_GABUNG)) {
    if (!bolehDigabung(c.kode) || c.targetKata > MAKS_KATA_GABUNG || potongan + c.potongan > MAKS_POTONGAN_GABUNG) break;
    potongan += c.potongan;
    n += 1;
  }
  return n >= 2 ? n : 0;
}

export const ATURAN_GABUNG = [
  'MODE GABUNG: pengguna mengirim beberapa SUB-BAGIAN sekaligus. Tulis setiap sub-bagian secara terpisah dan lengkap menurut aturan di atas.',
  'Kode sumber (D1, U1, M-…, T-…, J, P) dan kutipan bukti hanya berlaku di dalam sub-bagian tempat kode itu tercantum; jangan memakai potongan sub-bagian lain.',
  'Keluarkan JSON {"subBagian": [ ... ]}: satu objek per sub-bagian, berurutan, masing-masing berisi "kode" (kode sub-bagian) dan isi keluaran satu sub-bagian (bukti, paragraf, unsur, dokumenKurang, catatanUntukPenyusun).',
].join('\n');

export function susunPenggunaGabung(bagian: { kode: string; pengguna: string }[]): string {
  return bagian.map((b, i) => `# SUB-BAGIAN ${i + 1} (kode ${b.kode})\n\n${b.pengguna}`).join('\n\n---\n\n');
}

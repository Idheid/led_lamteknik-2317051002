import { dariSarjana, salinRumus, skorAmbang, type RumusJenjang } from './bersama.ts';
import { produkDiadopsi, publikasiPagelaran, sertifikasiDtps } from './vokasi.ts';
import { RUMUS_S2 } from './s2.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Magister Terapan (S2Tr), dari docs/rumus/RUMUS-S2TR.md. Tabel 6.d sama
 * dengan Magister; publikasi memakai 4.e/6.e.2 dan ada tabel vokasi 4.g/6.e.4. Butir yang aturannya sama dengan
 * Magister memakai rumus S2 dengan nomor butir S2Tr. Butir 15 dan 28 kualitatif.
 */

const J = 'S2Tr';
const s2 = (butir: string) => RUMUS_S2.find((r) => r.butir === butir)!;

/** Nomor butir S2Tr → nomor butir Magister yang aturannya sama. */
const SAMA_S2: Record<string, string> = {
  '6-I': '6-I', '6-II': '6-II', '9': '9', '10': '10', '11': '11', '22': '22', '24': '24', '25': '25', '26': '26',
  '29': '28', '30': '29', '31': '30', '37': '35', '40': '38', '41': '39', '42': '40', '44': '41', '45': '42',
  '47': '44', '49': '46', '50': '47',
};

export const RUMUS_S2TR: RumusJenjang[] = [
  ...Object.entries(SAMA_S2).map(([b, dasar]) => salinRumus(s2(dasar), J, b)),
  // hlm. 16: PPDMhs ≥ 75% → 4; < 75% → 1 + 6 × PPDMhs
  dariSarjana(J, '21', '23', (v) => ({ skor: skorAmbang(v.PPDMhs, 0.75, (p) => 1 + 6 * p, 1) })),
  // hlm. 18: sertifikasi DTPS (PDSK ≥ 50% → 4; 1 + 6 × PDSK)
  sertifikasiDtps(J, '27', (p) => skorAmbang(p, 0.5, (x) => 1 + 6 * x, 1)),
  // hlm. 20: publikasi + pagelaran DTPS (Tabel 4.e), faktor a = 0,5; b = 0,5; c = 1
  publikasiPagelaran(J, '32', { sheet: '4e', penyebut: 'NDTPS', a: 0.5, b: 0.5, c: 1, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah DTPS' }),
  // hlm. 21: RLP sama dengan Sarjana (≥ 3; 2 + 2 × RLP / 3)
  dariSarjana(J, '33', '34'),
  // hlm. 21: produk/jasa DTPS diadopsi (Tabel 4.g): NAPJ ≥ 3 → 4; < 3 → 1 + NAPJ
  produkDiadopsi(J, '34', { sheet: '4g', perDtps: false, skor: (n) => skorAmbang(n, 3, (x) => 1 + x, 1) }),
  // hlm. 22: PKDTPS ≥ 30% → 4; < 30% → 1 + 10 × PKDTPS
  dariSarjana(J, '35', '35', (v) => ({ skor: skorAmbang(v.PKDTPS, 0.3, (p) => 1 + 10 * p, 1) })),
  // hlm. 22: PKIB ≥ 30% → 4; < 30% → 2 + 2 × PKIB(%) / 30
  dariSarjana(J, '36', '36', (v) => ({
    skor: skorAmbang(v.PKIB, 0.3, (p) => 2 + (2 * p * 100) / 30, 2),
    catatan: ['PKIB dalam rumus skor ditulis dalam persen (30% → skor 4).'],
  })),
  // hlm. 29: produk/jasa mahasiswa diadopsi (Tabel 6.e.4): NAPJ ≥ 3 → 4; < 3 → 1 + NAPJ
  produkDiadopsi(J, '43', { sheet: '6e4', perDtps: false, skor: (n) => skorAmbang(n, 3, (x) => 1 + x, 1) }),
  // hlm. 30: publikasi + pagelaran mahasiswa (Tabel 6.e.2), faktor a = 0,1%; b = 20%; c = 70%
  publikasiPagelaran(J, '46', { sheet: '6e2', penyebut: 'NM', a: 0.001, b: 0.2, c: 0.7, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah mahasiswa' }),
];

export const MANUAL_S2TR: Record<string, string> = {};

import { dariSarjana, salinRumus, skorAmbang, type RumusJenjang } from './bersama.ts';
import { produkDiadopsi, publikasiPagelaran, sertifikasiDtps } from './vokasi.ts';
import { RUMUS_S3 } from './s3.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Doktor Terapan (S3Tr), dari docs/rumus/RUMUS-S3TR.md. Tabel 6.d sama
 * dengan Doktor; publikasi memakai 4.e/6.e.2 dan ada tabel vokasi 4.g/6.e.4. Butir yang aturannya sama dengan Doktor
 * memakai rumus S3 dengan nomor butir S3Tr. Butir 15 kualitatif.
 */

const J = 'S3Tr';
const s3 = (butir: string) => RUMUS_S3.find((r) => r.butir === butir)!;

/** Nomor butir S3Tr → nomor butir Doktor yang aturannya sama. */
const SAMA_S3: Record<string, string> = {
  '6-I': '6-I', '6-II': '6-II', '9': '9', '10': '10', '11': '11', '21': '21', '22': '22', '24': '24', '25': '25', '26': '26',
  '29': '28', '30': '29', '31': '30', '33': '32', '40': '38', '41': '39', '42': '40', '44': '41', '45': '42', '47': '44',
};

export const RUMUS_S3TR: RumusJenjang[] = [
  ...Object.entries(SAMA_S3).map(([b, dasar]) => salinRumus(s3(dasar), J, b)),
  // hlm. 17: sertifikasi DTPS: PDSK ≥ 50% → 4; 1 + 30 × PDSK / 5
  sertifikasiDtps(J, '27', (p) => skorAmbang(p, 0.5, (x) => 1 + (30 * x) / 5, 1)),
  // hlm. 19: publikasi + pagelaran DTPS (Tabel 4.e), faktor a = 0,5; b = 0,5; c = 1
  publikasiPagelaran(J, '32', { sheet: '4e', penyebut: 'NDTPS', a: 0.5, b: 0.5, c: 1, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah DTPS' }),
  // hlm. 20: produk/jasa DTPS (4.g) dan mahasiswa (6.e.4): NAPJ ≥ 4 → 4; < 4 → 1 + 3 × NAPJ / 4
  produkDiadopsi(J, '34', { sheet: '4g', perDtps: false, skor: (n) => skorAmbang(n, 4, (x) => 1 + (3 * x) / 4, 1) }),
  produkDiadopsi(J, '43', { sheet: '6e4', perDtps: false, skor: (n) => skorAmbang(n, 4, (x) => 1 + (3 * x) / 4, 1) }),
  // hlm. 20–21: PKDTPS ≥ 40% → 4; 1 + 30 × PKDTPS / 4. PKIB ≥ 40% → 4; 2 + 20 × PKIB / 4
  dariSarjana(J, '35', '35', (v) => ({ skor: skorAmbang(v.PKDTPS, 0.4, (p) => 1 + (30 * p) / 4, 1) })),
  dariSarjana(J, '36', '36', (v) => ({ skor: skorAmbang(v.PKIB, 0.4, (p) => 2 + (20 * p) / 4, 2) })),
  // hlm. 21: PRDTPS ≥ 2 → 4; < 2 → 2 + 4 × PRDTPS
  dariSarjana(J, '37', '37', (v) => ({
    skor: skorAmbang(v.PRDTPS, 2, (p) => 2 + 4 * p, 2),
    catatan: ['Ambang PRDTPS ≥ 2 dan rumus 2 + 4 × PRDTPS disalin dari matriks Doktor Terapan; PRDTPS = NRDTPS / NDTPS (perlu dikonfirmasi).'],
  })),
  // hlm. 24: publikasi + pagelaran mahasiswa (Tabel 6.e.2), faktor a = 0,25; b = 30%; c = 90%
  publikasiPagelaran(J, '46', { sheet: '6e2', penyebut: 'NM', a: 0.25, b: 0.3, c: 0.9, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah mahasiswa' }),
];

export const MANUAL_S3TR: Record<string, string> = {};

import { dariSarjana, skorAmbang, skorTigaTingkat, type RumusJenjang } from './bersama.ts';
import { dosenIndustri, masaStudi, tepatWaktu, waktuTungguDipesan } from './vokasi.ts';
import { rumusDiploma } from './d3.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Diploma Satu dan Diploma Dua (docs/rumus/RUMUS-D1.md, RUMUS-D2.md).
 * Penomoran dan sebagian besar aturan sama dengan D3; yang berbeda diganti di sini: praktik > 70%, kecukupan DTPS,
 * NDS3 ≥ 1, PGBLKL ≥ 30%, PMKI ≥ 30%, masa studi dan tepat waktu sesuai Tabel 6.d jenjang, waktu tunggu
 * (24 − 4 × WT)/3, tempat kerja faktor 2%/20%/90%.
 */

function bersamaD1D2(J: string): Record<string, RumusJenjang> {
  return {
    // PJP ≥ 70% → 4; < 70% → 1 + 30 × PJP / 7
    '18': dariSarjana(J, '18', '18', (v) => ({ skor: v.PJP === null ? null : v.PJP >= 0.7 ? 4 : 1 + (30 * v.PJP) / 7 })),
    // NDS3 ≥ 1 → 4; < 1 → 2
    '24': dariSarjana(J, '24', '27', (v) => ({ skor: v.NDS3 === null ? null : v.NDS3 >= 1 ? 4 : 2 })),
    // PGBLKL ≥ 30% → 4; < 30% → 2 + 20 × PGBLKL / 3
    '25': dariSarjana(J, '25', '28', (v) => ({ skor: skorAmbang(v.PGBLKL, 0.3, (p) => 2 + (20 * p) / 3, 2) })),
    // PMKI ≥ 30% → 4; < 30% → 2 + 20 × PMKI / 3
    '27': dosenIndustri(J, '27', (p) => skorAmbang(p, 0.3, (x) => 2 + (20 * x) / 3, 2)),
    // WT < 3 → 4; 3 ≤ WT ≤ 6 → (24 − 4 × WT)/3; > 6 → 0
    '45': waktuTungguDipesan(J, '45', (wt) => (wt < 3 ? 4 : wt <= 6 ? (24 - 4 * wt) / 3 : 0)),
    // tempat kerja faktor a = 2%, b = 20%, c = 90%
    '47': dariSarjana(J, '47', '51', (v) => ({
      skor: v.RI === null || v.RN === null || v.RW === null ? null : skorTigaTingkat(v.RI, v.RN, v.RW, 0.02, 0.2, 0.9),
      catatan: ['Faktor a = 2%; b = 20%; c = 90%.'],
    })),
  };
}

export const RUMUS_D1 = rumusDiploma('D1', {
  ...bersamaD1D2('D1'),
  // hlm. 17: NDTPS ≥ 3 dan PDTT ≤ 10% → 4; PDTT > 40% → 3; NDTPS < 3 → 2
  '23': dariSarjana('D1', '23', '26', (v) => {
    const n = v.NDTPS ?? 0;
    const p = v.PDTT;
    if (p === null) return { skor: null };
    if (n < 3) return { skor: 2 };
    if (p <= 0.1) return { skor: 4 };
    if (p > 0.4) return { skor: 3 };
    return { skor: 4 - (p - 0.1) / 0.3, catatan: ['10% < PDTT ≤ 40% tidak diatur matriks D1; diinterpolasi linear 4 → 3 (asumsi).'] };
  }),
  // Tabel 6.d D1: C 0,5 < MS ≤ 1,5; D 1,5 < MS ≤ 2; E MS ≤ 0,5. 1 < MS ≤ 1,5 → 4; 1,5 < MS ≤ 2 → 1 + 6 × (2 − MS); MS ≤ 0,5 → 0
  '42': masaStudi('D1', '42', {
    tengah: { E: 0.5, C: 1, D: 1.75 },
    skor: (ms) => (ms <= 0.5 ? 0 : ms <= 1.5 ? 4 : ms <= 2 ? 1 + 6 * (2 - ms) : null),
    asumsi: 'Asumsi: titik tengah Tabel 6.d D1 0,5; 1; 1,75 tahun; 0,5 < MS ≤ 1 diberi skor 4 (tidak diatur matriks).',
  }),
  '43': tepatWaktu('D1', '43', {
    angkatan: 'TS', kolom: ['C', 'E'], skor: (p) => (p >= 0.8 ? 4 : 1 + (30 * p) / 8),
    asumsi: 'Asumsi: a = mahasiswa masuk angkatan TS, b = lulus MS ≤ 1,5 tahun; matriks tidak mendefinisikan a dan b.',
  }),
});

export const RUMUS_D2 = rumusDiploma('D2', {
  ...bersamaD1D2('D2'),
  // hlm. 17: NDTPS ≥ 6 dan PDTT ≤ 10% → 4; A = (NDTPS − 3)/3; PDTT > 40% → 1
  '23': dariSarjana('D2', '23', '26', (v) => {
    const n = v.NDTPS ?? 0;
    const p = v.PDTT;
    if (p === null) return { skor: null };
    const A = (n - 3) / 3;
    const B = p <= 0.1 ? (0.4 - p) / 0.4 : (0.4 - p) / 0.3;
    if (n >= 6 && p <= 0.1) return { skor: 4 };
    if (n >= 6 && p <= 0.4) return { skor: 2 + 2 * B };
    if (n >= 3 && p <= 0.4) return { skor: 2 + 2 * (A * B) };
    if (n >= 3) return { skor: 1 };
    return { skor: 1, catatan: ['NDTPS < 3 tidak diatur matriks D2; skor 1 (asumsi).'] };
  }),
  // Tabel 6.d D2: C 1,5 < MS ≤ 2,5; D 2,5 < MS ≤ 4; E MS ≤ 1,5. 2,0 < MS ≤ 2,5 → 4; 2,5 < MS ≤ 4 → 9 − 2 × MS; MS ≤ 1,5 → 0
  '42': masaStudi('D2', '42', {
    tengah: { E: 1.25, C: 2, D: 3.25 },
    skor: (ms) => (ms <= 1.5 ? 0 : ms <= 2.5 ? 4 : ms <= 4 ? 9 - 2 * ms : null),
    asumsi: 'Asumsi: titik tengah Tabel 6.d D2 1,25; 2; 3,25 tahun; 1,5 < MS ≤ 2,0 diberi skor 4 (tidak diatur matriks).',
  }),
  '43': tepatWaktu('D2', '43', {
    angkatan: 'TS-1', kolom: ['C', 'E'], skor: (p) => (p >= 0.8 ? 4 : 1 + (30 * p) / 8),
    asumsi: 'Asumsi: a = mahasiswa masuk angkatan TS-1, b = lulus MS ≤ 2,5 tahun; matriks tidak mendefinisikan a dan b.',
  }),
});

export const MANUAL_D1: Record<string, string> = {};
export const MANUAL_D2: Record<string, string> = {};

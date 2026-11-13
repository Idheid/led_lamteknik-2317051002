import {
  bagi, dariSarjana, hasil, hitungButirSarjana, m, nilaiMetrik, salinRumus, skorAmbang, skorTigaTingkat, variabelDosen,
  variabelMahasiswa, type RumusJenjang,
} from './bersama.ts';
import { masaStudi, tepatWaktu } from './vokasi.ts';
import { RUMUS_S2 } from './s2.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Doktor (S3), dari docs/rumus/RUMUS-S3.md. Tabel 6.d Doktor berbeda;
 * template LKPS Doktor tidak memuat 6.f.2, 6.g.1, 6.g.2 (matriks Doktor juga tidak menilainya). Butir 15 kualitatif.
 */

const J = 'S3';
const s2 = (butir: string) => RUMUS_S2.find((r) => r.butir === butir)!;
const tiga = (v: Record<string, number | null>, a: number, b: number, c: number) =>
  v.RI === null || v.RN === null || v.RW === null || v.RI === undefined ? null : skorTigaTingkat(v.RI, v.RN!, v.RW!, a, b, c);

export const RUMUS_S3: RumusJenjang[] = [
  // hlm. 6: RK sama dengan Sarjana; tingkat kerja sama faktor a = 3, b = 8, c = 10
  dariSarjana(J, '6-I', '6-I'),
  dariSarjana(J, '6-II', '6-II', (v) => ({
    skor: skorTigaTingkat(v.NI ?? 0, v.NN ?? 0, v.NW ?? 0, 3, 8, 10), catatan: ['Faktor a = 3, b = 8, c = 10.'],
  })),
  // hlm. 8: BOP ≥ 40 juta → 4; BOP / 10 juta. DPD ≥ 30 juta → 4; 2 × DPD / 15 juta. DPkMD sama dengan Sarjana
  dariSarjana(J, '9', '9', (v) => ({ skor: skorAmbang(v.BOP, 40_000_000, (x) => x / 10_000_000) })),
  dariSarjana(J, '10', '10', (v) => ({ skor: skorAmbang(v.DPD, 30_000_000, (x) => (2 * x) / 15_000_000) })),
  dariSarjana(J, '11', '11'),
  // hlm. 15: PPDMhs ≥ 100% → 4; 1 + 3 × PPDMhs
  dariSarjana(J, '21', '23', (v) => ({ skor: skorAmbang(v.PPDMhs, 1, (p) => 1 + 3 * p, 1) })),
  // hlm. 15: PPTM ≥ 50% → 4; 1 + 6 × PPTM (metrik sama dengan Magister butir 22)
  {
    ...salinRumus(s2('22'), J, '22'),
    hitung: (t, k) => {
      const h = salinRumus(s2('22'), J, '22').hitung(t, k);
      const P = h.metrik.find((x) => x.kode === 'M-PPTM')?.nilai ?? null;
      return { ...h, skor: skorAmbang(P, 0.5, (p) => 1 + 6 * p, 1) };
    },
  },
  // hlm. 16: PKDMhs sama dengan Sarjana
  dariSarjana(J, '24', '25'),
  // hlm. 17: kecukupan DTPS dengan PGB = NDGB / NDTPS
  dariSarjana(J, '25', '26', (v, t) => {
    const d = variabelDosen(t);
    const n = d.NDTPS;
    const p = v.PDTT;
    const PGB = bagi(d.NDGB, n);
    const catatan = [
      `PGB = ${PGB === null ? '—' : (PGB * 100).toFixed(1)}%. Deskriptor Doktor menggabungkan PDTT dan PGB; dibaca: NDGB < 2 → 0; NDTPS ≥ 8 dan PDTT ≤ 10% → 4; 40% ≤ PGB < 50% → 2 + 2B (NDTPS ≥ 8) atau 2 + 2AB (5 < NDTPS < 8), A = (NDTPS − 3)/5, B = (PGB − 40%)/10%; selain itu 2 (asumsi perlu dikonfirmasi).`,
    ];
    if (p === null || PGB === null) return { skor: null, catatan };
    if (d.NDGB < 2) return { skor: 0, catatan };
    if (n >= 8 && p <= 0.1) return { skor: 4, catatan };
    const A = (n - 3) / 5;
    const B = (PGB - 0.4) / 0.1;
    if (PGB >= 0.4 && PGB < 0.5) return { skor: n >= 8 ? 2 + 2 * B : n > 5 ? 2 + 2 * A * B : 2, catatan };
    return { skor: PGB >= 0.5 && n >= 8 ? 4 : 2, catatan };
  }),
  // hlm. 17: PGB ≥ 50% dan NDTPS ≥ 8 → 4; PGBLK < 70% → 2 + 20 × PGBLK / 7
  dariSarjana(J, '26', '28', (v, t) => {
    const d = variabelDosen(t);
    const PGB = bagi(d.NDGB, d.NDTPS);
    const PGBLK = bagi(d.NDGB + d.NDLK, d.NDTPS);
    if (PGB === null || PGBLK === null) return { skor: null };
    if (PGB >= 0.5 && d.NDTPS >= 8) return { skor: 4 };
    return {
      skor: PGBLK >= 0.7 ? 4 : Math.max(2, 2 + (20 * PGBLK) / 7),
      catatan: [`PGB ${(PGB * 100).toFixed(1)}%, PGBLK ${(PGBLK * 100).toFixed(1)}%; PGBLK ≥ 70% tanpa PGB ≥ 50% diberi 4 (asumsi).`],
    };
  }, { judul: 'Jabatan akademik DTPS (Guru Besar dan Lektor Kepala)' }),
  // hlm. 18: RBK sama dengan Sarjana; penelitian/PkM faktor 0,1 / 1 / 2; publikasi DTPS faktor 0,5 / 6 / 4
  dariSarjana(J, '28', '30'),
  dariSarjana(J, '29', '31', (v) => ({ skor: tiga(v, 0.1, 1, 2), catatan: ['Faktor a = 0,1; b = 1; c = 2.'] })),
  dariSarjana(J, '30', '32', (v) => ({ skor: tiga(v, 0.1, 1, 2), catatan: ['Faktor a = 0,1; b = 1; c = 2.'] })),
  dariSarjana(J, '31', '33', (v) => ({ skor: tiga(v, 0.5, 6, 4), catatan: ['Faktor a = 0,5; b = 6; c = 4.'] })),
  // hlm. 19–21: RLP dan PKDTPS sama dengan Sarjana; PKIB, PRDTPS, PMA, RIPK, prestasi sama dengan Magister
  dariSarjana(J, '32', '34'),
  dariSarjana(J, '33', '35'),
  salinRumus(s2('34'), J, '34'),
  salinRumus(s2('35'), J, '35'),
  dariSarjana(J, '38', '41'),
  salinRumus(s2('39'), J, '39'),
  salinRumus(s2('40'), J, '40'),
  // hlm. 23: Tabel 6.d Doktor (C 2,5 < MS ≤ 3,5; D 3,5 < MS ≤ 4,5; E 4 < MS ≤ 6): 2,5 < MS ≤ 3,5 → 4; ≤ 6 → 1 + (36 − 6 × MS)/5; ≤ 2,5 → 0
  masaStudi(J, '41', {
    tengah: { C: 3, D: 4, E: 5 },
    skor: (ms) => (ms <= 2.5 ? 0 : ms <= 3.5 ? 4 : ms <= 6 ? 1 + (36 - 6 * ms) / 5 : null),
    asumsi: 'Asumsi: titik tengah Tabel 6.d Doktor 3; 4; 5 tahun.',
  }),
  // hlm. 24: PTW ≥ 60% → 4; 10% ≤ PTW < 60% → 1 + (30 × PTW − 3)/5; < 10% → 1
  tepatWaktu(J, '42', {
    angkatan: 'TS-2', kolom: ['C'], skor: (p) => (p >= 0.6 ? 4 : p >= 0.1 ? 1 + (30 * p - 3) / 5 : 1),
    asumsi: 'Asumsi: a = mahasiswa masuk angkatan TS-2, b = lulus 2,5 < MS ≤ 3,5 tahun; matriks tidak mendefinisikan a dan b.',
  }),
  // hlm. 24: publikasi mahasiswa (Tabel 6.e.1), faktor a = 0,25; b = 0,3; c = 0,9
  dariSarjana(J, '43', '46', (v) => ({ skor: tiga(v, 0.25, 0.3, 0.9), catatan: ['Faktor a = 0,25; b = 0,3; c = 0,9.'] })),
  // hlm. 25: NLP per mahasiswa ≥ 3 → 4; < 3 → 2 + 2 × NLP / 3
  {
    kode: `${J}-44`, jenjang: J, butir: '44', dasar: '47', judul: 'Luaran penelitian dan PkM mahasiswa',
    hitung: (t, k) => {
      const v = nilaiMetrik(hitungButirSarjana('47', t, k)!);
      const { NM, ada } = variabelMahasiswa(t);
      const NLP = ada ? bagi(v.NLP ?? 0, NM) : null;
      return hasil('44', 'Luaran penelitian dan PkM mahasiswa', ['6.e.3', '6.a'], 'NLP_NM', [
        m('NLP', 'Skor luaran mahasiswa', v.NLP ?? null, 'angka', 'NLP = 3 × NPaten + 2 × (NTTG + NBC) + NHKI'),
        m('NM', 'Jumlah mahasiswa saat TS', ada ? NM : null, 'angka'),
        m('NLP_NM', 'Skor luaran per mahasiswa', NLP, 'rasio', 'NLP / NM'),
      ], skorAmbang(NLP, 3, (x) => 2 + (2 * x) / 3, 2));
    },
  },
];

export const MANUAL_S3: Record<string, string> = {};

import { akhirTs, awalRentang, tanggal } from '../metrik-lkps.ts';
import {
  bagi, baris, batasi, dariSarjana, hasil, hitungButirSarjana, m, nilaiMetrik, nol, sama, skorAmbang, skorTigaTingkat,
  tercentang, terisi, teks, variabelDosen, variabelMahasiswa, type RumusJenjang,
} from './bersama.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Magister (S2), dari Matriks Penilaian LED dan LKPS Magister 2025
 * (docs/rumus/RUMUS-S2.md). Tabel 6.d dan 6.h.2 Magister berbeda dari Sarjana; tabel lain sama. Butir 15 dan 27
 * berdeskriptor kualitatif (bukan butir angka).
 */

const J = 'S2';

/** Kode metrik tiga tingkat hasil butir Sarjana (mis. "RI" untuk butir 31/33, "43-I_RI" untuk prestasi). */
function tigaTingkat(v: Record<string, number | null>, awalan: string, a: number, b: number, c: number): number | null {
  const [ri, rn, rw] = ['RI', 'RN', 'RW'].map((x) => v[`${awalan}${x}`] ?? null);
  return ri === null || rn === null || rw === null ? null : skorTigaTingkat(ri, rn, rw, a, b, c);
}

/** hlm. 26: Tabel 6.d Magister (C: 1,5 < MS ≤ 2,5; D: 2,5 < MS ≤ 3,5; E: 3,5 < MS ≤ 4). */
const TENGAH_MS_S2: Record<string, number> = { C: 2, D: 3, E: 3.75 };

export const RUMUS_S2: RumusJenjang[] = [
  // hlm. 6: kerja sama sama dengan Sarjana (faktor 2, 6, 8)
  dariSarjana(J, '6-I', '6-I'),
  dariSarjana(J, '6-II', '6-II'),
  // hlm. 8: BOP ≥ 28 juta → 4; < 28 juta → BOP / 7 juta
  dariSarjana(J, '9', '9', (v) => ({ skor: skorAmbang(v.BOP, 28_000_000, (x) => x / 7_000_000) })),
  // hlm. 8: DPD ≥ 20 juta → 4; < 20 juta → 2 × DPD / 10 juta
  dariSarjana(J, '10', '10', (v) => ({ skor: skorAmbang(v.DPD, 20_000_000, (x) => (2 * x) / 10_000_000) })),
  dariSarjana(J, '11', '11'),
  // hlm. 16: PPDMhs ≥ 75% → 4; < 75% → 1 + 4 × PPDMhs
  dariSarjana(J, '21', '23', (v) => ({ skor: skorAmbang(v.PPDMhs, 0.75, (p) => 1 + 4 * p, 1) })),
  // hlm. 16: penelitian DTPS yang menjadi rujukan tema tesis (Tabel 6.h.2 dan 3.b): PPTM ≥ 25% → 4; < 25% → 1 + 12 × PPTM
  {
    kode: `${J}-22`, jenjang: J, butir: '22', dasar: '23', judul: 'Penelitian DTPS yang menjadi rujukan tema tesis',
    hitung: (t, k) => {
      const NPD = nilaiMetrik(hitungButirSarjana('23', t, k)!).NPD ?? 0;
      const tema = new Set(baris(t, '6h2')
        .filter((b) => terisi(b.sel.C) && terisi(b.sel.E) && (nol(b.sel.F) === 0 || (nol(b.sel.F) >= k.tsTahunMulai - 2 && nol(b.sel.F) <= k.tsTahunMulai + 1)))
        .map((b) => teks(b.sel.C).toLowerCase()));
      const PPTM = bagi(tema.size, NPD);
      return hasil('22', 'Penelitian DTPS yang menjadi rujukan tema tesis', ['6.h.2', '3.b'], 'PPTM', [
        m('NTM', 'Judul penelitian DTPS yang menjadi rujukan tema tesis', tema.size, 'angka'),
        m('NPD', 'Judul penelitian DTPS 3 tahun terakhir', NPD, 'angka'),
        m('PPTM', 'Persentase penelitian rujukan tema tesis', PPTM, 'persen', 'PPTM = NTM / NPD × 100%'),
      ], skorAmbang(PPTM, 0.25, (p) => 1 + 12 * p, 1), [
        'Asumsi: NTM = tema penelitian berbeda di Tabel 6.h.2 (kolom tema) dengan tahun dalam 3 tahun terakhir; NPD dari Tabel 3.b.',
      ]);
    },
  },
  // hlm. 17: PKDMhs sama dengan Sarjana (≥ 50% → 4; 1 + 6 × PKDMhs)
  dariSarjana(J, '24', '25'),
  // hlm. 17: NDTPS ≥ 8 dan PDTT ≤ 10% → 4; A = (NDTPS − 5)/7 (sesuai teks matriks); PDTT > 40% → 2; NDTPS < 5 → 0
  dariSarjana(J, '25', '26', (v) => {
    const n = v.NDTPS ?? 0;
    const p = v.PDTT;
    if (p === null) return { skor: null };
    const A = (n - 5) / 7;
    const B = p <= 0.1 ? (0.4 - p) / 0.4 : (0.4 - p) / 0.3;
    const catatan = ['A = (NDTPS − 5)/7 sesuai teks matriks Magister walaupun ambangnya NDTPS ≥ 8 (perlu dikonfirmasi).'];
    if (n >= 8 && p <= 0.1) return { skor: 4, catatan };
    if (n >= 8 && p <= 0.4) return { skor: 2 + 2 * B, catatan };
    if (n >= 5 && p <= 0.4) return { skor: 2 + 2 * (A * B), catatan };
    return { skor: n >= 5 ? 2 : 0, catatan };
  }),
  // hlm. 18: PGBLK = (NDGB + NDLK) / NDTPS ≥ 70% → 4; < 70% → 2 + 20 × PGBLK / 7
  dariSarjana(J, '26', '28', (v, t) => {
    const P = bagi((v.NDGB ?? 0) + (v.NDLK ?? 0), variabelDosen(t).NDTPS);
    return { skor: skorAmbang(P, 0.7, (p) => 2 + (20 * p) / 7, 2), catatan: [`PGBLK = (NDGB + NDLK) / NDTPS = ${P === null ? '—' : (P * 100).toFixed(1)}% (Lektor tidak dihitung).`] };
  }, { judul: 'Jabatan akademik DTPS (Guru Besar dan Lektor Kepala)' }),
  // hlm. 18–19: RBK sama dengan Sarjana; penelitian dan PkM faktor a = 0,07; b = 0,5; c = 1,5
  dariSarjana(J, '28', '30'),
  dariSarjana(J, '29', '31', (v) => ({ skor: tigaTingkat(v, '', 0.07, 0.5, 1.5), catatan: ['Faktor a = 0,07; b = 0,5; c = 1,5.'] })),
  dariSarjana(J, '30', '32', (v) => ({ skor: tigaTingkat(v, '', 0.07, 0.5, 1.5), catatan: ['Faktor a = 0,07; b = 0,5; c = 1,5.'] })),
  // hlm. 20: publikasi DTPS (Tabel 4.d), faktor a = 0,5; b = 4; c = 4
  dariSarjana(J, '31', '33', (v) => ({ skor: tigaTingkat(v, '', 0.5, 4, 4), catatan: ['Faktor a = 0,5; b = 4; c = 4.'] })),
  // hlm. 20–21: RLP dan PKDTPS sama dengan Sarjana
  dariSarjana(J, '32', '34'),
  dariSarjana(J, '33', '35'),
  // hlm. 21: PKIB ≥ 50% → 4; < 50% → 2 + 4 × PKIB
  dariSarjana(J, '34', '36', (v) => ({ skor: skorAmbang(v.PKIB, 0.5, (p) => 2 + 4 * p, 2) })),
  // hlm. 22: PRDTPS ≥ 1 → 4; < 1 → 2 + 2 × PRDTPS
  dariSarjana(J, '35', '37', (v) => ({ skor: skorAmbang(v.PRDTPS, 1, (p) => 2 + 2 * p, 2) })),
  // hlm. 24–25: mahasiswa asing sama dengan Sarjana; RIPK ≥ 3,50 → 4; 3,00 ≤ RIPK < 3,50 → 4 × RIPK − 10
  dariSarjana(J, '38', '41'),
  dariSarjana(J, '39', '42', (v) => {
    const r = v.RIPK;
    return { skor: r === null ? null : batasi(r >= 3.5 ? 4 : r >= 3 ? 4 * r - 10 : 2, 2) };
  }),
  // hlm. 25: prestasi akademik 3 tahun terakhir, faktor a = 0,2%; b = 2%; c = 4%
  {
    kode: `${J}-40`, jenjang: J, butir: '40', dasar: null, judul: 'Prestasi akademik mahasiswa',
    hitung: (t, k) => {
      const awal = awalRentang(k, 3);
      const akhir = akhirTs(k);
      const sah = baris(t, '6c1').filter((b) => [b.sel.B, b.sel.C, b.sel.G].every(terisi)).filter((b) => {
        const d = tanggal(b.sel.C);
        return d !== null && d >= awal && d <= akhir;
      });
      const NI = sah.filter((b) => tercentang(b.sel.F)).length;
      const NN = sah.filter((b) => tercentang(b.sel.E)).length;
      const NW = sah.filter((b) => tercentang(b.sel.D)).length;
      const { NM, ada } = variabelMahasiswa(t);
      const [RI, RN, RW] = [NI, NN, NW].map((x) => (ada ? bagi(x, NM) : null));
      return hasil('40', 'Prestasi akademik mahasiswa', ['6.c.1', '6.a'], 'RI', [
        m('NI', 'Prestasi akademik internasional', NI, 'angka'),
        m('NN', 'Prestasi akademik nasional', NN, 'angka'),
        m('NW', 'Prestasi akademik wilayah/lokal', NW, 'angka'),
        m('RI', 'Rasio internasional per mahasiswa', RI, 'persen', 'RI = NI / NM'),
        m('RN', 'Rasio nasional per mahasiswa', RN, 'persen', 'RN = NN / NM'),
        m('RW', 'Rasio wilayah per mahasiswa', RW, 'persen', 'RW = NW / NM'),
      ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, 0.002, 0.02, 0.04), [
        'Faktor a = 0,2%; b = 2%; c = 4%; prestasi 3 tahun terakhir (Magister).',
      ]);
    },
  },
  // hlm. 26: masa studi Magister: 1,5 < MS ≤ 2,5 → 4; 2,5 < MS ≤ 4 → 9 − 2 × MS; MS < 1,5 → 0
  {
    kode: `${J}-41`, jenjang: J, butir: '41', dasar: null, judul: 'Rata-rata masa studi lulusan',
    hitung: (t) => {
      const isi = baris(t, '6d').filter((b) => /^TS(-\d)?$/i.test(teks(b.sel.A)));
      let n = 0;
      let total = 0;
      for (const b of isi) for (const [c, mid] of Object.entries(TENGAH_MS_S2)) {
        n += nol(b.sel[c]);
        total += nol(b.sel[c]) * mid;
      }
      const MS = n ? total / n : null;
      const skor = MS === null ? null : MS < 1.5 ? 0 : MS <= 2.5 ? 4 : MS <= 4 ? 9 - 2 * MS : null;
      return hasil('41', 'Rata-rata masa studi lulusan', ['6.d'], 'MS', [
        m('NLULUS_6D', 'Jumlah lulusan pada Tabel 6.d', n, 'angka'),
        m('MS', 'Rata-rata masa studi lulusan', MS, 'tahun', 'MS = Σ(lulusan × titik tengah masa studi) / Σ lulusan'),
      ], batasi(skor), ['Asumsi: masa studi didekati titik tengah kelompok Tabel 6.d Magister (2; 3; 3,75 tahun).']);
    },
  },
  // hlm. 26: PTW ≥ 60% → 4; 20% ≤ PTW < 60% → 1 + (30 × PTW − 6) / 4; < 20% → 1
  {
    kode: `${J}-42`, jenjang: J, butir: '42', dasar: null, judul: 'Persentase kelulusan tepat waktu',
    hitung: (t) => {
      const b = baris(t, '6d').find((x) => sama(x.sel.A, 'TS-2'));
      const a = nol(b?.sel.B);
      const lulus = nol(b?.sel.C);
      const PTW = b ? bagi(lulus, a) : null;
      return hasil('42', 'Persentase kelulusan tepat waktu', ['6.d'], 'PTW', [
        m('MASUK_TS2', 'Mahasiswa masuk TS-2 (a)', b ? a : null, 'angka'),
        m('LULUS_TW', 'Lulus 1,5 < MS ≤ 2,5 tahun dari angkatan TS-2 (b)', b ? lulus : null, 'angka'),
        m('PTW', 'Persentase kelulusan tepat waktu', PTW, 'persen', 'PTW = b / a × 100%'),
      ], PTW === null ? null : batasi(PTW >= 0.6 ? 4 : PTW >= 0.2 ? 1 + (30 * PTW - 6) / 4 : 1, 1), [
        'Asumsi: a = mahasiswa masuk angkatan TS-2, b = lulus 1,5 < MS ≤ 2,5 tahun; matriks Magister tidak mendefinisikan a dan b.',
      ]);
    },
  },
  // hlm. 27: publikasi mahasiswa (Tabel 6.e.1), faktor a = 0,1; b = 30%; c = 90%
  dariSarjana(J, '43', '46', (v) => ({ skor: tigaTingkat(v, '', 0.1, 0.3, 0.9), catatan: ['Faktor a = 0,1; b = 30%; c = 90%.'] })),
  // hlm. 27: luaran mahasiswa per mahasiswa: NLP = (3 × NPaten + 2 × (NTTG + NBC) + NHKI) / NM ≥ 2 → 4; < 2 → 2 + NLP
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
      ], skorAmbang(NLP, 2, (x) => 2 + x, 2));
    },
  },
  // hlm. 28: KBK dan kepuasan pengguna sama dengan Sarjana
  dariSarjana(J, '46', '50'),
  dariSarjana(J, '47', '52'),
];

export const MANUAL_S2: Record<string, string> = {};

import { bagi, baris, batasi, dariSarjana, hasil, m, nol, sama, skorAmbang, skorTigaTingkat, teks, type RumusJenjang } from './bersama.ts';
import { dosenIndustri, produkDiadopsi, publikasiPagelaran, sertifikasiDtps, waktuTungguDipesan } from './vokasi.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Diploma Tiga (D3), dari Matriks Penilaian LED dan LKPS Diploma III 2025
 * (docs/rumus/RUMUS-D3.md, nomor halaman di setiap entri). Butir 17 dan 28 deskriptornya kualitatif (bukan butir
 * angka). Asumsi yang perlu dikonfirmasi ditulis di `catatan` dan di docs/uji/hitungan-manual-d3.md.
 */

const J = 'D3';

/** Skor tiga tingkat dari metrik RI/RN/RW (berawalan, mis. "43-I_RI") hasil butir Sarjana. */
function tigaTingkat(v: Record<string, number | null>, awalan: string, a: number, b: number, c: number): number | null {
  const [ri, rn, rw] = ['RI', 'RN', 'RW'].map((x) => v[`${awalan}${x}`] ?? null);
  return ri === null || rn === null || rw === null ? null : skorTigaTingkat(ri, rn, rw, a, b, c);
}

/** hlm. 27: masa studi D3 dari Tabel 6.d D3 (C: 2,5 < MS ≤ 3,5; D: 3,5 < MS ≤ 6; E: MS ≤ 2,5). */
const TENGAH_MS_D3: Record<string, number> = { E: 2.25, C: 3, D: 4.75 };

export const RUMUS_D3: RumusJenjang[] = [
  // hlm. 6: RK sama dengan Sarjana
  dariSarjana(J, '6-I', '6-I'),
  // hlm. 6–7: faktor a = 1, b = 4, c = 6
  dariSarjana(J, '6-II', '6-II', (v) => ({
    skor: skorTigaTingkat(v.NI ?? 0, v.NN ?? 0, v.NW ?? 0, 1, 4, 6), catatan: ['Faktor a = 1, b = 4, c = 6 (matriks D3 hlm. 7).'],
  })),
  // hlm. 8: BOP, DPD, DPkMD sama dengan Sarjana
  dariSarjana(J, '9', '9'),
  dariSarjana(J, '10', '10'),
  dariSarjana(J, '11', '11'),
  // hlm. 14: 50% ≤ PJP ≤ 70% → 4; < 50% → 1 + 6 × PJP; > 70% → 4 − (40 × PJP − 28) / 3
  dariSarjana(J, '18', '18', (v) => {
    const p = v.PJP;
    if (p === null) return { skor: null };
    return {
      skor: p < 0.5 ? 1 + 6 * p : p > 0.7 ? 4 - (40 * p - 28) / 3 : 4,
      catatan: ['Asumsi: JP dan JB dihitung dari sks × 50 menit seperti Sarjana; kolom konversi jam (Vokasi) belum dipakai.'],
    };
  }),
  // hlm. 16–17: PKDMhs ≥ 25% → 4; < 25% → 2 + 8 × PKDMhs
  dariSarjana(J, '22', '25', (v) => ({ skor: skorAmbang(v.PKDMhs, 0.25, (p) => 2 + 8 * p, 2) })),
  // hlm. 17: NDTPS ≥ 9 dan PDTT ≤ 10% → 4; A = (NDTPS − 5) / 4
  dariSarjana(J, '23', '26', (v) => {
    const n = v.NDTPS ?? 0;
    const p = v.PDTT;
    if (p === null) return { skor: null };
    const A = (n - 5) / 4;
    const B = p <= 0.1 ? (0.4 - p) / 0.4 : (0.4 - p) / 0.3;
    if (n >= 9 && p <= 0.1) return { skor: 4 };
    if (n >= 9 && p <= 0.4) return { skor: 2 + 2 * B };
    if (n >= 5 && p <= 0.4) return { skor: 2 + 2 * (A * B) };
    if (n >= 5) return { skor: 1 };
    return { skor: 1, catatan: ['NDTPS < 5 tidak diatur matriks D3; "tidak ada skor kurang dari 1" → skor 1 (asumsi).'] };
  }),
  // hlm. 17–18: PDS3 ≥ 20% → 4; < 20% → 2 + 10 × PDS3
  dariSarjana(J, '24', '27', (v) => ({ skor: skorAmbang(v.PDS3, 0.2, (p) => 2 + 10 * p, 2) })),
  // hlm. 18: PGBLKL ≥ 50% → 4; < 50% → 2 + 4 × PGBLKL
  dariSarjana(J, '25', '28', (v) => ({ skor: skorAmbang(v.PGBLKL, 0.5, (p) => 2 + 4 * p, 2) })),
  // hlm. 18: PDSK ≥ 50% → 4; < 50% → 1 + 6 × PDSK
  sertifikasiDtps(J, '26', (p) => skorAmbang(p, 0.5, (x) => 1 + 6 * x, 1)),
  // hlm. 18: PMKI ≥ 20% → 4; < 20% → 2 + 10 × PMKI
  dosenIndustri(J, '27', (p) => skorAmbang(p, 0.2, (x) => 2 + 10 * x, 2)),
  // hlm. 19–20: RBK, kegiatan penelitian dan PkM DTPS sama dengan Sarjana
  dariSarjana(J, '29', '30'),
  dariSarjana(J, '30', '31'),
  dariSarjana(J, '31', '32'),
  // hlm. 21: Tabel 4.e (publikasi + pagelaran/pameran/presentasi), faktor a = 0,05; b = 0,5; c = 1
  publikasiPagelaran(J, '32', { sheet: '4e', penyebut: 'NDTPS', a: 0.05, b: 0.5, c: 1, judul: 'Pagelaran/pameran/presentasi/publikasi ilmiah DTPS' }),
  // hlm. 22: RLP ≥ 1 → 4; < 1 → 2 + 2 × RLP
  dariSarjana(J, '33', '34', (v) => ({ skor: skorAmbang(v.RLP, 1, (r) => 2 + 2 * r, 2) })),
  // hlm. 22: produk/jasa DTPS diadopsi (Tabel 4.g): RS = NAPJ / NDTPS ≥ 1 → 4; < 1 → 2 + 2 × RS
  produkDiadopsi(J, '34', { sheet: '4g', perDtps: true, skor: (r) => skorAmbang(r, 1, (x) => 2 + 2 * x, 2) }),
  // hlm. 23: PRDTPS ≥ 0,25 → 4; < 0,25 → 2 + 8 × PRDTPS
  dariSarjana(J, '35', '37', (v) => ({ skor: skorAmbang(v.PRDTPS, 0.25, (p) => 2 + 8 * p, 2) })),
  // hlm. 25: 10 ≤ RMD ≤ 20 → 4; RMD < 10 → 2 × RMD / 5; 20 < RMD < 30 → (60 − 2 × RMD) / 5; RMD ≥ 30 → 0
  dariSarjana(J, '38', '40', (v) => {
    const r = v.RMD;
    if (r === null) return { skor: null };
    return { skor: r >= 30 ? 0 : r > 20 ? (60 - 2 * r) / 5 : r >= 10 ? 4 : (2 * r) / 5 };
  }),
  // hlm. 25: RIPK sama dengan Sarjana
  dariSarjana(J, '39', '42'),
  // hlm. 26: prestasi akademik a = 0,05%, b = 1%, c = 2%; nonakademik a = 0,1%, b = 2%, c = 4%
  dariSarjana(J, '40-I', '43-I', (v) => ({
    skor: tigaTingkat(v, '43-I_', 0.0005, 0.01, 0.02),
    catatan: ['Faktor a = 0,05%; b = 1%; c = 2% (matriks D3 hlm. 26).'],
  })),
  dariSarjana(J, '40-II', '43-II', (v) => ({
    skor: tigaTingkat(v, '43-II_', 0.001, 0.02, 0.04),
    catatan: ['Faktor a = 0,1%; b = 2%; c = 4% (matriks D3 hlm. 26).'],
  })),
  // hlm. 27: produk/jasa karya mahasiswa diadopsi (Tabel 6.e.4): NAPJ ≥ 2 → 4; < 2 → 2 + NAPJ
  produkDiadopsi(J, '41', { sheet: '6e4', perDtps: false, skor: (n) => skorAmbang(n, 2, (x) => 2 + x, 2) }),
  // hlm. 27: masa studi D3
  {
    kode: `${J}-42`, jenjang: J, butir: '42', dasar: null, judul: 'Rata-rata masa studi lulusan',
    hitung: (t) => {
      const isi = baris(t, '6d').filter((b) => /^TS(-\d)?$/i.test(teks(b.sel.A)));
      let n = 0;
      let total = 0;
      for (const b of isi) for (const [c, mid] of Object.entries(TENGAH_MS_D3)) {
        n += nol(b.sel[c]);
        total += nol(b.sel[c]) * mid;
      }
      const MS = n ? total / n : null;
      const catatan = ['Asumsi: masa studi didekati titik tengah kelompok Tabel 6.d D3 (2,25; 3; 4,75 tahun).'];
      let skor: number | null = null;
      if (MS !== null) {
        if (MS < 2.5) skor = 0;
        else if (MS <= 3.5) {
          skor = 4;
          if (MS <= 3) catatan.push('2,5 ≤ MS ≤ 3,0 tidak diatur matriks D3; diberi skor 4 (asumsi perlu dikonfirmasi).');
        } else if (MS <= 6) skor = 1 + (36 - 6 * MS) / 5;
        else catatan.push('MS > 6 tahun di luar rentang matriks.');
      }
      return hasil('42', 'Rata-rata masa studi lulusan', ['6.d'], 'MS', [
        m('NLULUS_6D', 'Jumlah lulusan pada Tabel 6.d', n, 'angka'),
        m('MS', 'Rata-rata masa studi lulusan', MS, 'tahun', 'MS = Σ(lulusan × titik tengah masa studi) / Σ lulusan'),
      ], batasi(skor), catatan);
    },
  },
  // hlm. 27: PTW ≥ 80% → 4; < 80% → 1 + 30 × PTW / 8
  {
    kode: `${J}-43`, jenjang: J, butir: '43', dasar: null, judul: 'Persentase kelulusan tepat waktu',
    hitung: (t) => {
      const b = baris(t, '6d').find((x) => sama(x.sel.A, 'TS-2'));
      const a = nol(b?.sel.B);
      const lulus = nol(b?.sel.C) + nol(b?.sel.E);
      const PTW = b ? bagi(lulus, a) : null;
      return hasil('43', 'Persentase kelulusan tepat waktu', ['6.d'], 'PTW', [
        m('MASUK_TS2', 'Mahasiswa masuk TS-2 (a)', b ? a : null, 'angka'),
        m('LULUS_TW', 'Lulus MS ≤ 3,5 tahun dari angkatan TS-2 (b)', b ? lulus : null, 'angka'),
        m('PTW', 'Persentase kelulusan tepat waktu', PTW, 'persen', 'PTW = b / a × 100%'),
      ], skorAmbang(PTW, 0.8, (p) => 1 + (30 * p) / 8, 1), [
        'Asumsi: a = mahasiswa masuk angkatan TS-2, b = lulus dengan MS ≤ 3,5 tahun (kolom 2,5 < MS ≤ 3,5 dan MS ≤ 2,5); matriks D3 tidak mendefinisikan a dan b.',
      ]);
    },
  },
  // hlm. 28–29: WT < 3 → 4; 3 ≤ WT ≤ 6 → (18 − WT) / 3; WT > 6 → 0 (Tabel 6.f.1 D3)
  waktuTungguDipesan(J, '45', (wt) => (wt < 3 ? 4 : wt <= 6 ? (18 - wt) / 3 : 0)),
  // hlm. 29: KBK ≥ 80% → 4; < 80% → 5 × KBK
  dariSarjana(J, '46', '50', (v) => ({ skor: skorAmbang(v.KBK, 0.8, (p) => 5 * p) })),
  // hlm. 29–30: tempat kerja (a = 5%, b = 20%, c = 90%) dan kepuasan pengguna sama dengan Sarjana
  dariSarjana(J, '47', '51'),
  dariSarjana(J, '48', '52'),
];

/** Butir angka D3 tanpa rumus otomatis, dengan alasan (kriteria selesai R3). */
export const MANUAL_D3: Record<string, string> = {};

import {
  bagi, baris, batasi, dariSarjana, hasil, m, nol, sama, skorAmbang, terisi, teks, tercentang, variabelDosen, variabelMahasiswa,
  type PetaTabel, type RumusJenjang,
} from './bersama.ts';
import { waktuTungguDipesan } from './vokasi.ts';

/**
 * Rencana 10 Nov T10 (R3): rumus butir angka Program Profesi Insinyur (PPI), dari Matriks Penilaian LED dan LKPS
 * PPI 2025 (docs/rumus/RUMUS-PPI.md). PPI memakai tabel khusus: 3.a.2 (jam teori/praktik), 4.k (pembimbing lapangan),
 * 6.d dalam semester, 6.f.1 berkolom "dipesan sebelum lulus". Butir 17 dan 26 kualitatif. Butir 44 tetap manual
 * (lihat MANUAL_PPI).
 */

const J = 'PPI';

/** Dosen industri dari Tabel 4.a (kategori industri/praktisi). */
function jumlahDosenIndustri(t: PetaTabel): number {
  return baris(t, '4a').filter((b) => terisi(b.sel.B) && /industri|praktisi/i.test(teks(b.sel.D))).length;
}

/** hlm. 23: Tabel 6.d PPI dalam semester (C: 2 ≤ MS ≤ 3; D: 3 < MS ≤ 6; E: MS > 6). */
const TENGAH_MS_PPI: Record<string, number> = { C: 2.5, D: 4.5, E: 7 };

export const RUMUS_PPI: RumusJenjang[] = [
  // hlm. 5: RK = (3 × N1 + 2 × N2 + N3) / NDTPS ≥ 4 → 4; < 4 → RK
  dariSarjana(J, '6-I', '6-I', (v) => {
    const RK = bagi(3 * (v.N1 ?? 0) + 2 * (v.N2 ?? 0) + (v.N3 ?? 0), v.NDTPS ?? 0);
    return { skor: RK === null ? null : RK >= 4 ? 4 : RK, catatan: [`RK PPI berbobot = (3 × N1 + 2 × N2 + N3) / NDTPS = ${RK === null ? '—' : RK.toFixed(2)}.`] };
  }),
  // hlm. 6: faktor 2, 6, 8 sama dengan Sarjana
  dariSarjana(J, '6-II', '6-II'),
  // hlm. 7: dana sama dengan Sarjana
  dariSarjana(J, '9', '9'),
  dariSarjana(J, '10', '10'),
  dariSarjana(J, '11', '11'),
  // hlm. 12–13: praktik di industri (Tabel 3.a.2): 70% ≤ PJP ≤ 80% → 4; 80% < PJP ≤ 100% → 20 − 20 × PJP; < 70% → 0
  {
    kode: `${J}-18`, jenjang: J, butir: '18', dasar: null, judul: 'Pembelajaran praktik di industri',
    hitung: (t) => {
      const mk = baris(t, '3a2').filter((b) => terisi(b.sel.B));
      const teori = mk.reduce((s, b) => s + nol(b.sel.D), 0);
      const JP = mk.reduce((s, b) => s + nol(b.sel.E), 0);
      const PJP = bagi(JP, teori + JP);
      return hasil('18', 'Pembelajaran praktik di industri', ['3.a.2'], 'PJP', [
        m('JAM_TEORI', 'Jam pembelajaran teori', teori, 'angka'),
        m('JP', 'Jam pembelajaran praktik', JP, 'angka'),
        m('PJP', 'Persentase jam praktik', PJP, 'persen', 'PJP = JP / (jam teori + JP) × 100%'),
      ], PJP === null ? null : batasi(PJP < 0.7 ? 0 : PJP <= 0.8 ? 4 : 20 - 20 * PJP), [
        'Asumsi: JB = jam teori + jam praktik dari kolom konversi kredit ke jam Tabel 3.a.2.',
      ]);
    },
  },
  // hlm. 14–15: PPDMhs dan PKDMhs ≥ 10% → 4; < 10% → 1 + 3 × P(dalam puluhan persen)
  dariSarjana(J, '21', '23', (v) => ({
    skor: skorAmbang(v.PPDMhs, 0.1, (p) => 1 + 30 * p, 1),
    catatan: ['Asumsi: "1 + (3 × PPDMhs)" dibaca dengan PPDMhs dalam puluhan persen (10% → 4) supaya bersambung dengan ambang.'],
  })),
  dariSarjana(J, '23', '25', (v) => ({
    skor: skorAmbang(v.PKDMhs, 0.1, (p) => 1 + 30 * p, 1),
    catatan: ['Asumsi: "1 + (3 × PKDMhs)" dibaca dengan PKDMhs dalam puluhan persen (10% → 4) supaya bersambung dengan ambang.'],
  })),
  // hlm. 15: RDTPSPPI = (NDTPS + NDI) / NDI ≤ 3 → 4; 3 < R ≤ 5 → 2 + (5 − R); > 5 → 2
  {
    kode: `${J}-24`, jenjang: J, butir: '24', dasar: null, judul: 'Rasio dosen PSPPI terhadap dosen industri',
    hitung: (t) => {
      const { NDTPS } = variabelDosen(t);
      const NDI = jumlahDosenIndustri(t);
      const R = bagi(NDTPS + NDI, NDI);
      const catatan: string[] = [];
      if (NDI < 2 || NDTPS < 3) catatan.push('Syarat minimal NDI = 2 dan NDTPS = 3 belum terpenuhi.');
      return hasil('24', 'Rasio dosen PSPPI terhadap dosen industri', ['4.a'], 'RDTPSPPI', [
        m('NDTPS', 'Dosen tetap PSPPI', NDTPS, 'angka'),
        m('NDI', 'Dosen industri', NDI, 'angka'),
        m('RDTPSPPI', 'Rasio dosen PSPPI per dosen industri', R, 'rasio', 'RDTPSPPI = (NDTPS + NDI) / NDI'),
      ], R === null ? null : batasi(R <= 3 ? 4 : R <= 5 ? 2 + (5 - R) : 2, 2), catatan);
    },
  },
  // hlm. 15: PDIPU = DTPS bersertifikat IPU dan ber-STRI / NDTPS ≥ 50% → 4; < 50% → 2 + 4 × PDIPU
  {
    kode: `${J}-25`, jenjang: J, butir: '25', dasar: null, judul: 'Kualifikasi keinsinyuran DTPS',
    hitung: (t) => {
      const dtps = baris(t, '4a').filter((b) => terisi(b.sel.B) && sama(b.sel.D, 'Dosen Tetap') && tercentang(b.sel.J));
      const NDIPU = dtps.filter((b) => terisi(b.sel.O) && terisi(b.sel.P)).length;
      const P = bagi(NDIPU, dtps.length);
      return hasil('25', 'Kualifikasi keinsinyuran DTPS', ['4.a'], 'PDIPU', [
        m('NDIPU', 'DTPS bersertifikat insinyur profesional dan ber-STRI', NDIPU, 'angka'),
        m('NDTPS', 'Jumlah DTPS', dtps.length, 'angka'),
        m('PDIPU', 'Persentase DTPS bersertifikat IPU dan STRI', P, 'persen', 'PDIPU = NDIPU / NDTPS × 100%'),
      ], skorAmbang(P, 0.5, (p) => 2 + 4 * p, 2), [
        'Asumsi: sertifikat IPU = kolom "Sertifikat Keinsinyuran/SKIP" dan STRI = kolom "STRI" Tabel 4.a terisi; masa berlaku tidak dicek.',
      ]);
    },
  },
  // hlm. 16–19: RBK, penelitian/PkM (0,05; 0,3; 1), publikasi (0,5; 1; 2) sama dengan Sarjana
  dariSarjana(J, '27', '30'),
  dariSarjana(J, '28', '31'),
  dariSarjana(J, '29', '32'),
  dariSarjana(J, '30', '33'),
  // hlm. 19–20: RLP ≥ 1 → 4; < 1 → 2 + 2 × RLP
  dariSarjana(J, '31', '34', (v) => ({ skor: skorAmbang(v.RLP, 1, (r) => 2 + 2 * r, 2) })),
  // hlm. 20: PRDTPSPPI ≥ 0,5 → 4; < 0,5 → 2 + 4 × P (sama dengan Sarjana)
  dariSarjana(J, '32', '37'),
  // hlm. 21: pembimbing lapangan (Tabel 4.k): 1 ≤ PPL ≤ 4 → 4; 4 < PPL ≤ 10 → 1 + (10 − PPL) / 2
  {
    kode: `${J}-34`, jenjang: J, butir: '34', dasar: null, judul: 'Kecukupan jumlah pembimbing lapangan',
    hitung: (t) => {
      const pl = baris(t, '4k').filter((b) => terisi(b.sel.B));
      const NMRPL = pl.reduce((s, b) => s + nol(b.sel.K), 0);
      const PPL = bagi(NMRPL, pl.length);
      const catatan = ['Asumsi: NMRPL = jumlah kolom "Jumlah Bimbingan dalam 3 tahun" Tabel 4.k; NPL = jumlah pembimbing lapangan.'];
      if (PPL !== null && PPL < 1) catatan.push('PPL < 1 tidak diatur matriks; diberi skor 4 (asumsi).');
      return hasil('34', 'Kecukupan jumlah pembimbing lapangan', ['4.k'], 'PPL', [
        m('NMRPL', 'Mahasiswa reguler dibimbing pembimbing lapangan (3 tahun)', NMRPL, 'angka'),
        m('NPL', 'Pembimbing lapangan', pl.length, 'angka'),
        m('PPL', 'Mahasiswa per pembimbing lapangan', PPL, 'rasio', 'PPL = NMRPL / NPL'),
      ], PPL === null ? null : batasi(PPL <= 4 ? 4 : 1 + (10 - PPL) / 2), catatan);
    },
  },
  // hlm. 23: RMD = NMT / (NDTPS + NDI): 4 ≤ RMD ≤ 10 → 4; < 4 → 1 + 3 × RMD / 4; 10 < RMD ≤ 35 → 4 − (4 × RMD − 40) / 25; > 35 → 0
  {
    kode: `${J}-37`, jenjang: J, butir: '37', dasar: null, judul: 'Rasio mahasiswa terhadap dosen',
    hitung: (t) => {
      const { NDTPS } = variabelDosen(t);
      const NDI = jumlahDosenIndustri(t);
      const mhs = variabelMahasiswa(t);
      const RMD = mhs.ada ? bagi(mhs.NM, NDTPS + NDI) : null;
      return hasil('37', 'Rasio mahasiswa terhadap dosen', ['6.a', '4.a'], 'RMD', [
        m('NMT', 'Mahasiswa saat TS', mhs.ada ? mhs.NM : null, 'angka'),
        m('ND', 'Dosen tetap PSPPI + dosen industri', NDTPS + NDI, 'angka'),
        m('RMD', 'Rasio mahasiswa per dosen', RMD, 'rasio', 'RMD = NMT / (NDTPS + NDI)'),
      ], RMD === null ? null : batasi(RMD > 35 ? 0 : RMD > 10 ? 4 - (4 * RMD - 40) / 25 : RMD >= 4 ? 4 : 1 + (3 * RMD) / 4), [
        'Asumsi: NMT = mahasiswa saat TS dari Tabel 6.a (reguler dan RPL).',
      ]);
    },
  },
  // hlm. 23: RIPK sama dengan Sarjana
  dariSarjana(J, '38', '42'),
  // hlm. 23: MS (semester): 2 ≤ MS ≤ 3 → 4; 3 < MS ≤ 6 → 7 − MS; > 6 → 0
  {
    kode: `${J}-39`, jenjang: J, butir: '39', dasar: null, judul: 'Rata-rata masa studi (semester)',
    hitung: (t) => {
      const isi = baris(t, '6d').filter((b) => /^TS(-\d)?$/i.test(teks(b.sel.A)));
      let n = 0;
      let total = 0;
      for (const b of isi) for (const [c, mid] of Object.entries(TENGAH_MS_PPI)) {
        n += nol(b.sel[c]);
        total += nol(b.sel[c]) * mid;
      }
      const MS = n ? total / n : null;
      return hasil('39', 'Rata-rata masa studi (semester)', ['6.d'], 'MS', [
        m('NLULUS_6D', 'Jumlah lulusan pada Tabel 6.d', n, 'angka'),
        m('MS', 'Rata-rata masa studi (semester)', MS, 'angka', 'MS = Σ(lulusan × titik tengah) / Σ lulusan'),
      ], MS === null ? null : batasi(MS > 6 ? 0 : MS > 3 ? 7 - MS : 4), [
        'Asumsi: titik tengah kelompok Tabel 6.d PPI 2,5; 4,5; 7 semester; MS < 2 semester diberi skor 4.',
      ]);
    },
  },
  // hlm. 23–24: PTW ≥ 90% → 4; < 90% → 1 + 10 × PTW / 3; PPS ≥ 85% → 4; 30% < PPS < 85% → (80 × PPS − 24) / 11; ≤ 30% → 0
  ...(['40', '41'] as const).map((butir): RumusJenjang => ({
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null,
    judul: butir === '40' ? 'Persentase kelulusan tepat waktu' : 'Persentase keberhasilan studi',
    hitung: (t) => {
      const b = baris(t, '6d').find((x) => sama(x.sel.A, 'TS-1'));
      const a = nol(b?.sel.B);
      const lulus = butir === '40' ? nol(b?.sel.C) : nol(b?.sel.C) + nol(b?.sel.D) + nol(b?.sel.E);
      const P = b ? bagi(lulus, a) : null;
      const kode = butir === '40' ? 'PTW' : 'PPS';
      const skor = P === null ? null : butir === '40'
        ? batasi(P >= 0.9 ? 4 : 1 + (10 * P) / 3, 1)
        : batasi(P >= 0.85 ? 4 : P > 0.3 ? (80 * P - 24) / 11 : 0);
      return hasil(butir, butir === '40' ? 'Persentase kelulusan tepat waktu' : 'Persentase keberhasilan studi', ['6.d'], kode, [
        m('MASUK_TS1', 'Mahasiswa masuk TS-1 (a)', b ? a : null, 'angka'),
        m('LULUS', butir === '40' ? 'Lulus 2 ≤ MS ≤ 3 semester (b)' : 'Seluruh lulusan angkatan TS-1', b ? lulus : null, 'angka'),
        m(kode, butir === '40' ? 'Persentase kelulusan tepat waktu' : 'Persentase keberhasilan studi', P, 'persen', `${kode} = lulus / masuk × 100%`),
      ], skor, ['Asumsi: angkatan TS-1 (program satu tahun); matriks PPI tidak mendefinisikan angkatan yang dihitung.']);
    },
  })),
  // hlm. 24–25: WT ≤ 3 → 4; 3 < WT < 6 → (24 − 4 × WT) / 3; WT ≥ 6 → 0
  waktuTungguDipesan(J, '43', (wt) => (wt <= 3 ? 4 : wt < 6 ? (24 - 4 * wt) / 3 : 0)),
  // hlm. 26: tempat kerja dan kepuasan pengguna sama dengan Sarjana
  dariSarjana(J, '45', '51'),
  dariSarjana(J, '46', '52'),
];

/** Butir angka PPI tanpa rumus otomatis, dengan alasan. */
export const MANUAL_PPI: Record<string, string> = {
  '44': 'matriks merujuk Tabel 6.f.2 (kesesuaian bidang kerja), tetapi template LKPS 2025 tidak memuat tabel itu untuk PPI',
};

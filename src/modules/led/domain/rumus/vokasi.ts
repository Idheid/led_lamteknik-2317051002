import {
  bagi, baris, hasil, m, nol, sama, skorAmbang, skorTigaTingkat, tercentang, terisi, teks, variabelDosen, variabelMahasiswa,
  type RumusJenjang,
} from './bersama.ts';

/**
 * Rencana 10 Nov T10 (R2/R3): metrik yang tidak ada di Sarjana tetapi dipakai jenjang vokasi/terapan (D1–D3, Sarjana
 * Terapan, Magister/Doktor Terapan): sertifikasi kompetensi DTPS, dosen industri, publikasi + pagelaran (4.e, 6.e.2),
 * produk/jasa yang diadopsi (4.g, 6.e.4). Aturan skornya diberikan per jenjang.
 */

type Skor = (x: number | null) => number | null;

/** Tabel 4.a kolom 11: DTPS bersertifikat kompetensi/profesi/industri. PDSK = NDSK / NDTPS. */
export function sertifikasiDtps(J: string, butir: string, skor: Skor): RumusJenjang {
  const judul = 'Sertifikasi kompetensi/profesi/industri DTPS';
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul,
    hitung: (t) => {
      const isi = baris(t, '4a').filter((b) => terisi(b.sel.B) && sama(b.sel.D, 'Dosen Tetap') && tercentang(b.sel.J));
      const NDSK = isi.filter((b) => terisi(b.sel.M)).length;
      const P = bagi(NDSK, isi.length);
      return hasil(butir, judul, ['4.a'], 'PDSK', [
        m('NDSK', 'DTPS bersertifikat kompetensi/profesi/industri', NDSK, 'angka'),
        m('NDTPS', 'Jumlah DTPS', isi.length, 'angka'),
        m('PDSK', 'Persentase DTPS bersertifikat', P, 'persen', 'PDSK = NDSK / NDTPS × 100%'),
      ], skor(P));
    },
  };
}

/** Tabel 3.a.1 dan 4.a: mata kuliah kompetensi yang diampu dosen industri/praktisi. PMKI = MKKI / MKK. */
export function dosenIndustri(J: string, butir: string, skor: Skor): RumusJenjang {
  const judul = 'Keterlibatan dosen industri/praktisi';
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul,
    hitung: (t) => {
      const normal = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      const mkk = baris(t, '3a1').filter((b) => terisi(b.sel.D) && tercentang(b.sel.E)).map((b) => normal(teks(b.sel.D)));
      const ampuIndustri = baris(t, '4a')
        .filter((b) => terisi(b.sel.B) && /industri|praktisi/i.test(teks(b.sel.D)))
        .map((b) => normal(teks(b.sel.Q)));
      const MKKI = mkk.filter((nama) => ampuIndustri.some((q) => q.includes(nama))).length;
      const P = bagi(MKKI, mkk.length);
      return hasil(butir, judul, ['3.a.1', '4.a'], 'PMKI', [
        m('MKK', 'Jumlah mata kuliah kompetensi', mkk.length, 'angka'),
        m('MKKI', 'Mata kuliah kompetensi diampu dosen industri/praktisi', MKKI, 'angka'),
        m('PMKI', 'Persentase mata kuliah kompetensi oleh dosen industri', P, 'persen', 'PMKI = MKKI / MKK × 100%'),
      ], skor(P), [
        'Asumsi: dosen industri = baris Tabel 4.a berkategori industri/praktisi; mata kuliah dicocokkan dari kolom "Mata Kuliah yang Diampu".',
      ]);
    },
  };
}

/**
 * Publikasi + pagelaran/pameran/presentasi berjenjang (Tabel 4.e untuk DTPS, 6.e.2 untuk mahasiswa). Baris berurutan
 * NA1–NA4, NB1–NB3, NC1–NC3. RW = (NA1 + NB1 + NC1) / penyebut, RN = (NA2 + NA3 + NB2 + NC2) / penyebut,
 * RI = (NA4 + NB3 + NC3) / penyebut; skor tiga tingkat dengan faktor a, b, c.
 */
export function publikasiPagelaran(
  J: string, butir: string, o: { sheet: '4e' | '6e2'; penyebut: 'NDTPS' | 'NM'; a: number; b: number; c: number; judul: string },
): RumusJenjang {
  const tabel = o.sheet === '4e' ? ['4.e', '4.a'] : ['6.e.2', '6.a'];
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul: o.judul,
    hitung: (t) => {
      const isi = baris(t, o.sheet).filter((b) => /^\d+$/.test(teks(b.sel.A)));
      const n = (i: number) => (isi[i] ? nol(isi[i].sel.C) + nol(isi[i].sel.D) + nol(isi[i].sel.E) : 0);
      const [NA1, NA2, NA3, NA4, NB1, NB2, NB3, NC1, NC2, NC3] = Array.from({ length: 10 }, (_, i) => n(i));
      const mhs = variabelMahasiswa(t);
      const penyebut = o.penyebut === 'NDTPS' ? variabelDosen(t).NDTPS : mhs.ada ? mhs.NM : 0;
      const RW = bagi(NA1 + NB1 + NC1, penyebut);
      const RN = bagi(NA2 + NA3 + NB2 + NC2, penyebut);
      const RI = bagi(NA4 + NB3 + NC3, penyebut);
      const s = o.penyebut === 'NDTPS' ? 'DTPS' : 'mahasiswa';
      return hasil(butir, o.judul, tabel, 'RI', [
        m('RI', `Rasio internasional per ${s}`, RI, o.penyebut === 'NM' ? 'persen' : 'rasio', `RI = (NA4 + NB3 + NC3) / ${o.penyebut}`),
        m('RN', `Rasio nasional per ${s}`, RN, o.penyebut === 'NM' ? 'persen' : 'rasio', `RN = (NA2 + NA3 + NB2 + NC2) / ${o.penyebut}`),
        m('RW', `Rasio wilayah per ${s}`, RW, o.penyebut === 'NM' ? 'persen' : 'rasio', `RW = (NA1 + NB1 + NC1) / ${o.penyebut}`),
      ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, o.a, o.b, o.c), [
        `Faktor a = ${o.a}; b = ${o.b}; c = ${o.c}.`,
        `Asumsi: baris Tabel ${tabel[0]} berurutan NA1–NA4, NB1–NB3, NC1–NC3 seperti definisi matriks (${isi.length} baris terbaca).`,
      ]);
    },
  };
}

/**
 * Produk/jasa yang diadopsi industri/masyarakat: Tabel 4.g (karya DTPS) atau 6.e.4 (karya mahasiswa). `perDtps` =
 * skor memakai RS = NAPJ / NDTPS; selain itu jumlah NAPJ.
 */
export function produkDiadopsi(J: string, butir: string, o: { sheet: '4g' | '6e4'; perDtps: boolean; skor: Skor }): RumusJenjang {
  const judul = o.sheet === '4g' ? 'Produk/jasa DTPS yang diadopsi industri/masyarakat' : 'Produk/jasa karya mahasiswa yang diadopsi';
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul,
    hitung: (t) => {
      const NAPJ = baris(t, o.sheet).filter((b) => terisi(b.sel.C)).length;
      const { NDTPS } = variabelDosen(t);
      const RS = bagi(NAPJ, NDTPS);
      const tabel = o.sheet === '4g' ? ['4.g', ...(o.perDtps ? ['4.a'] : [])] : ['6.e.4'];
      return hasil(butir, judul, tabel, o.perDtps ? 'RS' : 'NAPJ', [
        m('NAPJ', o.sheet === '4g' ? 'Produk/jasa DTPS yang diadopsi' : 'Produk/jasa karya mahasiswa yang diadopsi', NAPJ, 'angka'),
        ...(o.perDtps ? [m('NDTPS', 'Jumlah DTPS', NDTPS, 'angka'), m('RS', 'Rasio produk/jasa per DTPS', RS, 'rasio', 'RS = NAPJ / NDTPS')] : []),
      ], o.skor(o.perDtps ? RS : NAPJ), [`Tabel ${tabel[0]} tidak memuat tahun; semua baris dianggap dalam 3 tahun terakhir (asumsi).`]);
    },
  };
}

export { skorAmbang };

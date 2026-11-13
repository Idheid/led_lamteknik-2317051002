import {
  bagi, baris, batasi, hasil, m, nol, sama, skorAmbang, skorTigaTingkat, tercentang, terisi, teks, variabelDosen, variabelMahasiswa,
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

/**
 * Waktu tunggu dari Tabel 6.f.1 berkolom "dipesan sebelum lulus" (D1–D3, PPI): D dipesan, E WT < 3, F 3 ≤ WT ≤ 6,
 * G WT > 6 bulan, lulusan TS-2 s.d. TS-1. WT didekati 0; 1,5; 4,5; 9 bulan.
 */
export function waktuTungguDipesan(J: string, butir: string, skor: (wt: number) => number): RumusJenjang {
  const judul = 'Waktu tunggu lulusan';
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul,
    hitung: (t) => {
      const isi = baris(t, '6f1').filter((b) => /^TS-[12]$/i.test(teks(b.sel.A)));
      const jumlah = (c: string) => isi.reduce((s, b) => s + nol(b.sel[c]), 0);
      const [jl, terlacak, pesan, k3, k6, l6] = ['B', 'C', 'D', 'E', 'F', 'G'].map(jumlah);
      const n = pesan + k3 + k6 + l6;
      const WT = n ? (k3 * 1.5 + k6 * 4.5 + l6 * 9) / n : null;
      const responden = bagi(terlacak, jl);
      const catatan = ['Asumsi: lulusan dipesan sebelum lulus WT = 0; titik tengah kelompok 1,5 dan 4,5 bulan; WT > 6 bulan = 9 bulan.'];
      if (responden !== null && responden < 0.3) catatan.push('Responden lulusan kurang dari 30%.');
      return hasil(butir, judul, ['6.f.1'], 'WT', [
        m('RESPONDEN_WT', 'Persentase lulusan terlacak', responden, 'persen'),
        m('WT_DIPESAN', 'Lulusan dipesan sebelum lulus', pesan, 'angka'),
        m('WT_KURANG3', 'Lulusan dengan WT < 3 bulan', k3, 'angka'),
        m('WT_3_6', 'Lulusan dengan 3 ≤ WT ≤ 6 bulan', k6, 'angka'),
        m('WT_LEBIH6', 'Lulusan dengan WT > 6 bulan', l6, 'angka'),
        m('WT', 'Perkiraan rata-rata waktu tunggu', WT, 'bulan'),
      ], WT === null ? null : batasi(skor(WT)), catatan);
    },
  };
}

/** Rata-rata masa studi dari Tabel 6.d berkelompok (titik tengah per kolom). */
export function masaStudi(J: string, butir: string, o: { tengah: Record<string, number>; skor: (ms: number) => number | null; asumsi: string }): RumusJenjang {
  const judul = 'Rata-rata masa studi lulusan';
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul,
    hitung: (t) => {
      const isi = baris(t, '6d').filter((b) => /^TS(-\d)?$/i.test(teks(b.sel.A)));
      let n = 0;
      let total = 0;
      for (const b of isi) for (const [c, mid] of Object.entries(o.tengah)) {
        n += nol(b.sel[c]);
        total += nol(b.sel[c]) * mid;
      }
      const MS = n ? total / n : null;
      const skor = MS === null ? null : o.skor(MS);
      return hasil(butir, judul, ['6.d'], 'MS', [
        m('NLULUS_6D', 'Jumlah lulusan pada Tabel 6.d', n, 'angka'),
        m('MS', 'Rata-rata masa studi lulusan', MS, 'tahun', 'MS = Σ(lulusan × titik tengah masa studi) / Σ lulusan'),
      ], skor === null ? null : batasi(skor), [o.asumsi]);
    },
  };
}

/** Persentase kelulusan tepat waktu satu angkatan Tabel 6.d: b = jumlah kolom tepat waktu, a = mahasiswa masuk. */
export function tepatWaktu(J: string, butir: string, o: { angkatan: string; kolom: string[]; skor: (p: number) => number; asumsi: string }): RumusJenjang {
  const judul = 'Persentase kelulusan tepat waktu';
  return {
    kode: `${J}-${butir}`, jenjang: J, butir, dasar: null, judul,
    hitung: (t) => {
      const b = baris(t, '6d').find((x) => sama(x.sel.A, o.angkatan));
      const a = nol(b?.sel.B);
      const lulus = o.kolom.reduce((s, c) => s + nol(b?.sel[c]), 0);
      const PTW = b ? bagi(lulus, a) : null;
      return hasil(butir, judul, ['6.d'], 'PTW', [
        m('MASUK', `Mahasiswa masuk ${o.angkatan} (a)`, b ? a : null, 'angka'),
        m('LULUS_TW', `Lulus tepat waktu dari angkatan ${o.angkatan} (b)`, b ? lulus : null, 'angka'),
        m('PTW', 'Persentase kelulusan tepat waktu', PTW, 'persen', 'PTW = b / a × 100%'),
      ], PTW === null ? null : batasi(o.skor(PTW)), [o.asumsi]);
    },
  };
}

export { skorAmbang };

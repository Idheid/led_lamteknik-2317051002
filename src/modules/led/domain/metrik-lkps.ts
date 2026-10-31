/**
 * F-08: metrik butir berjenis angka dihitung sistem dari tabel LKPS (bukan oleh LLM).
 *
 * Sumber rumus: Matriks Penilaian LED dan LKPS Sarjana, APS Akademik dan Vokasi Teknik 2025 (Pasca Akreditasi
 * Minimum dan Unggul). Cara menghitung variabel (NDTPS, NDS3, kerja sama yang sah, NM, JP/JB, RBK) mengikuti
 * rumus panel INFO di template LKPS 2025. Bagian yang tidak dirumuskan matriks atau terpotong di PDF ditulis
 * di `catatan` sebagai asumsi (lihat docs/uji/hitungan-manual-lkps.md).
 *
 * Fungsi murni: masukan tabel ber-kolom huruf template (A, B, C, ...), keluaran metrik dan skor perkiraan.
 * Skor perkiraan hanya bantuan penyusun; penilaian resmi tetap oleh asesor.
 */

export type Sel = string | number | null;

export interface TabelMetrik {
  sheet: string;
  baris: { nomorBaris: number; sel: Record<string, Sel> }[];
}

export type Satuan = 'angka' | 'persen' | 'rupiah' | 'sks' | 'tahun' | 'bulan' | 'rasio';

export interface Metrik {
  /** Kode sumber di prompt, misalnya "M-NDTPS". */
  kode: string;
  nama: string;
  nilai: number | null;
  satuan: Satuan;
  rumus?: string;
}

export interface HasilButirAngka {
  butir: string;
  judul: string;
  tabel: string[];
  /** Kode metrik utama penentu skor. */
  utama: string;
  metrik: Metrik[];
  skor: number | null;
  catatan: string[];
  /** false bila tabel sumber tidak ada atau penyebut nol. */
  lengkap: boolean;
}

export interface KonteksMetrik {
  /** Tahun mulai TS (2025 untuk TS 2025/2026). */
  tsTahunMulai: number;
}

// ------------------------------------------------------------------ utilitas sel

/** Angka dari sel: menerima angka Excel atau teks format Indonesia ("1.250.000", "3,25", "45%"). */
export function angka(v: Sel | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let t = v.trim().replace(/^rp\.?\s*/i, '').replace(/%$/, '').trim();
  if (t === '' || t === '-') return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(t)) t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const nol = (v: Sel | undefined) => angka(v) ?? 0;

export function tercentang(v: Sel | undefined): boolean {
  return typeof v === 'string' && /^(v|√|✓|✔|x|ya)$/i.test(v.trim());
}

export function terisi(v: Sel | undefined): boolean {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

function teks(v: Sel | undefined): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

function sama(v: Sel | undefined, t: string): boolean {
  return teks(v).toLowerCase() === t.toLowerCase();
}

/** Tanggal dari sel: ISO (YYYY-MM-DD), HH/BB/TTTT, atau nomor seri Excel. */
export function tanggal(v: Sel | undefined): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    if (v < 1 || v > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
  }
  const t = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(t);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

/** Akhir TS (31 Agustus tahun akhir TS), sama dengan isian "TS (31/08/TTTT)" di sheet Menu. */
export function akhirTs(k: KonteksMetrik): Date {
  return new Date(Date.UTC(k.tsTahunMulai + 1, 7, 31));
}

/** Awal rentang n tahun terakhir (TS-(n-1) s.d. TS): 1 September tahun mulai TS-(n-1). */
export function awalRentang(k: KonteksMetrik, nTahun: number): Date {
  return new Date(Date.UTC(k.tsTahunMulai - (nTahun - 1), 8, 1));
}

function dalamRentang(d: Date | null, awal: Date, akhir: Date): boolean {
  return d !== null && d.getTime() >= awal.getTime() && d.getTime() <= akhir.getTime();
}

/** Tahun YYYY yang termasuk n tahun akademik terakhir (tahun kalender yang disentuh TS-(n-1) s.d. TS). */
function tahunDalamRentang(v: Sel | undefined, k: KonteksMetrik, nTahun: number): boolean {
  const y = angka(v);
  return y !== null && y >= k.tsTahunMulai - (nTahun - 1) && y <= k.tsTahunMulai + 1;
}

function bagi(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
}

function batasi(skor: number | null, min = 0, maks = 4): number | null {
  if (skor === null || !Number.isFinite(skor)) return null;
  return Math.min(maks, Math.max(min, skor));
}

/**
 * Skor tiga tingkat (internasional, nasional, wilayah) yang dipakai banyak butir matriks:
 * skor 4 bila RI > a dan RN > b; selain itu 3,75 × ((A+B+C/2) − A×B − A×C/2 − B×C/2 + A×B×C/2)
 * dengan penyesuaian: RI ≥ a dan RN < b → RI = a; RI < a dan RN ≥ b → RN = b; RW ≥ c → RW = c.
 */
export function skorTigaTingkat(ri: number, rn: number, rw: number, a: number, b: number, c: number): number {
  if (ri > a && rn > b) return 4;
  let i = ri;
  let n = rn;
  let w = rw;
  if (i >= a && n < b) i = a;
  if (i < a && n >= b) n = b;
  if (w >= c) w = c;
  const A = i / a;
  const B = n / b;
  const C = w / c;
  return Math.min(4, 3.75 * (A + B + C / 2 - A * B - (A * C) / 2 - (B * C) / 2 + (A * B * C) / 2));
}

// ------------------------------------------------------------------ akses tabel

type PetaTabel = Map<string, TabelMetrik>;

function baris(t: PetaTabel, sheet: string) {
  return t.get(sheet)?.baris ?? [];
}

function barisBerlabel(t: PetaTabel, sheet: string, kolom: string, pola: RegExp) {
  return baris(t, sheet).find((b) => pola.test(teks(b.sel[kolom])));
}

/** Variabel dosen dari Tabel 4.a (definisi panel INFO template, dibatasi pada DTPS sesuai matriks). */
export function variabelDosen(t: PetaTabel) {
  const isi = baris(t, '4a').filter((b) => terisi(b.sel.B));
  const tetap = isi.filter((b) => sama(b.sel.D, 'Dosen Tetap'));
  const dtps = tetap.filter((b) => tercentang(b.sel.J));
  const jabatan = (j: string) => dtps.filter((b) => sama(b.sel.K, j)).length;
  return {
    NDT: tetap.length,
    NDTT: isi.filter((b) => sama(b.sel.D, 'Dosen Tidak Tetap')).length,
    NDTPS: dtps.length,
    NDS3: dtps.filter((b) => terisi(b.sel.G)).length,
    NDGB: jabatan('Guru Besar'),
    NDLK: jabatan('Lektor Kepala'),
    NDL: jabatan('Lektor'),
  };
}

/** Jumlah mahasiswa prodi yang diakreditasi (baris bertanda V di kolom C Tabel 6.a). */
export function variabelMahasiswa(t: PetaTabel) {
  const b = baris(t, '6a').find((x) => terisi(x.sel.B) && tercentang(x.sel.C));
  return {
    ada: Boolean(b),
    NM_TS2: nol(b?.sel.D),
    NM_TS1: nol(b?.sel.E),
    NM: nol(b?.sel.F),
    asingTS: nol(b?.sel.I) + nol(b?.sel.L),
  };
}

function m(kode: string, nama: string, nilai: number | null, satuan: Satuan, rumus?: string): Metrik {
  return { kode: `M-${kode}`, nama, nilai, satuan, rumus };
}

function hasil(
  butir: string, judul: string, tabel: string[], utama: string, metrik: Metrik[], skor: number | null,
  catatan: string[] = [],
): HasilButirAngka {
  // RI/RN/RW dipakai beberapa butir: kodenya diberi nomor butir supaya unik di prompt (M-33-RI)
  const unik = (k: string) => (/^(RI|RN|RW)$/.test(k) ? `M-${butir}-${k}` : `M-${k}`);
  const daftar = metrik.map((x) => ({ ...x, kode: unik(x.kode.replace(/^M-/, '')) }));
  const u = daftar.find((x) => x.kode === unik(utama));
  return { butir, judul, tabel, utama: unik(utama), metrik: daftar, skor, catatan, lengkap: Boolean(u && u.nilai !== null) };
}

// ------------------------------------------------------------------ kerja sama (2.a)

/** Kerja sama sah: kolom wajib terisi dan masa berlaku beririsan dengan 4 tahun sampai akhir TS (rumus template). */
export function kerjaSamaSah(b: { sel: Record<string, Sel> }, k: KonteksMetrik): boolean {
  if (![b.sel.B, b.sel.F, b.sel.L].every(terisi)) return false;
  if (![b.sel.C, b.sel.D, b.sel.E].some(tercentang)) return false;
  const mulai = tanggal(b.sel.H);
  const selesai = tanggal(b.sel.I);
  if (!mulai || !selesai) return false;
  const akhir = akhirTs(k);
  const awal = new Date(Date.UTC(akhir.getUTCFullYear() - 4, akhir.getUTCMonth(), akhir.getUTCDate()));
  const t = (d: Date) => d.getTime();
  return (t(mulai) > t(awal) && t(mulai) < t(akhir))
    || (t(selesai) > t(awal) && t(selesai) < t(akhir))
    || (t(mulai) < t(awal) && t(selesai) > t(akhir));
}

function kerjaSama(t: PetaTabel, k: KonteksMetrik) {
  const per = ['2a1', '2a2', '2a3'].map((s) => baris(t, s).filter((b) => kerjaSamaSah(b, k)));
  const semua = per.flat();
  return {
    N1: per[0].length, N2: per[1].length, N3: per[2].length,
    NI: semua.filter((b) => tercentang(b.sel.C)).length,
    NN: semua.filter((b) => tercentang(b.sel.D)).length,
    NW: semua.filter((b) => tercentang(b.sel.E)).length,
  };
}

// ------------------------------------------------------------------ tabel isian tetap tiga tahun (TS-2, TS-1, TS)

function jumlahTigaTahun(b: { sel: Record<string, Sel> } | undefined, kolom = ['C', 'D', 'E']): number {
  return b ? kolom.reduce((s, c) => s + nol(b.sel[c]), 0) : 0;
}

/** Baris NA1..NB3 (Tabel 4.d / 6.e.1), urut sesuai template. */
function publikasi(t: PetaTabel, sheet: string) {
  const isi = baris(t, sheet).filter((b) => /^\d+$/.test(teks(b.sel.A)));
  const n = (i: number) => jumlahTigaTahun(isi[i]);
  return { NA1: n(0), NA2: n(1), NA3: n(2), NA4: n(3), NB1: n(4), NB2: n(5), NB3: n(6), ada: isi.length >= 7 };
}

/** Luaran (paten, HKI, TTG, buku) dari sheet 4.f / 6.e.3 dalam 3 tahun terakhir. */
function luaran(t: PetaTabel, awalan: '4f' | '6e3', k: KonteksMetrik) {
  const awal = awalRentang(k, 3);
  const akhir = akhirTs(k);
  const hitung = (s: string) => {
    const isi = baris(t, `${awalan}-${s}`).filter((b) => terisi(b.sel.B));
    return {
      n: isi.filter((b) => dalamRentang(tanggal(b.sel.C), awal, akhir)).length,
      luar: isi.filter((b) => !dalamRentang(tanggal(b.sel.C), awal, akhir)).length,
    };
  };
  const p = hitung('1');
  const h = hitung('2');
  const g = hitung('3');
  const bk = hitung('4');
  return { NPaten: p.n, NHKI: h.n, NTTG: g.n, NBC: bk.n, diluarRentang: p.luar + h.luar + g.luar + bk.luar };
}

/** Jumlah judul (berbeda) di Tabel 6.h.1 / 6.i yang melibatkan mahasiswa dalam 3 tahun terakhir. */
function judulMelibatkanMahasiswa(t: PetaTabel, sheet: string, k: KonteksMetrik): number {
  const judul = new Set(
    baris(t, sheet)
      .filter((b) => [b.sel.B, b.sel.D, b.sel.E].every(terisi) && tahunDalamRentang(b.sel.F, k, 3))
      .map((b) => teks(b.sel.E).toLowerCase().replace(/\s+/g, ' ')),
  );
  return judul.size;
}

/** Jumlah judul penelitian/PkM per sumber pembiayaan (Tabel 3.b / 3.c). */
function sumberDana(t: PetaTabel, sheet: string) {
  const pt = barisBerlabel(t, sheet, 'B', /perguruan tinggi|mandiri/i);
  const dn = barisBerlabel(t, sheet, 'B', /dalam negeri/i);
  const ln = barisBerlabel(t, sheet, 'B', /luar negeri/i);
  const NW = jumlahTigaTahun(pt);
  const NN = jumlahTigaTahun(dn);
  const NI = jumlahTigaTahun(ln);
  return { NI, NN, NW, total: NI + NN + NW, ada: Boolean(pt || dn || ln) };
}

// ------------------------------------------------------------------ butir

type FungsiButir = (t: PetaTabel, k: KonteksMetrik) => HasilButirAngka;

const BUTIR: Record<string, FungsiButir> = {
  '6-I': (t, k) => {
    const ks = kerjaSama(t, k);
    const { NDTPS } = variabelDosen(t);
    const RK = bagi(ks.N1 + ks.N2 + ks.N3, NDTPS);
    return hasil('6-I', 'Relevansi kerja sama', ['2.a', '4.a'], 'RK', [
      m('N1', 'Jumlah kerja sama pendidikan (sah)', ks.N1, 'angka'),
      m('N2', 'Jumlah kerja sama penelitian (sah)', ks.N2, 'angka'),
      m('N3', 'Jumlah kerja sama PkM (sah)', ks.N3, 'angka'),
      m('NDTPS', 'Jumlah DTPS', NDTPS, 'angka'),
      m('RK', 'Rasio kerja sama per DTPS', RK, 'rasio', 'RK = (N1 + N2 + N3) / NDTPS'),
    ], RK === null ? null : batasi(RK >= 4 ? 4 : RK), [
      'Kerja sama dihitung sah bila masa berlakunya beririsan dengan 4 tahun sampai akhir TS dan bukti terisi (rumus template).',
    ]);
  },

  '6-II': (t, k) => {
    const ks = kerjaSama(t, k);
    return hasil('6-II', 'Kerja sama tingkat internasional, nasional, wilayah', ['2.a'], 'NI', [
      m('NI', 'Kerja sama tingkat internasional', ks.NI, 'angka'),
      m('NN', 'Kerja sama tingkat nasional', ks.NN, 'angka'),
      m('NW', 'Kerja sama tingkat wilayah/lokal', ks.NW, 'angka'),
    ], skorTigaTingkat(ks.NI, ks.NN, ks.NW, 2, 6, 8), ['Faktor a = 2, b = 6, c = 8.']);
  },

  '9': (t) => {
    const tahun = [['G', 'NM_TS2'], ['H', 'NM_TS1'], ['I', 'NM']] as const;
    const mhs = variabelMahasiswa(t);
    const rinci = baris(t, '2b').filter((b) => /^[a-f]\./i.test(teks(b.sel.B)));
    const perTahun = tahun.map(([kol, km]) => {
      const dana = rinci.reduce((s, b) => s + nol(b.sel[kol]), 0);
      return bagi(dana, mhs[km]);
    });
    const sah = perTahun.filter((x): x is number => x !== null);
    const BOP = sah.length ? sah.reduce((s, x) => s + x, 0) / sah.length : null;
    return hasil('9', 'Biaya operasional pendidikan', ['2.b', '6.a'], 'BOP', [
      m('BOP_TS2', 'Dana operasional pendidikan per mahasiswa TS-2', perTahun[0], 'rupiah'),
      m('BOP_TS1', 'Dana operasional pendidikan per mahasiswa TS-1', perTahun[1], 'rupiah'),
      m('BOP_TS', 'Dana operasional pendidikan per mahasiswa TS', perTahun[2], 'rupiah'),
      m('BOP', 'Rata-rata dana operasional pendidikan per mahasiswa per tahun', BOP, 'rupiah',
        'BOP = rata-rata (jumlah biaya operasional pendidikan a–f kolom Program Studi / jumlah mahasiswa aktif) TS-2 s.d. TS'),
    ], BOP === null ? null : batasi(BOP >= 20_000_000 ? 4 : BOP / 5_000_000), [
      'Asumsi: memakai kolom Program Studi Tabel 2.b baris 1.a–1.f (tanpa biaya kemahasiswaan) dibagi mahasiswa aktif Tabel 6.a tahun yang sama.',
    ]);
  },

  '10': (t) => {
    const b = barisBerlabel(t, '2b', 'B', /^biaya penelitian/i);
    const { NDTPS } = variabelDosen(t);
    const rerata = jumlahTigaTahun(b, ['G', 'H', 'I']) / 3;
    const DPD = bagi(rerata, NDTPS);
    return hasil('10', 'Dana penelitian DTPS', ['2.b', '4.a'], 'DPD', [
      m('DANA_PENELITIAN', 'Rata-rata dana penelitian program studi per tahun', b ? rerata : null, 'rupiah'),
      m('DPD', 'Rata-rata dana penelitian per DTPS per tahun', DPD, 'rupiah', 'DPD = rata-rata dana penelitian per tahun / NDTPS'),
    ], DPD === null ? null : batasi(DPD >= 10_000_000 ? 4 : (2 * DPD) / 5_000_000), [
      'Asumsi: rata-rata per tahun dibagi NDTPS (matriks menulis "dana penelitian DTPS/tahun").',
    ]);
  },

  '11': (t) => {
    const b = barisBerlabel(t, '2b', 'B', /^biaya pkm/i);
    const { NDTPS } = variabelDosen(t);
    const rerata = jumlahTigaTahun(b, ['G', 'H', 'I']) / 3;
    const DPkMD = bagi(rerata, NDTPS);
    return hasil('11', 'Dana PkM DTPS', ['2.b', '4.a'], 'DPkMD', [
      m('DANA_PKM', 'Rata-rata dana PkM program studi per tahun', b ? rerata : null, 'rupiah'),
      m('DPkMD', 'Rata-rata dana PkM per DTPS per tahun', DPkMD, 'rupiah', 'DPkMD = rata-rata dana PkM per tahun / NDTPS'),
    ], DPkMD === null ? null : batasi(DPkMD >= 5_000_000 ? 4 : (4 * DPkMD) / 5_000_000), [
      'Asumsi: rata-rata per tahun dibagi NDTPS.',
    ]);
  },

  '18': (t) => {
    const mk = baris(t, '3a1').filter((b) => [b.sel.B, b.sel.C, b.sel.D].every(terisi));
    const kuliah = mk.reduce((s, b) => s + nol(b.sel.F), 0);
    const seminar = mk.reduce((s, b) => s + nol(b.sel.G), 0);
    const praktik = mk.reduce((s, b) => s + nol(b.sel.H), 0);
    const JP = praktik * 50;
    const JB = (kuliah + seminar + praktik) * 50;
    const PJP = bagi(JP, JB);
    let skor: number | null = null;
    if (PJP !== null) skor = PJP < 0.2 ? 20 * PJP : PJP > 0.5 ? 8 - 8 * PJP : 4;
    return hasil('18', 'Pembelajaran praktikum, praktik, praktik lapangan', ['3.a.1'], 'PJP', [
      m('SKS_KULIAH', 'Jumlah sks kuliah/responsi/tutorial', kuliah, 'sks'),
      m('SKS_SEMINAR', 'Jumlah sks seminar', seminar, 'sks'),
      m('SKS_PRAKTIK', 'Jumlah sks praktikum/praktik/praktik lapangan', praktik, 'sks'),
      m('JP', 'Jam pembelajaran praktik', JP, 'angka', 'JP = sks praktik × 50'),
      m('JB', 'Jam pembelajaran total', JB, 'angka', 'JB = (sks kuliah + seminar + praktik) × 50'),
      m('PJP', 'Persentase jam praktik', PJP, 'persen', 'PJP = JP / JB × 100%'),
    ], batasi(skor));
  },

  '19': (t) => {
    const mk = baris(t, '3a4').filter((b) => terisi(b.sel.B));
    const sks = mk.reduce((s, b) => s + nol(b.sel.D), 0);
    const skor = sks >= 25 ? 4 : sks >= 20 ? 3 : sks >= 15 ? 2 : sks >= 10 ? 1 : 0;
    return hasil('19', 'Mata kuliah basic sciences dan matematika', ['3.a.4'], 'SKS_BASIC', [
      m('SKS_BASIC', 'Jumlah sks basic sciences dan matematika', mk.length ? sks : null, 'sks'),
    ], mk.length ? skor : null);
  },

  '23': (t, k) => {
    const NPMhs = judulMelibatkanMahasiswa(t, '6h1', k);
    const NPD = sumberDana(t, '3b').total;
    const P = bagi(NPMhs, NPD);
    return hasil('23', 'Penelitian DTPS yang melibatkan mahasiswa', ['6.h.1', '3.b'], 'PPDMhs', [
      m('NPMhs', 'Judul penelitian DTPS yang melibatkan mahasiswa', NPMhs, 'angka'),
      m('NPD', 'Judul penelitian DTPS 3 tahun terakhir', NPD, 'angka'),
      m('PPDMhs', 'Persentase penelitian yang melibatkan mahasiswa', P, 'persen', 'PPDMhs = NPMhs / NPD × 100%'),
    ], P === null ? null : batasi(P >= 0.5 ? 4 : 1 + 6 * P, 1), ['NPD diambil dari jumlah judul Tabel 3.b; judul di 6.h.1 dihitung sekali walau melibatkan beberapa mahasiswa.']);
  },

  '25': (t, k) => {
    const NPKMhs = judulMelibatkanMahasiswa(t, '6i', k);
    const NPKD = sumberDana(t, '3c').total;
    const P = bagi(NPKMhs, NPKD);
    return hasil('25', 'PkM DTPS yang melibatkan mahasiswa', ['6.i', '3.c'], 'PKDMhs', [
      m('NPKMhs', 'Judul PkM DTPS yang melibatkan mahasiswa', NPKMhs, 'angka'),
      m('NPKD', 'Judul PkM DTPS 3 tahun terakhir', NPKD, 'angka'),
      m('PKDMhs', 'Persentase PkM yang melibatkan mahasiswa', P, 'persen', 'PKDMhs = NPKMhs / NPKD × 100%'),
    ], P === null ? null : batasi(P >= 0.5 ? 4 : 1 + 6 * P, 1), ['NPKD diambil dari jumlah judul Tabel 3.c.']);
  },

  '26': (t) => {
    const d = variabelDosen(t);
    const PDTT = bagi(d.NDTT, d.NDT + d.NDTT);
    let skor: number | null = null;
    const catatan: string[] = [];
    if (PDTT !== null) {
      const A = (d.NDTPS - 5) / 7;
      const B = PDTT <= 0.1 ? (0.4 - PDTT) / 0.4 : (0.4 - PDTT) / 0.3;
      if (d.NDTPS >= 12 && PDTT <= 0.1) skor = 4;
      else if (d.NDTPS >= 12 && PDTT <= 0.4) skor = 2 + 2 * B;
      else if (d.NDTPS >= 5 && PDTT <= 0.4) skor = 2 + 2 * (A * B);
      else if (d.NDTPS >= 5) {
        skor = 1;
        catatan.push('NDTPS ≥ 5 dan PDTT > 40%: skor 1 dibaca dari kolom skor 1 matriks (teks PDF terpotong).');
      } else skor = 0;
    }
    return hasil('26', 'Kecukupan jumlah DTPS', ['4.a'], 'NDTPS', [
      m('NDTPS', 'Jumlah DTPS', d.NDTPS, 'angka'),
      m('NDT', 'Jumlah dosen tetap', d.NDT, 'angka'),
      m('NDTT', 'Jumlah dosen tidak tetap', d.NDTT, 'angka'),
      m('PDTT', 'Persentase dosen tidak tetap', PDTT, 'persen', 'PDTT = NDTT / (NDT + NDTT) × 100%'),
    ], batasi(skor), catatan);
  },

  '27': (t) => {
    const d = variabelDosen(t);
    const P = bagi(d.NDS3, d.NDTPS);
    return hasil('27', 'Kualifikasi akademik DTPS', ['4.a'], 'PDS3', [
      m('NDS3', 'Jumlah DTPS berpendidikan doktor', d.NDS3, 'angka'),
      m('NDTPS', 'Jumlah DTPS', d.NDTPS, 'angka'),
      m('PDS3', 'Persentase DTPS doktor', P, 'persen', 'PDS3 = NDS3 / NDTPS × 100%'),
    ], P === null ? null : batasi(P >= 0.5 ? 4 : 2 + 4 * P, 2));
  },

  '28': (t) => {
    const d = variabelDosen(t);
    const P = bagi(d.NDGB + d.NDLK + d.NDL, d.NDTPS);
    return hasil('28', 'Jabatan akademik DTPS', ['4.a'], 'PGBLKL', [
      m('NDGB', 'DTPS Guru Besar', d.NDGB, 'angka'),
      m('NDLK', 'DTPS Lektor Kepala', d.NDLK, 'angka'),
      m('NDL', 'DTPS Lektor', d.NDL, 'angka'),
      m('PGBLKL', 'Persentase DTPS Guru Besar, Lektor Kepala, Lektor', P, 'persen', 'PGBLKL = (NDGB + NDLK + NDL) / NDTPS × 100%'),
    ], P === null ? null : batasi(P >= 0.7 ? 4 : 2 + (20 * P) / 7, 2));
  },

  '30': (t) => {
    const dtps = baris(t, '4c').filter((b) => terisi(b.sel.B) && tercentang(b.sel.C));
    const perSemester = dtps.map((b) => ['D', 'E', 'F', 'G', 'H', 'I'].reduce((s, c) => s + nol(b.sel[c]), 0) / 2);
    const RBK = perSemester.length ? perSemester.reduce((s, x) => s + x, 0) / perSemester.length : null;
    let skor: number | null = null;
    const catatan: string[] = [];
    if (RBK !== null) {
      if (RBK >= 12 && RBK <= 16) skor = 4;
      else if (RBK > 16 && RBK <= 20) skor = (64 - 3 * RBK) / 4;
      else catatan.push('RBK di luar 12–20 sks: skor tidak terbaca dari matriks, perlu penilaian asesor.');
    }
    return hasil('30', 'Rerata beban kerja DTPS', ['4.c'], 'RBK', [
      m('RBK', 'Rerata beban kerja DTPS per semester', RBK, 'sks', 'RBK = rata-rata (jumlah BK per tahun / 2) DTPS'),
    ], batasi(skor, 1), catatan);
  },

  '31': (t) => butirSumberDana('31', 'Penelitian DTPS', '3b', '3.b', t),
  '32': (t) => butirSumberDana('32', 'PkM DTPS', '3c', '3.c', t),

  '33': (t) => {
    const p = publikasi(t, '4d');
    const { NDTPS } = variabelDosen(t);
    const RI = bagi(p.NA4 + p.NB3, NDTPS);
    const RN = bagi(p.NA2 + p.NA3 + p.NB2, NDTPS);
    const RW = bagi(p.NA1 + p.NB1, NDTPS);
    return hasil('33', 'Publikasi ilmiah DTPS', ['4.d', '4.a'], 'RI', [
      ...(['NA1', 'NA2', 'NA3', 'NA4', 'NB1', 'NB2', 'NB3'] as const).map((x) => m(x, `Publikasi ${x}`, p[x], 'angka')),
      m('RI', 'Rasio publikasi internasional bereputasi per DTPS', RI, 'rasio', 'RI = (NA4 + NB3) / NDTPS'),
      m('RN', 'Rasio publikasi nasional terakreditasi/internasional per DTPS', RN, 'rasio', 'RN = (NA2 + NA3 + NB2) / NDTPS'),
      m('RW', 'Rasio publikasi nasional/wilayah per DTPS', RW, 'rasio', 'RW = (NA1 + NB1) / NDTPS'),
    ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, 0.5, 1, 2), ['Faktor a = 0,5; b = 1; c = 2.']);
  },

  '34': (t, k) => {
    const l = luaran(t, '4f', k);
    const { NDTPS } = variabelDosen(t);
    const RLP = bagi(3 * l.NPaten + 2 * (l.NTTG + l.NBC) + l.NHKI, NDTPS);
    const catatan = l.diluarRentang ? [`${l.diluarRentang} luaran bertanggal di luar 3 tahun terakhir tidak dihitung.`] : [];
    return hasil('34', 'Luaran penelitian dan PkM DTPS', ['4.f', '4.a'], 'RLP', [
      m('NPaten', 'Paten dan paten sederhana', l.NPaten, 'angka'),
      m('NHKI', 'HKI (hak cipta, desain, dll.)', l.NHKI, 'angka'),
      m('NTTG', 'Teknologi tepat guna dan produk', l.NTTG, 'angka'),
      m('NBC', 'Buku ber-ISBN dan book chapter', l.NBC, 'angka'),
      m('RLP', 'Rasio luaran per DTPS', RLP, 'rasio', 'RLP = (3 × NPaten + 2 × (NTTG + NBC) + NHKI) / NDTPS'),
    ], RLP === null ? null : batasi(RLP >= 3 ? 4 : 2 + (2 * RLP) / 3, 2), catatan);
  },

  '35': (t) => {
    const { NDTPS } = variabelDosen(t);
    const nama = new Set(
      baris(t, '4h')
        .filter((b) => terisi(b.sel.B) && nol(b.sel.C) + nol(b.sel.D) + nol(b.sel.E) > 0)
        .map((b) => teks(b.sel.B).toLowerCase()),
    );
    const P = bagi(nama.size, NDTPS);
    return hasil('35', 'DTPS penulis pertama/korespondensi karya bereputasi', ['4.h', '4.a'], 'PKDTPS', [
      m('NKDTPS', 'DTPS dengan karya ilmiah bereputasi sebagai penulis pertama/korespondensi', nama.size, 'angka'),
      m('PKDTPS', 'Persentase DTPS penulis pertama/korespondensi', P, 'persen', 'PKDTPS = NKDTPS / NDTPS × 100%'),
    ], P === null ? null : batasi(P >= 0.5 ? 4 : 1 + 6 * P, 1));
  },

  '36': (t) => {
    const { NDTPS } = variabelDosen(t);
    const KIB = baris(t, '4i').filter((b) => terisi(b.sel.B) && terisi(b.sel.C) && nol(b.sel.D) > 0).length;
    const P = bagi(KIB, NDTPS);
    return hasil('36', 'Karya ilmiah bereputasi DTPS yang disitasi', ['4.i', '4.a'], 'PKIB', [
      m('KIB', 'Karya ilmiah bereputasi yang disitasi', KIB, 'angka'),
      m('PKIB', 'Persentase karya ilmiah bereputasi disitasi per DTPS', P, 'persen', 'PKIB = KIB / NDTPS'),
    ], P === null ? null : batasi(P >= 0.25 ? 4 : 2 + 8 * P, 2));
  },

  '37': (t, k) => {
    const { NDTPS } = variabelDosen(t);
    const nama = new Set(
      baris(t, '4j')
        .filter((b) => terisi(b.sel.B) && terisi(b.sel.D) && tahunDalamRentang(b.sel.I, k, 3))
        .map((b) => teks(b.sel.B).toLowerCase()),
    );
    const P = bagi(nama.size, NDTPS);
    return hasil('37', 'DTPS dengan pengakuan/rekognisi', ['4.j', '4.a'], 'PRDTPS', [
      m('NRDTPS', 'DTPS yang memiliki rekognisi 3 tahun terakhir', nama.size, 'angka'),
      m('PRDTPS', 'Persentase DTPS dengan rekognisi', P, 'persen', 'PRDTPS = NRDTPS / NDTPS'),
    ], P === null ? null : batasi(P >= 0.5 ? 4 : 2 + 4 * P, 2));
  },

  '40': (t) => {
    const { NDTPS } = variabelDosen(t);
    const mhs = variabelMahasiswa(t);
    const RMD = mhs.ada ? bagi(mhs.NM, NDTPS) : null;
    let skor: number | null = null;
    if (RMD !== null) {
      const A = (NDTPS - 5) / 7;
      const B = RMD < 15 ? RMD / 15 : RMD <= 25 ? 1 : RMD <= 35 ? (35 - RMD) / 10 : 0;
      if (RMD > 35) skor = 0;
      else if (NDTPS >= 12 && RMD >= 15 && RMD <= 25) skor = 4;
      else if (NDTPS >= 12) skor = 1 + 3 * B;
      else if (NDTPS >= 5) skor = 1 + 3 * (A * B);
      else skor = 0;
    }
    return hasil('40', 'Rasio mahasiswa terhadap DTPS', ['6.a', '4.a'], 'RMD', [
      m('NM', 'Jumlah mahasiswa saat TS', mhs.ada ? mhs.NM : null, 'angka'),
      m('NDTPS', 'Jumlah DTPS', NDTPS, 'angka'),
      m('RMD', 'Rasio mahasiswa per DTPS', RMD, 'rasio', 'RMD = NM / NDTPS'),
    ], batasi(skor));
  },

  '41': (t) => {
    const mhs = variabelMahasiswa(t);
    const PMA = mhs.ada ? bagi(mhs.asingTS, mhs.NM) : null;
    return hasil('41', 'Persentase mahasiswa asing', ['6.a'], 'PMA', [
      m('NMA', 'Mahasiswa asing saat TS (penuh dan paruh waktu)', mhs.ada ? mhs.asingTS : null, 'angka'),
      m('PMA', 'Persentase mahasiswa asing', PMA, 'persen', 'PMA = NMA / NM × 100%'),
    ], PMA === null ? null : batasi(PMA >= 0.01 ? 4 : 2 + 200 * PMA, 2), [
      'Asumsi: mahasiswa asing penuh waktu dan paruh waktu saat TS pada baris prodi yang diakreditasi.',
    ]);
  },

  '42': (t) => {
    const isi = baris(t, '6b').filter((b) => /^TS(-[12])?$/i.test(teks(b.sel.B)) && nol(b.sel.C) > 0 && angka(b.sel.E) !== null);
    const lulusan = isi.reduce((s, b) => s + nol(b.sel.C), 0);
    const RIPK = lulusan ? isi.reduce((s, b) => s + nol(b.sel.C) * nol(b.sel.E), 0) / lulusan : null;
    let skor: number | null = null;
    if (RIPK !== null) skor = RIPK >= 3.25 ? 4 : RIPK >= 2 ? (8 * RIPK - 6) / 5 : 2;
    return hasil('42', 'Rata-rata IPK lulusan', ['6.b'], 'RIPK', [
      m('NL_IPK', 'Jumlah lulusan TS-2 s.d. TS', lulusan, 'angka'),
      m('RIPK', 'Rata-rata IPK lulusan 3 tahun terakhir', RIPK, 'angka', 'RIPK = Σ(jumlah lulusan × rata-rata IPK) / Σ jumlah lulusan'),
    ], batasi(skor, 2), ['Rata-rata tertimbang jumlah lulusan per tahun.']);
  },

  '43-I': (t, k) => butirPrestasi('43-I', 'Prestasi akademik mahasiswa', '6c1', '6.c.1', t, k),
  '43-II': (t, k) => butirPrestasi('43-II', 'Prestasi nonakademik mahasiswa', '6c2', '6.c.2', t, k),

  '44': (t) => {
    const tengah: Record<string, number> = { C: 4, D: 5, E: 6, F: 7.25 };
    const isi = baris(t, '6d').filter((b) => /^TS(-\d)?$/i.test(teks(b.sel.A)));
    let n = 0;
    let total = 0;
    for (const b of isi) for (const [c, mid] of Object.entries(tengah)) {
      n += nol(b.sel[c]);
      total += nol(b.sel[c]) * mid;
    }
    const MS = n ? total / n : null;
    let skor: number | null = null;
    const catatan = ['Asumsi: masa studi tiap lulusan didekati titik tengah kelompok 6.d (4; 5; 6; 7,25 tahun).'];
    if (MS !== null) {
      if (MS > 3.5 && MS <= 4.5) skor = 4;
      else if (MS > 4.5 && MS <= 8) skor = (55 - 6 * MS) / 7;
      else if (MS <= 3) skor = 0;
      else catatan.push('MS di luar rentang yang terbaca dari matriks.');
    }
    return hasil('44', 'Rata-rata masa studi lulusan', ['6.d'], 'MS', [
      m('NLULUS_6D', 'Jumlah lulusan pada Tabel 6.d', n, 'angka'),
      m('MS', 'Rata-rata masa studi lulusan', MS, 'tahun', 'MS = Σ(lulusan × titik tengah masa studi) / Σ lulusan'),
    ], batasi(skor), catatan);
  },

  '45': (t) => {
    const b = baris(t, '6d').find((x) => sama(x.sel.A, 'TS-3'));
    const a = nol(b?.sel.B);
    const lulus = nol(b?.sel.C);
    const PTW = b ? bagi(lulus, a) : null;
    let skor: number | null = null;
    if (PTW !== null) skor = PTW >= 0.5 ? 4 : PTW > 0 ? 1 + 6 * PTW : 0;
    return hasil('45', 'Persentase kelulusan tepat waktu', ['6.d'], 'PTW', [
      m('MASUK_TS3', 'Mahasiswa masuk TS-3 (a)', b ? a : null, 'angka'),
      m('LULUS_TW', 'Lulus 3,5 < MS ≤ 4,5 dari angkatan TS-3 (b)', b ? lulus : null, 'angka'),
      m('PTW', 'Persentase kelulusan tepat waktu', PTW, 'persen', 'PTW = b / a × 100%'),
    ], batasi(skor));
  },

  '46': (t) => {
    const p = publikasi(t, '6e1');
    const { NM, ada } = variabelMahasiswa(t);
    const RI = ada ? bagi(p.NA4 + p.NB3, NM) : null;
    const RN = ada ? bagi(p.NA2 + p.NA3 + p.NB2, NM) : null;
    const RW = ada ? bagi(p.NA1 + p.NB1, NM) : null;
    return hasil('46', 'Publikasi ilmiah mahasiswa', ['6.e.1', '6.a'], 'RI', [
      ...(['NA1', 'NA2', 'NA3', 'NA4', 'NB1', 'NB2', 'NB3'] as const).map((x) => m(`MHS_${x}`, `Publikasi mahasiswa ${x}`, p[x], 'angka')),
      m('RI', 'Rasio publikasi internasional bereputasi per mahasiswa', RI, 'rasio', 'RI = (NA4 + NB3) / NM'),
      m('RN', 'Rasio publikasi nasional terakreditasi/internasional per mahasiswa', RN, 'rasio', 'RN = (NA2 + NA3 + NB2) / NM'),
      m('RW', 'Rasio publikasi nasional/wilayah per mahasiswa', RW, 'rasio', 'RW = (NA1 + NB1) / NM'),
    ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, 0.01, 0.1, 0.5), ['Faktor a = 0,01; b = 0,1; c = 0,5.']);
  },

  '47': (t, k) => {
    const l = luaran(t, '6e3', k);
    const NLP = 3 * l.NPaten + 2 * (l.NTTG + l.NBC) + l.NHKI;
    return hasil('47', 'Luaran penelitian dan PkM mahasiswa', ['6.e.3'], 'NLP', [
      m('MHS_NPaten', 'Paten mahasiswa', l.NPaten, 'angka'),
      m('MHS_NHKI', 'HKI mahasiswa', l.NHKI, 'angka'),
      m('MHS_NTTG', 'TTG/produk mahasiswa', l.NTTG, 'angka'),
      m('MHS_NBC', 'Buku/book chapter mahasiswa', l.NBC, 'angka'),
      m('NLP', 'Skor luaran mahasiswa', NLP, 'angka', 'NLP = 3 × NPaten + 2 × (NTTG + NBC) + NHKI'),
    ], batasi(NLP >= 10 ? 4 : 2 + 0.2 * NLP, 2));
  },

  '49': (t) => {
    const isi = baris(t, '6f1').filter((b) => /^TS-[12]$/i.test(teks(b.sel.A)));
    const jl = isi.reduce((s, b) => s + nol(b.sel.B), 0);
    const terlacak = isi.reduce((s, b) => s + nol(b.sel.C), 0);
    const k3 = isi.reduce((s, b) => s + nol(b.sel.D), 0);
    const k18 = isi.reduce((s, b) => s + nol(b.sel.E), 0);
    const l18 = isi.reduce((s, b) => s + nol(b.sel.F), 0);
    const n = k3 + k18 + l18;
    const WT = n ? (k3 * 1.5 + k18 * 10.5 + l18 * 18) / n : null;
    const responden = bagi(terlacak, jl);
    let skor: number | null = null;
    const catatan = ['Asumsi: WT didekati titik tengah kelompok (1,5; 10,5 bulan) dan 18 bulan untuk WT > 18 bulan.'];
    if (WT !== null) {
      if (WT <= 3) skor = 4;
      else if (WT <= 18) skor = (23 - WT) / 5;
      else catatan.push('WT > 18 bulan: skor tidak terbaca dari matriks.');
    }
    if (responden !== null && responden < 0.3) catatan.push('Responden lulusan kurang dari 30%.');
    return hasil('49', 'Waktu tunggu lulusan', ['6.f.1'], 'WT', [
      m('RESPONDEN_WT', 'Persentase lulusan terlacak', responden, 'persen'),
      m('WT_KURANG3', 'Lulusan dengan WT < 3 bulan', k3, 'angka'),
      m('WT_3_18', 'Lulusan dengan 3 ≤ WT ≤ 18 bulan', k18, 'angka'),
      m('WT_LEBIH18', 'Lulusan dengan WT > 18 bulan', l18, 'angka'),
      m('WT', 'Perkiraan rata-rata waktu tunggu', WT, 'bulan'),
    ], batasi(skor), catatan);
  },

  '50': (t) => {
    const isi = baris(t, '6f2').filter((b) => /^TS-[12]$/i.test(teks(b.sel.A)));
    const jl = isi.reduce((s, b) => s + nol(b.sel.B), 0);
    const terlacak = isi.reduce((s, b) => s + nol(b.sel.C), 0);
    const rendah = isi.reduce((s, b) => s + nol(b.sel.D), 0);
    const sedang = isi.reduce((s, b) => s + nol(b.sel.E), 0);
    const tinggi = isi.reduce((s, b) => s + nol(b.sel.F), 0);
    const KBK = bagi(sedang + tinggi, rendah + sedang + tinggi);
    const responden = bagi(terlacak, jl);
    const catatan = ['Asumsi: KBK = lulusan dengan kesesuaian sedang dan tinggi dibagi lulusan terlacak yang dinilai.'];
    if (responden !== null && responden < 0.3) catatan.push('Responden lulusan kurang dari 30%.');
    return hasil('50', 'Kesesuaian bidang kerja lulusan', ['6.f.2'], 'KBK', [
      m('RESPONDEN_KBK', 'Persentase lulusan terlacak', responden, 'persen'),
      m('KBK', 'Kesesuaian bidang kerja', KBK, 'persen', 'KBK = (sedang + tinggi) / (rendah + sedang + tinggi) × 100%'),
    ], KBK === null ? null : batasi(KBK >= 0.6 ? 4 : (20 * KBK) / 3), catatan);
  },

  '51': (t) => {
    const isi = baris(t, '6g1').filter((b) => /^TS-[12]$/i.test(teks(b.sel.A)));
    const NL = isi.reduce((s, b) => s + nol(b.sel.B), 0);
    const terlacak = isi.reduce((s, b) => s + nol(b.sel.D), 0);
    const NW = isi.reduce((s, b) => s + nol(b.sel.E), 0);
    const NN = isi.reduce((s, b) => s + nol(b.sel.F), 0);
    const NI = isi.reduce((s, b) => s + nol(b.sel.G), 0);
    const RI = bagi(NI, NL);
    const RN = bagi(NN, NL);
    const RW = bagi(NW, NL);
    const responden = bagi(terlacak, NL);
    const catatan = responden !== null && responden < 0.3 ? ['Responden lulusan kurang dari 30%.'] : [];
    return hasil('51', 'Tempat kerja lulusan', ['6.g.1'], 'RI', [
      m('NL', 'Jumlah lulusan TS-2 s.d. TS-1', NL, 'angka'),
      m('RESPONDEN_TK', 'Persentase lulusan terlacak', responden, 'persen'),
      m('RI', 'Persentase lulusan bekerja tingkat multinasional/internasional', RI, 'persen', 'RI = NI / NL × 100%'),
      m('RN', 'Persentase lulusan bekerja tingkat nasional/wirausaha berizin', RN, 'persen', 'RN = NN / NL × 100%'),
      m('RW', 'Persentase lulusan bekerja tingkat wilayah/lokal', RW, 'persen', 'RW = NW / NL × 100%'),
    ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, 0.05, 0.2, 0.9), [
      'Faktor a = 5%, b = 20%, c = 90%.', ...catatan,
    ]);
  },

  '52': (t) => {
    const isi = baris(t, '6g2').filter((b) => /^\d+$/.test(teks(b.sel.A)) && terisi(b.sel.B));
    const tk = isi.map((b) => (4 * nol(b.sel.C) + 3 * nol(b.sel.D) + 2 * nol(b.sel.E) + nol(b.sel.F)) / 100);
    const skor = isi.length ? tk.reduce((s, x) => s + x, 0) / 7 : null;
    return hasil('52', 'Kepuasan pengguna lulusan', ['6.g.2'], 'TK', [
      ...isi.map((b, i) => m(`TK${i + 1}`, `Tingkat kepuasan: ${teks(b.sel.B)}`, tk[i], 'angka')),
      m('TK', 'Rata-rata tingkat kepuasan 7 aspek', skor, 'angka', 'Skor = ΣTKi / 7; TKi = 4a + 3b + 2c + d (persentase)'),
    ], batasi(skor));
  },
};

function butirSumberDana(kode: string, nama: string, sheet: string, tabel: string, t: PetaTabel): HasilButirAngka {
  const s = sumberDana(t, sheet);
  const { NDTPS } = variabelDosen(t);
  const RI = bagi(s.NI / 3, NDTPS);
  const RN = bagi(s.NN / 3, NDTPS);
  const RW = bagi(s.NW / 3, NDTPS);
  return hasil(kode, `Kegiatan ${nama}`, [tabel, '4.a'], 'RI', [
    m(`${kode}_NI`, `Judul ${nama} sumber dana luar negeri`, s.NI, 'angka'),
    m(`${kode}_NN`, `Judul ${nama} sumber dana dalam negeri`, s.NN, 'angka'),
    m(`${kode}_NW`, `Judul ${nama} sumber dana PT/mandiri`, s.NW, 'angka'),
    m('RI', 'Rasio sumber luar negeri per DTPS per tahun', RI, 'rasio', 'RI = NI / 3 / NDTPS'),
    m('RN', 'Rasio sumber dalam negeri per DTPS per tahun', RN, 'rasio', 'RN = NN / 3 / NDTPS'),
    m('RW', 'Rasio sumber PT/mandiri per DTPS per tahun', RW, 'rasio', 'RW = NW / 3 / NDTPS'),
  ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, 0.05, 0.3, 1), ['Faktor a = 0,05; b = 0,3; c = 1.']);
}

function butirPrestasi(kode: string, nama: string, sheet: string, tabel: string, t: PetaTabel, k: KonteksMetrik): HasilButirAngka {
  const awal = awalRentang(k, 5);
  const akhir = akhirTs(k);
  const isi = baris(t, sheet).filter((b) => [b.sel.B, b.sel.C, b.sel.G].every(terisi));
  const sah = isi.filter((b) => dalamRentang(tanggal(b.sel.C), awal, akhir));
  const NI = sah.filter((b) => tercentang(b.sel.F)).length;
  const NN = sah.filter((b) => tercentang(b.sel.E)).length;
  const NW = sah.filter((b) => tercentang(b.sel.D)).length;
  const { NM, ada } = variabelMahasiswa(t);
  const RI = ada ? bagi(NI, NM) : null;
  const RN = ada ? bagi(NN, NM) : null;
  const RW = ada ? bagi(NW, NM) : null;
  const catatan = ['Faktor a = 0,2%; b = 2%; c = 4%.'];
  if (isi.length > sah.length) catatan.push(`${isi.length - sah.length} prestasi di luar 5 tahun terakhir tidak dihitung.`);
  return hasil(kode, nama, [tabel, '6.a'], `${kode}_RI`, [
    m(`${kode}_NI`, `${nama} tingkat internasional`, NI, 'angka'),
    m(`${kode}_NN`, `${nama} tingkat nasional`, NN, 'angka'),
    m(`${kode}_NW`, `${nama} tingkat wilayah/lokal`, NW, 'angka'),
    m(`${kode}_RI`, 'Rasio internasional per mahasiswa', RI, 'persen', 'RI = NI / NM'),
    m(`${kode}_RN`, 'Rasio nasional per mahasiswa', RN, 'persen', 'RN = NN / NM'),
    m(`${kode}_RW`, 'Rasio wilayah per mahasiswa', RW, 'persen', 'RW = NW / NM'),
  ], RI === null || RN === null || RW === null ? null : skorTigaTingkat(RI, RN, RW, 0.002, 0.02, 0.04), catatan);
}

/** Kode butir angka Sarjana yang didukung, urut nomor butir (6-I, 6-II, 9, 10, ...). */
export const BUTIR_ANGKA_SARJANA = Object.keys(BUTIR).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));

/** Hitung metrik satu butir. Mengembalikan null bila butir bukan butir angka yang dikenal. */
export function hitungButir(kodeButir: string, tabel: TabelMetrik[], k: KonteksMetrik): HasilButirAngka | null {
  const f = BUTIR[kodeButir];
  if (!f) return null;
  const peta = new Map(tabel.map((x) => [x.sheet, x]));
  return f(peta, k);
}

/** Hitung semua butir angka Sarjana. */
export function hitungSemua(tabel: TabelMetrik[], k: KonteksMetrik): HasilButirAngka[] {
  return BUTIR_ANGKA_SARJANA.map((kode) => hitungButir(kode, tabel, k) as HasilButirAngka);
}

export interface RumusKatalog {
  kode: string;
  judul: string;
  tabel: string[];
  /** rumus metrik utama, mis. "RK = (N1 + N2 + N3) / NDTPS" */
  rumus: string | null;
}

/**
 * Katalog rumus yang sudah ada (butir angka Sarjana 2025): dipakai sebagai daftar pilihan saat AI mengusulkan
 * pencocokan rumus untuk butir angka instrumen baru (revisi 19 Okt 2026).
 */
export function katalogRumus(): RumusKatalog[] {
  return BUTIR_ANGKA_SARJANA.map((kode) => {
    const h = hitungButir(kode, [], { tsTahunMulai: 2025 })!;
    const utama = h.metrik.find((m) => m.kode === h.utama);
    return { kode, judul: h.judul, tabel: h.tabel, rumus: utama?.rumus ?? (utama ? `${utama.kode}: ${utama.nama}` : null) };
  });
}

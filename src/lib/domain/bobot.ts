import { JENJANG } from './instrumen.ts';
import { cariJudulTabel, gabungSel, kelompokkanBaris, kolomItem, tepiKolom, type HalamanTeks } from './tata-letak-pdf.ts';

/**
 * Tabel "LAMPIRAN: BOBOT PENILAIAN AKREDITASI PROGRAM STUDI" di Pedoman Penilaian (satu tabel per jenjang),
 * berkolom NO. | ELEMEN | INDIKATOR | BOBOT. Dibaca tanpa AI dari posisi kolom: setiap angka di kolom BOBOT
 * memulai satu sub-indikator. Butir dengan lebih dari satu bobot menjadi n-I, n-II, ...
 */

export interface SubBobot {
  bobot: number;
  indikator: string;
}

export interface BarisBobot {
  no: number;
  elemen: string;
  sub: SubBobot[];
  halaman: number;
}

export interface ButirBobot {
  kode: string;
  no: number;
  sub: string | null;
  elemen: string;
  indikator: string;
  bobot: number;
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function romawi(n: number): string {
  return ROMAWI[n - 1] ?? String(n);
}

const LABEL = [/^NO\.?$/i, /^ELEMEN$/i, /^INDIKATOR$/i, /^BOBOT$/i];
const POLA_BOBOT = /^\d{1,2}[.,]\d{1,2}$/;
const KAKI = 70;

export function bacaTabelBobot(halaman: HalamanTeks[]): { baris: BarisBobot[]; butir: ButirBobot[] } {
  const hasil: BarisBobot[] = [];
  let tepi: number[] | null = null;
  let kini: { b: BarisBobot; elemen: string[]; indikator: string[][] } | null = null;
  const tutup = () => {
    if (!kini) return;
    kini.b.elemen = gabungSel(kini.elemen);
    kini.b.sub = kini.b.sub.map((s, i) => ({ ...s, indikator: gabungSel(kini!.indikator[i] ?? []) }));
    hasil.push(kini.b);
    kini = null;
  };
  for (const h of halaman) {
    const semua = kelompokkanBaris(h.item);
    const judul = cariJudulTabel(semua, LABEL);
    if (judul) tepi = tepiKolom(h.item.filter((i) => i.y < judul.y - 2 && i.y > KAKI), judul.tengah);
    if (!tepi) continue;
    for (const b of semua.filter((x) => x.y > KAKI && (!judul || x.y < judul.y - 2))) {
      const t = tepi;
      const no = b.item.find((i) => kolomItem(i.x, t) === 0 && /^\d{1,3}$/.test(i.teks.trim()));
      if (no) {
        tutup();
        kini = { b: { no: Number(no.teks.trim()), elemen: '', sub: [], halaman: h.nomor }, elemen: [], indikator: [] };
      }
      if (!kini) continue;
      const k = kini as { b: BarisBobot; elemen: string[]; indikator: string[][] };
      const bobot = b.item.find((i) => kolomItem(i.x, t) === 3 && POLA_BOBOT.test(i.teks.trim()));
      if (bobot) {
        k.b.sub.push({ bobot: Number(bobot.teks.trim().replace(',', '.')), indikator: '' });
        k.indikator.push([]);
      }
      const el = b.item.filter((i) => kolomItem(i.x, t) === 1).map((i) => i.teks.trim()).join(' ');
      if (el) k.elemen.push(el);
      const ind = b.item.filter((i) => kolomItem(i.x, t) === 2).map((i) => i.teks.trim()).join(' ');
      if (ind) {
        if (k.indikator.length === 0) k.indikator.push([]);
        k.indikator[k.indikator.length - 1].push(ind);
      }
    }
  }
  tutup();
  return { baris: hasil, butir: butirDariBobot(hasil) };
}

/** Kode butir dari tabel bobot: satu bobot → "n"; beberapa bobot → "n-I", "n-II", ... */
export function butirDariBobot(baris: BarisBobot[]): ButirBobot[] {
  return baris.flatMap((b) => b.sub.map((s, i) => ({
    kode: b.sub.length > 1 ? `${b.no}-${romawi(i + 1)}` : String(b.no),
    no: b.no,
    sub: b.sub.length > 1 ? romawi(i + 1) : null,
    elemen: b.elemen,
    indikator: s.indikator,
    bobot: s.bobot,
  })));
}

/** Rentang halaman "223-227" → [223, ..., 227]; "223" → [223]; "223-225, 227" juga diterima. */
export function bacaRentangHalaman(teks: string | null | undefined, maks = 2000): number[] {
  if (!teks?.trim()) return [];
  const hasil = new Set<number>();
  for (const bagian of teks.split(/[,;]/)) {
    const m = /^\s*(\d{1,4})\s*(?:[-–—]|s\.?d\.?)\s*(\d{1,4})\s*$/i.exec(bagian) ?? /^\s*(\d{1,4})\s*$/.exec(bagian);
    if (!m) throw new Error(`Rentang halaman "${bagian.trim()}" tidak dikenali. Contoh: 223-227.`);
    const a = Number(m[1]);
    const z = Number(m[2] ?? m[1]);
    if (a < 1 || z < a || z - a > 50 || z > maks) throw new Error(`Rentang halaman "${bagian.trim()}" tidak sah.`);
    for (let i = a; i <= z; i++) hasil.add(i);
  }
  return [...hasil].sort((x, y) => x - y);
}

export interface LetakTabelBobot {
  jenjang: string;
  halamanMulai: number;
  halamanAkhir: number;
}

/**
 * Usulan letak tabel bobot per jenjang dari teks polos per halaman: halaman berjudul "BOBOT PENILAIAN" sampai
 * halaman berurutan terakhir yang masih memuat angka bobot. Jenjang diambil dari judul "PROGRAM ..." terdekat sebelumnya.
 */
export function deteksiTabelBobot(teksHalaman: string[]): LetakTabelBobot[] {
  const hasil: LetakTabelBobot[] = [];
  const pola = JENJANG.map((j) => ({ kode: j.kode, re: new RegExp(`PROGRAM\\s+${j.nama.toUpperCase().replace(/^PROGRAM\s+/, '').replace(/\s+/g, '\\s+')}(?![A-Z\\s]*TERAPAN)`) }));
  teksHalaman.forEach((t, i) => {
    if (!/BOBOT\s+PENILAIAN/i.test(t) || !/LAMPIRAN/i.test(t)) return;
    let jenjang = '';
    for (let j = i; j >= Math.max(0, i - 40) && !jenjang; j--) {
      // nama yang lebih panjang lebih dulu ("SARJANA TERAPAN" sebelum "SARJANA")
      const cocok = [...pola].sort((a, b) => b.re.source.length - a.re.source.length).find((p) => p.re.test(teksHalaman[j].toUpperCase()));
      if (cocok) jenjang = cocok.kode;
    }
    let akhir = i;
    while (akhir + 1 < teksHalaman.length && akhir - i < 7 && /^\s*\d{1,2}[.,]\d{2}\s*$/m.test(teksHalaman[akhir + 1]) && !/\bForm\s+(Laporan|Berita|Rekomendasi)|LAPORAN ASESMEN|BOBOT\s+PENILAIAN/.test(teksHalaman[akhir + 1])) akhir++;
    if (jenjang) hasil.push({ jenjang, halamanMulai: i + 1, halamanAkhir: akhir + 1 });
  });
  return hasil;
}

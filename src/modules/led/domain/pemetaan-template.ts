import { JENJANG } from '../../bersama/domain/jenjang.ts';
import {
  untukJenjang, uraiTemplate, type BagianHasilTemplate, type ParagrafTemplate, type PemetaanTemplate, type PeranGaya,
} from './template-led.ts';

/**
 * Pemetaan judul oleh Admin, tanpa AI dan tanpa token (perbaikan 2 Nov 2026, I3): tabel gaya paragraf template,
 * usulan awal dari aturan sederhana, dan pratinjau struktur hasil pemetaan.
 */

export const LABEL_PERAN: Record<PeranGaya | '', string> = {
  '': 'Seperti biasa',
  bab: 'BAB',
  bagian2: 'Bagian Bab II (II.A, II.B, …)',
  penanda: 'Penanda "Kriteria Akreditasi"',
  kriteria: 'Kriteria',
  sub1: 'Judul sub-bagian tingkat 1',
  sub2: 'Judul sub-bagian tingkat 2',
  sub3: 'Judul sub-bagian tingkat 3',
  instruksi: 'Instruksi',
  abaikan: 'Abaikan',
};

export interface BarisGaya {
  gaya: string;
  jumlah: number;
  /** paragraf bernomor (penomoran Word) */
  bernomor: number;
  ilvl: number[];
  contoh: string[];
}

function rapi(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const dipakai = (p: ParagrafTemplate) => !p.tabel && !/^toc/i.test(p.gaya) && rapi(p.teks).length > 0;

/** Gaya paragraf yang dipakai template beserta jumlah, penomoran, tingkat, dan 3 contoh teks. */
export function daftarGaya(paragraf: ParagrafTemplate[]): BarisGaya[] {
  const peta = new Map<string, BarisGaya>();
  for (const p of paragraf.filter(dipakai)) {
    const x = peta.get(p.gaya) ?? { gaya: p.gaya, jumlah: 0, bernomor: 0, ilvl: [], contoh: [] };
    x.jumlah += 1;
    if (p.numId) {
      x.bernomor += 1;
      if (!x.ilvl.includes(p.ilvl)) x.ilvl.push(p.ilvl);
    }
    const t = rapi(p.teks);
    if (x.contoh.length < 3 && t.length <= 200 && !x.contoh.includes(t)) x.contoh.push(t.length > 100 ? `${t.slice(0, 99)}…` : t);
    peta.set(p.gaya, x);
  }
  return [...peta.values()].map((x) => ({ ...x, ilvl: x.ilvl.sort() })).sort((a, b) => b.jumlah - a.jumlah);
}

/**
 * Usulan awal tanpa AI:
 * - gaya yang memuat "BAB I/II/…" → BAB;
 * - gaya yang memuat "Kriteria Akreditasi" → Bagian Bab II (bila dipakai juga untuk judul lain) atau Penanda;
 * - gaya yang muncul tepat N kali di bawah "Kriteria Akreditasi" (N = jumlah kriteria Matriks bila diketahui; bila
 *   tidak, gaya judul pertama sesudahnya) → Kriteria;
 * - gaya "heading 2/3" yang tidak bernomor dan belum dipetakan → judul sub-bagian tingkat 1/2, hanya bila template
 *   hampir tidak memakai penomoran Word untuk judul (template resmi memakainya).
 */
export function usulanPemetaan(paragraf: ParagrafTemplate[], opsi: { jumlahKriteria?: number } = {}): PemetaanTemplate {
  const gaya: Record<string, PeranGaya> = {};
  const isi = paragraf.filter(dipakai);
  for (const p of isi) {
    const t = rapi(p.teks);
    if (/^BAB\s+[IVX]+\b/i.test(t) && t.length <= 120 && p.gaya && (/heading|judul|title/i.test(p.gaya) || t === t.toUpperCase())) gaya[p.gaya] ??= 'bab';
  }
  const penanda = isi.findIndex((p) => /^kriteria akreditasi\.?$/i.test(rapi(p.teks)));
  if (penanda >= 0) {
    const g = isi[penanda].gaya;
    if (g && !gaya[g]) gaya[g] = isi.filter((p) => p.gaya === g).length > 1 ? 'bagian2' : 'penanda';
    const sesudah = isi.slice(penanda + 1);
    const akhir = sesudah.findIndex((p) => gaya[p.gaya] === 'bab');
    const wilayah = akhir >= 0 ? sesudah.slice(0, akhir) : sesudah;
    const hitung = new Map<string, number>();
    for (const p of wilayah) if (!p.numId && p.gaya && !gaya[p.gaya] && rapi(p.teks).length <= 150) hitung.set(p.gaya, (hitung.get(p.gaya) ?? 0) + 1);
    const tepat = opsi.jumlahKriteria ? [...hitung].find(([, n]) => n === opsi.jumlahKriteria)?.[0] : undefined;
    const pertama = wilayah.find((p) => !p.numId && p.gaya && !gaya[p.gaya] && /heading|judul|title/i.test(p.gaya))?.gaya;
    const k = tepat ?? pertama;
    if (k) gaya[k] = 'kriteria';
  }
  // judul sub-bagian template resmi memakai penomoran Word; gaya heading hanya diusulkan bila hampir tidak ada penomoran
  const judulBernomor = isi.filter((p) => p.numId && rapi(p.teks).length <= 150).length;
  for (const b of judulBernomor >= 10 ? [] : daftarGaya(paragraf)) {
    if (gaya[b.gaya] || b.bernomor > b.jumlah / 2) continue;
    const m = /^heading ([23])$/i.exec(b.gaya);
    if (m) gaya[b.gaya] = m[1] === '2' ? 'sub1' : 'sub2';
  }
  return { gaya };
}

export interface PratinjauBagian {
  kode: string;
  nama: string;
  jenis: BagianHasilTemplate['jenis'];
  /** jumlah sub-bagian per jenjang */
  sub: Record<string, number>;
  /** judul sub-bagian (semua jenjang) */
  judul: string[];
}

export interface Pratinjau {
  bagian: PratinjauBagian[];
  jumlahKriteria: number;
  /** sub-bagian per jenjang (seluruh template) */
  total: Record<string, number>;
  peringatan: string[];
}

/** Pohon BAB → kriteria → sub-bagian per jenjang, dan peringatan bila jumlah kriteria tidak sama dengan Matriks. */
export function pratinjauPemetaan(
  paragraf: ParagrafTemplate[], pemetaan: PemetaanTemplate | null, opsi: { jenjang: string | null; kriteriaMatriks?: number },
): Pratinjau {
  const hasil = uraiTemplate(paragraf, pemetaan);
  const jenjang = JENJANG.map((j) => j.kode);
  const per = Object.fromEntries(jenjang.map((j) => [j, untukJenjang(hasil, j)]));
  const bagian = hasil.map((b, i) => ({
    kode: b.kode, nama: b.nama, jenis: b.jenis,
    sub: Object.fromEntries(jenjang.map((j) => [j, per[j][i].sub.length])),
    judul: b.sub.map((s) => [...s.jalur, s.judul].join(' › ')),
  }));
  const total = Object.fromEntries(jenjang.map((j) => [j, bagian.reduce((n, b) => n + b.sub[j], 0)]));
  const jumlahKriteria = hasil.filter((b) => b.jenis === 'kriteria').length;
  const peringatan: string[] = [];
  if (jumlahKriteria === 0) peringatan.push('Belum ada kriteria yang terbaca. Pilih gaya yang berperan sebagai Kriteria.');
  if (opsi.kriteriaMatriks && jumlahKriteria && jumlahKriteria !== opsi.kriteriaMatriks) {
    peringatan.push(`Jumlah kriteria (${jumlahKriteria}) tidak sama dengan Matriks Penilaian (${opsi.kriteriaMatriks}).`);
  }
  if (opsi.jenjang && jumlahKriteria && total[opsi.jenjang] === 0) peringatan.push('Tidak ada sub-bagian untuk jenjang instrumen ini.');
  if (!hasil.some((b) => /^II\./.test(b.kode))) peringatan.push('Bagian Bab II (II.A, II.B) belum terbaca.');
  return { bagian, jumlahKriteria, total, peringatan };
}

/** Pola catatan jenjang dari Admin harus regex yang sah dan tidak kosong maknanya. */
export function polaCatatanSah(pola: string): boolean {
  try {
    const r = new RegExp(pola, 'i');
    return !r.test('');
  } catch {
    return false;
  }
}

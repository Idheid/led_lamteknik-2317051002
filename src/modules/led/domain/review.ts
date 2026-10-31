import type { DokTiptap } from './narasi.ts';
import type { StatusReview } from './kesiapan.ts';

/**
 * Review asesor (revisi 22 Okt 2026): jangkar catatan revisi pada teks, alur status catatan dan LED, serta nilai
 * akhir simulasi (bobot × skor, maksimal 400) dengan perkiraan status menurut ambang Pedoman Penilaian.
 * Fungsi murni; dipakai server (penanda "teks asli berubah") dan editor (sorotan).
 */

export type StatusCatatan = 'terbuka' | 'diperbaiki' | 'diterima';

export const LABEL_CATATAN: Record<StatusCatatan, string> = {
  terbuka: 'Terbuka',
  diperbaiki: 'Sudah diperbaiki',
  diterima: 'Diterima',
};

export function bacaStatusCatatan(s: string): StatusCatatan {
  return s === 'diperbaiki' || s === 'diterima' ? s : 'terbuka';
}

/** Catatan yang belum selesai (dihitung di lonceng, ringkasan kriteria, dan kesiapan). */
export const CATATAN_BELUM_SELESAI: StatusCatatan[] = ['terbuka', 'diperbaiki'];

// ------------------------------------------------------------------ teks polos dan jangkar

/** Panjang konteks di kiri dan kanan teks yang diblok. */
export const PANJANG_KONTEKS = 60;

interface SimpulJson {
  type?: string;
  text?: string;
  content?: SimpulJson[];
}

/**
 * Teks polos dokumen untuk jangkar: teks setiap paragraf (termasuk di dalam daftar dan sel tabel) berurutan
 * depth-first, dipisah "\n". Urutan dan pemisah ini harus sama dengan peta posisi editor (petaTeksDokumen).
 */
export function teksPolos(doc: DokTiptap | null | undefined): string {
  const par: string[] = [];
  const jalan = (n: SimpulJson) => {
    if (n.type === 'paragraph') {
      par.push((n.content ?? []).filter((a) => a.type === 'text').map((a) => a.text ?? '').join(''));
      return;
    }
    for (const a of n.content ?? []) jalan(a);
  };
  for (const n of (doc?.content ?? []) as SimpulJson[]) jalan(n);
  return par.join('\n');
}

export interface Jangkar {
  teks: string;
  sebelum: string;
  sesudah: string;
}

/** Jangkar dari blok teks [mulai, akhir) pada teks polos. Spasi di tepi blok dibuang. */
export function buatJangkar(teks: string, mulai: number, akhir: number): Jangkar | null {
  while (mulai < akhir && /\s/.test(teks[mulai])) mulai++;
  while (akhir > mulai && /\s/.test(teks[akhir - 1])) akhir--;
  if (akhir <= mulai) return null;
  return {
    teks: teks.slice(mulai, akhir),
    sebelum: teks.slice(Math.max(0, mulai - PANJANG_KONTEKS), mulai),
    sesudah: teks.slice(akhir, akhir + PANJANG_KONTEKS),
  };
}

function akhiranSama(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function awalanSama(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Cari letak jangkar di teks sekarang: semua kemunculan teks persisnya, dipilih yang konteks kiri/kanannya paling
 * cocok (teks yang sama bisa muncul lebih dari sekali). null bila teksnya sudah tidak ada ("teks asli berubah").
 */
export function cariJangkar(teks: string, j: Jangkar): { mulai: number; akhir: number } | null {
  if (!j.teks) return null;
  let terbaik: { mulai: number; skor: number } | null = null;
  for (let i = teks.indexOf(j.teks); i >= 0; i = teks.indexOf(j.teks, i + 1)) {
    const skor = akhiranSama(teks.slice(Math.max(0, i - PANJANG_KONTEKS), i), j.sebelum)
      + awalanSama(teks.slice(i + j.teks.length, i + j.teks.length + PANJANG_KONTEKS), j.sesudah);
    if (!terbaik || skor > terbaik.skor) terbaik = { mulai: i, skor };
  }
  return terbaik ? { mulai: terbaik.mulai, akhir: terbaik.mulai + j.teks.length } : null;
}

// ------------------------------------------------------------------ alur

export type AksiCatatan = 'diperbaiki' | 'diterima' | 'dibuka';

/** PJ: terbuka → diperbaiki. Asesor: diperbaiki → diterima, dan diperbaiki/diterima → terbuka (buka lagi). */
export function statusSetelah(peran: 'PJ' | 'ASESOR', dari: StatusCatatan, aksi: AksiCatatan): StatusCatatan | null {
  if (peran === 'PJ') return aksi === 'diperbaiki' && dari === 'terbuka' ? 'diperbaiki' : null;
  if (aksi === 'diterima') return dari === 'diperbaiki' ? 'diterima' : null;
  if (aksi === 'dibuka') return dari === 'diperbaiki' || dari === 'diterima' ? 'terbuka' : null;
  return null;
}

/** PJ mengajukan review dari Draf atau Perlu revisi; asesor memutuskan hanya saat Direview. */
export function bolehAjukanReview(s: StatusReview): boolean {
  return s === 'draf' || s === 'perlu_revisi';
}

// ------------------------------------------------------------------ penilaian akhir

export interface ButirNilai {
  kode: string;
  bobot: number;
}

export interface NilaiAkhir {
  total: number;
  maksimum: number;
  dinilai: number;
  jumlahButir: number;
  lengkap: boolean;
}

/** Nilai akhir = Σ bobot × skor (bobot satu jenjang berjumlah 100, jadi maksimal 400). */
export function hitungNilaiAkhir(butir: ButirNilai[], skor: Map<string, number>): NilaiAkhir {
  let total = 0;
  let dinilai = 0;
  for (const b of butir) {
    const s = skor.get(b.kode);
    if (s === undefined) continue;
    total += b.bobot * s;
    dinilai++;
  }
  const maksimum = butir.reduce((a, b) => a + b.bobot * 4, 0);
  return { total: Math.round(total * 100) / 100, maksimum: Math.round(maksimum * 100) / 100, dinilai, jumlahButir: butir.length, lengkap: dinilai === butir.length && butir.length > 0 };
}

export interface AturanStatus {
  status: string;
  naMin?: number;
  naMaksEksklusif?: number;
  masaBerlakuTahun?: number;
  syarat?: string;
}

/** Aturan status dari VersiInstrumen.statusAkreditasi (seed: Pedoman Penilaian Tabel 3). */
export function bacaAturanStatus(json: unknown): AturanStatus[] {
  const aturan = (json as { aturan?: unknown } | null)?.aturan;
  return Array.isArray(aturan) ? aturan.filter((a): a is AturanStatus => typeof a?.status === 'string') : [];
}

/** Perkiraan status (aturan pertama yang ambangnya terpenuhi); syarat perlu tidak diperiksa di sini. */
export function perkiraanStatus(total: number, aturan: AturanStatus[]): AturanStatus | null {
  return aturan.find((a) => (a.naMin === undefined || total >= a.naMin) && (a.naMaksEksklusif === undefined || total < a.naMaksEksklusif)) ?? null;
}

/** Skor 0-4, paling banyak dua desimal (skor hitungan sistem bisa pecahan). */
export function skorSah(s: number): boolean {
  return Number.isFinite(s) && s >= 0 && s <= 4 && Math.round(s * 100) === s * 100;
}

/** Skor asesor berbeda dari hitungan sistem (butir angka) wajib diberi alasan. */
export function perluAlasan(skor: number, skorSistem: number | null): boolean {
  return skorSistem !== null && Math.abs(skor - skorSistem) > 0.005;
}

import { angka, type Sel } from './metrik-lkps.ts';

/**
 * Target dan capaian, plus tren 3 tahun (revisi 22 Okt 2026). Semua dihitung di kode, bukan oleh AI: persen capaian
 * (capaian dibagi target), status tercapai, dan tren TS-2, TS-1, TS dari tabel LKPS. Hasilnya masuk konteks sebagai
 * metrik bersumber; AI hanya menjelaskannya, lalu menulis akar masalah dan tindak lanjut.
 */

export interface HasilCapaian {
  capaian: number;
  target: number;
  /** capaian / target × 100 (untuk "lebih kecil lebih baik": target / capaian × 100) */
  persen: number;
  tercapai: boolean;
}

export function hitungCapaian(capaian: number | null, target: number | null, lebihKecil = false): HasilCapaian | null {
  if (capaian === null || target === null || !Number.isFinite(capaian) || !Number.isFinite(target) || target <= 0) return null;
  if (lebihKecil && capaian <= 0) return { capaian, target, persen: 100, tercapai: true };
  const persen = lebihKecil ? (target / capaian) * 100 : (capaian / target) * 100;
  return { capaian, target, persen: Math.round(persen * 10) / 10, tercapai: lebihKecil ? capaian <= target : capaian >= target };
}

/** Angka dari teks isian (format Indonesia: "1.250", "3,25", "45%"). */
export function angkaTeks(s: string | null | undefined): number | null {
  return angka((s ?? '').trim() as Sel);
}

export type ArahTren = 'naik' | 'turun' | 'tetap';

export interface Tren {
  judul: string;
  /** [TS-2, TS-1, TS] */
  nilai: [number, number, number];
  arah: ArahTren;
}

interface KolomTabel {
  kunci: string;
  label: string;
}

/**
 * Tren tiga tahun dari tabel LKPS yang berkolom TS-2, TS-1, TS: setiap kelompok tiga kolom berurutan dijumlahkan per
 * tahun di semua baris. Judul diambil dari label kelompok ("Jumlah Judul Penelitian / TS-2" → "Jumlah Judul Penelitian").
 */
export function trenTabel(t: { kolom: KolomTabel[]; baris: { sel: Record<string, Sel> }[] }, maks = 3): Tren[] {
  const hasil: Tren[] = [];
  const k = t.kolom;
  // label kolom tahun: bagian terakhir setelah "/" ("Jumlah Judul / TS-2", "TS-1", "TS")
  const tahun = (x: KolomTabel) => x.label.split('/').pop()!.trim();
  for (let i = 0; i + 2 < k.length && hasil.length < maks; i++) {
    if (tahun(k[i]) !== 'TS-2' || tahun(k[i + 1]) !== 'TS-1' || tahun(k[i + 2]) !== 'TS') continue;
    const judul = k[i].label.replace(/\s*\/\s*TS-2\s*$/, '').split('/').map((x) => x.trim()).filter(Boolean).join(' – ') || 'Jumlah';
    const jumlah = (kunci: string) => t.baris.reduce((n, b) => n + (angka(b.sel[kunci]) ?? 0), 0);
    const nilai: [number, number, number] = [jumlah(k[i].kunci), jumlah(k[i + 1].kunci), jumlah(k[i + 2].kunci)];
    if (nilai.every((v) => v === 0)) { i += 2; continue; }
    hasil.push({ judul, nilai, arah: nilai[2] > nilai[0] ? 'naik' : nilai[2] < nilai[0] ? 'turun' : 'tetap' });
    i += 2;
  }
  return hasil;
}

const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

export function teksTren(t: Tren): string {
  return `${t.judul}: ${fmt(t.nilai[0])} (TS-2), ${fmt(t.nilai[1])} (TS-1), ${fmt(t.nilai[2])} (TS), ${t.arah}`;
}

export function teksCapaian(c: HasilCapaian, satuan: string | null): string {
  const s = satuan ? ` ${satuan}` : '';
  return `capaian ${fmt(c.capaian)}${s} dari target ${fmt(c.target)}${s} (${fmt(c.persen)}% dari target), ${c.tercapai ? 'tercapai' : 'belum tercapai'}`;
}

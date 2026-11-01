import { ambangPengingat, bulanSampai } from '../../bersama/domain/akreditasi.ts';

/**
 * Dashboard akreditasi Fakultas/UPPS (desain form 2, 2 Nov 2026), logika murni: masa berlaku dan hitung mundur, status
 * LPMPP (reviewer internal), kelengkapan, tab, dan ringkasan.
 */

export type LabelMasa = 'Berakhir' | 'Kritis' | 'Perhatian' | 'Aktif' | 'Belum diisi';

export interface MasaBerlaku {
  label: LabelMasa;
  /** hari sampai berakhir (negatif bila sudah lewat) */
  hari: number | null;
  /** "82 hari lagi", "1,4 tahun", "lewat 10 hari" */
  teks: string;
}

const HARI = 24 * 3600_000;

/** Kritis ≤ 6 bulan, Perhatian ≤ 18 bulan (sama dengan ambang pengingat L2), Aktif selebihnya. */
export function masaBerlaku(berlakuSampai: Date | null, hariIni: Date): MasaBerlaku {
  if (!berlakuSampai) return { label: 'Belum diisi', hari: null, teks: 'Tanggal berakhir belum tercatat' };
  const hari = Math.round((berlakuSampai.getTime() - hariIni.getTime()) / HARI);
  if (hari < 0) return { label: 'Berakhir', hari, teks: `lewat ${-hari} hari` };
  const ambang = ambangPengingat(berlakuSampai, hariIni);
  const label: LabelMasa = ambang === 6 ? 'Kritis' : ambang ? 'Perhatian' : 'Aktif';
  const bulan = bulanSampai(berlakuSampai, hariIni);
  const teks = hari <= 120 ? `${hari} hari lagi`
    : bulan < 24 ? `${bulan} bulan lagi`
    : `${(hari / 365.25).toLocaleString('id-ID', { maximumFractionDigits: 1 })} tahun`;
  return { label, hari, teks };
}

export type KodeStatusLpmpp = 'belum-ada-led' | 'penyusunan' | 'direview' | 'perlu-revisi' | 'layak' | 'ekspor-final' | 'hasil-menunggu' | 'hasil-dicatat';

export const LABEL_STATUS_LPMPP: Record<KodeStatusLpmpp, string> = {
  'belum-ada-led': 'Belum ada LED',
  penyusunan: 'Penyusunan',
  direview: 'Direview LPMPP',
  'perlu-revisi': 'Revisi dari LPMPP',
  layak: 'Layak diajukan (LPMPP)',
  'ekspor-final': 'Siap diajukan ke LAM',
  'hasil-menunggu': 'Hasil menunggu konfirmasi',
  'hasil-dicatat': 'Hasil akreditasi dicatat',
};

/** Status LPMPP dari alur review internal (peran reviewer LPMPP) dan data LED. */
export function statusLpmpp(m: { adaLed: boolean; statusReview: string | null; eksporFinal: boolean; hasil: 'menunggu' | 'berlaku' | null }): KodeStatusLpmpp {
  if (m.hasil === 'menunggu') return 'hasil-menunggu';
  if (!m.adaLed) return m.hasil === 'berlaku' ? 'hasil-dicatat' : 'belum-ada-led';
  if (m.statusReview === 'direview') return 'direview';
  if (m.statusReview === 'perlu_revisi') return 'perlu-revisi';
  if (m.statusReview === 'layak') return m.eksporFinal ? 'ekspor-final' : 'layak';
  return 'penyusunan';
}

/** Kelengkapan LED: persentase sub-bagian yang sudah berdraf (selesai dihitung penuh, berdraf setengah). */
export function persenLed(sub: { total: number; draf: number; selesai: number } | null): number | null {
  if (!sub || sub.total === 0) return null;
  return Math.round(((sub.selesai + (sub.draf - sub.selesai) * 0.5) / sub.total) * 100);
}

export type TabDashboard = 'semua' | 'prioritas' | 'unggul' | 'review';

export const LABEL_TAB: Record<TabDashboard, string> = {
  semua: 'Semua Prodi',
  prioritas: 'Prioritas Re-akreditasi',
  unggul: 'Sudah Unggul',
  review: 'Dalam Review LPMPP',
};

export interface BarisTab {
  masa: MasaBerlaku;
  peringkat: string | null;
  status: KodeStatusLpmpp;
  perluLedBaru: boolean;
}

/** Prioritas: berakhir ≤ 18 bulan, sudah lewat, atau perlu LED baru. Unggul: peringkat memuat "Unggul". */
export function masukTab(b: BarisTab, tab: TabDashboard): boolean {
  if (tab === 'semua') return true;
  if (tab === 'prioritas') return b.perluLedBaru || b.masa.label === 'Kritis' || b.masa.label === 'Perhatian' || b.masa.label === 'Berakhir';
  if (tab === 'unggul') return /unggul/i.test(b.peringkat ?? '');
  return b.status === 'direview' || b.status === 'perlu-revisi';
}

export function jumlahPerTab(baris: BarisTab[]): Record<TabDashboard, number> {
  return Object.fromEntries((Object.keys(LABEL_TAB) as TabDashboard[]).map((t) => [t, baris.filter((b) => masukTab(b, t)).length])) as Record<TabDashboard, number>;
}

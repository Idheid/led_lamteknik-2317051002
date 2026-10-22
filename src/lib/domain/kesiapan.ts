/**
 * Deadline, kesiapan, dan jadwal kerja dihitung mundur (revisi 22 Okt 2026).
 * - LED yang akreditasi prodinya paling dekat berakhir tampil paling atas, dengan tanda warna.
 * - Batas pengajuan per LED; tonggak dihitung mundur dari tanggal itu (Pedoman Penyusunan LEDPS meminta jadwal
 *   kerja "yang dihitung mundur dari batas waktu penyerahan") dan bisa diubah PJ.
 */

export type StatusReview = 'draf' | 'direview' | 'perlu_revisi' | 'layak';

export const LABEL_REVIEW: Record<StatusReview, string> = {
  draf: 'Draf',
  direview: 'Direview',
  perlu_revisi: 'Perlu revisi',
  layak: 'Layak diajukan',
};

export function bacaStatusReview(s: string | null | undefined): StatusReview {
  return s === 'direview' || s === 'perlu_revisi' || s === 'layak' ? s : 'draf';
}

/** Usulan awal (belum dikonfirmasi): LED diajukan paling lambat 6 bulan sebelum akreditasi berakhir. */
export const BULAN_PENGAJUAN_SEBELUM_BERAKHIR = 6;

export interface DefTonggak {
  kode: 'lkps' | 'kriteria' | 'bab' | 'review' | 'ekspor';
  nama: string;
  /** minggu sebelum batas pengajuan */
  minggu: number;
}

export const TONGGAK: DefTonggak[] = [
  { kode: 'lkps', nama: 'LKPS lengkap dan dokumen terunggah', minggu: 8 },
  { kode: 'kriteria', nama: 'Draf C.1 sampai C.7 selesai', minggu: 6 },
  { kode: 'bab', nama: 'Bab I–IV, kata pengantar, dan ringkasan selesai', minggu: 4 },
  { kode: 'review', nama: 'Review asesor selesai dan sosialisasi draf', minggu: 2 },
  { kode: 'ekspor', nama: 'Ekspor final', minggu: 0 },
];

export type KodeTonggak = DefTonggak['kode'];

export interface Tonggak {
  kode: KodeTonggak;
  nama: string;
  /** YYYY-MM-DD */
  tanggal: string;
  diubah: boolean;
}

const HARI = 86_400_000;

/** Tanggal YYYY-MM-DD (UTC) dari Date. */
export function tanggalIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function tambahBulan(d: Date, bulan: number): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + bulan, 1));
  const akhir = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(d.getUTCDate(), akhir));
  return x;
}

export function usulanBatasPengajuan(akreditasiBerakhir: Date): Date {
  return tambahBulan(akreditasiBerakhir, -BULAN_PENGAJUAN_SEBELUM_BERAKHIR);
}

/** Tonggak dihitung mundur dari batas pengajuan; tanggal yang diubah PJ (`ubahan`) dipakai bila sah. */
export function jadwalMundur(batas: Date, ubahan: Record<string, string | null | undefined> = {}): Tonggak[] {
  return TONGGAK.map((t) => {
    const u = ubahan[t.kode];
    const sah = typeof u === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u) && !Number.isNaN(Date.parse(u));
    return {
      kode: t.kode,
      nama: t.nama,
      tanggal: sah ? u! : tanggalIso(new Date(batas.getTime() - t.minggu * 7 * HARI)),
      diubah: sah,
    };
  });
}

export type StatusTonggak = 'tercapai' | 'terlewat' | 'mendatang';

export function statusTonggak(tanggal: string, tercapai: boolean, hariIni: Date): StatusTonggak {
  if (tercapai) return 'tercapai';
  return tanggal < tanggalIso(hariIni) ? 'terlewat' : 'mendatang';
}

/** Sisa bulan penuh sampai tanggal berakhir (negatif bila sudah lewat); null bila tanggal tidak diketahui. */
export function sisaBulan(berakhir: Date | null | undefined, hariIni: Date): number | null {
  if (!berakhir) return null;
  let n = (berakhir.getUTCFullYear() - hariIni.getUTCFullYear()) * 12 + (berakhir.getUTCMonth() - hariIni.getUTCMonth());
  if (berakhir.getUTCDate() < hariIni.getUTCDate()) n -= 1;
  return n;
}

export type WarnaKesiapan = 'merah' | 'kuning' | null;

/** Merah: sisa 6 bulan atau kurang dan belum Layak diajukan; kuning: sisa 12 bulan atau kurang (ambang usulan). */
export function warnaKesiapan(sisa: number | null, review: StatusReview): WarnaKesiapan {
  if (sisa === null) return null;
  if (sisa <= 6 && review !== 'layak') return 'merah';
  if (sisa <= 12) return 'kuning';
  return null;
}

export function labelSisa(sisa: number | null): string {
  if (sisa === null) return 'tanggal akreditasi belum diisi';
  if (sisa < 0) return 'akreditasi sudah berakhir';
  if (sisa === 0) return 'berakhir bulan ini';
  return `${sisa} bulan lagi`;
}

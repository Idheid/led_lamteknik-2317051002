/**
 * Navigasi satu sub-bagian satu halaman (revisi 19 Okt 2026): status sub-bagian untuk ringkasan kriteria,
 * posisi "3 dari 14", tujuan tombol Sebelumnya/Berikutnya, dan sub-bagian tujuan tombol Lanjutkan.
 */

export type StatusSub = 'belum' | 'ada_jawaban' | 'ada_draf' | 'selesai' | 'data';

export const LABEL_STATUS_SUB: Record<StatusSub, string> = {
  belum: 'Belum diisi',
  ada_jawaban: 'Ada jawaban',
  ada_draf: 'Ada draf',
  selesai: 'Selesai',
  data: 'Dari data',
};

/** Sub-bagian bertipe data/otomatis tidak di-generate; isinya diambil dari data proyek. */
export function subDigenerate(tipe: string): boolean {
  return tipe !== 'data' && tipe !== 'otomatis';
}

export function statusSubBagian(m: {
  tipe: string;
  jawaban?: string | null;
  adaDraf: boolean;
  statusDraf?: string | null;
}): StatusSub {
  if (!subDigenerate(m.tipe)) return 'data';
  if (m.statusDraf === 'selesai') return 'selesai';
  if (m.adaDraf) return 'ada_draf';
  if (m.jawaban && m.jawaban.trim()) return 'ada_jawaban';
  return 'belum';
}

/** Sub-bagian yang dibuka tombol Lanjutkan: yang pertama belum selesai (dilewati: selesai dan data). */
export function subLanjutkan(daftar: { kode: string; status: StatusSub }[]): string | null {
  return daftar.find((s) => s.status !== 'selesai' && s.status !== 'data')?.kode ?? daftar[0]?.kode ?? null;
}

export interface Posisi {
  /** 1-based */
  nomor: number;
  total: number;
  sebelumnya: string | null;
  berikutnya: string | null;
}

export function posisiSub(kodeUrut: string[], kode: string): Posisi | null {
  const i = kodeUrut.indexOf(kode);
  if (i < 0) return null;
  return {
    nomor: i + 1,
    total: kodeUrut.length,
    sebelumnya: kodeUrut[i - 1] ?? null,
    berikutnya: kodeUrut[i + 1] ?? null,
  };
}

/** Bagian sesudah `kode` dalam urutan bagian proyek (tujuan Berikutnya di sub-bagian terakhir). */
export function bagianBerikutnya(kodeBagianUrut: string[], kode: string): string | null {
  const i = kodeBagianUrut.indexOf(kode);
  return i < 0 ? null : (kodeBagianUrut[i + 1] ?? null);
}

/** Persen kemajuan untuk bilah progres: posisi halaman di kriteria. */
export function persenPosisi(p: Pick<Posisi, 'nomor' | 'total'>): number {
  return p.total ? Math.round((p.nomor / p.total) * 100) : 0;
}

/**
 * Unsur skor 4 dari deskriptor resmi: dipecah menurut nomor (1), (2), … Bila deskriptor tidak bernomor,
 * seluruh deskriptor menjadi satu unsur.
 */
export function pecahUnsurSkor4(deskriptor: string): string[] {
  const teks = deskriptor.replace(/\s+/g, ' ').trim();
  if (!teks) return [];
  // bentuk rentang: "aspek (1) s.d. (4): a; b; c; d."
  const rentang = teks.match(/\(1\)\s*s\.?\s*d\.?\s*\((\d{1,2})\)\s*:\s*(.+)$/i);
  if (rentang) {
    const bagian = rentang[2].split(';').map((x) => x.trim().replace(/[.;,]\s*$/, '').trim()).filter(Boolean);
    if (bagian.length === Number(rentang[1])) return bagian.map((u) => u.charAt(0).toUpperCase() + u.slice(1));
  }
  const tanda = [...teks.matchAll(/\((\d{1,2})\)\s*/g)];
  // hanya penomoran berurutan mulai (1) yang dianggap pemecah unsur
  const urut: RegExpMatchArray[] = [];
  for (const m of tanda) if (Number(m[1]) === urut.length + 1) urut.push(m);
  if (urut.length < 2) return [teks];
  const hasil: string[] = [];
  for (let i = 0; i < urut.length; i++) {
    const awal = urut[i].index! + urut[i][0].length;
    const akhir = i + 1 < urut.length ? urut[i + 1].index! : teks.length;
    const u = teks.slice(awal, akhir).trim().replace(/[;,]?\s*(dan|serta|and)?\s*$/i, '').replace(/[;,.]\s*$/, '').trim();
    if (u) hasil.push(u.charAt(0).toUpperCase() + u.slice(1));
  }
  return hasil;
}

/** AF dan SWOT memakai ringkasan IKU: peringatkan bila belum ada draf IKU di kriteria ini. */
export function peringatanSebelumGenerate(kodeSub: string, jumlahDrafIku: number): string | null {
  const akhir = kodeSub.split('-').pop();
  if ((akhir === 'AF' || akhir === 'SWOT') && jumlahDrafIku === 0) {
    return `${akhir === 'AF' ? 'Analisis faktor' : 'SWOT'} disusun dari ringkasan indikator kinerja (IKU), tetapi kriteria ini belum punya draf IKU. Hasilnya akan kurang lengkap. Sebaiknya generate sub-bagian IKU lebih dulu.`;
  }
  return null;
}

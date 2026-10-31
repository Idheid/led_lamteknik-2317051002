/**
 * Utilitas teks berbahasa Indonesia: format angka, hitung kata, dan pemeriksaan angka di narasi.
 * Pemeriksaan angka mendukung aturan anti-halusinasi: setiap angka di narasi harus berasal dari data
 * (LKPS, metrik yang dihitung sistem, atau potongan dokumen yang dipakai).
 */

const fmtCache = new Map<number, Intl.NumberFormat>();

/** 1234.5 -> "1.234,5" (desimal koma, ribuan titik). */
export function formatAngka(n: number, desimal = 2): string {
  let f = fmtCache.get(desimal);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: desimal });
    fmtCache.set(desimal, f);
  }
  return f.format(n);
}

/** 0.4567 -> "45,67%". */
export function formatPersen(rasio: number, desimal = 2): string {
  return `${formatAngka(rasio * 100, desimal)}%`;
}

/** 20000000 -> "Rp20.000.000". */
export function formatRupiah(n: number): string {
  return `Rp${formatAngka(Math.round(n), 0)}`;
}

export function hitungKata(teks: string): number {
  const bersih = teks.replace(/<[^>]+>/g, ' ').trim();
  if (!bersih) return 0;
  return bersih.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export interface AngkaDitemukan {
  teks: string;
  nilai: number;
  persen: boolean;
  indeks: number;
}

/**
 * Ambil angka dari teks Indonesia: "1.234,56", "45%", "3,25", "2025/2026" (tahun akademik dibaca dua tahun).
 * Titik dianggap pemisah ribuan hanya bila diikuti tepat tiga digit.
 */
export function ekstrakAngka(teks: string): AngkaDitemukan[] {
  const hasil: AngkaDitemukan[] = [];
  // Boleh diawali "Rp"; tidak boleh menempel pada huruf (PDS3, S1) atau bagian angka lain.
  const re = /(?:(?<=Rp)|(?<![\p{L}\d.,]))(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(\s?%)?/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(teks)) !== null) {
    const bulat = m[1].replace(/\./g, '');
    const nilai = Number(m[2] ? `${bulat}.${m[2]}` : bulat);
    hasil.push({ teks: m[0], nilai, persen: Boolean(m[3]), indeks: m.index });
  }
  return hasil;
}

export interface OpsiPeriksaAngka {
  /** Abaikan bilangan bulat kecil (penomoran, jumlah unsur). Bawaan: <= 10. */
  abaikanBulatSampai?: number;
  /** Toleransi relatif untuk pembulatan (0,005 = 0,5%). */
  toleransi?: number;
  /** Tahun yang dianggap sah (misalnya dari peta TS). */
  tahunSah?: number[];
}

/**
 * Kembalikan angka di narasi yang tidak cocok dengan daftar angka sah.
 * Persen dibandingkan dua cara: sebagai nilai persen (45) dan rasio (0,45).
 */
export function angkaTidakBerdasar(teks: string, angkaSah: number[], opsi: OpsiPeriksaAngka = {}): AngkaDitemukan[] {
  const batasKecil = opsi.abaikanBulatSampai ?? 10;
  const tol = opsi.toleransi ?? 0.005;
  const tahun = new Set(opsi.tahunSah ?? []);
  const cocok = (a: number, b: number) => (a === b) || (b !== 0 && Math.abs(a - b) / Math.abs(b) <= tol);
  return ekstrakAngka(teks).filter((x) => {
    if (Number.isInteger(x.nilai) && x.nilai <= batasKecil && !x.persen) return false;
    if (tahun.has(x.nilai)) return false;
    const kandidat = x.persen ? [x.nilai, x.nilai / 100] : [x.nilai];
    return !angkaSah.some((s) => kandidat.some((k) => cocok(k, s) || cocok(k, s * 100)));
  });
}

/** Status panjang terhadap target (+/- toleransi). */
export function statusPanjang(jumlahKata: number, target: number, toleransi = 0.15): 'pas' | 'kurang' | 'lebih' {
  if (target <= 0) return 'pas';
  if (jumlahKata < target * (1 - toleransi)) return 'kurang';
  if (jumlahKata > target * (1 + toleransi)) return 'lebih';
  return 'pas';
}

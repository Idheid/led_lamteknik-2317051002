/**
 * Tahun akademik dan label TS.
 *
 * TS = tahun akademik penuh terakhir saat usulan akreditasi diajukan (catatan resmi template LKPS).
 * Contoh: pengajuan Oktober 2026 -> TS = 2025/2026, TS-1 = 2024/2025, TS-2 = 2023/2024.
 * Tahun akademik disimpan sebagai tahun mulainya (2025 untuk 2025/2026).
 */

/** Bulan (1-12) tahun akademik dimulai. Unila: Agustus. Bisa diubah per instalasi. */
export const BULAN_MULAI_TA_BAWAAN = 8;

/** Label TS paling jauh yang dipakai template LKPS (masa studi memakai sampai TS-7). */
export const TS_MUNDUR_MAKS = 7;

export function formatTahunAkademik(tahunMulai: number): string {
  if (!Number.isInteger(tahunMulai)) throw new Error(`Tahun tidak valid: ${tahunMulai}`);
  return `${tahunMulai}/${tahunMulai + 1}`;
}

/** "2025/2026" -> 2025. Melempar galat bila format salah atau tahun tidak berurutan. */
export function parseTahunAkademik(teks: string): number {
  const m = /^\s*(\d{4})\s*\/\s*(\d{4})\s*$/.exec(teks);
  if (!m) throw new Error(`Format tahun akademik harus YYYY/YYYY: "${teks}"`);
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (b !== a + 1) throw new Error(`Tahun akademik tidak berurutan: "${teks}"`);
  return a;
}

/**
 * Usulan TS bawaan dari tanggal pengajuan: tahun akademik terakhir yang sudah selesai penuh.
 * Tahun akademik yang dimulai pada tahun Y berakhir sebelum bulan mulai di tahun Y+1.
 */
export function tsDariTanggalPengajuan(tanggal: Date, bulanMulai: number = BULAN_MULAI_TA_BAWAAN): number {
  const tahun = tanggal.getUTCFullYear();
  const bulan = tanggal.getUTCMonth() + 1;
  // Bila bulan pengajuan >= bulan mulai, tahun akademik (tahun-1)/(tahun) sudah selesai.
  return bulan >= bulanMulai ? tahun - 1 : tahun - 2;
}

/** Label "TS", "TS-1", ... "TS-n" -> selisih tahun (0, 1, ... n). Mengembalikan null bila bukan label TS. */
export function selisihDariLabel(label: string): number | null {
  const m = /^\s*TS(?:\s*-\s*(\d+))?\s*$/i.exec(label);
  if (!m) return null;
  return m[1] ? Number(m[1]) : 0;
}

export function tahunMulaiDariLabel(label: string, tsTahunMulai: number): number {
  const s = selisihDariLabel(label);
  if (s === null) throw new Error(`Bukan label TS: "${label}"`);
  return tsTahunMulai - s;
}

/** Peta label -> tahun akademik, misalnya { "TS": "2025/2026", "TS-1": "2024/2025", ... }. */
export function petaTS(tsTahunMulai: number, mundurMaks: number = TS_MUNDUR_MAKS): Record<string, string> {
  const peta: Record<string, string> = {};
  for (let i = 0; i <= mundurMaks; i++) {
    peta[i === 0 ? 'TS' : `TS-${i}`] = formatTahunAkademik(tsTahunMulai - i);
  }
  return peta;
}

/**
 * Ganti label TS di dalam teks dengan tahun akademik nyata.
 * "TS-2 s.d. TS" -> "2023/2024 s.d. 2025/2026". Tidak menyentuh singkatan seperti DTPS atau NDTPS.
 */
export function gantiLabelTS(teks: string, tsTahunMulai: number): string {
  return teks.replace(/(?<![A-Za-z0-9])TS(?:\s*-\s*(\d+))?(?![A-Za-z0-9])/g, (_cocok, n?: string) => {
    const selisih = n ? Number(n) : 0;
    return formatTahunAkademik(tsTahunMulai - selisih);
  });
}

/**
 * Revisi 19 Okt 2026: satu LED berlaku 5 tahun. Label periode = tahun pengajuan sampai 5 tahun sesudahnya,
 * misalnya pengajuan 2026 → "Periode 2026–2031".
 */
export function labelPeriode(tahunPengajuan: number): string {
  return `Periode ${tahunPengajuan}–${tahunPengajuan + 5}`;
}

export interface PilihanTs {
  tsTahunMulai: number;
  /** "TS 2026/2027" */
  label: string;
  keterangan: string;
}

/**
 * Revisi 31 Okt 2026 (Pak Tris: "kalau saya maju tahun 2027 ... bisa pakai TS 2026 atau 2027"): dua pilihan TS untuk
 * tahun pengajuan P, yaitu (P−1)/P dan (P−2)/(P−1).
 */
export function pilihanTs(tahunPengajuan: number): PilihanTs[] {
  if (!Number.isInteger(tahunPengajuan)) throw new Error(`Tahun tidak valid: ${tahunPengajuan}`);
  const baru = formatTahunAkademik(tahunPengajuan - 1);
  return [
    { tsTahunMulai: tahunPengajuan - 1, label: `TS ${baru}`, keterangan: `Pakai bila data tahun akademik ${baru} sudah lengkap.` },
    {
      tsTahunMulai: tahunPengajuan - 2,
      label: `TS ${formatTahunAkademik(tahunPengajuan - 2)}`,
      keterangan: `Pakai bila pengajuan sebelum tahun akademik ${baru} selesai.`,
    },
  ];
}

/** TS bawaan LED baru: tsDariTanggalPengajuan(batas pengajuan atau hari ini), dibatasi ke dua pilihan tahun pengajuan. */
export function tsBawaan(tahunPengajuan: number, tanggal: Date, bulanMulai: number = BULAN_MULAI_TA_BAWAAN): number {
  const ts = tsDariTanggalPengajuan(tanggal, bulanMulai);
  return Math.min(tahunPengajuan - 1, Math.max(tahunPengajuan - 2, ts));
}

/** Label LED di kartu dan judul (revisi 31 Okt 2026): "TS 2026/2027 · pengajuan 2027". */
export function labelTsPengajuan(tsTahunMulai: number, tahunPengajuan: number): string {
  return `TS ${formatTahunAkademik(tsTahunMulai)} · pengajuan ${tahunPengajuan}`;
}

/** TS bawaan dari tahun pengajuan: tahun akademik sebelumnya (pengajuan 2026 → TS 2025/2026). */
export function tsDariTahunPengajuan(tahunPengajuan: number): number {
  return tahunPengajuan - 1;
}

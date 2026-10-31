/**
 * Rotasi kunci API LLM (Gemini).
 *
 * Alur yang disepakati:
 * - Penanggung jawab mengisi satu kunci. Saat kuotanya habis, generate berhenti rapi di butir terakhir
 *   dan sistem meminta kunci baru. Setelah kunci baru diisi, generate dilanjutkan dari butir itu.
 * - Super admin juga bisa mengisi kunci cadangan.
 * - Fakta Gemini (dicek 1 Okt 2026, ai.google.dev/gemini-api/docs/rate-limits):
 *   batas dihitung per PROJECT, bukan per kunci; kuota harian direset tengah malam waktu Pasifik;
 *   galat kuota = HTTP 429 RESOURCE_EXHAUSTED. Kunci tambahan hanya menambah kuota bila dari project lain.
 */

export type StatusKunci = 'aktif' | 'kuota_habis' | 'tidak_valid' | 'nonaktif';
export type PemilikKunci = 'penanggung_jawab' | 'super_admin';

export interface KunciAPI {
  id: string;
  label: string;
  pemilik: PemilikKunci;
  status: StatusKunci;
  /** Untuk status kuota_habis: kapan kunci boleh dicoba lagi. */
  habisSampai: Date | null;
  /** Urutan pemakaian di dalam kelompok pemilik yang sama (kecil = dipakai dulu). */
  urutan: number;
  dibuatPada: Date;
}

export type JenisGalat = 'kuota_harian' | 'batas_per_menit' | 'tidak_valid' | 'sementara' | 'lain';

export const ZONA_RESET = 'America/Los_Angeles';

function bagianTanggal(waktu: Date, zona: string): { y: number; m: number; d: number; h: number; mi: number; s: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(waktu)) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

/** Selisih (ms) waktu lokal zona terhadap UTC pada instan tertentu. */
function offsetZona(waktu: Date, zona: string): number {
  const b = bagianTanggal(waktu, zona);
  const sebagaiUtc = Date.UTC(b.y, b.m - 1, b.d, b.h, b.mi, b.s);
  return sebagaiUtc - Math.floor(waktu.getTime() / 1000) * 1000;
}

/** Instan UTC untuk pukul 00:00 tanggal (y, m, d) di zona tertentu. */
export function tengahMalamDiZona(y: number, m: number, d: number, zona: string = ZONA_RESET): Date {
  const tebakan = Date.UTC(y, m - 1, d, 0, 0, 0);
  let hasil = tebakan - offsetZona(new Date(tebakan), zona);
  // koreksi sekali lagi untuk pergantian jam musim panas
  hasil = tebakan - offsetZona(new Date(hasil), zona);
  return new Date(hasil);
}

/** Waktu reset kuota harian berikutnya (tengah malam waktu Pasifik) setelah `sekarang`. */
export function resetKuotaBerikutnya(sekarang: Date, zona: string = ZONA_RESET): Date {
  const b = bagianTanggal(sekarang, zona);
  const besok = new Date(Date.UTC(b.y, b.m - 1, b.d + 1));
  return tengahMalamDiZona(besok.getUTCFullYear(), besok.getUTCMonth() + 1, besok.getUTCDate(), zona);
}

/** Status yang berlaku sekarang: kunci kuota_habis yang masa tunggunya lewat dianggap aktif lagi. */
export function statusEfektif(k: KunciAPI, sekarang: Date): StatusKunci {
  if (k.status === 'kuota_habis' && k.habisSampai && sekarang.getTime() >= k.habisSampai.getTime()) return 'aktif';
  return k.status;
}

export interface OpsiPilihKunci {
  /** Pakai kunci super admin setelah kunci penanggung jawab habis. Keputusan final menunggu konfirmasi. */
  pakaiCadanganAdmin: boolean;
}

/** Pilih kunci yang dipakai: kunci penanggung jawab dulu (urutan, lalu tanggal dibuat), lalu cadangan super admin. */
export function pilihKunci(daftar: KunciAPI[], sekarang: Date, opsi: OpsiPilihKunci = { pakaiCadanganAdmin: true }): KunciAPI | null {
  const siap = daftar
    .filter((k) => statusEfektif(k, sekarang) === 'aktif')
    .filter((k) => opsi.pakaiCadanganAdmin || k.pemilik === 'penanggung_jawab')
    .sort((a, b) => {
      if (a.pemilik !== b.pemilik) return a.pemilik === 'penanggung_jawab' ? -1 : 1;
      if (a.urutan !== b.urutan) return a.urutan - b.urutan;
      return a.dibuatPada.getTime() - b.dibuatPada.getTime();
    });
  return siap[0] ?? null;
}

export interface GalatPenyedia {
  status?: number;
  code?: string | number;
  message?: string;
  /** Isi mentah detail galat Google (QuotaFailure, RetryInfo) bila ada. */
  detail?: unknown;
}

/** Kelompokkan galat penyedia LLM supaya sistem tahu harus menunggu, berganti kunci, atau berhenti. */
export function klasifikasiGalat(g: GalatPenyedia): JenisGalat {
  const teks = `${g.code ?? ''} ${g.message ?? ''} ${JSON.stringify(g.detail ?? '')}`;
  if (g.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(teks)) {
    if (/PerDay|per day|daily/i.test(teks)) return 'kuota_harian';
    if (/PerMinute|per minute/i.test(teks)) return 'batas_per_menit';
    return 'kuota_harian';
  }
  if (g.status === 400 && /API_KEY_INVALID|API key not valid/i.test(teks)) return 'tidak_valid';
  if (g.status === 401 || g.status === 403 || /PERMISSION_DENIED|API_KEY_INVALID/i.test(teks)) return 'tidak_valid';
  if (g.status !== undefined && g.status >= 500) return 'sementara';
  if (/ETIMEDOUT|ECONNRESET|fetch failed|UNAVAILABLE/i.test(teks)) return 'sementara';
  return 'lain';
}

/** Status kunci setelah galat. Batas per menit dan galat sementara tidak mengubah status (cukup tunggu lalu ulangi). */
export function tandaiSetelahGalat(k: KunciAPI, jenis: JenisGalat, sekarang: Date): KunciAPI {
  if (jenis === 'kuota_harian') return { ...k, status: 'kuota_habis', habisSampai: resetKuotaBerikutnya(sekarang) };
  if (jenis === 'tidak_valid') return { ...k, status: 'tidak_valid', habisSampai: null };
  return k;
}

/** Pesan untuk pengguna saat tidak ada kunci yang bisa dipakai. */
export function pesanKunciHabis(daftar: KunciAPI[], _sekarang: Date): string {
  const tunggu = daftar
    .filter((k) => k.status === 'kuota_habis' && k.habisSampai)
    .map((k) => k.habisSampai as Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const jam = tunggu
    ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(tunggu)
    : null;
  const dasar = 'Kuota semua kunci API habis. Tambahkan kunci baru dari project atau akun Google yang berbeda';
  return jam ? `${dasar}, atau tunggu reset kuota sekitar pukul ${jam} WIB.` : `${dasar}.`;
}

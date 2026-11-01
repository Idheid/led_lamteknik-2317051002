/**
 * Riwayat dan hasil akreditasi prodi (L1, 2 Nov 2026), logika murni. Tanggal akreditasi berakhir tidak hanya diketik
 * di data prodi, tetapi dicatat dari SK hasil LED yang diajukan, sehingga siklus LED per periode tertutup.
 */

export const PILIHAN_PERINGKAT = ['Terakreditasi Unggul', 'Terakreditasi', 'Tidak Terakreditasi'] as const;

export const LABEL_JENIS_RIWAYAT: Record<string, string> = {
  hasil: 'Hasil akreditasi',
  koreksi: 'Koreksi manual',
  awal: 'Data awal prodi',
};

export const LABEL_STATUS_RIWAYAT: Record<string, string> = {
  menunggu: 'Menunggu konfirmasi Admin UPPS',
  berlaku: 'Berlaku',
  ditolak: 'Ditolak',
};

export interface RiwayatRingkas {
  status: string;
  peringkat: string;
  nomorSk: string | null;
  berlakuSampai: Date | null;
  createdAt: Date;
}

/** Riwayat berlaku terbaru (urutan pencatatan), sumber data akreditasi prodi. */
export function riwayatBerlakuTerbaru<T extends RiwayatRingkas>(riwayat: T[]): T | null {
  return [...riwayat].filter((r) => r.status === 'berlaku').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

/** Label LED yang diarsipkan setelah hasilnya dicatat. */
export function labelArsipLed(tahunPengajuan: number, peringkat: string): string {
  return `Diajukan ${tahunPengajuan} · ${peringkat}`;
}

// ------------------------------------------------------------------ bantuan isi dari PDF SK (tanpa AI)

const BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
const POLA_TANGGAL = String.raw`(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{2}-\d{2})`;

function dua(n: number): string {
  return String(n).padStart(2, '0');
}

/** "20 Agustus 2030", "20-08-2030", "20/08/2030", atau "2030-08-20" → "2030-08-20"; null bila bukan tanggal sah. */
export function tanggalIndonesia(s: string): string | null {
  const t = s.trim().toLowerCase().replace(/\s+/g, ' ');
  let h: number, b: number, y: number;
  let m = /^(\d{1,2}) ([a-z]+) (\d{4})$/.exec(t);
  if (m) {
    b = BULAN.indexOf(m[2]) + 1;
    h = Number(m[1]);
    y = Number(m[3]);
  } else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) {
    h = Number(m[1]);
    b = Number(m[2]);
    y = Number(m[3]);
  } else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) {
    y = Number(m[1]);
    b = Number(m[2]);
    h = Number(m[3]);
  } else return null;
  const d = new Date(Date.UTC(y, b - 1, h));
  if (b < 1 || d.getUTCMonth() !== b - 1 || d.getUTCDate() !== h || y < 1990 || y > 2100) return null;
  return `${y}-${dua(b)}-${dua(h)}`;
}

export interface UsulanSk {
  peringkat?: string;
  nomorSk?: string;
  tanggalSk?: string;
  berlakuMulai?: string;
  berlakuSampai?: string;
}

function cari(teks: string, pola: string): string | undefined {
  const m = new RegExp(pola, 'i').exec(teks);
  return m ? (tanggalIndonesia(m[1]) ?? undefined) : undefined;
}

/**
 * Usulan isian dari teks SK akreditasi, tanpa AI: masa berlaku ("berlaku sejak … sampai dengan …"), tanggal
 * penetapan, nomor SK, dan peringkat. Hasilnya hanya usulan di formulir; Admin tetap memeriksa.
 */
export function bacaSk(teksAsli: string): UsulanSk {
  const teks = teksAsli.replace(/\s+/g, ' ');
  const hasil: UsulanSk = {};
  const sd = String.raw`(?:sampai\s+dengan|s\.\s?d\.?|s/d|hingga)`;
  hasil.berlakuSampai = cari(teks, String.raw`berlaku[^.]{0,120}?${sd}\s+(?:tanggal\s+)?${POLA_TANGGAL}`)
    ?? cari(teks, String.raw`${sd}\s+(?:tanggal\s+)?${POLA_TANGGAL}`);
  hasil.berlakuMulai = cari(teks, String.raw`berlaku\s+(?:sejak|mulai)\s+(?:tanggal\s+)?${POLA_TANGGAL}`)
    ?? cari(teks, String.raw`(?:sejak|mulai)\s+(?:tanggal\s+)?${POLA_TANGGAL}\s+${sd}`);
  hasil.tanggalSk = cari(teks, String.raw`(?:ditetapkan\s+di\s+[a-z ]{2,30}?\s+)?pada\s+tanggal\s*:?\s*${POLA_TANGGAL}`)
    ?? cari(teks, String.raw`tanggal\s+penetapan\s*:?\s*${POLA_TANGGAL}`);
  const nomor = /\bnomor\s*:?\s*([0-9A-Z][0-9A-Z.\-]*\/[0-9A-Z./\-]+)/i.exec(teks);
  if (nomor) hasil.nomorSk = nomor[1].replace(/[.,]$/, '');
  if (/tidak\s+terakreditasi/i.test(teks)) hasil.peringkat = 'Tidak Terakreditasi';
  else if (/terakreditasi\s+unggul|peringkat\s+unggul|predikat\s+unggul/i.test(teks)) hasil.peringkat = 'Terakreditasi Unggul';
  else if (/baik\s+sekali/i.test(teks)) hasil.peringkat = 'Baik Sekali';
  else if (/\bterakreditasi\b/i.test(teks)) hasil.peringkat = 'Terakreditasi';
  return Object.fromEntries(Object.entries(hasil).filter(([, v]) => v)) as UsulanSk;
}

/** Nomor induk dan angka panjang (≥ 15 digit, mis. NIP) disamarkan sebelum teks SK dikirim ke AI. */
export function samarkanAngkaPanjang(teks: string): string {
  return teks.replace(/\d[\d ]{13,}\d/g, (m) => (m.replace(/\D/g, '').length >= 15 ? '[disamarkan]' : m));
}

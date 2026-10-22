import { paragrafBersumber, type DokTiptap } from './narasi.ts';
import { angkaTidakBerdasar, ekstrakAngka } from './teks.ts';

/**
 * Verifikasi per kalimat (revisi 22 Okt 2026). Setiap kalimat narasi diberi label Sesuai sumber, Sebagian, atau
 * Tidak didukung sumber. Cek otomatis (tanpa kuota AI): angka dan tahun di kalimat harus ada di sumber yang dirujuk
 * paragrafnya, lalu kata kunci kalimat dibandingkan dengan teks sumber itu. Persentase kalimat yang sesuai sumber
 * dipakai sebagai angka evaluasi RAG (mirip metrik faithfulness).
 */

export type LabelKalimat = 'sesuai' | 'sebagian' | 'tidak_didukung';

export const LABEL_KALIMAT: Record<LabelKalimat, string> = {
  sesuai: 'Sesuai sumber',
  sebagian: 'Sebagian',
  tidak_didukung: 'Tidak didukung sumber',
};

export interface KalimatTerperiksa {
  teks: string;
  /** indeks paragraf narasi (0-based) */
  paragraf: number;
  sumber: string[];
  label: LabelKalimat;
  alasan: string;
}

export interface RingkasVerifikasi {
  total: number;
  sesuai: number;
  sebagian: number;
  tidak_didukung: number;
}

/** Batas teks satu sumber yang disimpan bersama versi draf (cukup untuk memeriksa kalimat). */
export const MAKS_TEKS_SUMBER = 4000;

const SINGKATAN = /(?:\b(?:hlm|No|no|dkk|dll|dsb|Dr|dr|Prof|Ir|S\.T|M\.T|M\.Kom|S\.Kom|Tbk|Jl|th|thn|tgl|vol|ed|ST|MT)|\b[A-Z])\.$/;

/** Pecah teks paragraf menjadi kalimat (titik desimal, singkatan, dan "hlm." tidak memecah). */
export function pecahKalimat(teks: string): string[] {
  const hasil: string[] = [];
  let awal = 0;
  const re = /[.!?](?=\s+(?:["“(\[]?[A-Z0-9]))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(teks)) !== null) {
    const potong = teks.slice(awal, m.index + 1);
    if (SINGKATAN.test(potong.trimEnd())) continue;
    hasil.push(potong.trim());
    awal = m.index + 1;
  }
  const sisa = teks.slice(awal).trim();
  if (sisa) hasil.push(sisa);
  return hasil.filter(Boolean);
}

/** Kunci pencocokan kalimat (untuk menempelkan label di editor walau spasi berubah). */
export function kunciKalimat(teks: string): string {
  return teks.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP = new Set([
  'yang', 'dengan', 'dalam', 'untuk', 'pada', 'dari', 'oleh', 'serta', 'atau', 'adalah', 'telah', 'sudah', 'akan',
  'juga', 'secara', 'sebagai', 'setiap', 'tersebut', 'program', 'studi', 'prodi', 'upps', 'melalui', 'terhadap',
  'bahwa', 'dapat', 'masih', 'antara', 'karena', 'agar', 'sehingga', 'yaitu', 'yakni', 'para', 'kami', 'kegiatan',
  'dilakukan', 'menjadi', 'memiliki', 'tahun', 'hingga', 'sampai', 'belum', 'lebih', 'kurang', 'namun', 'tetapi',
]);

function kataKunci(teks: string): string[] {
  return [...new Set(kunciKalimat(teks).split(' ').filter((w) => w.length >= 4 && !/^\d/.test(w) && !STOP.has(w)))];
}

/** Kata ditemukan di sumber: utuh, atau akar sederhana (awalan 5+ huruf) untuk imbuhan -nya, -kan, -an. */
function adaDiSumber(kata: string, sumber: string): boolean {
  if (sumber.includes(kata)) return true;
  const akar = kata.slice(0, Math.max(5, kata.length - 3));
  return akar.length >= 5 && sumber.includes(akar);
}

export interface OpsiVerifikasi {
  tahunSah: number[];
}

/** Cek otomatis per kalimat terhadap teks sumber yang dirujuk paragrafnya. */
export function periksaKalimat(doc: DokTiptap, teksSumber: Record<string, string>, opsi: OpsiVerifikasi): KalimatTerperiksa[] {
  const hasil: KalimatTerperiksa[] = [];
  paragrafBersumber(doc).forEach((p, i) => {
    const sumberTeks = p.sumber.map((s) => teksSumber[s] ?? '').join('\n');
    const sumberNorm = ` ${kunciKalimat(sumberTeks)} `;
    const angkaSumber = ekstrakAngka(sumberTeks).map((a) => a.nilai);
    for (const k of pecahKalimat(p.teks)) {
      const dasar = { teks: k, paragraf: i, sumber: p.sumber };
      if (/\[BELUM ADA BUKTI/i.test(k)) {
        hasil.push({ ...dasar, label: 'sebagian', alasan: 'Kalimat menandai bukti yang belum ada.' });
        continue;
      }
      if (p.sumber.length === 0) {
        hasil.push({ ...dasar, label: 'tidak_didukung', alasan: 'Paragraf tidak mencantumkan kode sumber.' });
        continue;
      }
      if (!p.sumber.some((s) => teksSumber[s])) {
        hasil.push({ ...dasar, label: 'sebagian', alasan: 'Teks sumber tidak tersedia untuk dicocokkan; periksa dengan AI.' });
        continue;
      }
      const salah = angkaTidakBerdasar(k, angkaSumber, { tahunSah: opsi.tahunSah }).map((a) => a.teks.trim());
      if (salah.length) {
        hasil.push({ ...dasar, label: 'tidak_didukung', alasan: `Angka ${[...new Set(salah)].join(', ')} tidak ada di sumber ${p.sumber.join(', ')}.` });
        continue;
      }
      const kunci = kataKunci(k);
      if (kunci.length < 2) {
        hasil.push({ ...dasar, label: 'sesuai', alasan: 'Kalimat pendek; angka sesuai sumber.' });
        continue;
      }
      const tidakAda = kunci.filter((w) => !adaDiSumber(w, sumberNorm));
      const cocok = 1 - tidakAda.length / kunci.length;
      // kalimat berangka yang semua angkanya ada di sumber: angka itulah fakta utamanya (nama metrik biasanya diparafrasekan)
      const berangka = ekstrakAngka(k).some((a) => !(Number.isInteger(a.nilai) && a.nilai <= 10));
      const [batasSesuai, batasSebagian] = berangka ? [0.2, 0] : [0.6, 0.3];
      if (cocok >= batasSesuai) hasil.push({ ...dasar, label: 'sesuai', alasan: berangka ? 'Angka sesuai sumber yang dirujuk.' : 'Sebagian besar kata kunci ada di sumber.' });
      else if (cocok >= batasSebagian) hasil.push({ ...dasar, label: 'sebagian', alasan: `Ada simpulan atau kata tambahan yang tidak ada di sumber: ${tidakAda.slice(0, 5).join(', ')}.` });
      else hasil.push({ ...dasar, label: 'tidak_didukung', alasan: 'Isi kalimat tidak ditemukan di sumber yang dirujuk.' });
    }
  });
  return hasil;
}

export function ringkasVerifikasi(k: { label: LabelKalimat }[]): RingkasVerifikasi {
  return {
    total: k.length,
    sesuai: k.filter((x) => x.label === 'sesuai').length,
    sebagian: k.filter((x) => x.label === 'sebagian').length,
    tidak_didukung: k.filter((x) => x.label === 'tidak_didukung').length,
  };
}

export function teksRingkas(r: RingkasVerifikasi): string {
  return `${r.total} kalimat: ${r.sesuai} sesuai, ${r.sebagian} sebagian, ${r.tidak_didukung} tidak didukung`;
}

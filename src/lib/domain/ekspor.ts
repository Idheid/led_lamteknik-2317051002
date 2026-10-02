/**
 * Aturan ekspor Word (F-22–F-24), fungsi murni: nomor bab untuk penomoran tabel/gambar, ukuran gambar (rasio asli,
 * lebar maks. 17,1 cm), pemeriksaan judul tabel/gambar, pemeriksaan sebelum ekspor, dan perkiraan jumlah halaman
 * bila LibreOffice tidak tersedia.
 */
import type { DokTiptap, NodeTiptap } from './narasi.ts';
import { PENANDA_BELUM_ADA_BUKTI } from './prompt.ts';

export const BATAS_HALAMAN = 150;
/** 17,1 cm pada 96 dpi (satuan piksel ImageRun pustaka docx). */
export const LEBAR_GAMBAR_MAKS_PX = Math.round((17.1 / 2.54) * 96);

/** Nomor bab untuk penomoran "Tabel 2.3" / "Gambar 2.1"; null untuk halaman awal dan lampiran (tanpa nomor bab). */
export function nomorBab(bagianKode: string): number | null {
  if (bagianKode === 'I') return 1;
  if (bagianKode.startsWith('II') || bagianKode.startsWith('C.')) return 2;
  if (bagianKode === 'III') return 3;
  if (bagianKode === 'IV') return 4;
  return null;
}

/** Tabel yang sudah ada di template per bab (Tabel 2.1 dan 2.2 di Bab II.A), sehingga nomor berikutnya dimulai sesudahnya. */
export const TABEL_TEMPLATE: Record<number, number> = { 2: 2 };

export interface UkuranGambar {
  lebar: number;
  tinggi: number;
  jenis: 'png' | 'jpg' | 'gif';
}

/** Baca ukuran piksel dari kepala berkas PNG, JPEG, atau GIF. */
export function ukuranGambar(b: Uint8Array): UkuranGambar | null {
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u32be = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { lebar: u32be(16), tinggi: u32be(20), jenis: 'png' };
  }
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { lebar: b[6] | (b[7] << 8), tinggi: b[8] | (b[9] << 8), jenis: 'gif' };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const penanda = b[i + 1];
      const panjang = u16be(i + 2);
      // SOF0–SOF15 kecuali DHT (C4), JPG (C8), DAC (CC)
      if (penanda >= 0xc0 && penanda <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(penanda)) {
        return { lebar: u16be(i + 7), tinggi: u16be(i + 5), jenis: 'jpg' };
      }
      i += 2 + panjang;
    }
  }
  return null;
}

/** Skala gambar: rasio asli, lebar paling besar `maks`; gambar kecil tidak diperbesar. */
export function skalaGambar(lebar: number, tinggi: number, maks = LEBAR_GAMBAR_MAKS_PX): { lebar: number; tinggi: number } {
  if (lebar <= 0 || tinggi <= 0) return { lebar: maks, tinggi: Math.round(maks * 0.6) };
  const l = Math.min(lebar, maks);
  return { lebar: Math.round(l), tinggi: Math.round((tinggi * l) / lebar) };
}

function teks(n: NodeTiptap): string {
  if (n.type === 'text') return n.text ?? '';
  return (n.content ?? []).map(teks).join('');
}

/** Paragraf judul tabel: dibuat sistem (peran judul-tabel) atau ditulis pengguna diawali "Tabel". */
export function adalahJudulTabel(n: NodeTiptap | undefined): boolean {
  if (!n || n.type !== 'paragraph') return false;
  return n.attrs?.peran === 'judul-tabel' || /^\s*tabel\b/i.test(teks(n));
}

/** Buang nomor lama dari judul ("Tabel 2.3. Judul" → "Judul"). */
export function bersihkanJudul(t: string, jenis: 'Tabel' | 'Gambar'): string {
  return t.replace(new RegExp(`^\\s*${jenis}\\s*[\\d.]*\\s*[.:–-]?\\s*`, 'i'), '').trim();
}

export interface MasalahJudul {
  jenis: 'tabel' | 'gambar';
  pesan: string;
}

/** Setiap tabel harus didahului judul; setiap gambar harus punya judul (diambil dari judul unggahan). */
export function masalahJudul(doc: DokTiptap): MasalahJudul[] {
  const hasil: MasalahJudul[] = [];
  doc.content.forEach((n, i) => {
    if (n.type === 'table' && !adalahJudulTabel(doc.content[i - 1])) hasil.push({ jenis: 'tabel', pesan: 'Ada tabel tanpa judul di atasnya.' });
    if (n.type === 'image' && !String(n.attrs?.title ?? n.attrs?.alt ?? '').trim()) hasil.push({ jenis: 'gambar', pesan: 'Ada gambar tanpa judul.' });
  });
  return hasil;
}

export interface BagianPeriksa {
  kode: string;
  nama: string;
  status: string;
  /** Jumlah sub-bagian yang wajib punya draf (yang di-generate). */
  jumlahSub: number;
}

export interface SubPeriksa {
  kode: string;
  label: string;
  bagianKode: string;
  doc: DokTiptap | null;
}

export interface HasilPeriksaEkspor {
  galat: string[];
  peringatan: string[];
}

/**
 * Pemeriksaan sebelum ekspor: semua bagian bernarasi ditandai selesai, setiap sub-bagian punya draf, tidak ada
 * penanda [BELUM ADA BUKTI: …], dan setiap tabel/gambar berjudul. Batas 150 halaman diperiksa setelah berkas dibuat.
 */
export function periksaSebelumEkspor(bagian: BagianPeriksa[], sub: SubPeriksa[]): HasilPeriksaEkspor {
  const galat: string[] = [];
  const peringatan: string[] = [];
  for (const b of bagian) {
    if (b.jumlahSub > 0 && b.status !== 'selesai') galat.push(`${b.kode} ${b.nama} belum ditandai selesai.`);
  }
  for (const s of sub) {
    if (!s.doc) {
      galat.push(`${s.label} belum punya draf.`);
      continue;
    }
    const t = JSON.stringify(s.doc);
    const penanda = (t.match(/\[BELUM ADA BUKTI:/g) ?? []).length;
    if (penanda > 0) galat.push(`${s.label}: masih ada ${penanda} penanda ${PENANDA_BELUM_ADA_BUKTI} …].`);
    for (const m of masalahJudul(s.doc)) galat.push(`${s.label}: ${m.pesan}`);
  }
  return { galat, peringatan };
}

/** Perkiraan halaman bila LibreOffice tidak tersedia: kata / kata per halaman + ruang tabel dan gambar + halaman awal. */
export function perkiraanHalaman(o: { kata: number; barisTabel: number; gambar: number; kataPerHalaman: number; halamanTetap: number }): number {
  const halNarasi = o.kata / Math.max(o.kataPerHalaman, 1);
  const halTabel = o.barisTabel / 25; // ±25 baris tabel per halaman
  const halGambar = o.gambar * 0.4;
  return Math.ceil(o.halamanTetap + halNarasi + halTabel + halGambar);
}

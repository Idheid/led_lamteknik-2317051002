/**
 * Rencana 10 Nov T3: aturan OCR yang murni (tanpa I/O), dipakai pemrosesan dokumen dan diuji tersendiri.
 */

/** Halaman dengan teks bersih kurang dari ini dianggap hasil pindai. */
export const AMBANG_KARAKTER_PINDAIAN = 50;
/** Halaman OCR dengan keyakinan rata-rata di bawah ini ditandai "perlu dicek". */
export const AMBANG_KEYAKINAN_OCR = 70;

/** Teks bersih = huruf dan angka saja (spasi, tanda baca, dan sisa garis tidak dihitung). */
export function teksPindaian(teks: string): boolean {
  return (teks.match(/[\p{L}\p{N}]/gu) ?? []).length < AMBANG_KARAKTER_PINDAIAN;
}

function jumlahHuruf(teks: string): number {
  return (teks.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

/** Teks per halaman dokumen beserta asalnya (disimpan di Dokumen.halamanTeks). */
export interface HalamanTeks {
  halaman: number;
  teks: string;
  sumber: 'teks' | 'ocr';
  /** keyakinan OCR 0–100; null untuk halaman berlapis teks */
  keyakinan: number | null;
  perluDicek: boolean;
  /** teks sudah dikoreksi manusia di "Lihat teks hasil OCR" */
  dikoreksi: boolean;
}

/**
 * Gabungkan teks lapisan PDF dengan hasil OCR. Halaman OCR yang sudah dikoreksi sebelumnya memakai teks koreksi itu
 * (tidak di-OCR ulang).
 */
export function gabungHalaman(
  lapisan: string[],
  ocr: { halaman: number; teks: string; keyakinan: number }[],
  koreksiLama: HalamanTeks[] = [],
): HalamanTeks[] {
  const petaOcr = new Map(ocr.map((o) => [o.halaman, o]));
  const petaKoreksi = new Map(koreksiLama.filter((h) => h.dikoreksi).map((h) => [h.halaman, h]));
  return lapisan.map((t, i) => {
    const nomor = i + 1;
    const k = petaKoreksi.get(nomor);
    if (k) return { ...k };
    const o = petaOcr.get(nomor);
    // halaman bertulisan pendek (mis. satu baris) juga di-OCR; lapisan teks tetap dipakai bila OCR tidak lebih banyak
    if (o && jumlahHuruf(o.teks) > jumlahHuruf(t)) return { halaman: nomor, teks: o.teks, sumber: 'ocr', keyakinan: o.keyakinan, perluDicek: o.keyakinan < AMBANG_KEYAKINAN_OCR, dikoreksi: false };
    return { halaman: nomor, teks: t, sumber: 'teks', keyakinan: null, perluDicek: false, dikoreksi: false };
  });
}

/** Keyakinan rata-rata halaman OCR yang dicakup sebuah potongan (halaman awal sampai sebelum potongan berikutnya). */
export function keyakinanPotongan(halamanAwal: number | null, halamanAkhir: number | null, halaman: HalamanTeks[]): { sumber: 'teks' | 'ocr'; keyakinan: number | null } {
  if (halamanAwal === null) return { sumber: 'teks', keyakinan: null };
  const akhir = halamanAkhir ?? halamanAwal;
  const ocr = halaman.filter((h) => h.halaman >= halamanAwal && h.halaman <= akhir && h.sumber === 'ocr');
  if (ocr.length === 0) return { sumber: 'teks', keyakinan: null };
  const nilai = ocr.map((h) => (h.dikoreksi ? 100 : h.keyakinan ?? 0));
  return { sumber: 'ocr', keyakinan: Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length) };
}

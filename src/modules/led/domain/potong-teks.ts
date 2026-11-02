/**
 * F-11: pemotongan teks dokumen untuk RAG.
 * Potongan 800–1.200 karakter, tumpang tindih ±15% dengan potongan sebelumnya, dipotong di batas paragraf,
 * kalimat, atau kata (berurutan menurut prioritas). Nomor halaman = halaman tempat potongan dimulai.
 */

export interface OpsiPotong {
  minimum: number;
  maksimum: number;
  tumpang: number;
}

export const OPSI_POTONG: OpsiPotong = { minimum: 800, maksimum: 1200, tumpang: 0.15 };

export interface PotonganTeks {
  urutan: number;
  teks: string;
  halaman: number | null;
}

/** Rapikan spasi; paragraf (baris kosong) dipertahankan. */
export function rapikanTeks(teks: string): string {
  return teks
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cariBatas(teks: string, dari: number, sampai: number): number {
  const jendela = teks.slice(dari, sampai);
  const pola = [/\n\n/g, /[.!?;:]["')\]]?\s/g, /\n/g, /\s/g];
  for (const p of pola) {
    let terakhir = -1;
    for (const m of jendela.matchAll(p)) terakhir = (m.index ?? 0) + m[0].length;
    if (terakhir > 0) return dari + terakhir;
  }
  return sampai;
}

/**
 * Potong teks per halaman menjadi potongan. `halaman` berisi teks tiap halaman (indeks 0 = halaman 1);
 * untuk dokumen tanpa halaman (DOCX) kirim satu elemen dan `adaHalaman` false.
 */
export function potongTeks(halaman: string[], opsi: OpsiPotong = OPSI_POTONG, adaHalaman = true): PotonganTeks[] {
  const bagian = halaman.map(rapikanTeks);
  const awalHalaman: number[] = [];
  let teks = "";
  bagian.forEach((h) => {
    if (!h) {
      awalHalaman.push(teks.length);
      return;
    }
    if (teks) teks += "\n\n";
    awalHalaman.push(teks.length);
    teks += h;
  });
  if (!teks) return [];
  const halamanDi = (pos: number) => {
    if (!adaHalaman) return null;
    let h = 0;
    for (let i = 0; i < awalHalaman.length; i++) if (awalHalaman[i] <= pos) h = i;
    return h + 1;
  };

  const hasil: PotonganTeks[] = [];
  let pos = 0;
  while (pos < teks.length) {
    let akhir = Math.min(teks.length, pos + opsi.maksimum);
    if (akhir < teks.length) akhir = cariBatas(teks, pos + opsi.minimum, akhir);
    const isi = teks.slice(pos, akhir).trim();
    if (isi) hasil.push({ urutan: hasil.length, teks: isi, halaman: halamanDi(pos) });
    if (akhir >= teks.length) break;
    // mulai potongan berikutnya ±15% sebelum akhir, di awal kata
    let lanjut = akhir - Math.round((akhir - pos) * opsi.tumpang);
    while (lanjut < akhir && !/\s/.test(teks[lanjut - 1] ?? " ")) lanjut++;
    pos = Math.max(lanjut, pos + 1);
  }
  return hasil;
}

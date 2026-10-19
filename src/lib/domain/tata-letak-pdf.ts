/**
 * Teks PDF beserta posisinya (dari pdf.js). Tabel matriks dan tabel bobot disusun ulang menurut posisi kolom
 * karena teks hasil ekstraksi biasa bercampur antarkolom. y diukur dari bawah halaman (konvensi PDF).
 */
export interface ItemTeks {
  x: number;
  y: number;
  lebar: number;
  teks: string;
}

export interface HalamanTeks {
  /** nomor halaman PDF (mulai 1) */
  nomor: number;
  item: ItemTeks[];
}

export interface Baris {
  y: number;
  item: ItemTeks[];
}

/** Kelompokkan item per baris (y berdekatan), urut dari atas ke bawah dan kiri ke kanan. */
export function kelompokkanBaris(item: ItemTeks[], toleransi = 2.5): Baris[] {
  const urut = item.filter((i) => i.teks.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const hasil: Baris[] = [];
  for (const i of urut) {
    const akhir = hasil[hasil.length - 1];
    if (akhir && Math.abs(akhir.y - i.y) <= toleransi) akhir.item.push(i);
    else hasil.push({ y: i.y, item: [i] });
  }
  for (const b of hasil) b.item.sort((a, c) => a.x - c.x);
  return hasil;
}

export function teksBaris(b: Baris): string {
  return b.item.map((i) => i.teks.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Cari baris judul tabel: baris yang memuat semua label `label` (urut kiri ke kanan).
 * Mengembalikan posisi tengah tiap label dan y baris judul.
 */
export function cariJudulTabel(baris: Baris[], label: RegExp[]): { y: number; tengah: number[] } | null {
  for (const b of baris) {
    const tengah: number[] = [];
    let dari = 0;
    for (const pola of label) {
      const i = b.item.findIndex((x, k) => k >= dari && pola.test(x.teks.trim()));
      if (i < 0) break;
      tengah.push(b.item[i].x + b.item[i].lebar / 2);
      dari = i + 1;
    }
    if (tengah.length === label.length) return { y: b.y, tengah };
  }
  return null;
}

/**
 * Tepi kiri setiap kolom dari sebaran x item di bawah judul: untuk kolom ke-k, ambil x-kiri terbesar yang sering
 * muncul dan tidak melewati tengah label kolom itu (teks sel rata kiri, label judul rata tengah).
 */
export function tepiKolom(item: ItemTeks[], tengahLabel: number[], minimal = 2): number[] {
  const frekuensi = new Map<number, number>();
  for (const i of item) {
    const x = Math.round(i.x);
    frekuensi.set(x, (frekuensi.get(x) ?? 0) + 1);
  }
  const kandidat = [...frekuensi.entries()].filter(([, n]) => n >= minimal).map(([x]) => x).sort((a, b) => a - b);
  const tepi: number[] = [];
  tengahLabel.forEach((t, k) => {
    const bawah = k === 0 ? -Infinity : tepi[k - 1] + 4;
    const cocok = kandidat.filter((x) => x >= bawah && x <= t + 2);
    tepi.push(cocok.length ? cocok[cocok.length - 1] : Math.round(k === 0 ? t - 10 : (tengahLabel[k - 1] + t) / 2));
  });
  return tepi;
}

/** Indeks kolom item menurut tepi kiri kolom. */
export function kolomItem(x: number, tepi: number[]): number {
  let k = 0;
  for (let i = 0; i < tepi.length; i++) if (x >= tepi[i] - 3) k = i;
  return k;
}

/** Gabung baris-baris teks satu sel: baris baru dipertahankan sebelum penomoran "(1)", "I.", "1." atau "Skor". */
export function gabungSel(baris: string[]): string {
  let hasil = '';
  for (const t of baris.map((x) => x.trim()).filter(Boolean)) {
    if (!hasil) hasil = t;
    else if (/^(\(\d{1,2}\)|[IVX]{1,4}\.\s|\d{1,2}\.\s|[a-z]\.\s|Skor\b|NB\b|Catatan\b)/.test(t)) hasil += `\n${t}`;
    else if (/[A-Za-z]-$/.test(hasil) && /^[a-z]/.test(t)) hasil = hasil.slice(0, -1) + t;
    else hasil += ` ${t}`;
  }
  return hasil.replace(/[ \t]+/g, ' ').trim();
}

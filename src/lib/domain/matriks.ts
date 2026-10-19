import { cariJudulTabel, gabungSel, kelompokkanBaris, kolomItem, teksBaris, tepiKolom, type HalamanTeks } from './tata-letak-pdf.ts';

/**
 * Matriks Penilaian LED dan LKPS (PDF): tabel berkolom No | Kriteria | Indikator | 4 | 3 | 2 | 1 | 0.
 * Teks disusun ulang per baris butir menurut posisi kolom (tanpa AI). Satu baris butir bisa berlanjut ke
 * halaman berikutnya. Baris judul (A. KRITERIA, I. Diferensiasi Misi, ...) dicatat sebagai konteks.
 * Hasilnya dikirim ke LLM per kelompok kecil supaya AI cukup memecah sub-indikator dan mengisi kolom.
 */

export interface BarisMatriks {
  /** nomor butir di kolom No */
  no: string;
  halaman: number[];
  /** judul bagian/kriteria yang berlaku saat baris ini dimulai, dari yang paling luar */
  konteks: string[];
  kriteria: string;
  indikator: string;
  /** deskriptor skor [4, 3, 2, 1, 0] */
  skor: [string, string, string, string, string];
}

export interface HasilMatriks {
  baris: BarisMatriks[];
  /** halaman yang tidak memuat tabel (sampul, catatan) */
  halamanLain: number[];
}

const LABEL_JUDUL = [/^No\.?$/i, /^Kriteria$/i, /^Indikator$/i, /^4$/, /^3$/, /^2$/, /^1$/, /^0$/];

/** A. KRITERIA → 0, I. Diferensiasi Misi → 1, judul lain → 2 */
function tingkatJudul(t: string): number {
  // "A. KRITERIA" (huruf kapital semua) → 0; "I. Diferensiasi Misi" (angka Romawi) → 1
  if (/^[A-Z]\.\s+[^a-z]+$/.test(t)) return 0;
  return /^[IVX]+\.\s/.test(t) ? 1 : 2;
}

/** Batas bawah kaki halaman (y dari bawah). */
const KAKI = 40;

export function susunMatriks(halaman: HalamanTeks[]): HasilMatriks {
  const hasil: BarisMatriks[] = [];
  const halamanLain: number[] = [];
  let tepi: number[] | null = null;
  let kini: { b: BarisMatriks; sel: string[][] } | null = null;
  const konteks: string[] = [];

  const tutup = () => {
    if (!kini) return;
    const [k, ind, s4, s3, s2, s1, s0] = kini.sel.map(gabungSel);
    Object.assign(kini.b, { kriteria: k, indikator: ind, skor: [s4, s3, s2, s1, s0] });
    hasil.push(kini.b);
    kini = null;
  };

  for (const h of halaman) {
    const semua = kelompokkanBaris(h.item);
    const judul = cariJudulTabel(semua, LABEL_JUDUL);
    if (judul) {
      const bawahJudul = h.item.filter((i) => i.y < judul.y - 2 && i.y > KAKI);
      tepi = tepiKolom(bawahJudul, judul.tengah);
    } else if (!tepi) {
      halamanLain.push(h.nomor);
      continue;
    }
    const baris = semua.filter((b) => b.y > KAKI && (!judul || b.y < judul.y - 2));
    if (!judul && baris.length === 0) {
      halamanLain.push(h.nomor);
      continue;
    }
    for (const b of baris) {
      const t = tepi!;
      const diNo = b.item.filter((i) => kolomItem(i.x, t) === 0);
      const nomor = diNo.find((i) => /^\d{1,3}$/.test(i.teks.trim()));
      if (diNo.length > 0 && !nomor) {
        // baris judul bagian (membentang beberapa kolom)
        tutup();
        const teks = teksBaris(b);
        const tk = tingkatJudul(teks);
        while (konteks.length && tingkatJudul(konteks[konteks.length - 1]) >= tk) konteks.pop();
        konteks.push(teks);
        continue;
      }
      if (nomor) {
        tutup();
        kini = {
          b: { no: nomor.teks.trim(), halaman: [h.nomor], konteks: [...konteks], kriteria: '', indikator: '', skor: ['', '', '', '', ''] },
          sel: Array.from({ length: 7 }, () => []),
        };
      }
      if (!kini) continue;
      const aktif = kini as { b: BarisMatriks; sel: string[][] };
      if (!aktif.b.halaman.includes(h.nomor)) aktif.b.halaman.push(h.nomor);
      // gabungkan item satu baris per kolom
      const perKolom = new Map<number, string[]>();
      for (const i of b.item) {
        if (i === nomor) continue;
        const k = kolomItem(i.x, t);
        if (k === 0) continue;
        perKolom.set(k, [...(perKolom.get(k) ?? []), i.teks.trim()]);
      }
      for (const [k, isi] of perKolom) aktif.sel[k - 1].push(isi.join(' '));
    }
  }
  tutup();
  return { baris: hasil, halamanLain };
}

/** Teks satu baris matriks untuk prompt LLM. */
export function teksBarisMatriks(b: BarisMatriks): string {
  const skor = ['4', '3', '2', '1', '0'];
  return [
    `### Baris No ${b.no} (halaman PDF ${b.halaman.join(', ')})`,
    b.konteks.length ? `Konteks: ${b.konteks.join(' › ')}` : null,
    `Kriteria/elemen: ${b.kriteria || '-'}`,
    `Indikator: ${b.indikator || '-'}`,
    ...b.skor.map((s, i) => `Skor ${skor[i]}: ${s || '-'}`),
  ].filter(Boolean).join('\n');
}

/** Bagi baris menjadi kelompok untuk satu panggilan LLM: paling banyak `maks` baris atau `maksKarakter` karakter. */
export function kelompokBaris(baris: BarisMatriks[], maks = 6, maksKarakter = 9000): BarisMatriks[][] {
  const hasil: BarisMatriks[][] = [];
  let kini: BarisMatriks[] = [];
  let panjang = 0;
  for (const b of baris) {
    const p = teksBarisMatriks(b).length;
    if (kini.length && (kini.length >= maks || panjang + p > maksKarakter)) {
      hasil.push(kini);
      kini = [];
      panjang = 0;
    }
    kini.push(b);
    panjang += p;
  }
  if (kini.length) hasil.push(kini);
  return hasil;
}

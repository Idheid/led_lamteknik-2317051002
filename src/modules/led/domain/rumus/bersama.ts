import {
  pustakaMetrik, skorTigaTingkat, tercentang, terisi, variabelDosen, variabelMahasiswa,
  type HasilButirAngka, type KonteksMetrik, type Metrik, type PetaTabel,
} from '../metrik-lkps.ts';

/**
 * Rencana 10 Nov T10 (R2): kerangka rumus butir angka per jenjang. Metrik dihitung oleh pustaka bersama (fungsi butir
 * Sarjana padanannya, atau fungsi metrik jenjang bila tabel/kolom LKPS-nya berbeda); aturan skor ditulis per jenjang
 * dari Matriks Penilaian 2025 (docs/rumus/RUMUS-<JENJANG>.md). Kode rumus = `<JENJANG>-<butir>`, mis. `D3-23`.
 */

export const { baris, teks, nol, bagi, batasi, hasil, m, sama, jumlahTigaTahun, hitungButirSarjana } = pustakaMetrik;
export { skorTigaTingkat, tercentang, terisi, variabelDosen, variabelMahasiswa };
export type { HasilButirAngka, KonteksMetrik, Metrik, PetaTabel };

export interface RumusJenjang {
  /** kode rumus, mis. "D3-23" */
  kode: string;
  jenjang: string;
  /** nomor butir di matriks jenjang */
  butir: string;
  judul: string;
  /** butir Sarjana yang metriknya dipakai (null = metrik khusus jenjang) */
  dasar: string | null;
  hitung: (t: PetaTabel, k: KonteksMetrik) => HasilButirAngka;
}

/** Nilai metrik hasil butir Sarjana, dengan kode tanpa awalan "M-" dan tanpa nomor butir (RI, RN, RW). */
export function nilaiMetrik(h: HasilButirAngka): Record<string, number | null> {
  return Object.fromEntries(h.metrik.map((x) => [x.kode.replace(new RegExp(`^M-(${h.butir}-)?`), ''), x.nilai]));
}

/**
 * Rumus jenjang yang memakai metrik butir Sarjana `dasar`, dengan skor jenjang. `skor` menerima nilai metrik; bila
 * dihilangkan, skor Sarjana dipakai (deskriptor sama). Hasil diberi nomor butir jenjang.
 */
export function dariSarjana(
  jenjang: string, butir: string, dasar: string,
  skor?: (v: Record<string, number | null>, t: PetaTabel, k: KonteksMetrik) => { skor: number | null; catatan?: string[] },
  opsi: { judul?: string } = {},
): RumusJenjang {
  return {
    kode: `${jenjang}-${butir}`, jenjang, butir, dasar, judul: opsi.judul ?? '',
    hitung: (t, k) => {
      const h = hitungButirSarjana(dasar, t, k)!;
      const v = nilaiMetrik(h);
      const s = skor ? skor(v, t, k) : { skor: h.skor, catatan: [] };
      const metrik = h.metrik.map((x) => ({ ...x, kode: x.kode.replace(new RegExp(`^M-(${h.butir}-)?`), '') }));
      const utama = h.utama.replace(new RegExp(`^M-(${h.butir}-)?`), '');
      return hasil(butir, opsi.judul ?? h.judul, h.tabel, utama, metrik.map((x) => m(x.kode, x.nama, x.nilai, x.satuan, x.rumus)),
        s.skor === null ? null : batasi(s.skor), [...h.catatan.filter((c) => !/^Faktor a =/.test(c)), ...(s.catatan ?? [])]);
    },
  };
}

/** Skor "ambang atas, rumus di bawahnya, batas bawah": nilai ≥ ambang → 4, selain itu f(nilai) dibatasi [min, 4]. */
export function skorAmbang(nilai: number | null, ambang: number, f: (x: number) => number, min = 0): number | null {
  if (nilai === null) return null;
  return batasi(nilai >= ambang ? 4 : f(nilai), min);
}

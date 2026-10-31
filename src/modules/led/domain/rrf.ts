/**
 * Reciprocal rank fusion untuk pencarian gabungan (vektor + kata kunci):
 * skor(d) = Σ 1 / (k + peringkat_i(d)), peringkat mulai 1. k = 60 (nilai lazim, Cormack dkk. 2009).
 */
export interface HasilGabung {
  id: string;
  skor: number;
  /** Peringkat di tiap daftar (null bila tidak muncul). */
  peringkat: (number | null)[];
}

export function gabungRRF(daftar: string[][], k = 60): HasilGabung[] {
  const peta = new Map<string, HasilGabung>();
  daftar.forEach((urutan, i) => {
    urutan.forEach((id, j) => {
      const h = peta.get(id) ?? { id, skor: 0, peringkat: daftar.map(() => null) };
      if (h.peringkat[i] !== null) return; // id ganda di satu daftar: pakai peringkat pertama
      h.peringkat[i] = j + 1;
      h.skor += 1 / (k + j + 1);
      peta.set(id, h);
    });
  });
  return [...peta.values()].sort((a, b) => b.skor - a.skor || a.id.localeCompare(b.id));
}

/**
 * Kueri pencarian potongan untuk generate satu sub-bagian (revisi 22 Okt 2026: juga dipakai uji cari di Basis
 * Pengetahuan supaya hasilnya persis 8 potongan yang diberikan ke AI): judul, instruksi, indikator, dan unsur skor 4.
 */
export function kueriGenerate(judul: string, instruksi: string, butir: { indikator: string; unsurSkor4: string[] }[]): string {
  return [judul, instruksi.slice(0, 400), ...butir.flatMap((b) => [b.indikator, ...b.unsurSkor4])].join('. ').slice(0, 1500);
}

/** Kata kueri untuk to_tsquery PostgreSQL: hanya huruf/angka (aman dari sintaks tsquery), digabung OR. */
export function kueriKataKunci(kueri: string): string | null {
  const kata = [...new Set((kueri.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((k) => k.length >= 2))].slice(0, 20);
  return kata.length ? kata.join(' | ') : null;
}

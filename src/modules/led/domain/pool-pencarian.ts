import { gabungRRF } from './rrf';

/**
 * Rencana 10 Nov T2: pool pelabelan per sub-bagian. Untuk setiap konfigurasi, ambil N teratas dari setiap jalur (vektor,
 * kata kunci) ditambah k teratas hasil gabungan (potongan yang benar-benar dipakai sistem, yang bisa saja tidak masuk
 * N teratas jalur mana pun), lalu satukan tanpa duplikat. Setiap potongan membawa peringkatnya di setiap konfigurasi.
 */

export interface JalurKonfigurasi {
  /** id potongan terurut dari peringkat 1 (kandidat sistem, biasanya 30 per jalur) */
  vektor: string[];
  kataKunci: string[];
  /** k sistem konfigurasi ini */
  k: number;
}

export interface PeringkatPool {
  /** peringkat jalur vektor, kata kunci, dan gabungan (null bila tidak muncul) */
  v: number | null;
  kk: number | null;
  g: number | null;
}

export interface BarisPool {
  potonganId: string;
  peringkat: Record<string, PeringkatPool>;
  /** peringkat gabungan terbaik di konfigurasi mana pun (untuk urutan baris) */
  terbaik: number;
}

/** Urutan gabungan (RRF) satu konfigurasi, sama dengan yang dipakai sistem. */
export function urutanGabungan(j: Pick<JalurKonfigurasi, 'vektor' | 'kataKunci'>): string[] {
  return gabungRRF([j.vektor, j.kataKunci]).map((g) => g.id);
}

export function susunPool(perKonfigurasi: Record<string, JalurKonfigurasi>, nPerJalur = 20): BarisPool[] {
  const masuk = new Set<string>();
  const gabungan: Record<string, string[]> = {};
  for (const [konf, j] of Object.entries(perKonfigurasi)) {
    gabungan[konf] = urutanGabungan(j);
    for (const id of [...j.vektor.slice(0, nPerJalur), ...j.kataKunci.slice(0, nPerJalur), ...gabungan[konf].slice(0, j.k)]) masuk.add(id);
  }
  const posisi = (daftar: string[], id: string) => { const i = daftar.indexOf(id); return i < 0 ? null : i + 1; };
  const hasil: BarisPool[] = [...masuk].map((id) => {
    const peringkat: Record<string, PeringkatPool> = {};
    let terbaik = Infinity;
    for (const [konf, j] of Object.entries(perKonfigurasi)) {
      const g = posisi(gabungan[konf], id);
      peringkat[konf] = { v: posisi(j.vektor, id), kk: posisi(j.kataKunci, id), g };
      if (g !== null) terbaik = Math.min(terbaik, g);
    }
    return { potonganId: id, peringkat, terbaik };
  });
  return hasil.sort((a, b) => a.terbaik - b.terbaik || a.potonganId.localeCompare(b.potonganId));
}

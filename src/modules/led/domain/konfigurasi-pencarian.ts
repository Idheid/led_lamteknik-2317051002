/**
 * Rencana 10 Nov T2: konfigurasi pencarian bernama, supaya setiap perubahan pencarian bisa diukur (rumusan masalah 2).
 * Konfigurasi lama tetap bisa dijalankan sampai evaluasi skripsi selesai. Konfigurasi baru diaktifkan di tahapnya:
 * B-bm25 di T5 (setelah kepala konteks T4), C-unsur di T6.
 */

export type KodeKonfigurasi = 'A-lama' | 'B-bm25' | 'C-unsur';

export interface KonfigurasiPencarian {
  kode: KodeKonfigurasi;
  /** kolom vektor potongan */
  vektor: 'embedding' | 'embeddingKonteks';
  /** jalur kata kunci */
  kataKunci: 'ts_rank' | 'bm25';
  /** satu kueri gabungan (kueriGenerate) atau kueri per unsur skor 4 */
  kueri: 'gabungan' | 'unsur';
  /** sudah bisa dijalankan */
  aktif: boolean;
  /** jumlah potongan yang masuk konteks generate (k sistem) */
  k: number;
  keterangan: string;
}

export const KONFIGURASI_PENCARIAN: Record<KodeKonfigurasi, KonfigurasiPencarian> = {
  'A-lama': {
    kode: 'A-lama', vektor: 'embedding', kataKunci: 'ts_rank', kueri: 'gabungan', aktif: true, k: 8,
    keterangan: 'Vektor teks potongan + ts_rank atas teksTsv, satu kueri gabungan (pembanding).',
  },
  'B-bm25': {
    kode: 'B-bm25', vektor: 'embeddingKonteks', kataKunci: 'bm25', kueri: 'gabungan', aktif: true, k: 8,
    keterangan: 'Vektor potongan berkepala + BM25 atas teks berkepala, satu kueri gabungan (pembanding).',
  },
  'C-unsur': {
    kode: 'C-unsur', vektor: 'embeddingKonteks', kataKunci: 'bm25', kueri: 'unsur', aktif: false, k: 10,
    keterangan: 'Seperti B, dengan kueri per unsur skor 4 dan batas per dokumen.',
  },
};

/** Urutan tahap: konfigurasi bawaan = konfigurasi aktif paling akhir. */
const URUTAN: KodeKonfigurasi[] = ['A-lama', 'B-bm25', 'C-unsur'];

export function konfigurasiAktif(): KodeKonfigurasi[] {
  return URUTAN.filter((k) => KONFIGURASI_PENCARIAN[k].aktif);
}

export function adalahKodeKonfigurasi(s: string): s is KodeKonfigurasi {
  return (URUTAN as string[]).includes(s);
}

/**
 * Konfigurasi untuk generate: nilai PENCARIAN_KONFIGURASI bila sah dan aktif, selain itu konfigurasi aktif paling akhir.
 */
export function konfigurasiBawaan(env?: string | null): KodeKonfigurasi {
  const aktif = konfigurasiAktif();
  const v = env?.trim();
  if (v && adalahKodeKonfigurasi(v) && KONFIGURASI_PENCARIAN[v].aktif) return v;
  return aktif[aktif.length - 1];
}

/** Daftar konfigurasi dari argumen ("A-lama,B-bm25"); galat bila tidak dikenal atau belum aktif. */
export function bacaDaftarKonfigurasi(teks: string): KodeKonfigurasi[] {
  const hasil: KodeKonfigurasi[] = [];
  for (const bagian of teks.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (!adalahKodeKonfigurasi(bagian)) throw new Error(`Konfigurasi tidak dikenal: ${bagian}. Pilihan: ${URUTAN.join(', ')}.`);
    if (!KONFIGURASI_PENCARIAN[bagian].aktif) throw new Error(`Konfigurasi ${bagian} belum aktif di tahap ini.`);
    if (!hasil.includes(bagian)) hasil.push(bagian);
  }
  if (hasil.length === 0) throw new Error('Tidak ada konfigurasi yang diminta.');
  return hasil;
}

/** Satu kandidat hasil pencarian yang disimpan di VersiDraf.pencarian dan dipakai ekspor data uji. */
export interface KandidatPencarian {
  potonganId: string;
  dokumenId: string;
  /** peringkat di jalur vektor (1 = teratas), null bila tidak muncul */
  peringkatVektor: number | null;
  /** peringkat di jalur kata kunci, null bila tidak muncul */
  peringkatKataKunci: number | null;
  /** peringkat setelah digabung RRF */
  peringkatGabungan: number;
  skorRrf: number;
  /** unsur skor 4 asal kandidat (konfigurasi per unsur), null untuk kueri gabungan */
  unsur: string | null;
  masukKonteks: boolean;
}

/** Jejak pencarian satu versi draf (kolom JSON VersiDraf.pencarian). */
export interface JejakPencarian {
  konfigurasi: KodeKonfigurasi;
  /** satu kueri, atau satu per unsur */
  kueri: string[];
  k: number;
  kandidat: KandidatPencarian[];
}

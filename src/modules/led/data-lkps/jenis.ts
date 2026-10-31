/**
 * Bentuk data tabel LKPS hasil baca (Excel atau PDF). Disimpan di TabelLKPS (kolom `kolom` dan `baris`).
 * Kolom dikunci dengan huruf kolom template Excel (A, B, C, ...) supaya rumus metrik tidak bergantung pada judul kolom.
 */

export type NilaiSel = string | number | null;

export interface KolomLkps {
  /** Huruf kolom pada template, misalnya "D". */
  kunci: string;
  /** Nomor kolom yang tercetak di template (baris 1, 2, 3, ...). */
  nomor: string;
  /** Judul kolom gabungan dari baris judul, misalnya "Jumlah Judul Penelitian / TS-2". */
  label: string;
}

export interface BarisLkps {
  /** Nomor baris di lembar asal (Excel) atau urutan baris (PDF). */
  nomorBaris: number;
  sel: Record<string, NilaiSel>;
}

export interface MasalahLkps {
  tingkat: 'galat' | 'peringatan';
  sheet: string | null;
  pesan: string;
  baris?: number;
  kolom?: string;
}

export interface TabelBaca {
  /** Kode tabel sesuai seed instrumen, misalnya "4.a" (null bila sheet tidak dipakai butir). */
  kode: string | null;
  sheet: string;
  judul: string;
  /** Label blok untuk sheet berblok jenjang (6.d, 6.f.1), misalnya "Program Sarjana". */
  blok: string | null;
  kolom: KolomLkps[];
  baris: BarisLkps[];
  /** Kolom yang berisi rumus di template (dihitung Excel, tidak wajib diisi). */
  kolomRumus: string[];
}

export interface IdentitasLkps {
  /** Tanggal akhir TS di sheet Menu (31/08/TTTT), format YYYY-MM-DD. */
  tanggalTs: string | null;
  namaProgramStudi: string | null;
}

export interface HasilBacaLkps {
  tabel: TabelBaca[];
  masalah: MasalahLkps[];
  identitas: IdentitasLkps;
}

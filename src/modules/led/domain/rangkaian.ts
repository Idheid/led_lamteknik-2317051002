/**
 * Susun seluruh LED (revisi 31 Okt 2026, Pak Tris: "lebih mudah ngedit dibandingkan create"): urutan bagian satu
 * rangkaian generate dan data kosong halaman yang terisi otomatis dari data (sampul, identitas, tim).
 */

/** Bab sesudah kriteria: Bab II (tim dan jadwal, lingkungan eksternal), lalu III, I, IV. */
export const URUTAN_BAB_SUSUN = ['II.A', 'II.B', 'III', 'I', 'IV'];

/** Halaman awal yang disusun paling akhir karena isinya merangkum bagian lain. */
export const SUB_AWAL_SUSUN = ['AWAL-PENGANTAR', 'AWAL-RINGKASAN'];

/**
 * Urutan bagian satu rangkaian: C.1–C.7 (urutan nomor), Bab II.A, II.B, III, I, IV, terakhir AWAL. Bagian yang tidak
 * ada di versi instrumen dilewati; bagian lain (LAMPIRAN) tidak disusun.
 */
export function urutanBagianSusun(kodeBagian: string[]): string[] {
  const nomor = (k: string) => Number(/^C\.(\d+)$/.exec(k)?.[1]);
  const kriteria = kodeBagian.filter((k) => /^C\.\d+$/.test(k)).sort((a, b) => nomor(a) - nomor(b));
  const bab = URUTAN_BAB_SUSUN.filter((k) => kodeBagian.includes(k));
  return [...kriteria, ...bab, ...(kodeBagian.includes('AWAL') ? ['AWAL'] : [])];
}

/** Sub-bagian AWAL yang disusun: kata pengantar lalu ringkasan eksekutif. */
export function subAwalSusun(kodeSub: string[]): string[] {
  return SUB_AWAL_SUSUN.filter((k) => kodeSub.includes(k));
}

/** Sub-bagian yang akan disusun: urutan generate dikurangi yang sudah ditandai selesai. */
export function subBelumSelesai(urutan: string[], selesai: Set<string>): string[] {
  return urutan.filter((k) => !selesai.has(k));
}

export interface DataHalamanAwal {
  prodi: { nama: string; jenjang: string; kodePddikti: string | null };
  identitas: Record<string, string | undefined>;
  fakultas: { nama: string; perguruanTinggi: string; alamat: string | null; kota: string | null } | null;
  jumlahTim: number;
}

export interface DataKosong {
  muka: string[];
  identitas: string[];
  tim: string[];
}

/** Data yang masih kosong untuk halaman yang terisi otomatis (halaman muka, identitas pengusul, tim penyusun). */
export function dataKosongHalamanAwal(d: DataHalamanAwal): DataKosong {
  const kosong = (pasangan: [string, string | null | undefined][]) => pasangan.filter(([, v]) => !v?.trim()).map(([l]) => l);
  const i = d.identitas;
  return {
    muka: kosong([
      ['Nama fakultas', d.fakultas?.nama],
      ['Nama perguruan tinggi', d.fakultas?.perguruanTinggi],
      ['Kota', i.kota || d.fakultas?.kota],
    ]),
    identitas: kosong([
      ['Kode PDDikti', d.prodi.kodePddikti],
      ['SK pendirian perguruan tinggi', i.skPendirian],
      ['Tanggal SK pendirian', i.tanggalSkPendirian],
      ['SK pembukaan prodi', i.skPembukaan],
      ['Tanggal SK pembukaan', i.tanggalSkPembukaan],
      ['Tahun pertama menerima mahasiswa', i.tahunPertamaMenerima],
      ['Peringkat akreditasi terakhir', i.peringkatAkreditasi],
      ['Nomor SK akreditasi', i.nomorSkAkreditasi],
      ['Alamat prodi', i.alamat],
      ['Telepon', i.telepon],
      ['Email prodi', i.email],
    ]),
    tim: d.jumlahTim > 0 ? [] : ['Susunan tim penyusun'],
  };
}

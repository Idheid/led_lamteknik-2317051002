/**
 * Rencana 10 Nov T9 (6): rumus perkiraan permintaan AI dan token untuk "Susun seluruh LED" (murni, diuji unit).
 * - Permintaan: satu per sub-bagian yang dikirim ke AI, satu pemeriksaan per bagian yang punya sub-bagian dikirim (T8),
 *   dan paling banyak dua lagi per bagian itu (perbaikan terarah + pemeriksaan ulang) bila ada kalimat tidak didukung.
 * - Token masukan ≈ panjang prompt / 4 karakter; token keluaran ≈ 2 × target kata (JSON, kutipan bukti, unsur).
 *   Pemeriksaan ≈ keluaran narasi × 1,5 masukan dan 40 token keluaran per kalimat (± 15 kata per kalimat).
 */

export interface SubPerkiraan {
  bagian: string;
  status: 'kirim' | 'dilewati' | 'tanpa_ai';
  /** panjang karakter instruksi sistem + teks pengguna */
  panjangMasukan: number;
  targetKata: number;
}

export interface PerkiraanSusun {
  model: string;
  jumlah: { kirim: number; dilewati: number; tanpaAi: number };
  /** rincian per bagian (urutan Susun) */
  bagian: { kode: string; kirim: number; dilewati: number; tanpaAi: number }[];
  permintaan: { generate: number; pemeriksaan: number; perbaikanMaks: number; min: number; maks: number };
  token: { masuk: number; keluar: number };
  hariIni: { permintaan: number; tokenMasuk: number; tokenKeluar: number; sejak: string };
  reset: string;
}

export const KARAKTER_PER_TOKEN = 4;

export function perkiraanPermintaan(sub: SubPerkiraan[]): PerkiraanSusun['permintaan'] {
  const kirim = sub.filter((s) => s.status === 'kirim');
  const bagian = new Set(kirim.map((s) => s.bagian)).size;
  const generate = kirim.length;
  const pemeriksaan = bagian;
  const perbaikanMaks = 2 * bagian;
  return { generate, pemeriksaan, perbaikanMaks, min: generate + pemeriksaan, maks: generate + pemeriksaan + perbaikanMaks };
}

export function rincianBagian(sub: SubPerkiraan[]): PerkiraanSusun['bagian'] {
  const urut = [...new Set(sub.map((s) => s.bagian))];
  return urut.map((kode) => {
    const di = sub.filter((s) => s.bagian === kode);
    return {
      kode,
      kirim: di.filter((s) => s.status === 'kirim').length,
      dilewati: di.filter((s) => s.status === 'dilewati').length,
      tanpaAi: di.filter((s) => s.status === 'tanpa_ai').length,
    };
  });
}

export function perkiraanToken(sub: SubPerkiraan[]): PerkiraanSusun['token'] {
  const kirim = sub.filter((s) => s.status === 'kirim');
  const masukNarasi = kirim.reduce((a, s) => a + Math.ceil(s.panjangMasukan / KARAKTER_PER_TOKEN), 0);
  const keluarNarasi = kirim.reduce((a, s) => a + 2 * s.targetKata, 0);
  const kalimat = kirim.reduce((a, s) => a + Math.ceil(s.targetKata / 15), 0);
  return { masuk: masukNarasi + Math.round(keluarNarasi * 1.5), keluar: keluarNarasi + 40 * kalimat };
}

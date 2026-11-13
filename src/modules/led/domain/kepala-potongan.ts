/**
 * Rencana 10 Nov T4: kepala konteks setiap potongan, disusun kode tanpa AI, misalnya
 *   "Dokumen: SK Dekan Pengembangan Dosen | Jenis: SK pengembangan dosen | Hlm. 2 | Bagian: Pasal 3"
 * Kepala + teks (`teksIndeks`) dipakai untuk embedding baru (`embeddingKonteks`) dan indeks BM25 (T5). Teks potongan
 * sendiri tidak berubah: tetap ditampilkan, dikirim ke prompt, dan dipakai mencocokkan kutipan.
 */

/** Naikkan bila format kepala berubah (dipakai versi pemrosesan dokumen, T9). */
export const VERSI_KEPALA = 'kepala-v1';

export interface InfoKepala {
  /** judul dokumen, atau nama berkas bila judul kosong */
  dokumen: string;
  /** jenis dokumen bila diketahui (dokumen yang diharapkan instrumen), misalnya "SK pengembangan dosen" */
  jenis?: string | null;
  halaman?: number | null;
  /** judul bagian terdekat sebelum potongan, bila terdeteksi */
  bagian?: string | null;
}

/** Nama dokumen tampilan: judul, atau nama berkas tanpa ekstensi dengan pemisah diganti spasi. */
export function namaDokumenKepala(judul: string | null | undefined, namaBerkas: string): string {
  const j = judul?.trim();
  if (j) return j;
  return namaBerkas.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function susunKepala(i: InfoKepala): string {
  const bagian = [`Dokumen: ${i.dokumen}`];
  if (i.jenis?.trim()) bagian.push(`Jenis: ${i.jenis.trim()}`);
  if (i.halaman) bagian.push(`Hlm. ${i.halaman}`);
  if (i.bagian?.trim()) bagian.push(`Bagian: ${i.bagian.trim()}`);
  return bagian.join(' | ');
}

export function teksIndeks(kepala: string, teks: string): string {
  return `${kepala}\n${teks}`;
}

const POLA_BERNOMOR = [
  /^BAB\s+[IVXLC\d]+\b.{0,80}$/i,
  /^Pasal\s+\d+[A-Za-z]?\b.{0,60}$/i,
  /^Bagian\s+(ke)?[A-Za-z\d]+\b.{0,60}$/i,
  /^Lampiran\b.{0,60}$/i,
  /^\d+(\.\d+){0,3}\.?\s+[A-Z][^.!?]{1,80}$/,
  /^[A-H]\.\s+[A-Z][^.!?]{1,80}$/,
];

/** Baris judul: bernomor (BAB II, Pasal 3, 1.2 Tujuan) atau pendek dan berhuruf kapital semua. */
export function barisJudul(baris: string): boolean {
  const b = baris.trim();
  if (b.length < 3 || b.length > 90) return false;
  if (POLA_BERNOMOR.some((p) => p.test(b))) return true;
  const huruf = b.match(/\p{L}/gu) ?? [];
  if (huruf.length < 4) return false;
  const kapital = huruf.filter((h) => h === h.toUpperCase() && h !== h.toLowerCase()).length;
  // kalimat biasa berakhir titik; judul kapital tidak
  return kapital / huruf.length >= 0.9 && !/[.;,]$/.test(b) && b.split(/\s+/).length <= 12;
}

/**
 * Judul bagian terdekat sebelum potongan di halaman yang sama. `teksHalaman` = teks halaman tempat potongan dimulai;
 * `awalPotongan` = teks potongan (dicari posisinya di halaman). Bila tidak yakin, null (jangan menebak).
 */
export function bagianTerdekat(teksHalaman: string | null | undefined, awalPotongan: string): string | null {
  if (!teksHalaman) return null;
  const kunci = awalPotongan.replace(/\s+/g, ' ').trim().slice(0, 40);
  const datar = teksHalaman.replace(/[ \t]+/g, ' ');
  let posisi = kunci ? datar.replace(/\s+/g, ' ').indexOf(kunci) : -1;
  if (posisi < 0) return null;
  // petakan posisi di teks berspasi tunggal kembali ke teks berbaris: hitung karakter bukan spasi
  const target = datar.replace(/\s+/g, ' ').slice(0, posisi).replace(/\s/g, '').length;
  let hitung = 0;
  let i = 0;
  for (; i < datar.length && hitung < target; i++) if (!/\s/.test(datar[i])) hitung++;
  posisi = i;
  const sebelum = datar.slice(0, posisi).split('\n').map((b) => b.trim()).filter(Boolean);
  // baris pertama potongan sendiri juga boleh menjadi judul
  const barisPertama = awalPotongan.split('\n')[0]?.trim() ?? '';
  if (barisJudul(barisPertama)) return barisPertama.slice(0, 90);
  for (let j = sebelum.length - 1; j >= 0; j--) if (barisJudul(sebelum[j])) return sebelum[j].slice(0, 90);
  return null;
}

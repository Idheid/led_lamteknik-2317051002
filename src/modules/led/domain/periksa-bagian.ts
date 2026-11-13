import { teksKeInline, type DokTiptap, type NodeTiptap } from './narasi.ts';
import { kunciKalimat, type KalimatTerperiksa, type LabelKalimat } from './verifikasi.ts';
import { kodeDokumen, type RingkasanKutipan } from './kutipan.ts';
import { angkaTidakBerdasar, ekstrakAngka } from '../../bersama/domain/teks.ts';

/**
 * Rencana 10 Nov T8: pemeriksaan per bagian (kriteria) dalam tiga langkah.
 * 1. Aturan (0 token): cek angka dan kata kunci per kalimat (revisi 22 Okt) ditambah hasil cek kutipan T7.
 * 2. AI otomatis: satu panggilan memeriksa semua kalimat dari semua versi baru dalam satu bagian. Masukan hanya kalimat,
 *    kutipan bukti yang dirujuk, dan baris M/T/J terkait (bukan potongan utuh).
 * 3. Perbaikan terarah, maksimal sekali: paragraf yang memuat kalimat `tidak_didukung` ditulis ulang hanya dari bukti
 *    yang sah (atau kalimatnya dihapus), lalu kalimat yang berubah diperiksa lagi dalam satu panggilan.
 * Kalimat `tidak_didukung` yang belum disunting atau dikonfirmasi (dengan alasan) menahan ekspor final.
 */

export interface HasilVerifikasiAi {
  model: string;
  waktu: string;
  hasil: KalimatTerperiksa[];
}

export interface KonfirmasiKalimat {
  kunci: string;
  teks: string;
  alasan: string;
  oleh: string;
  waktu: string;
}

export type StatusAi = 'antre' | 'selesai' | 'gagal';

/** Bagian `VersiDraf.pemeriksaan` yang dipakai T8 (selain HasilPemeriksaan dan rujukan). */
export interface PemeriksaanT8 {
  kalimat?: KalimatTerperiksa[];
  kalimatAi?: HasilVerifikasiAi;
  kutipan?: RingkasanKutipan | null;
  teksSumber?: Record<string, string>;
  statusAi?: StatusAi;
  pesanAi?: string;
  /** kunci kalimat `tidak_didukung` yang menahan ekspor final sampai disunting atau dikonfirmasi */
  tahan?: string[];
  konfirmasi?: KonfirmasiKalimat[];
  /** versi asal yang sudah diperbaiki otomatis (perbaikan hanya sekali) */
  diperbaiki?: boolean;
  /** versi "perbaikan otomatis": versi asal dan nomor paragraf yang ditulis ulang/dihapus */
  perbaikan?: { dariVersiId: string; dariNomor: number; ditulisUlang: number[]; dihapus: number[] };
}

export const ALASAN_KUTIPAN_DITOLAK = 'Paragraf hanya bersandar pada kutipan yang tidak ditemukan di sumber';

/**
 * Langkah 1: label aturan per kalimat digabung dengan cek kutipan T7. Paragraf `tidak_didukung` menurut cek kutipan,
 * atau kalimat dengan angka yang tidak ada di kutipan/data yang dirujuk, diberi label `tidak_didukung`.
 * `pasti` = kunci kalimat yang labelnya berasal dari cek kutipan (deterministik, menahan ekspor final walau AI belum
 * berjalan); label kata kunci tetap petunjuk saja.
 */
export function labelAturan(kalimat: KalimatTerperiksa[], kutipan: RingkasanKutipan | null | undefined): { kalimat: KalimatTerperiksa[]; pasti: string[] } {
  if (!kutipan) return { kalimat, pasti: [] };
  const pasti: string[] = [];
  const hasil = kalimat.map((k) => {
    const p = kutipan.paragraf[k.paragraf];
    if (!p || /\[BELUM ADA BUKTI/i.test(k.teks)) return k;
    if (p.status === 'tidak_didukung') {
      pasti.push(kunciKalimat(k.teks));
      const ditolak = p.buktiDitolak.length ? ` (${p.buktiDitolak.join(', ')})` : ' (tanpa kutipan bukti)';
      return { ...k, label: 'tidak_didukung' as const, alasan: `${ALASAN_KUTIPAN_DITOLAK}${ditolak}.` };
    }
    const angka = p.angkaTanpaRujukan.filter((a) => k.teks.includes(a));
    if (angka.length) {
      pasti.push(kunciKalimat(k.teks));
      return { ...k, label: 'tidak_didukung' as const, alasan: `Angka ${angka.join(', ')} tidak ada di kutipan atau data yang dirujuk.` };
    }
    return k;
  });
  return { kalimat: hasil, pasti };
}

export interface ButirBukti {
  kode: string;
  teks: string;
}

const MAKS_DATA = 1200;
const MAKS_DOKUMEN_TANPA_KUTIPAN = 800;

/**
 * Bukti untuk satu paragraf: kutipan sah (T7) + baris M/T/J/P yang dirujuk. Dokumen (D/U) hanya lewat kutipan; versi
 * lama tanpa kutipan memakai awal teks dokumen yang dirujuk (dipotong).
 */
export function buktiParagraf(i: number, sumber: string[], kutipan: RingkasanKutipan | null | undefined, teksSumber: Record<string, string>): ButirBukti[] {
  const hasil: ButirBukti[] = [];
  const p = kutipan?.paragraf[i];
  for (const id of p?.buktiSah ?? []) {
    const b = kutipan!.bukti.find((x) => x.id === id);
    if (b) hasil.push({ kode: id, teks: `(${b.sumber}) ${b.kutipan}` });
  }
  for (const s of sumber) {
    const t = teksSumber[s];
    if (!t) continue;
    if (kodeDokumen(s)) {
      if (!kutipan) hasil.push({ kode: s, teks: t.slice(0, MAKS_DOKUMEN_TANPA_KUTIPAN) });
      continue;
    }
    hasil.push({ kode: s, teks: t.slice(0, MAKS_DATA) });
  }
  return hasil;
}

export interface ItemPeriksa {
  /** kode sub-bagian (untuk dibaca AI dan dicatat) */
  kode: string;
  kalimat: KalimatTerperiksa[];
  /** bukti per indeks paragraf */
  bukti: (paragraf: number) => ButirBukti[];
}

export const SISTEM_PERIKSA = [
  'Anda pemeriksa fakta untuk draf Laporan Evaluasi Diri. Untuk setiap kalimat bernomor, nilai apakah isinya didukung BUKTI yang dirujuk kalimat itu (kode di dalam kurung, hanya dari sub-bagian yang sama).',
  'Label:',
  '- "sesuai": isi dan angkanya ada di bukti yang dirujuk;',
  '- "sebagian": merujuk bukti, tetapi ada simpulan, penilaian, atau tambahan kata yang tidak ada di bukti;',
  '- "tidak_didukung": angka atau isinya tidak ditemukan di bukti yang dirujuk, atau kalimat tidak merujuk bukti.',
  'Kalimat pengantar atau penghubung tanpa klaim fakta boleh diberi "sesuai". Kalimat yang berisi penanda [BELUM ADA BUKTI: ...] diberi label "sebagian".',
  'Alasan ditulis singkat (paling banyak 25 kata) dalam bahasa Indonesia. Keluarkan satu objek untuk setiap nomor kalimat, hanya JSON sesuai skema.',
].join('\n');

/**
 * Prompt Langkah 2 untuk banyak sub-bagian sekaligus. Bukti didaftar sekali per sub-bagian (kode `s1.B1`, `s1.M-PDS3`);
 * kalimat merujuk kode itu. `peta[n-1]` = posisi kalimat nomor n.
 */
export function susunPenggunaPeriksa(item: ItemPeriksa[], hanya?: (iItem: number, k: KalimatTerperiksa) => boolean): { teks: string; peta: { item: number; kalimat: number }[] } {
  const peta: { item: number; kalimat: number }[] = [];
  const blok: string[] = [];
  item.forEach((it, iItem) => {
    const awalan = `s${iItem + 1}`;
    const daftar = it.kalimat.map((k, i) => ({ k, i })).filter(({ k }) => !hanya || hanya(iItem, k));
    if (daftar.length === 0) return;
    const bukti = new Map<string, string>();
    const kodePar = new Map<number, string[]>();
    for (const { k } of daftar) {
      if (kodePar.has(k.paragraf)) continue;
      const b = it.bukti(k.paragraf);
      kodePar.set(k.paragraf, b.map((x) => `${awalan}.${x.kode}`));
      for (const x of b) bukti.set(`${awalan}.${x.kode}`, x.teks);
    }
    const baris = daftar.map(({ k, i }) => {
      peta.push({ item: iItem, kalimat: i });
      const kode = kodePar.get(k.paragraf) ?? [];
      return `${peta.length}. (${kode.join(', ') || 'tanpa bukti'}) ${k.teks}`;
    });
    blok.push([
      `## SUB-BAGIAN ${awalan} (${it.kode})`,
      '### BUKTI',
      bukti.size ? [...bukti].map(([k, t]) => `[${k}] ${t}`).join('\n') : '(tidak ada bukti)',
      '### KALIMAT',
      ...baris,
    ].join('\n'));
  });
  return { teks: blok.join('\n\n'), peta };
}

/** Gabungkan keluaran AI dengan kalimat; kalimat yang tidak dinilai AI tetap memakai label aturan. */
export function terapkanLabelAi(
  item: ItemPeriksa[],
  peta: { item: number; kalimat: number }[],
  keluaran: { nomor: number; label: LabelKalimat; alasan: string }[],
): KalimatTerperiksa[][] {
  const hasil = item.map((it) => it.kalimat.map((k) => ({ ...k })));
  const dinilai = new Set<string>();
  for (const o of keluaran) {
    const posisi = peta[o.nomor - 1];
    if (!posisi) continue;
    hasil[posisi.item][posisi.kalimat] = { ...hasil[posisi.item][posisi.kalimat], label: o.label, alasan: o.alasan };
    dinilai.add(`${posisi.item}:${posisi.kalimat}`);
  }
  for (const { item: i, kalimat: j } of peta) {
    if (!dinilai.has(`${i}:${j}`)) hasil[i][j] = { ...hasil[i][j], alasan: `AI tidak menilai kalimat ini; label cek otomatis: ${hasil[i][j].alasan}` };
  }
  return hasil;
}

// ------------------------------------------------------------------ Langkah 3: perbaikan terarah

export interface ParagrafPerbaikan {
  item: number;
  /** indeks paragraf narasi */
  paragraf: number;
  teks: string;
  sumber: string[];
  bermasalah: KalimatTerperiksa[];
  bukti: ButirBukti[];
}

/** Paragraf yang memuat kalimat `tidak_didukung` (bukan penanda). */
export function paragrafPerluPerbaikan(
  kalimat: KalimatTerperiksa[],
  paragraf: { teks: string; sumber: string[] }[],
  bukti: (i: number) => ButirBukti[],
  item: number,
): ParagrafPerbaikan[] {
  const per = new Map<number, KalimatTerperiksa[]>();
  for (const k of kalimat) {
    if (k.label !== 'tidak_didukung' || /\[BELUM ADA BUKTI/i.test(k.teks)) continue;
    per.set(k.paragraf, [...(per.get(k.paragraf) ?? []), k]);
  }
  return [...per].filter(([i]) => paragraf[i]).map(([i, bermasalah]) => ({
    item, paragraf: i, teks: paragraf[i].teks, sumber: paragraf[i].sumber, bermasalah, bukti: bukti(i),
  }));
}

export const SISTEM_PERBAIKAN = [
  'Anda penyunting draf Laporan Evaluasi Diri. Setiap PARAGRAF di bawah memuat kalimat yang tidak didukung bukti.',
  'Tulis ulang setiap paragraf HANYA dari BUKTI SAH paragraf itu: pertahankan kalimat yang didukung, perbaiki atau hapus kalimat bermasalah. Jangan menambah fakta, angka, nama, atau tahun yang tidak ada di bukti.',
  'Isi "bukti" dengan kode bukti sah yang dipakai paragraf hasil (misalnya ["B1", "M-PDS3"]). Bila tidak ada isi yang didukung bukti, kembalikan "teks" kosong (paragraf dihapus).',
  'Bahasa Indonesia baku, nada laporan, tanpa kode bukti di dalam teks. Keluarkan satu objek untuk setiap nomor paragraf, hanya JSON sesuai skema.',
].join('\n');

export function susunPenggunaPerbaikan(daftar: ParagrafPerbaikan[], kodeItem: (i: number) => string): string {
  return daftar.map((p, n) => [
    `## PARAGRAF ${n + 1} (${kodeItem(p.item)}, paragraf ${p.paragraf + 1})`,
    `Teks: ${p.teks}`,
    'Kalimat bermasalah:',
    ...p.bermasalah.map((k) => `- ${k.teks} (${k.alasan})`),
    'BUKTI SAH:',
    p.bukti.length ? p.bukti.map((b) => `[${b.kode}] ${b.teks}`).join('\n') : '(tidak ada bukti sah: hapus kalimat bermasalah)',
  ].join('\n')).join('\n\n');
}

export interface HasilPerbaikanParagraf {
  /** null = paragraf dihapus */
  teks: string | null;
  buktiSah: string[];
  buktiDitolak: string[];
  angkaTanpaRujukan: string[];
}

/**
 * Cek kode hasil perbaikan: kode bukti harus berasal dari bukti sah paragraf itu; angka harus ada di bukti yang dipakai.
 * Teks yang memuat kode bukti mentah ("B1") dibersihkan.
 */
export function cekPerbaikan(p: ParagrafPerbaikan, keluaran: { teks: string; bukti: string[] }, tahunSah: number[]): HasilPerbaikanParagraf {
  const teks = keluaran.teks.replace(/\s*\[?\b(?:s\d+\.)?B\d+\b\]?/g, '').replace(/\s+/g, ' ').trim();
  if (!teks) return { teks: null, buktiSah: [], buktiDitolak: [], angkaTanpaRujukan: [] };
  const boleh = new Map(p.bukti.map((b) => [b.kode, b.teks]));
  const buktiSah = keluaran.bukti.filter((b) => boleh.has(b));
  const buktiDitolak = keluaran.bukti.filter((b) => !boleh.has(b));
  const angkaSah = ekstrakAngka(buktiSah.map((b) => boleh.get(b)!).join('\n')).map((a) => a.nilai);
  const angkaTanpaRujukan = [...new Set(angkaTidakBerdasar(teks, angkaSah, { tahunSah }).map((a) => a.teks.trim()))];
  return { teks, buktiSah, buktiDitolak, angkaTanpaRujukan };
}

/**
 * Ganti teks paragraf narasi ke-i (urutan sama dengan `paragrafBersumber`); `null` menghapus paragraf. Atribut sumber
 * dipertahankan; tabel dan judul tabel tidak disentuh.
 */
export function gantiParagraf(doc: DokTiptap, ganti: Map<number, string | null>): DokTiptap {
  let i = -1;
  const jalan = (n: NodeTiptap): NodeTiptap | null => {
    if (n.type === 'table') return n;
    if (n.type === 'paragraph') {
      if (n.attrs?.peran === 'judul-tabel') return n;
      const teks = (n.content ?? []).map((c) => c.text ?? '').join('').trim();
      if (!teks) return n;
      i += 1;
      if (!ganti.has(i)) return n;
      const baru = ganti.get(i);
      return baru === null ? null : { ...n, content: teksKeInline(baru!) };
    }
    if (!n.content) return n;
    const isi = n.content.map(jalan).filter((x): x is NodeTiptap => x !== null);
    return isi.length === 0 && (n.type === 'listItem' || n.type === 'bulletList' || n.type === 'orderedList') ? null : { ...n, content: isi };
  };
  return { ...doc, content: doc.content.map(jalan).filter((x): x is NodeTiptap => x !== null) };
}

/**
 * Kutipan versi perbaikan: paragraf yang ditulis ulang memakai bukti hasil cek; paragraf yang dihapus dibuang dan
 * indeks paragraf sesudahnya digeser.
 */
export function kutipanSetelahPerbaikan(lama: RingkasanKutipan | null | undefined, hasil: Map<number, HasilPerbaikanParagraf>): RingkasanKutipan | null {
  if (!lama) return null;
  const geser = (i: number) => i - [...hasil].filter(([j, h]) => j < i && h.teks === null).length;
  const paragraf = lama.paragraf.filter((p) => hasil.get(p.indeks)?.teks !== null).map((p) => {
    const h = hasil.get(p.indeks);
    if (!h) return { ...p, indeks: geser(p.indeks) };
    // bukti data (M/T/J) tidak ada di `bukti` kutipan; paragraf yang hanya merujuk data tetap didukung
    return { indeks: geser(p.indeks), status: h.buktiSah.length ? 'didukung' as const : 'tidak_didukung' as const,
      buktiSah: h.buktiSah.filter((b) => /^B\d+$/.test(b)), buktiDitolak: h.buktiDitolak, angkaTanpaRujukan: h.angkaTanpaRujukan };
  });
  const kalimat = lama.kalimat.filter((k) => !hasil.has(k.paragraf)).map((k) => ({ ...k, paragraf: geser(k.paragraf) }));
  return { ...lama, paragraf, kalimat, jumlah: { ...lama.jumlah, kalimatTidakDidukung: paragraf.filter((p) => p.status === 'tidak_didukung').length } };
}

// ------------------------------------------------------------------ gerbang ekspor final

/** Kunci kalimat yang menahan ekspor: label akhir (AI bila ada, selain itu cek kutipan) `tidak_didukung`. */
export function kunciTahan(kalimat: KalimatTerperiksa[], pastiAturan: string[], dariAi: boolean): string[] {
  const k = dariAi
    ? kalimat.filter((x) => x.label === 'tidak_didukung' && !/\[BELUM ADA BUKTI/i.test(x.teks)).map((x) => kunciKalimat(x.teks))
    : pastiAturan;
  return [...new Set(k)];
}

/** Kalimat yang masih menahan: kunci tahan yang kalimatnya masih ada di narasi (belum disunting) dan belum dikonfirmasi. */
export function kalimatMenahan(tahan: string[] | undefined, kalimatNarasi: string[], konfirmasi: KonfirmasiKalimat[] | undefined): string[] {
  if (!tahan?.length) return [];
  const ada = new Map(kalimatNarasi.map((t) => [kunciKalimat(t), t]));
  const dikonfirmasi = new Set((konfirmasi ?? []).map((k) => k.kunci));
  return tahan.filter((k) => ada.has(k) && !dikonfirmasi.has(k)).map((k) => ada.get(k)!);
}

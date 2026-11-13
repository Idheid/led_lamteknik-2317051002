import { angkaTidakBerdasar, ekstrakAngka } from '../../bersama/domain/teks.ts';

/**
 * Rencana 10 Nov T7: generate berbasis kutipan. AI memilih kutipan bukti (salinan persis dari POTONGAN atau JAWABAN
 * PENYUSUN), lalu menulis narasi hanya dari kutipan, METRIK, dan TABEL. Pemeriksaan di sini murni kode (0 token):
 * - kutipan harus potongan teks persis dari sumbernya (setelah menormalkan spasi, tanda kutip, tanda hubung pemenggal
 *   kata, dan huruf besar/kecil); tidak boleh dirangkai dengan "…";
 * - paragraf yang hanya bersandar pada bukti yang ditolak → kalimatnya `tidak_didukung`;
 * - unsur `terpenuhi` tanpa bukti sah (atau M/T/J) → `belum_ada_bukti` dan penanda disisipkan;
 * - angka di paragraf harus ada di kutipan, M, T, atau J yang dirujuk paragraf itu.
 */

export interface Bukti {
  id: string;
  sumber: string;
  kutipan: string;
}

export interface ParagrafBerbukti {
  teks: string;
  sumber: string[];
  bukti?: string[];
}

export interface UnsurBerbukti {
  butir: string;
  unsur: string;
  status: 'terpenuhi' | 'sebagian' | 'belum_ada_bukti';
  sumber?: string[];
  bukti?: string[];
}

export const MAKS_KUTIPAN = 300;

/** Normalisasi untuk mencocokkan kutipan dengan sumber. */
export function normalKutipan(s: string): string {
  return s
    .replace(/­/g, '') // tanda hubung lunak
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2') // kata dipenggal di akhir baris
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export interface HasilBukti extends Bukti {
  sah: boolean;
  alasan?: string;
}

/** Cek setiap kutipan terhadap teks sumber (kode D1/U1/J → teks yang diberikan ke AI). */
export function cekBukti(bukti: Bukti[], sumber: Map<string, string>): HasilBukti[] {
  const normalSumber = new Map([...sumber].map(([k, v]) => [k, normalKutipan(v)]));
  return bukti.map((b) => {
    const kutipan = b.kutipan ?? '';
    const tolak = (alasan: string): HasilBukti => ({ ...b, sah: false, alasan });
    if (!normalSumber.has(b.sumber)) return tolak(`sumber ${b.sumber} tidak ada di konteks`);
    if (!kutipan.trim()) return tolak('kutipan kosong');
    if (/\.\.\.|…/.test(kutipan)) return tolak('kutipan dirangkai dengan "…"');
    if (kutipan.length > MAKS_KUTIPAN + 20) return tolak(`kutipan lebih dari ${MAKS_KUTIPAN} karakter`);
    const n = normalKutipan(kutipan);
    if (n.length < 8) return tolak('kutipan terlalu pendek');
    if (!normalSumber.get(b.sumber)!.includes(n)) return tolak('kutipan tidak ditemukan persis di sumber');
    return { ...b, sah: true };
  });
}

/** Kode sumber dokumen (D1, U2) yang wajib dibuktikan lewat kutipan; M-/T-/J/P bersumber data sistem atau penyusun. */
export function kodeDokumen(kode: string): boolean {
  return /^[DU]\d+$/.test(kode);
}

export type LabelKalimat = 'didukung' | 'tidak_didukung';

export interface HasilParagraf {
  indeks: number;
  status: LabelKalimat;
  buktiSah: string[];
  buktiDitolak: string[];
  /** angka di paragraf yang tidak ada di kutipan, M, T, atau J yang dirujuk */
  angkaTanpaRujukan: string[];
}

/** Pecah paragraf menjadi kalimat (titik/tanda tanya/seru diikuti spasi dan huruf besar atau angka). */
export function pecahKalimat(teks: string): string[] {
  return teks.split(/(?<=[.!?])\s+(?=[\p{Lu}\d[])/u).map((x) => x.trim()).filter(Boolean);
}

export interface RujukanTeks {
  /** teks bukti per id bukti (hanya yang sah) */
  bukti: Map<string, string>;
  /** teks data sistem dan penyusun per kode (M-…, T-…, J, P) */
  data: Map<string, string>;
  tahunSah?: number[];
}

export function cekParagraf(paragraf: ParagrafBerbukti[], hasil: HasilBukti[], rujukan: RujukanTeks): HasilParagraf[] {
  const sah = new Set(hasil.filter((h) => h.sah).map((h) => h.id));
  return paragraf.map((p, i) => {
    const bukti = p.bukti ?? [];
    const buktiSah = bukti.filter((b) => sah.has(b));
    const buktiDitolak = bukti.filter((b) => !sah.has(b));
    const dataLain = p.sumber.filter((s) => !kodeDokumen(s) && rujukan.data.has(s));
    const penanda = /\[BELUM ADA BUKTI:/.test(p.teks);
    const status: LabelKalimat = buktiSah.length > 0 || dataLain.length > 0 || penanda ? 'didukung' : 'tidak_didukung';
    const teksRujukan = [...buktiSah.map((b) => rujukan.bukti.get(b) ?? ''), ...dataLain.map((d) => rujukan.data.get(d) ?? '')].join('\n');
    const angkaSah = ekstrakAngka(teksRujukan).map((a) => a.nilai);
    const angkaTanpaRujukan = status === 'didukung' && !penanda
      ? angkaTidakBerdasar(p.teks, angkaSah, { tahunSah: rujukan.tahunSah }).map((a) => a.teks.trim())
      : [];
    return { indeks: i, status, buktiSah, buktiDitolak, angkaTanpaRujukan: [...new Set(angkaTanpaRujukan)] };
  });
}

export interface HasilUnsur {
  unsur: UnsurBerbukti[];
  diturunkan: { butir: string; unsur: string }[];
}

/** Unsur `terpenuhi` tanpa bukti sah dan tanpa sumber data (M/T/J) diturunkan menjadi `belum_ada_bukti`. */
export function turunkanUnsur(unsur: UnsurBerbukti[], hasil: HasilBukti[], dataSah: Set<string>): HasilUnsur {
  const sah = new Set(hasil.filter((h) => h.sah).map((h) => h.id));
  const diturunkan: HasilUnsur['diturunkan'] = [];
  const baru = unsur.map((u) => {
    if (u.status !== 'terpenuhi') return u;
    const adaBukti = (u.bukti ?? []).some((b) => sah.has(b));
    const adaData = (u.sumber ?? []).some((s) => !kodeDokumen(s) && dataSah.has(s));
    if (adaBukti || adaData) return u;
    diturunkan.push({ butir: u.butir, unsur: u.unsur });
    return { ...u, status: 'belum_ada_bukti' as const };
  });
  return { unsur: baru, diturunkan };
}

export interface RingkasanKutipan {
  bukti: HasilBukti[];
  paragraf: HasilParagraf[];
  kalimat: { paragraf: number; teks: string; label: LabelKalimat }[];
  unsurDiturunkan: { butir: string; unsur: string }[];
  jumlah: { buktiSah: number; buktiDitolak: number; kalimatTidakDidukung: number };
}

/**
 * Jalankan semua cek kutipan untuk satu keluaran: mengembalikan keluaran yang sudah disesuaikan (unsur diturunkan,
 * penanda disisipkan) dan ringkasan untuk disimpan di versi draf.
 */
export function terapkanCekKutipan<K extends { paragraf: ParagrafBerbukti[]; unsur: UnsurBerbukti[]; bukti?: Bukti[] }>(
  keluaran: K,
  sumber: Map<string, string>,
  data: Map<string, string>,
  tahunSah?: number[],
): { keluaran: K; ringkasan: RingkasanKutipan } {
  const bukti = cekBukti(keluaran.bukti ?? [], sumber);
  const rujukan: RujukanTeks = { bukti: new Map(bukti.filter((b) => b.sah).map((b) => [b.id, b.kutipan])), data, tahunSah };
  const paragraf = cekParagraf(keluaran.paragraf, bukti, rujukan);
  const { unsur, diturunkan } = turunkanUnsur(keluaran.unsur, bukti, new Set(data.keys()));
  const paragrafBaru = [...keluaran.paragraf];
  if (diturunkan.length) {
    paragrafBaru.push({
      teks: diturunkan.map((d) => `[BELUM ADA BUKTI: ${d.unsur}]`).join(' '),
      sumber: [],
      bukti: [],
    });
  }
  const kalimat = keluaran.paragraf.flatMap((p, i) => pecahKalimat(p.teks).map((teks) => ({ paragraf: i, teks, label: paragraf[i].status })));
  return {
    keluaran: { ...keluaran, paragraf: paragrafBaru, unsur },
    ringkasan: {
      bukti,
      paragraf,
      kalimat,
      unsurDiturunkan: diturunkan,
      jumlah: {
        buktiSah: bukti.filter((b) => b.sah).length,
        buktiDitolak: bukti.filter((b) => !b.sah).length,
        kalimatTidakDidukung: kalimat.filter((k) => k.label === 'tidak_didukung').length,
      },
    },
  };
}

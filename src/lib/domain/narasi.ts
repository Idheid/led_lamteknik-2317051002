/**
 * Olah narasi hasil generate (F-13–F-18, F-21). Fungsi murni, tanpa basis data dan tanpa LLM:
 * - penyamaran data pribadi sebelum konteks dikirim ke LLM (NIDN/NIP/NIM/NIK dan nama mahasiswa);
 * - tabel LKPS ke Markdown ringkas untuk prompt;
 * - keluaran terstruktur LLM ke dokumen Tiptap (paragraf membawa atribut `sumber`, F-15), dan sebaliknya ke teks;
 * - pemeriksaan otomatis: panjang (±15%), angka tanpa dasar, sumber, penanda belum ada bukti;
 * - urutan generate per kriteria (IKU, lalu latar belakang dan kebijakan, lalu analisis faktor, terakhir SWOT);
 * - perbandingan dua versi (diff kata) dan status gabungan kriteria.
 */
import { diffWordsWithSpace } from 'diff';
import { angkaTidakBerdasar, ekstrakAngka, formatAngka, hitungKata, statusPanjang } from './teks.ts';
import { gantiLabelTS } from './tahun-akademik.ts';
import { PENANDA_BELUM_ADA_BUKTI, type KeluaranSubBagian, type KonteksSubBagian, type MasalahKeluaran } from './prompt.ts';

// ------------------------------------------------------------------ penyamaran data pribadi

/** Deret 10–20 digit tanpa pemisah: NIDN (10), NIM (umumnya 10), NIK (16), NIP (18). */
const POLA_ID = /(?<!\d|\d[.,])\d{10,20}(?!\d|[.,]\d)/g;
export const PENGGANTI_ID = '[ID disamarkan]';
export const PENGGANTI_NAMA = '[nama disamarkan]';

export function samarkanTeks(teks: string): string {
  return teks.replace(POLA_ID, PENGGANTI_ID);
}

/** Kolom LKPS yang berisi identitas pribadi (tidak dikirim ke LLM). */
export function kolomPribadi(label: string): 'id' | 'nama' | null {
  if (/(^|[^A-Za-z])(NIDN|NIDK|NUPTK|NIP|NIM|NIK)([^A-Za-z]|$)/i.test(label)) return 'id';
  if (/nama\s+(mahasiswa|lulusan|alumni)/i.test(label)) return 'nama';
  return null;
}

// ------------------------------------------------------------------ tabel LKPS ke Markdown

export type SelMentah = string | number | boolean | null | undefined;

export interface TabelMentah {
  kode: string;
  judul: string;
  kolom: { kunci: string; nomor?: string; label: string }[];
  baris: { nomorBaris: number; sel: Record<string, SelMentah> }[];
}

function teksSel(v: SelMentah, ts: number): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return formatAngka(v, 2);
  if (typeof v === 'boolean') return v ? 'ya' : '';
  const t = gantiLabelTS(String(v).replace(/\s+/g, ' ').trim(), ts).replace(/\|/g, '/');
  return t.length > 80 ? `${t.slice(0, 77)}...` : t;
}

/**
 * Tabel ringkas untuk prompt: kolom kosong dibuang, label TS diganti tahun nyata, kolom pribadi disamarkan,
 * paling banyak `maksBaris` baris berisi.
 */
export function tabelKeMarkdown(t: TabelMentah, tsTahunMulai: number, maksBaris = 30): string {
  const isi = t.baris.filter((b) => t.kolom.some((k) => teksSel(b.sel[k.kunci], tsTahunMulai) !== ''));
  const kolom = t.kolom.filter((k) => isi.some((b) => teksSel(b.sel[k.kunci], tsTahunMulai) !== ''));
  if (isi.length === 0 || kolom.length === 0) return '(tabel kosong)';
  const jenis = kolom.map((k) => kolomPribadi(k.label));
  const kepala = kolom.map((k) => gantiLabelTS(k.label.replace(/\s+/g, ' ').trim(), tsTahunMulai).replace(/\|/g, '/') || k.kunci);
  const baris = isi.slice(0, maksBaris).map((b, ib) => kolom.map((k, i) => {
    const v = teksSel(b.sel[k.kunci], tsTahunMulai);
    if (!v || !jenis[i]) return samarkanTeks(v);
    return jenis[i] === 'id' ? PENGGANTI_ID : `Mahasiswa ${ib + 1}`;
  }));
  const md = [
    `| ${kepala.join(' | ')} |`,
    `| ${kepala.map(() => '---').join(' | ')} |`,
    ...baris.map((r) => `| ${r.join(' | ')} |`),
  ];
  if (isi.length > maksBaris) md.push(`(${isi.length - maksBaris} baris lain tidak ditampilkan)`);
  return md.join('\n');
}

// ------------------------------------------------------------------ dokumen Tiptap

export interface MarkTiptap {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface NodeTiptap {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NodeTiptap[];
  text?: string;
  marks?: MarkTiptap[];
}

export interface DokTiptap {
  type: 'doc';
  content: NodeTiptap[];
}

/** Teks dengan *istilah asing* menjadi node teks bermarka miring; **tebal** dibuang tandanya (struktur diatur sistem). */
export function teksKeInline(teks: string): NodeTiptap[] {
  const bersih = teks.replace(/\*\*(.+?)\*\*/g, '$1');
  const hasil: NodeTiptap[] = [];
  const re = /\*([^*\n]+)\*/g;
  let akhir = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bersih)) !== null) {
    if (m.index > akhir) hasil.push({ type: 'text', text: bersih.slice(akhir, m.index) });
    hasil.push({ type: 'text', text: m[1], marks: [{ type: 'italic' }] });
    akhir = m.index + m[0].length;
  }
  if (akhir < bersih.length) hasil.push({ type: 'text', text: bersih.slice(akhir) });
  return hasil.filter((n) => n.text);
}

export interface TabelSistem {
  judul: string;
  kepala: string[];
  baris: string[][];
  sumber: string[];
}

function sel(type: 'tableHeader' | 'tableCell', teks: string): NodeTiptap {
  return { type, content: [{ type: 'paragraph', content: teks ? [{ type: 'text', text: teks }] : [] }] };
}

export function tabelKeNode(t: TabelSistem): NodeTiptap[] {
  return [
    { type: 'paragraph', attrs: { sumber: t.sumber.join(', '), peran: 'judul-tabel' }, content: [{ type: 'text', text: t.judul }] },
    {
      type: 'table',
      content: [
        { type: 'tableRow', content: t.kepala.map((k) => sel('tableHeader', k)) },
        ...t.baris.map((r) => ({ type: 'tableRow', content: r.map((x) => sel('tableCell', x)) })),
      ],
    },
  ];
}

/** Keluaran LLM menjadi dokumen Tiptap. Tabel metrik butir angka (dibuat sistem) diletakkan di awal. */
export function keluaranKeDokumen(out: KeluaranSubBagian, tabel: TabelSistem[] = []): DokTiptap {
  return {
    type: 'doc',
    content: [
      ...tabel.flatMap(tabelKeNode),
      ...out.paragraf.map((p) => ({
        type: 'paragraph',
        attrs: { sumber: (p.sumber ?? []).join(', ') },
        content: teksKeInline(p.teks.trim()),
      })),
    ],
  };
}

export function bacaDokumen(json: unknown): DokTiptap {
  const d = json as DokTiptap | null;
  return d && d.type === 'doc' && Array.isArray(d.content) ? d : { type: 'doc', content: [] };
}

function teksNode(n: NodeTiptap): string {
  if (n.type === 'text') return n.text ?? '';
  if (n.type === 'hardBreak') return '\n';
  return (n.content ?? []).map(teksNode).join(n.type === 'tableRow' ? ' | ' : '');
}

/** Teks polos per blok. `tanpaTabel` membuang tabel dan judul tabel buatan sistem (untuk hitung kata dan cek angka). */
export function blokTeks(doc: DokTiptap, opsi: { tanpaTabel?: boolean } = {}): string[] {
  const hasil: string[] = [];
  const jalan = (n: NodeTiptap) => {
    if (n.type === 'table') {
      if (!opsi.tanpaTabel) for (const r of n.content ?? []) hasil.push((r.content ?? []).map(teksNode).join(' | '));
      return;
    }
    if (n.type === 'paragraph' || n.type === 'heading') {
      if (opsi.tanpaTabel && n.attrs?.peran === 'judul-tabel') return;
      hasil.push(teksNode(n));
      return;
    }
    if (n.type === 'image') {
      if (!opsi.tanpaTabel) hasil.push(`[Gambar: ${String(n.attrs?.title ?? n.attrs?.alt ?? '')}]`);
      return;
    }
    for (const c of n.content ?? []) jalan(c);
  };
  for (const n of doc.content) jalan(n);
  return hasil.filter((t) => t.trim() !== '');
}

export function teksDokumen(doc: DokTiptap, opsi: { tanpaTabel?: boolean } = {}): string {
  return blokTeks(doc, opsi).join('\n\n');
}

/** Paragraf narasi (bukan judul tabel) beserta kode sumbernya. */
export function paragrafBersumber(doc: DokTiptap): { teks: string; sumber: string[] }[] {
  const hasil: { teks: string; sumber: string[] }[] = [];
  const jalan = (n: NodeTiptap, dalamTabel: boolean) => {
    if (n.type === 'table') return;
    if (n.type === 'paragraph') {
      if (dalamTabel || n.attrs?.peran === 'judul-tabel') return;
      const teks = teksNode(n).trim();
      if (teks) {
        const s = typeof n.attrs?.sumber === 'string' ? n.attrs.sumber : '';
        hasil.push({ teks, sumber: s.split(',').map((x) => x.trim()).filter(Boolean) });
      }
      return;
    }
    for (const c of n.content ?? []) jalan(c, dalamTabel);
  };
  for (const n of doc.content) jalan(n, false);
  return hasil;
}

// ------------------------------------------------------------------ pemeriksaan otomatis

/** Angka sah dari seluruh konteks (metrik, tabel, jawaban, potongan, butir, ringkasan IKU). */
export function kumpulkanAngkaSah(k: KonteksSubBagian, nilaiMetrik: number[] = []): number[] {
  const teks = [
    ...k.metrik.map((m) => `${m.nilaiTeks} ${m.keterangan ?? ''}`),
    ...k.tabel.map((t) => `${t.judul}\n${t.markdown}`),
    k.jawabanForm ?? '',
    ...k.potongan.map((p) => `${p.sumber} ${p.teks}`),
    ...k.butir.flatMap((b) => [b.indikator, b.deskriptorSkor4, ...b.unsurSkor4]),
    k.subBagian.instruksi,
    k.ringkasanIku ?? '',
  ];
  const s = new Set<number>(nilaiMetrik.filter((x) => Number.isFinite(x)));
  for (const t of teks) for (const a of ekstrakAngka(t)) s.add(a.nilai);
  return [...s];
}

/** Tahun yang wajar disebut: TS-10 sampai TS+5 (tahun mulai dan akhir tahun akademik). */
export function tahunSah(tsTahunMulai: number): number[] {
  const t: number[] = [];
  for (let y = tsTahunMulai - 10; y <= tsTahunMulai + 6; y++) t.push(y);
  return t;
}

export interface RujukanPeriksa {
  angkaSah: number[];
  tahunSah: number[];
  target: number | null;
  sumberSah: string[];
}

export interface HasilPemeriksaan {
  jumlahKata: number;
  target: number | null;
  panjang: 'pas' | 'kurang' | 'lebih';
  angkaTidakBerdasar: string[];
  masalahSumber: MasalahKeluaran[];
  belumAdaBukti: string[];
}

const RE_BELUM = /\[BELUM ADA BUKTI:\s*([^\]]*)\]/g;

/** Pemeriksaan dokumen (setelah generate atau setelah disunting). Tabel buatan sistem tidak ikut dihitung. */
export function periksaDokumen(doc: DokTiptap, r: RujukanPeriksa, masalahKeluaran: MasalahKeluaran[] = []): HasilPemeriksaan {
  const narasi = teksDokumen(doc, { tanpaTabel: true });
  const jumlahKata = hitungKata(narasi);
  const angka = angkaTidakBerdasar(narasi.replace(RE_BELUM, ''), r.angkaSah, { tahunSah: r.tahunSah }).map((a) => a.teks.trim());
  const sah = new Set(r.sumberSah);
  const masalahSumber: MasalahKeluaran[] = [...masalahKeluaran.filter((m) => m.jenis === 'unsur_hilang')];
  paragrafBersumber(doc).forEach((p, i) => {
    if (p.sumber.length === 0) masalahSumber.push({ jenis: 'tanpa_sumber', pesan: `Paragraf ${i + 1} tidak punya sumber.` });
    for (const s of p.sumber) {
      if (!sah.has(s)) masalahSumber.push({ jenis: 'sumber_tidak_dikenal', pesan: `Paragraf ${i + 1} mengutip sumber yang tidak ada di konteks: ${s}.` });
    }
  });
  const belumAdaBukti = [...narasi.matchAll(RE_BELUM)].map((m) => m[1].trim());
  return {
    jumlahKata,
    target: r.target,
    panjang: r.target ? statusPanjang(jumlahKata, r.target) : 'pas',
    angkaTidakBerdasar: [...new Set(angka)],
    masalahSumber,
    belumAdaBukti,
  };
}

export { PENANDA_BELUM_ADA_BUKTI };

// ------------------------------------------------------------------ urutan generate dan ringkasan IKU

export interface SubUntukUrutan {
  kode: string;
  tipe: string;
  urutan: number;
}

function peringkat(s: SubUntukUrutan): number {
  if (s.tipe !== 'bersama') return 0;
  const akhir = s.kode.split('-').pop();
  if (akhir === 'LB' || akhir === 'KEB') return 1;
  if (akhir === 'AF') return 2;
  if (akhir === 'SWOT') return 3;
  return 1;
}

/** Sub-bagian yang di-generate, berurutan: IKU/narasi, lalu LB dan KEB, lalu AF, terakhir SWOT. */
export function urutkanUntukGenerate<T extends SubUntukUrutan>(sub: T[]): T[] {
  return sub
    .filter((s) => s.tipe !== 'data' && s.tipe !== 'otomatis')
    .map((s, i) => ({ s, i }))
    .sort((a, b) => peringkat(a.s) - peringkat(b.s) || a.s.urutan - b.s.urutan || a.i - b.i)
    .map((x) => x.s);
}

export function perluRingkasanIku(kodeSub: string): boolean {
  const akhir = kodeSub.split('-').pop();
  return akhir === 'AF' || akhir === 'SWOT';
}

/** Ringkasan hasil IKU untuk prompt analisis faktor dan SWOT (2 kalimat pertama per sub-bagian + status unsur). */
export function ringkasIku(
  item: { judul: string; teks: string; unsur?: { status: string }[] }[],
  maksKarakter = 3500,
): string {
  const baris = item.filter((x) => x.teks.trim()).map((x) => {
    const kalimat = x.teks.replace(RE_BELUM, '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g) ?? [x.teks];
    const u = x.unsur ?? [];
    const status = u.length
      ? ` (unsur skor 4: ${u.filter((y) => y.status === 'terpenuhi').length} terpenuhi, ${u.filter((y) => y.status === 'sebagian').length} sebagian, ${u.filter((y) => y.status === 'belum_ada_bukti').length} belum ada bukti)`
      : '';
    return `- ${x.judul}: ${kalimat.slice(0, 2).map((k) => k.trim()).join(' ')}${status}`;
  });
  const teks = baris.join('\n');
  return teks.length > maksKarakter ? `${teks.slice(0, maksKarakter - 3)}...` : teks;
}

// ------------------------------------------------------------------ perbandingan versi dan status

export interface PotonganDiff {
  jenis: 'sama' | 'hapus' | 'tambah';
  teks: string;
}

/** Perbandingan per kata; teks lama yang dihapus ditampilkan dicoret, teks baru disorot. */
export function bandingkanTeks(lama: string, baru: string): PotonganDiff[] {
  return diffWordsWithSpace(lama, baru).map((c) => ({
    jenis: c.added ? 'tambah' : c.removed ? 'hapus' : 'sama',
    teks: c.value,
  }));
}

export type StatusIsi = 'belum' | 'draf' | 'disunting' | 'selesai';

/** Status kriteria dari status sub-bagiannya. */
export function statusGabungan(status: StatusIsi[]): StatusIsi {
  if (status.length === 0 || status.every((s) => s === 'belum')) return 'belum';
  if (status.every((s) => s === 'selesai')) return 'selesai';
  if (status.some((s) => s === 'disunting' || s === 'selesai')) return 'disunting';
  return 'draf';
}

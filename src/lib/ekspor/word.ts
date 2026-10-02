import {
  AlignmentType, ImageRun, LineRuleType, Paragraph, PatchType, SimpleField, Table, TableCell, TableRow, TextRun, WidthType,
  type ParagraphChild, type IPatch,
} from 'docx';
import {
  adalahJudulTabel, bersihkanJudul, nomorBab, skalaGambar, TABEL_TEMPLATE, ukuranGambar,
} from '@/lib/domain/ekspor';
import type { DokTiptap, NodeTiptap } from '@/lib/domain/narasi';

/**
 * Tiptap JSON → isi placeholder template LEDPS (pustaka docx, patchDocument). Paragraf rata kiri-kanan, Arial 11,
 * spasi 1,15, sejajar dengan instruksi yang digantikan; istilah asing miring; tabel berjudul di atas dan bernomor per
 * bab (baris judul kolom tebal dan diulang di halaman berikut); gambar unggahan utuh, rasio asli, lebar maks. 17,1 cm,
 * judul di bawah. Penanda sumber (atribut `sumber`) tidak ikut diekspor. Judul tabel/gambar memuat field TC sehingga
 * Daftar Tabel dan Daftar Gambar (field TOC \f t / \f g) terisi saat field diperbarui di Word.
 */

const HURUF = { font: 'Arial', size: 22 } as const; // Arial 11
const SPASI = { line: 276, lineRule: LineRuleType.AUTO, after: 120 } as const; // 1,15

export interface GambarDibaca {
  data: Buffer;
}

export interface KonteksWord {
  /** Nomor tabel/gambar terakhir per bab (diperbarui saat konversi). */
  nomorTabel: Map<number, number>;
  nomorGambar: Map<number, number>;
  bacaGambar: (dokumenId: string) => Promise<GambarDibaca | null>;
  masalah: string[];
  jumlah: { tabel: number; gambar: number; barisTabel: number };
}

export function konteksBaru(bacaGambar: KonteksWord['bacaGambar']): KonteksWord {
  return {
    nomorTabel: new Map(Object.entries(TABEL_TEMPLATE).map(([k, v]) => [Number(k), v])),
    nomorGambar: new Map(),
    bacaGambar,
    masalah: [],
    jumlah: { tabel: 0, gambar: 0, barisTabel: 0 },
  };
}

function berikut(peta: Map<number, number>, bab: number | null, kunciTanpaBab = 0): string {
  const k = bab ?? kunciTanpaBab;
  const n = (peta.get(k) ?? 0) + 1;
  peta.set(k, n);
  return bab === null ? String(n) : `${bab}.${n}`;
}

function teks(n: NodeTiptap): string {
  if (n.type === 'text') return n.text ?? '';
  return (n.content ?? []).map(teks).join('');
}

function run(n: NodeTiptap, tambahan: { size?: number; bold?: boolean } = {}): ParagraphChild[] {
  if (n.type === 'hardBreak') return [new TextRun({ ...HURUF, ...tambahan, break: 1 })];
  if (n.type !== 'text' || !n.text) return [];
  const marks = new Set((n.marks ?? []).map((m) => m.type));
  return [new TextRun({ text: n.text, ...HURUF, ...tambahan, bold: tambahan.bold || marks.has('bold') || undefined, italics: marks.has('italic') || undefined })];
}

function inline(n: NodeTiptap, tambahan: { size?: number; bold?: boolean } = {}): ParagraphChild[] {
  return (n.content ?? []).flatMap((c) => run(c, tambahan));
}

function paragrafNarasi(children: ParagraphChild[], indent: number, opsi: { hanging?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: SPASI,
    indent: opsi.hanging ? { left: indent + opsi.hanging, hanging: opsi.hanging } : { left: indent },
    children,
  });
}

function judul(jenis: 'Tabel' | 'Gambar', nomor: string, isi: string, indent: number, sebelum: boolean): Paragraph {
  const label = `${jenis} ${nomor}. ${isi}`;
  return new Paragraph({
    keepNext: sebelum,
    alignment: AlignmentType.CENTER,
    indent: { left: indent },
    spacing: sebelum ? { before: 120, after: 60 } : { before: 60, after: 160 },
    children: [
      new TextRun({ text: label, ...HURUF }),
      // entri tersembunyi untuk Daftar Tabel / Daftar Gambar
      new SimpleField(`TC "${label.replace(/"/g, "'")}" \\f ${jenis === 'Tabel' ? 't' : 'g'} \\l 1`),
    ],
  });
}

function tabel(n: NodeTiptap, indent: number, ctx: KonteksWord): Table {
  const baris = n.content ?? [];
  ctx.jumlah.barisTabel += baris.length;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    indent: { size: indent, type: WidthType.DXA },
    rows: baris.map((r) => {
      const kepala = (r.content ?? []).some((c) => c.type === 'tableHeader');
      return new TableRow({
        tableHeader: kepala,
        cantSplit: true,
        children: (r.content ?? []).map((c) => {
          const par = (c.content ?? []).filter((p) => p.type === 'paragraph');
          return new TableCell({
            children: par.length
              ? par.map((p) => new Paragraph({ spacing: { line: 240, lineRule: LineRuleType.AUTO }, children: inline(p, { size: 20, bold: kepala }) }))
              : [new Paragraph({ children: [] })],
          });
        }),
      });
    }),
  });
}

/** Ubah satu dokumen Tiptap menjadi anak-anak placeholder. */
export async function dokumenKeWord(doc: DokTiptap, o: { bagianKode: string; indent: number; label: string }, ctx: KonteksWord) {
  const bab = nomorBab(o.bagianKode);
  const hasil: (Paragraph | Table)[] = [];
  const isi = doc.content;
  for (let i = 0; i < isi.length; i++) {
    const n = isi[i];
    if (n.type === 'paragraph') {
      if (adalahJudulTabel(n) && isi[i + 1]?.type === 'table') {
        ctx.jumlah.tabel += 1;
        hasil.push(judul('Tabel', berikut(ctx.nomorTabel, bab), bersihkanJudul(teks(n), 'Tabel'), o.indent, true));
        hasil.push(tabel(isi[i + 1], o.indent, ctx));
        i += 1;
        continue;
      }
      if (!teks(n).trim() && !(n.content ?? []).some((c) => c.type === 'hardBreak')) continue;
      hasil.push(paragrafNarasi(inline(n), o.indent));
    } else if (n.type === 'bulletList' || n.type === 'orderedList') {
      let k = Number(n.attrs?.start ?? 1);
      for (const li of n.content ?? []) {
        const penanda = n.type === 'bulletList' ? '•\t' : `${k++}.\t`;
        const par = (li.content ?? []).filter((p) => p.type === 'paragraph');
        par.forEach((p, j) => hasil.push(paragrafNarasi([...(j === 0 ? [new TextRun({ text: penanda, ...HURUF })] : []), ...inline(p)], o.indent, { hanging: 360 })));
      }
    } else if (n.type === 'table') {
      ctx.masalah.push(`${o.label}: tabel tanpa judul.`);
      hasil.push(tabel(n, o.indent, ctx));
    } else if (n.type === 'image') {
      const dokumenId = String(n.attrs?.dokumenId ?? /\/api\/dokumen\/([^/]+)\/berkas/.exec(String(n.attrs?.src ?? ''))?.[1] ?? '');
      const g = dokumenId ? await ctx.bacaGambar(dokumenId) : null;
      const u = g ? ukuranGambar(g.data) : null;
      if (!g || !u) {
        ctx.masalah.push(`${o.label}: gambar tidak bisa dibaca.`);
        continue;
      }
      const s = skalaGambar(u.lebar, u.tinggi);
      ctx.jumlah.gambar += 1;
      hasil.push(new Paragraph({
        keepNext: true,
        alignment: AlignmentType.CENTER,
        indent: { left: o.indent },
        spacing: { before: 120 },
        children: [new ImageRun({ type: u.jenis, data: g.data, transformation: { width: s.lebar, height: s.tinggi } })],
      }));
      const judulGambar = String(n.attrs?.title ?? n.attrs?.alt ?? '').trim();
      if (!judulGambar) ctx.masalah.push(`${o.label}: gambar tanpa judul.`);
      hasil.push(judul('Gambar', berikut(ctx.nomorGambar, bab), bersihkanJudul(judulGambar, 'Gambar'), o.indent, false));
    }
  }
  if (hasil.length === 0) hasil.push(paragrafNarasi([], o.indent));
  return hasil;
}

export function patchIsi(children: (Paragraph | Table)[]): IPatch {
  return { type: PatchType.DOCUMENT, children };
}

/** Isi Daftar Tabel / Daftar Gambar: field TOC dari entri TC yang ditanam di judul tabel/gambar. */
export function patchDaftar(jenis: 't' | 'g'): IPatch {
  return {
    type: PatchType.DOCUMENT,
    children: [new Paragraph({
      children: [new SimpleField(`TOC \\h \\z \\f ${jenis}`, 'Daftar diperbarui otomatis saat dokumen dibuka di Microsoft Word (pilih Yes/Ya saat diminta memperbarui field).')],
    })],
  };
}

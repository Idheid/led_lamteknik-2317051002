import type { ReactNode } from "react";
import type { DokTiptap } from "@/modules/led/domain/narasi";

interface Simpul {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
  content?: Simpul[];
}

function teks(s: Simpul, k: number): ReactNode {
  let isi: ReactNode = s.text ?? "";
  for (const m of s.marks ?? []) {
    if (m.type === "bold") isi = <strong>{isi}</strong>;
    else if (m.type === "italic") isi = <em>{isi}</em>;
  }
  return <span key={k}>{isi}</span>;
}

function anak(s: Simpul): ReactNode[] {
  return (s.content ?? []).map((x, i) => simpul(x, i));
}

function simpul(s: Simpul, k: number): ReactNode {
  switch (s.type) {
    case "text": return teks(s, k);
    case "paragraph": return <p key={k} className={s.attrs?.peran === "judul-tabel" ? "font-medium" : undefined}>{anak(s)}</p>;
    case "heading": return <p key={k} className="font-semibold">{anak(s)}</p>;
    case "bulletList": return <ul key={k} className="list-disc pl-5">{anak(s)}</ul>;
    case "orderedList": return <ol key={k} className="list-decimal pl-5">{anak(s)}</ol>;
    case "listItem": return <li key={k}>{anak(s)}</li>;
    case "hardBreak": return <br key={k} />;
    case "table": return <div key={k} className="overflow-x-auto"><table className="w-full border-collapse text-xs"><tbody>{anak(s)}</tbody></table></div>;
    case "tableRow": return <tr key={k}>{anak(s)}</tr>;
    case "tableHeader": return <th key={k} className="border px-2 py-1 text-left font-medium">{anak(s)}</th>;
    case "tableCell": return <td key={k} className="border px-2 py-1 align-top">{anak(s)}</td>;
    case "image": return <p key={k} className="text-xs italic text-muted-foreground">[Gambar{s.attrs?.title ? `: ${String(s.attrs.title)}` : ""}]</p>;
    default: return <span key={k}>{anak(s)}</span>;
  }
}

/**
 * Narasi hanya baca (revisi 31 Okt 2026): isi sub-bagian ditampilkan apa adanya di halaman Penilaian, tanpa editor
 * dan tanpa perlu mengunduh Word.
 */
export function NarasiBaca({ isi }: { isi: DokTiptap | null }) {
  if (!isi || isi.content.length === 0) return <p className="text-sm italic text-muted-foreground">Belum ada narasi.</p>;
  return <div className="flex flex-col gap-2 text-sm leading-relaxed">{(isi.content as unknown as Simpul[]).map((x, i) => simpul(x, i))}</div>;
}

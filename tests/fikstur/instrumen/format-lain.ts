import JSZip from "jszip";

/**
 * Template LEDPS 2025 tiruan yang judulnya hanya memakai gaya "Heading 1/2/3" (perbaikan 2 Nov 2026, I3/I5), seperti
 * template baru yang formatnya tidak dikenali aturan bawaan:
 * - "I. Judul Besar" dan "Title" → Heading 1 (BAB, KATA PENGANTAR, LAMPIRAN, ...)
 * - "II. Sub Judul" → Heading 2 (bagian Bab II dan "Kriteria Akreditasi")
 * - "C.1. ..." (judul kriteria) → Heading 3
 * - "heading 2/3" lama (judul sub-bagian bernomor) → Body Text; penomoran Word paragraf tetap.
 * Isi, kotak isian, dan penomoran tidak diubah, jadi strukturnya sama dengan template resmi bila judulnya dipetakan.
 * Gaya diganti langsung di XML (JSZip), bukan dibuat ulang dengan pustaka `docx`, supaya kotak isian dan penomoran
 * tetap persis.
 */
export const GANTI_GAYA: Record<string, string> = {
  IJudulBesar: "Heading1",
  Title: "Heading1",
  IISubJudul: "Heading2",
  IISubJudulStrukturLED: "Heading2",
  C1DiferensiasiMisiVisi: "Heading3",
  Heading2: "BodyText",
  Heading3: "BodyText",
};

/** Pemetaan yang membuat template ini terbaca sama dengan template resmi. */
export const PEMETAAN_FORMAT_LAIN = { gaya: { "heading 1": "bab", "heading 2": "bagian2", "heading 3": "kriteria" } } as const;

export async function templateFormatLain(resmi: Buffer | Uint8Array): Promise<Buffer> {
  const zip = await JSZip.loadAsync(resmi);
  const doc = await zip.file("word/document.xml")!.async("string");
  zip.file("word/document.xml", doc.replace(/<w:pStyle w:val="([^"]+)"\/>/g, (m, id: string) => (GANTI_GAYA[id] ? `<w:pStyle w:val="${GANTI_GAYA[id]}"/>` : m)));
  // tanggal tetap supaya isi zip (dan SHA-256) sama setiap kali dibuat
  const tetap = new Date("2026-11-02T00:00:00Z");
  zip.forEach((_, f) => { f.date = tetap; });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

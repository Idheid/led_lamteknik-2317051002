import JSZip from "jszip";
import { adaKotak, gaya, pecahBody, teksElemen } from "@/lib/ekspor/xml";
import type { ParagrafTemplate } from "@/lib/domain/template-led";

/** Paragraf tingkat atas Template LEDPS (.docx) beserta nama gaya, penomoran, dan tanda kotak isian. */
export async function bacaParagrafTemplate(isi: Buffer | Uint8Array): Promise<ParagrafTemplate[]> {
  const zip = await JSZip.loadAsync(isi);
  const doc = await zip.file("word/document.xml")?.async("string");
  if (!doc) throw new Error("Berkas bukan dokumen Word (.docx) yang sah.");
  const styles = (await zip.file("word/styles.xml")?.async("string")) ?? "";
  const namaGaya = new Map(
    [...styles.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<w:name w:val="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  return pecahBody(doc).elemen.map((e) => {
    const ppr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(e.xml)?.[0] ?? "";
    const g = gaya(e.xml);
    return {
      teks: e.tag === "tbl" ? "" : teksElemen(e.xml),
      gaya: namaGaya.get(g) ?? g ?? "",
      numId: /<w:numId w:val="(\d+)"/.exec(ppr)?.[1] ?? null,
      ilvl: Number(/<w:ilvl w:val="(\d+)"/.exec(ppr)?.[1] ?? 0),
      kotak: adaKotak(e.xml),
      tabel: e.tag === "tbl",
    };
  });
}

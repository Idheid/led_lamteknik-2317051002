import { getDocumentProxy } from "unpdf";
import type { HalamanTeks } from "@/modules/led/domain/tata-letak-pdf";

/** Baca teks dan posisi item per halaman PDF. `halaman` (mulai 1) membatasi halaman yang dibaca. */
export async function bacaHalamanPdf(isi: Buffer | Uint8Array, halaman?: number[]): Promise<{ jumlah: number; halaman: HalamanTeks[] }> {
  const pdf = await getDocumentProxy(new Uint8Array(isi));
  const nomor = halaman?.filter((n) => n >= 1 && n <= pdf.numPages) ?? Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const hasil: HalamanTeks[] = [];
  for (const n of nomor) {
    const page = await pdf.getPage(n);
    const isiTeks = await page.getTextContent();
    hasil.push({
      nomor: n,
      item: isiTeks.items.flatMap((it) => ("str" in it && it.str.trim()
        ? [{ x: it.transform[4], y: it.transform[5], lebar: it.width, teks: it.str }]
        : [])),
    });
  }
  await pdf.cleanup();
  return { jumlah: pdf.numPages, halaman: hasil };
}

/** Teks polos per halaman (untuk mendeteksi letak tabel bobot). */
export async function teksPerHalaman(isi: Buffer | Uint8Array): Promise<string[]> {
  const { halaman } = await bacaHalamanPdf(isi);
  return halaman.map((h) => {
    const baris = [...h.item].sort((a, b) => b.y - a.y || a.x - b.x);
    return baris.map((i) => i.teks).join("\n");
  });
}

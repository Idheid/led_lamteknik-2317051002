import type { Metrik } from "@/modules/led/domain/metrik-lkps";
import { formatAngka, formatPersen, formatRupiah } from "@/modules/bersama/domain/teks";

/** Nilai metrik untuk tampilan dan prompt (format Indonesia). */
export function formatMetrik(m: Pick<Metrik, "nilai" | "satuan">): string {
  if (m.nilai === null) return "—";
  switch (m.satuan) {
    case "persen": return formatPersen(m.nilai, 2);
    case "rupiah": return formatRupiah(m.nilai);
    case "sks": return `${formatAngka(m.nilai, 2)} sks`;
    case "tahun": return `${formatAngka(m.nilai, 2)} tahun`;
    case "bulan": return `${formatAngka(m.nilai, 2)} bulan`;
    case "rasio": return formatAngka(m.nilai, 4);
    default: return formatAngka(m.nilai, 2);
  }
}

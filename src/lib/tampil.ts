import type { Metrik } from "@/lib/domain/metrik-lkps";
import { formatAngka, formatPersen, formatRupiah } from "@/lib/domain/teks";

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

export function formatUkuran(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${formatAngka(byte / 1024, 0)} KB`;
  return `${formatAngka(byte / 1024 / 1024, 1)} MB`;
}

export const fmtWaktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/** Status proses latar yang masih berjalan (halaman disegarkan berkala selama ada yang berjalan). */
export const STATUS_BERJALAN = ["diunggah", "diproses"];

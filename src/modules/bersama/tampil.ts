import { formatAngka } from "@/modules/bersama/domain/teks";

export function formatUkuran(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${formatAngka(byte / 1024, 0)} KB`;
  return `${formatAngka(byte / 1024 / 1024, 1)} MB`;
}

export const fmtWaktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/** Status proses latar yang masih berjalan (halaman disegarkan berkala selama ada yang berjalan). */
export const STATUS_BERJALAN = ["diunggah", "diproses"];

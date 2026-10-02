import type { MasalahLkps, TabelBaca } from "./jenis";
import { KOLOM_WAJIB, SHEET_WAJIB, sheetBerlakuUntuk } from "./struktur";

const terisi = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

/**
 * Validasi isi tabel LKPS (Excel maupun hasil PDF):
 * - tabel wajib untuk jenjang yang belum diisi sama sekali;
 * - baris yang terisi sebagian (ada kolom wajib yang kosong).
 * Semua berupa peringatan; metrik tetap dihitung dari data yang ada.
 */
export function periksaIsi(tabel: TabelBaca[], jenjang: string): MasalahLkps[] {
  const hasil: MasalahLkps[] = [];
  const ada = new Set(tabel.map((t) => t.sheet));
  for (const sheet of SHEET_WAJIB) {
    if (!sheetBerlakuUntuk(sheet, jenjang) || !ada.has(sheet)) continue;
    const t = tabel.find((x) => x.sheet === sheet) as TabelBaca;
    const wajib = (KOLOM_WAJIB[sheet] ?? []).filter((k) => t.kolom.some((c) => c.kunci === k));
    if (wajib.length === 0) continue;
    const label = (k: string) => t.kolom.find((c) => c.kunci === k)?.label ?? k;
    const barisIsi = t.baris.filter((b) => wajib.some((k) => terisi(b.sel[k])));
    if (barisIsi.length === 0) {
      hasil.push({ tingkat: "peringatan", sheet, pesan: `Tabel ${t.kode ?? sheet} belum diisi.` });
      continue;
    }
    for (const b of barisIsi) {
      for (const k of wajib) {
        if (!terisi(b.sel[k])) {
          hasil.push({
            tingkat: "peringatan",
            sheet,
            baris: b.nomorBaris,
            kolom: k,
            pesan: `Sel ${k}${b.nomorBaris} (${label(k)}) kosong. Isi 0 bila memang tidak ada.`,
          });
        }
      }
    }
  }
  return hasil;
}

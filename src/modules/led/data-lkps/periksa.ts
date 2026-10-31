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

/**
 * Persentase LKPS terisi (revisi 22 Okt 2026; Pak Tris: "data LKPS-nya sudah berapa persen diisi"). Untuk setiap
 * tabel wajib jenjang ini: sel wajib terisi dibagi sel wajib pada baris yang berisi data; tabel yang belum diisi
 * sama sekali bernilai 0. Hasil = rata-rata semua tabel wajib (0–100, dibulatkan).
 */
export function persenTerisi(tabel: Pick<TabelBaca, "sheet" | "baris">[], jenjang: string): { persen: number; tabelTerisi: number; tabelWajib: number } {
  const wajibJenjang = SHEET_WAJIB.filter((s) => sheetBerlakuUntuk(s, jenjang) && (KOLOM_WAJIB[s] ?? []).length > 0);
  if (wajibJenjang.length === 0) return { persen: 0, tabelTerisi: 0, tabelWajib: 0 };
  let jumlah = 0;
  let terisiTabel = 0;
  for (const sheet of wajibJenjang) {
    const t = tabel.find((x) => x.sheet === sheet);
    const kolom = KOLOM_WAJIB[sheet] ?? [];
    const barisIsi = (t?.baris ?? []).filter((b) => kolom.some((k) => terisi(b.sel[k])));
    if (barisIsi.length === 0) continue;
    terisiTabel += 1;
    const sel = barisIsi.length * kolom.length;
    const isi = barisIsi.reduce((n, b) => n + kolom.filter((k) => terisi(b.sel[k])).length, 0);
    jumlah += isi / sel;
  }
  return { persen: Math.round((jumlah / wajibJenjang.length) * 100), tabelTerisi: terisiTabel, tabelWajib: wajibJenjang.length };
}

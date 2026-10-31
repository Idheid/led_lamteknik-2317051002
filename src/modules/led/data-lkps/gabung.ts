import { JENJANG_SHEET, kodeTabelDariSheet, sheetBerlakuUntuk } from "@/modules/led/data-lkps/struktur";

/**
 * Data LKPS dari banyak berkas (revisi 31 Okt 2026, Pak Tris: LKPS dicetak PDF per tabel lalu diunggah ke LED tanpa
 * menunggu LKPS selesai). Tabel dari semua berkas sumber digabung; bila satu tabel ada di dua berkas, berkas terbaru
 * yang dipakai.
 */

const URUTAN_SHEET = new Map(Object.keys(JENJANG_SHEET).map((s, i) => [s, i]));

/** Gabung tabel dari berkas sumber (diurutkan terbaru dulu): satu tabel per sheet, urut seperti template LKPS. */
export function gabungTabelLkps<T extends { sheet: string }>(berkasTerbaruDulu: { tabel: T[] }[]): T[] {
  const dipilih = new Map<string, T>();
  for (const b of berkasTerbaruDulu) {
    for (const t of b.tabel) if (!dipilih.has(t.sheet)) dipilih.set(t.sheet, t);
  }
  return [...dipilih.values()].sort((a, b) => (URUTAN_SHEET.get(a.sheet) ?? 999) - (URUTAN_SHEET.get(b.sheet) ?? 999));
}

/**
 * Tabel LKPS yang berlaku untuk jenjang: yang sudah terbaca dan yang belum ada. Label = kode tabel ("4.a"); bila beberapa
 * sheet berbagi kode (2a1, 2a2, 2a3 = Tabel 2.a), nama sheet ikut disebut supaya bisa dibedakan.
 */
export function ringkasTabelTerbaca(sheetTerbaca: string[], jenjang: string): { terbaca: string[]; belum: string[] } {
  const ada = new Set(sheetTerbaca);
  const berlaku = Object.keys(JENJANG_SHEET).filter((s) => sheetBerlakuUntuk(s, jenjang));
  const jumlah = new Map<string, number>();
  for (const s of berlaku) jumlah.set(kodeTabelDariSheet(s), (jumlah.get(kodeTabelDariSheet(s)) ?? 0) + 1);
  const label = (s: string) => ((jumlah.get(kodeTabelDariSheet(s)) ?? 0) > 1 ? `${kodeTabelDariSheet(s)} (${s})` : kodeTabelDariSheet(s));
  return {
    terbaca: berlaku.filter((s) => ada.has(s)).map(label),
    belum: berlaku.filter((s) => !ada.has(s)).map(label),
  };
}

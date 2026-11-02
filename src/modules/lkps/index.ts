/**
 * Modul LKPS (Laporan Kinerja Program Studi), dikerjakan Ghalib. Kerangka dibuat 31 Okt 2026; isinya belum ada.
 *
 * Berkas ini menjadi "pintu" modul LKPS: fungsi yang boleh dipakai modul lain (terutama modul LED, yang nanti membaca
 * tabel LKPS langsung dari basis data tanpa unggah ulang) diekspor dari sini. Contoh rencana:
 *   export { tabelLkpsUntukProdi } from "./data/tabel";
 * Lihat README.md di folder ini untuk aturan folder dan batas modul.
 */
export const MODUL_LKPS = { kode: "lkps", nama: "Laporan Kinerja Program Studi", siap: false } as const;

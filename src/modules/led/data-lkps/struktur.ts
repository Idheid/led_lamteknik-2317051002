/**
 * Struktur template LKPS LAM Teknik 2025 (Pasca Terakreditasi Pertama dan Unggul).
 * Keberlakuan sheet per jenjang disalin dari sheet "Daftar Tabel" template (tanda √ per jenjang).
 * Diuji terhadap berkas template asli di tests/integrasi/lkps.test.ts.
 */

const SEMUA = ["D1", "D2", "D3", "S1", "STr", "S2", "S2Tr", "S3", "S3Tr", "PPI"];
const TANPA_PPI = SEMUA.filter((j) => j !== "PPI");

/** Sheet tabel → jenjang yang wajib mengisinya (sheet "Daftar Tabel"). */
export const JENJANG_SHEET: Record<string, string[]> = {
  "1": SEMUA, "2a1": SEMUA, "2a2": SEMUA, "2a3": SEMUA, "2b": SEMUA, "3a1": SEMUA, "3a2": ["PPI"], "3a3": SEMUA,
  "3a4": ["S1", "STr"], "3a5": ["S1", "STr"], "3b": SEMUA, "3c": SEMUA, "4a": SEMUA, "4b": SEMUA, "4c": SEMUA,
  "4d": ["S1", "S2", "S3", "PPI"], "4e": ["D1", "D2", "D3", "STr", "S2Tr", "S3Tr", "PPI"],
  "4f-1": SEMUA, "4f-2": SEMUA, "4f-3": SEMUA, "4f-4": SEMUA, "4g": ["D1", "D2", "D3", "STr", "S2Tr", "S3Tr"],
  "4h": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr"], "4i": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr"], "4j": SEMUA,
  "4k": ["PPI"], "5a": SEMUA, "5b": SEMUA, "5c": SEMUA, "6a": SEMUA, "6b": SEMUA, "6c1": TANPA_PPI,
  "6c2": ["D1", "D2", "D3", "S1", "STr"], "6d": SEMUA, "6e1": ["S1", "S2", "S3"], "6e2": ["STr", "S2Tr", "S3Tr"],
  "6e3-1": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr"], "6e3-2": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr"],
  "6e3-3": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr"], "6e3-4": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr"],
  "6e4": ["D1", "D2", "D3", "STr", "S2Tr", "S3Tr"], "6f1": ["D1", "D2", "D3", "S1", "STr", "PPI"],
  "6f2": ["D1", "D2", "D3", "S1", "STr", "S2", "S2Tr"], "6g1": ["D1", "D2", "D3", "S1", "STr", "S2", "S2Tr", "PPI"],
  "6g2": ["D1", "D2", "D3", "S1", "STr", "S2", "S2Tr", "PPI"], "6h1": ["S1", "STr", "S2", "S2Tr", "S3", "S3Tr", "PPI"],
  "6h2": ["S2", "S2Tr", "S3", "S3Tr"], "6i": SEMUA, "7a": SEMUA, "7b": SEMUA,
};

/**
 * Kolom wajib per sheet untuk pemeriksaan "sel kosong". Kolom pilihan (tanda V salah satu tingkat, bukti/tautan,
 * kolom khusus vokasi atau PPI, sertifikat) tidak diperiksa supaya peringatan tetap bermakna.
 */
export const KOLOM_WAJIB: Record<string, string[]> = {
  "1": ["C"], "2a1": ["B", "F", "H", "I"], "2a2": ["B", "F", "H", "I"], "2a3": ["B", "F", "H", "I"],
  "2b": ["G", "H", "I"], "3a1": ["B", "C", "D", "F", "G", "H"], "3a3": ["B", "C", "D", "E"], "3a4": ["B", "C", "D"],
  "3a5": ["B", "C", "D", "E", "F"], "3b": ["C", "D", "E"], "3c": ["C", "D", "E"], "4a": ["B", "C", "D", "E", "H", "K"],
  "4b": ["B", "L"], "4c": ["B", "D", "G", "H", "I"], "4d": ["C", "D", "E"], "4e": ["C", "D", "E"],
  "4f-1": ["B", "C", "D"], "4f-2": ["B", "C", "D"], "4f-3": ["B", "C"], "4f-4": ["B", "C", "D"], "4g": ["B", "C", "D"],
  "4h": ["B", "C", "D", "E"], "4i": ["B", "C", "D"], "4j": ["B", "D", "I"], "5a": ["B", "C", "D"], "5b": ["B", "C", "D"],
  "5c": ["B", "C", "D"], "6a": ["B", "D", "E", "F"], "6b": ["C", "D", "E", "F"], "6c1": ["B", "C", "G"],
  "6c2": ["B", "C", "G"], "6d": ["B", "C", "D", "E"], "6e1": ["C", "D", "E"], "6e2": ["C", "D", "E"],
  "6e3-1": ["B", "C", "D"], "6e3-2": ["B", "C", "D"], "6e3-3": ["B", "C", "D"], "6e3-4": ["B", "C", "D"],
  "6f1": ["B", "C"], "6f2": ["B", "C", "D", "E", "F"], "6g1": ["B", "C", "D", "E", "F", "G"], "6g2": ["C", "D", "E", "F"],
  "6h1": ["B", "C", "D", "E", "F"], "6h2": ["B", "C", "D", "E", "F"], "6i": ["B", "C", "D", "E", "F"], "7a": ["C", "D"], "7b": ["C"],
};

/** Sheet yang harus ada di berkas (semua sheet tabel template). */
export const SHEET_WAJIB = Object.keys(JENJANG_SHEET);

/** Sheet non-tabel yang tidak dibaca sebagai tabel. */
export const KECUALI_SHEET = new Set(["Menu", "Daftar Tabel", "PS", "PSPPI"]);

export function sheetBerlakuUntuk(sheet: string, jenjang: string): boolean {
  const j = JENJANG_SHEET[sheet];
  return j ? j.includes(jenjang) : false;
}

/**
 * Nama sheet → kode tabel seperti di seed instrumen ("4a" → "4.a", "2a1" → "2.a", "4f-3" → "4.f", "6c1" → "6.c.1",
 * "3a1" → "3.a.1", "6e3-2" → "6.e.3", "1" → "1").
 */
export function kodeTabelDariSheet(sheet: string): string {
  if (/^2a\d$/.test(sheet)) return "2.a";
  const dasar = sheet.replace(/-\d+$/, "");
  const m = /^(\d)([a-z])?(\d)?$/.exec(dasar);
  if (!m) return sheet;
  return [m[1], m[2], m[3]].filter(Boolean).join(".");
}

/** Pola label blok "Diisi oleh ... Program X" per jenjang untuk sheet berblok (6.d, 6.f.1). */
const POLA_BLOK: Record<string, RegExp> = {
  D1: /Diploma Satu/i,
  D2: /Diploma Dua/i,
  D3: /Diploma Tiga/i,
  S1: /Program Sarjana(?! Terapan)/i,
  STr: /Sarjana Terapan/i,
  S2: /Magister/i,
  S2Tr: /Magister/i,
  S3: /Doktor/i,
  S3Tr: /Doktor/i,
  PPI: /Profesi Insinyur Moda Pembelajaran Reguler/i,
};

/** Indeks blok yang sesuai jenjang (null bila tidak ada blok untuk jenjang itu). */
export function pilihBlokJenjang(label: (string | null)[], jenjang: string): number | null {
  const pola = POLA_BLOK[jenjang];
  if (!pola) return null;
  const i = label.findIndex((l) => l !== null && pola.test(l));
  return i >= 0 ? i : null;
}

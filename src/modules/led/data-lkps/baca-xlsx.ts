import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import type { BarisLkps, HasilBacaLkps, IdentitasLkps, KolomLkps, MasalahLkps, NilaiSel, TabelBaca } from "./jenis";
import { periksaIsi } from "./periksa";
import { KECUALI_SHEET, kodeTabelDariSheet, pilihBlokJenjang, SHEET_WAJIB, sheetBerlakuUntuk } from "./struktur";

/**
 * F-08: pembaca LKPS Excel (template LKPS LAM Teknik 2025).
 *
 * Berkas dibaca dengan pembaca aliran (stream) ExcelJS: template berisi gaya dan validasi untuk ±1.000 baris di
 * 54 sheet, sehingga model penuh ExcelJS butuh ±35 detik, sedangkan aliran ±3 detik. Isi sel disalin ke model
 * ringan `Lembar` lalu diproses dengan aturan generik yang berlaku untuk semua sheet tabel:
 * 1. Cari "baris nomor kolom": sel A, B, C berisi 1, 2, 3 (template selalu mencetak nomor kolom di bawah judul).
 * 2. Kolom tabel = kolom bernomor di baris itu (ditambah kolom tanpa nomor yang punya judul sendiri);
 *    panel INFO di sebelah kanan diabaikan.
 * 3. Judul kolom = gabungan teks di atas baris nomor, mulai dari baris "No"/"Tahun Masuk"/"Tahun Lulus".
 * 4. Data = baris di bawah baris nomor sampai blok berikutnya; baris dianggap kosong bila hanya kolom A
 *    (nomor urut bawaan template) atau kolom rumus yang terisi; baris kategori (I, II, ...) dan jumlah dilewati.
 * 5. Sheet berblok per jenjang (6.d, 6.f.1) dipilih blok yang sesuai jenjang proyek.
 * Kolom berisi rumus Excel memakai hasil terhitung (bila ada), tetapi tidak dipakai menghitung metrik.
 */

export interface SelMentah {
  nilai: NilaiSel;
  rumus: boolean;
}

/** Model ringan satu sheet: sel per baris dan kolom (1-based). */
export interface Lembar {
  nama: string;
  sel: Map<number, Map<number, SelMentah>>;
  barisMaks: number;
  kolomMaks: number;
}

const LABEL_AWAL_JUDUL = /^(no\.?|tahun masuk|tahun lulus)$/i;
const BARIS_MAKS = 1200;

export function huruf(kolom: number): string {
  let s = "";
  let n = kolom;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function nomorKolom(h: string): number {
  return [...h.toUpperCase()].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
}

function tanggalIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Nilai sel ExcelJS → teks/angka/tanggal ISO; rumus memakai hasil terhitung. */
export function nilaiSel(v: ExcelJS.CellValue): SelMentah {
  if (v === null || v === undefined) return { nilai: null, rumus: false };
  if (typeof v === "number") return { nilai: v, rumus: false };
  if (typeof v === "boolean") return { nilai: v ? "V" : null, rumus: false };
  if (v instanceof Date) return { nilai: tanggalIso(v), rumus: false };
  if (typeof v === "string") {
    const t = v.replace(/ /g, " ").trim();
    return { nilai: t === "" ? null : t, rumus: false };
  }
  if (typeof v === "object") {
    if ("formula" in v || "sharedFormula" in v) {
      const r = (v as { result?: unknown }).result;
      if (r instanceof Date) return { nilai: tanggalIso(r), rumus: true };
      if (typeof r === "number") return { nilai: r, rumus: true };
      if (typeof r === "string") return { nilai: r.trim() === "" ? null : r.trim(), rumus: true };
      return { nilai: null, rumus: true };
    }
    if ("richText" in v) {
      const t = (v as ExcelJS.CellRichTextValue).richText.map((x) => x.text).join("").trim();
      return { nilai: t === "" ? null : t, rumus: false };
    }
    if ("text" in v) {
      const t = String((v as { text: unknown }).text ?? "").trim();
      return { nilai: t === "" ? null : t, rumus: false };
    }
    if ("error" in v) return { nilai: null, rumus: true };
  }
  return { nilai: String(v), rumus: false };
}

function lembarBaru(nama: string): Lembar {
  return { nama, sel: new Map(), barisMaks: 0, kolomMaks: 0 };
}

function simpan(l: Lembar, r: number, c: number, v: ExcelJS.CellValue) {
  const s = nilaiSel(v);
  if (s.nilai === null && !s.rumus) return;
  let baris = l.sel.get(r);
  if (!baris) {
    baris = new Map();
    l.sel.set(r, baris);
  }
  baris.set(c, s);
  l.barisMaks = Math.max(l.barisMaks, r);
  l.kolomMaks = Math.max(l.kolomMaks, c);
}

/** Baca semua sheet berkas .xlsx dengan pembaca aliran ExcelJS. */
export async function bacaLembarXlsx(berkas: Buffer): Promise<Lembar[]> {
  const pembaca = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(berkas), {
    styles: "cache", // perlu untuk mengenali sel tanggal
    sharedStrings: "cache",
    hyperlinks: "ignore",
    worksheets: "emit",
    entries: "emit",
  });
  const hasil: Lembar[] = [];
  for await (const ws of pembaca) {
    const l = lembarBaru((ws as unknown as { name: string }).name);
    for await (const row of ws) {
      if (row.number > BARIS_MAKS + 50) continue;
      row.eachCell({ includeEmpty: false }, (cell, c) => simpan(l, row.number, c, cell.value));
    }
    hasil.push(l);
  }
  return hasil;
}

/** Model `Lembar` dari worksheet ExcelJS yang sudah dimuat penuh (dipakai skrip fikstur). */
export function lembarDariWorksheet(ws: ExcelJS.Worksheet): Lembar {
  const l = lembarBaru(ws.name);
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    if (r <= BARIS_MAKS + 50) row.eachCell({ includeEmpty: false }, (cell, c) => simpan(l, r, c, cell.value));
  });
  return l;
}

function sel(l: Lembar, r: number, c: number): SelMentah {
  return l.sel.get(r)?.get(c) ?? { nilai: null, rumus: false };
}

function teks(l: Lembar, r: number, c: number): string {
  const n = sel(l, r, c).nilai;
  return n === null ? "" : String(n);
}

function angkaBulat(l: Lembar, r: number, c: number): number | null {
  const n = sel(l, r, c).nilai;
  if (typeof n === "number" && Number.isInteger(n)) return n;
  if (typeof n === "string" && /^\d+$/.test(n)) return Number(n);
  return null;
}

/** Baris-baris nomor kolom (A=1, B=2, C=3) di satu sheet. */
export function barisNomor(l: Lembar): number[] {
  const hasil: number[] = [];
  const akhir = Math.min(l.barisMaks, 120);
  for (let r = 1; r <= akhir; r++) {
    if (angkaBulat(l, r, 1) === 1 && angkaBulat(l, r, 2) === 2 && angkaBulat(l, r, 3) === 3) hasil.push(r);
  }
  return hasil;
}

/** Teks "Diisi oleh ..." terdekat di atas baris nomor (label blok). */
export function labelBlok(l: Lembar, rNomor: number, rBatasAtas: number): string | null {
  for (let r = rNomor - 1; r >= Math.max(1, rBatasAtas); r--) {
    const t = teks(l, r, 1);
    if (/^diisi oleh/i.test(t)) return t;
  }
  return null;
}

function kolomTabel(l: Lembar, rNomor: number): KolomLkps[] {
  let rJudul = Math.max(1, rNomor - 2);
  for (let r = rNomor - 1; r >= Math.max(1, rNomor - 8); r--) {
    if (LABEL_AWAL_JUDUL.test(teks(l, r, 1))) {
      rJudul = r;
      break;
    }
  }
  let kolomTerakhir = 0;
  for (let c = 1; c <= Math.max(l.kolomMaks, 1); c++) if (angkaBulat(l, rNomor, c) !== null) kolomTerakhir = c;
  const hasil: KolomLkps[] = [];
  for (let c = 1; c <= kolomTerakhir; c++) {
    const no = angkaBulat(l, rNomor, c);
    const bagian: string[] = [];
    for (let r = rJudul; r < rNomor; r++) {
      const t = teks(l, r, c).replace(/\s+/g, " ").trim();
      if (t && !t.startsWith("=") && bagian[bagian.length - 1] !== t) bagian.push(t);
    }
    const label = bagian.join(" / ");
    // kolom tanpa nomor tetap dibaca bila punya judul sendiri (template 4f-3 kolom D tidak bernomor)
    if (no === null && (!label || hasil[hasil.length - 1]?.label === label)) continue;
    hasil.push({ kunci: huruf(c), nomor: no === null ? "" : String(no), label: label || `Kolom ${no}` });
  }
  return hasil;
}

/** Baca satu blok tabel: data dari bawah baris nomor sampai `rAkhir`. */
function bacaBlok(l: Lembar, rNomor: number, rAkhir: number) {
  const kolom = kolomTabel(l, rNomor);
  const indeks = kolom.map((k) => ({ k, c: nomorKolom(k.kunci) }));
  const baris: BarisLkps[] = [];
  const kolomRumus = new Set<string>();
  for (let r = rNomor + 1; r <= Math.min(rAkhir, l.barisMaks); r++) {
    if (!l.sel.has(r)) continue;
    const isiSel: Record<string, NilaiSel> = {};
    const rumusBaris: string[] = [];
    let isi = false;
    for (const { k, c } of indeks) {
      const s = sel(l, r, c);
      isiSel[k.kunci] = s.nilai;
      if (s.rumus) rumusBaris.push(k.kunci);
      if (s.nilai !== null && !s.rumus && k.kunci !== "A") isi = true;
    }
    const a = isiSel.A;
    // baris kategori (I, II, III, IV di 4.f/6.e.3) dan baris jumlah/total hasil rumus bukan data
    if (typeof a === "string" && /^[IVX]+$/.test(a)) continue;
    if ([isiSel.A, isiSel.B].some((x) => typeof x === "string" && /^(jumlah|total)$/i.test(x))) continue;
    // label baris tetap (TS-2, TS-1, ...) di kolom A dihitung sebagai isi
    if (typeof a === "string" && !/^\d+$/.test(a)) isi = true;
    if (isi) {
      baris.push({ nomorBaris: r, sel: isiSel });
      for (const k of rumusBaris) kolomRumus.add(k);
    }
  }
  return { kolom, baris, kolomRumus: [...kolomRumus] };
}

function judulSheet(l: Lembar): string {
  for (let r = 1; r <= 3; r++) {
    const t = teks(l, r, 1);
    if (/^tabel/i.test(t)) return t.replace(/\s+/g, " ");
  }
  return l.nama;
}

function bacaIdentitas(lembar: Lembar[]): IdentitasLkps {
  const menu = lembar.find((l) => l.nama === "Menu");
  if (!menu) return { tanggalTs: null, namaProgramStudi: null };
  const ts = sel(menu, 73, nomorKolom("S")).nilai;
  const prodi = sel(menu, 23, nomorKolom("H")).nilai;
  return {
    tanggalTs: typeof ts === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ts) ? ts : null,
    namaProgramStudi: typeof prodi === "string" ? prodi : null,
  };
}

/** Proses model lembar menjadi tabel LKPS untuk satu jenjang. */
export function bacaLkpsDariLembar(lembar: Lembar[], jenjang: string): HasilBacaLkps {
  const masalah: MasalahLkps[] = [];
  const nama = new Set(lembar.map((l) => l.nama));
  for (const sheet of SHEET_WAJIB) {
    if (sheetBerlakuUntuk(sheet, jenjang) && !nama.has(sheet)) {
      masalah.push({
        tingkat: "galat",
        sheet,
        pesan: `Sheet "${sheet}" tidak ditemukan. Jangan mengubah nama atau menghapus sheet template LKPS.`,
      });
    }
  }

  const tabel: TabelBaca[] = [];
  for (const l of lembar) {
    if (KECUALI_SHEET.has(l.nama) || !sheetBerlakuUntuk(l.nama, jenjang)) continue;
    const nomor = barisNomor(l);
    if (nomor.length === 0) {
      masalah.push({ tingkat: "galat", sheet: l.nama, pesan: `Struktur sheet "${l.nama}" berubah: baris nomor kolom (1, 2, 3, ...) tidak ditemukan.` });
      continue;
    }
    const label = nomor.map((r, i) => labelBlok(l, r, i === 0 ? 1 : nomor[i - 1] + 1));
    let i = 0;
    const berblok = label.filter(Boolean).length > 1;
    if (berblok) {
      const pilih = pilihBlokJenjang(label, jenjang);
      if (pilih === null) continue;
      i = pilih;
    }
    // blok berakhir sebelum judul blok berikutnya
    const rAkhir = i + 1 < nomor.length ? nomor[i + 1] - 4 : BARIS_MAKS;
    tabel.push({
      kode: kodeTabelDariSheet(l.nama),
      sheet: l.nama,
      judul: judulSheet(l),
      blok: berblok ? (label[i] ?? null) : null,
      ...bacaBlok(l, nomor[i], rAkhir),
    });
  }
  return { tabel, masalah: [...masalah, ...periksaIsi(tabel, jenjang)], identitas: bacaIdentitas(lembar) };
}

/** Baca berkas LKPS Excel untuk satu jenjang. Masalah isi dikumpulkan, bukan dilempar. */
export async function bacaLkpsXlsx(berkas: Buffer, jenjang: string): Promise<HasilBacaLkps> {
  let lembar: Lembar[];
  try {
    lembar = await bacaLembarXlsx(berkas);
  } catch {
    return {
      tabel: [],
      identitas: { tanggalTs: null, namaProgramStudi: null },
      masalah: [{ tingkat: "galat", sheet: null, pesan: "Berkas tidak bisa dibuka sebagai Excel (.xlsx). Pastikan berkas tidak rusak dan bukan format .xls lama." }],
    };
  }
  if (lembar.length === 0) {
    return {
      tabel: [],
      identitas: { tanggalTs: null, namaProgramStudi: null },
      masalah: [{ tingkat: "galat", sheet: null, pesan: "Berkas tidak berisi sheet. Pastikan berkas adalah template LKPS LAM Teknik 2025." }],
    };
  }
  return bacaLkpsDariLembar(lembar, jenjang);
}

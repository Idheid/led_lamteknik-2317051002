import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { extractImages, getDocumentProxy, renderPageAsImage } from "unpdf";
import type { Worker } from "tesseract.js";
import { teksPindaian } from "@/modules/led/domain/ocr";

/**
 * Rencana 10 Nov T3: OCR lokal untuk halaman PDF hasil pindai (tanpa AI, tanpa token, data tidak keluar server).
 * - Halaman dirender `renderPageAsImage` (unpdf + @napi-rs/canvas, scale 2). Bila canvas native tidak bisa dimuat
 *   (misalnya diblokir kebijakan Application Control Windows), dipakai gambar terbesar yang tertanam di halaman
 *   (`extractImages`), yang pada PDF hasil pindai adalah gambar halaman itu sendiri.
 * - Teks dikenali tesseract.js (WebAssembly), bahasa ind + eng, model `best_int` dari paket @tesseract.js-data yang
 *   terpasang saat `npm install` (tidak diunduh saat produksi berjalan).
 */

export const VERSI_OCR = "tesseract.js-7.0.0/ind+eng-best_int/v1";

const minta = createRequire(import.meta.url);

/** Folder traineddata lokal: kedua bahasa harus berada di satu folder untuk langPath tesseract.js. */
function folderBahasa(): string {
  const tujuan = resolve(process.env.OCR_TESSDATA_DIR || join(tmpdir(), "led-lamteknik-tessdata")); // selalu bisa ditulis, juga di kontainer
  mkdirSync(tujuan, { recursive: true });
  for (const kode of ["ind", "eng"]) {
    const berkas = `${kode}.traineddata.gz`;
    if (existsSync(join(tujuan, berkas))) continue;
    const paket = minta.resolve(`@tesseract.js-data/${kode}/package.json`);
    copyFileSync(join(paket, "..", "4.0.0_best_int", berkas), join(tujuan, berkas));
  }
  return tujuan;
}

let pekerja: Promise<Worker> | null = null;
let penutup: NodeJS.Timeout | null = null;
/** Pekerja OCR ditutup setelah menganggur sekian lama supaya tidak menahan memori dan proses (worker, uji). */
const JEDA_TUTUP_MS = Number(process.env.OCR_JEDA_TUTUP_MS ?? 15_000);

function jadwalkanTutup() {
  if (penutup) clearTimeout(penutup);
  penutup = setTimeout(() => void tutupOcr(), JEDA_TUTUP_MS);
  penutup.unref();
}

async function ambilPekerja(): Promise<Worker> {
  pekerja ??= (async () => {
    const { createWorker, OEM } = await import("tesseract.js");
    const dir = folderBahasa();
    return createWorker(["ind", "eng"], OEM.LSTM_ONLY, { langPath: dir, cachePath: dir, gzip: true });
  })();
  return pekerja;
}

/** Hentikan pekerja OCR (akhir uji atau saat worker dimatikan). */
export async function tutupOcr(): Promise<void> {
  if (penutup) clearTimeout(penutup);
  penutup = null;
  const p = pekerja;
  pekerja = null;
  if (p) await (await p).terminate();
}

/** Gambar mentah (RGB/RGBA/abu-abu) menjadi PNM biner (P5/P6) yang dibaca Leptonica tanpa pustaka tambahan. */
export function pnmDariPiksel(data: Uint8ClampedArray | Uint8Array, lebar: number, tinggi: number, kanal: number): Buffer {
  const abu = kanal === 1;
  const kepala = Buffer.from(`${abu ? "P5" : "P6"}\n${lebar} ${tinggi}\n255\n`, "ascii");
  const isi = Buffer.alloc(lebar * tinggi * (abu ? 1 : 3));
  for (let i = 0, j = 0; i < lebar * tinggi; i++) {
    if (abu) { isi[j++] = data[i]; continue; }
    const s = i * kanal;
    isi[j++] = data[s];
    isi[j++] = data[s + 1];
    isi[j++] = data[s + 2];
  }
  return Buffer.concat([kepala, isi]);
}

let canvasTersedia: boolean | null = null;

async function gambarHalaman(isi: Uint8Array, nomor: number): Promise<Buffer | null> {
  if (canvasTersedia !== false) {
    try {
      const png = await renderPageAsImage(isi.slice(), nomor, { scale: 2, canvasImport: () => import("@napi-rs/canvas") });
      canvasTersedia = true;
      return Buffer.from(png);
    } catch {
      canvasTersedia = false;
    }
  }
  const pdf = await getDocumentProxy(isi.slice());
  const gambar = await extractImages(pdf, nomor);
  if (gambar.length === 0) return null;
  const g = [...gambar].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return pnmDariPiksel(g.data, g.width, g.height, g.channels);
}

export interface HasilOcrHalaman {
  /** nomor halaman, mulai 1 */
  halaman: number;
  teks: string;
  /** keyakinan rata-rata 0–100 dari Tesseract */
  keyakinan: number;
}

/**
 * OCR halaman tertentu sebuah PDF. Halaman tanpa gambar (kosong) menghasilkan teks kosong dan keyakinan 0.
 * `onProgres(selesai, total)` dipanggil setelah setiap halaman.
 */
export async function ocrHalamanPdf(
  isi: Buffer | Uint8Array,
  halaman: number[],
  onProgres?: (selesai: number, total: number) => Promise<void> | void,
): Promise<HasilOcrHalaman[]> {
  const data = new Uint8Array(isi);
  const hasil: HasilOcrHalaman[] = [];
  for (const [i, nomor] of halaman.entries()) {
    const gambar = await gambarHalaman(data, nomor);
    if (!gambar) {
      hasil.push({ halaman: nomor, teks: "", keyakinan: 0 });
    } else {
      const w = await ambilPekerja();
      const { data: r } = await w.recognize(gambar);
      hasil.push({ halaman: nomor, teks: r.text.trim(), keyakinan: Math.round(r.confidence) });
    }
    await onProgres?.(i + 1, halaman.length);
  }
  if (pekerja) jadwalkanTutup();
  return hasil;
}

/** Nomor halaman (mulai 1) yang dianggap pindaian. */
export function halamanPindaian(halaman: string[]): number[] {
  return halaman.flatMap((t, i) => (teksPindaian(t) ? [i + 1] : []));
}

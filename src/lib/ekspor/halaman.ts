import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Hitung halaman berkas .docx lewat LibreOffice (`soffice --headless --convert-to pdf`), lalu jumlah halaman PDF.
 * Lokasi soffice dari SOFFICE_PATH atau lokasi pemasangan umum; null bila LibreOffice tidak tersedia.
 */

const CALON = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
];

export function lokasiSoffice(): string | null {
  const env = process.env.SOFFICE_PATH;
  if (env && existsSync(env)) return env;
  return CALON.find((p) => existsSync(p)) ?? null;
}

function jalankan(perintah: string, argumen: string[], batasMs: number): Promise<void> {
  return new Promise((ok, gagal) => {
    execFile(perintah, argumen, { timeout: batasMs, windowsHide: true }, (e) => (e ? gagal(e) : ok()));
  });
}

/**
 * Halaman sebelum judul LAMPIRAN (revisi 22 Okt 2026: Lampiran tidak dihitung dalam batas 150 halaman). Judul bab
 * dikenali sebagai baris yang persis "LAMPIRAN"; entri daftar isi ("LAMPIRAN 30", "LAMPIRAN……") tidak cocok.
 * Bila judul tidak ditemukan, seluruh halaman dihitung.
 */
export function halamanSebelumLampiran(teksHalaman: string[]): number {
  for (let i = teksHalaman.length - 1; i >= 0; i--) {
    if (teksHalaman[i].split(/\r?\n/).some((b) => b.trim() === "LAMPIRAN")) return i;
  }
  return teksHalaman.length;
}

export async function hitungHalamanDocx(isi: Buffer): Promise<{ total: number; sebelumLampiran: number } | null> {
  const soffice = lokasiSoffice();
  if (!soffice) return null;
  const folder = await mkdtemp(join(tmpdir(), "led-halaman-"));
  try {
    const docx = join(folder, "led.docx");
    await writeFile(docx, isi);
    // profil terpisah supaya tidak bentrok dengan LibreOffice yang sedang dibuka pengguna
    const profil = pathToFileURL(join(folder, "profil")).href;
    await jalankan(soffice, [`-env:UserInstallation=${profil}`, "--headless", "--convert-to", "pdf", "--outdir", folder, docx], 180_000);
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(join(folder, "led.pdf"))));
    const { text } = await extractText(pdf, { mergePages: false });
    return { total: pdf.numPages, sebelumLampiran: halamanSebelumLampiran(text as string[]) };
  } finally {
    await rm(folder, { recursive: true, force: true }).catch(() => undefined);
  }
}

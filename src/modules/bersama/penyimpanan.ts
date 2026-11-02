import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

/**
 * Penyimpanan berkas unggahan di disk (UPLOAD_DIR). Berkas disimpan apa adanya (tanpa kompresi ulang, F-12);
 * basis data hanya menyimpan lokasi relatif terhadap UPLOAD_DIR.
 */

export function akarUnggahan(): string {
  return resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");
}

/** Nama berkas aman untuk disk: tanpa folder, karakter aneh diganti, panjang dibatasi. */
export function namaAman(nama: string): string {
  const dasar = nama.split(/[\\/]/).pop() ?? "berkas";
  const bersih = dasar.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").replace(/^\.+/, "");
  return (bersih || "berkas").slice(-120);
}

function jalurPenuh(lokasi: string): string {
  const akar = akarUnggahan();
  const penuh = resolve(akar, lokasi);
  if (penuh !== akar && !penuh.startsWith(akar + sep)) throw new Error("Lokasi berkas di luar folder unggahan");
  return penuh;
}

export interface BerkasTersimpan {
  lokasi: string;
  hash: string;
  ukuran: number;
}

export async function simpanBerkas(folder: string, namaAsli: string, isi: Buffer): Promise<BerkasTersimpan> {
  const lokasi = join(folder, `${randomUUID()}-${namaAman(namaAsli)}`).split(sep).join("/");
  const penuh = jalurPenuh(lokasi);
  await mkdir(dirname(penuh), { recursive: true });
  await writeFile(penuh, isi);
  return { lokasi: relative(akarUnggahan(), penuh).split(sep).join("/"), hash: hashBerkas(isi), ukuran: isi.length };
}

export function bacaBerkas(lokasi: string): Promise<Buffer> {
  return readFile(jalurPenuh(lokasi));
}

export async function hapusBerkas(lokasi: string): Promise<void> {
  await rm(jalurPenuh(lokasi), { force: true });
}

export function hashBerkas(isi: Buffer): string {
  return createHash("sha256").update(isi).digest("hex");
}

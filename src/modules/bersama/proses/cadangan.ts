import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import JSZip from "jszip";
import { prisma } from "@/modules/bersama/db";
import { akarUnggahan } from "@/modules/bersama/penyimpanan";

/**
 * Cadangan harian (revisi 22 Okt 2026): basis data (pg_dump format custom) dan folder unggahan (zip) disimpan per
 * hari di CADANGAN_DIR, sebaiknya disk lain atau drive fakultas. Hanya CADANGAN_SIMPAN cadangan terbaru yang
 * disimpan. Dijadwalkan worker (pg-boss, CADANGAN_JADWAL), atau dijalankan manual: npm run cadangan.
 *
 * pg_dump/pg_restore harus versi yang sama atau lebih baru dari server (PostgreSQL 17). Di image Docker sudah
 * terpasang; di laptop pengembangan bisa lewat kontainer basis data:
 *   CADANGAN_PG_DUMP="docker exec -i -e PGPASSWORD led-lamteknik-db pg_dump"
 * Kata sandi basis data dikirim lewat variabel PGPASSWORD, bukan argumen perintah.
 */

const POLA_FOLDER = /^cadangan-\d{8}-\d{6}$/;

export function folderCadangan(): string {
  return resolve(process.cwd(), process.env.CADANGAN_DIR || "./cadangan");
}

export function jumlahSimpan(): number {
  const n = Number(process.env.CADANGAN_SIMPAN);
  return Number.isInteger(n) && n > 0 ? n : 14;
}

export function jadwalCadangan(): string {
  return process.env.CADANGAN_JADWAL || "0 2 * * *";
}

/** Pecah perintah dari env menjadi program dan argumen (bagian berkutip boleh berisi spasi). */
export function pecahPerintah(teks: string): string[] {
  return [...teks.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);
}

/** URL koneksi tanpa kata sandi dan tanpa parameter Prisma (?schema=...), plus kata sandinya untuk PGPASSWORD. */
export function koneksiDb(url: string): { url: string; sandi: string } {
  const u = new URL(url);
  const sandi = decodeURIComponent(u.password);
  u.password = "";
  u.search = "";
  return { url: u.toString(), sandi };
}

/** Nama folder dengan waktu WIB, mis. cadangan-20261022-020000. */
export function namaFolder(waktu: Date): string {
  const t = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(waktu);
  return `cadangan-${t.replace(/\D/g, "").replace(/^(\d{8})(\d{6})$/, "$1-$2")}`;
}

function bersihkan(pesan: string, sandi: string): string {
  const t = sandi ? pesan.split(sandi).join("***") : pesan;
  return t.trim().slice(-1500);
}

interface Aliran {
  masuk?: string;
  keluar?: string;
}

/** Jalankan perintah basis data dengan stdin/stdout dari/ke berkas; galat memuat stderr (tanpa kata sandi). */
function jalankan(perintah: string[], argumen: string[], sandi: string, aliran: Aliran): Promise<void> {
  const [program, ...awal] = perintah;
  return new Promise((ok, gagal) => {
    const proses = spawn(program, [...awal, ...argumen], {
      env: { ...process.env, PGPASSWORD: sandi },
      stdio: [aliran.masuk ? "pipe" : "ignore", aliran.keluar ? "pipe" : "ignore", "pipe"],
      windowsHide: true,
    });
    let galat = "";
    proses.stderr!.on("data", (d: Buffer) => { galat = (galat + d.toString()).slice(-4000); });
    const tulis = aliran.keluar ? pipeline(proses.stdout!, createWriteStream(aliran.keluar)) : Promise.resolve();
    const baca = aliran.masuk ? pipeline(createReadStream(aliran.masuk), proses.stdin!) : Promise.resolve();
    proses.on("error", (e: NodeJS.ErrnoException) => {
      gagal(new Error(e.code === "ENOENT" ? `Perintah "${program}" tidak ditemukan. Atur CADANGAN_PG_DUMP / CADANGAN_PG_RESTORE.` : e.message));
    });
    proses.on("close", (kode) => {
      Promise.all([tulis, baca]).then(
        () => (kode === 0 ? ok() : gagal(new Error(`${program} keluar dengan kode ${kode}: ${bersihkan(galat, sandi)}`))),
        (e: Error) => gagal(new Error(`${program}: ${bersihkan(e.message, sandi)} ${bersihkan(galat, sandi)}`)),
      );
    });
  });
}

function urlDb(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi");
  return url;
}

async function cadangkanDb(berkas: string): Promise<void> {
  const { url, sandi } = koneksiDb(urlDb());
  const perintah = pecahPerintah(process.env.CADANGAN_PG_DUMP || "pg_dump");
  await jalankan(perintah, ["--format=custom", "--no-owner", "--no-privileges", `--dbname=${url}`], sandi, { keluar: berkas });
}

async function daftarBerkas(akar: string): Promise<string[]> {
  try {
    const isi = await readdir(akar, { recursive: true, withFileTypes: true });
    return isi.filter((e) => e.isFile()).map((e) => relative(akar, join(e.parentPath, e.name)).split(sep).join("/"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/** Zip folder unggahan tanpa kompresi ulang (PDF dan DOCX sudah terkompresi); berkas dibaca bertahap. */
async function zipFolder(akar: string, berkas: string): Promise<number> {
  const daftar = await daftarBerkas(akar);
  const zip = new JSZip();
  for (const rel of daftar) zip.file(rel, createReadStream(join(akar, rel)));
  await pipeline(zip.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "STORE" }), createWriteStream(berkas));
  return daftar.length;
}

async function ukuranFolder(folder: string): Promise<number> {
  let total = 0;
  for (const rel of await daftarBerkas(folder)) total += (await stat(join(folder, rel))).size;
  return total;
}

/** Hapus cadangan lama, sisakan `simpan` folder terbaru. Mengembalikan jumlah yang dihapus. */
export async function pangkasCadangan(akar: string, simpan: number): Promise<number> {
  const folder = (await readdir(akar, { withFileTypes: true })).filter((e) => e.isDirectory() && POLA_FOLDER.test(e.name)).map((e) => e.name).sort().reverse();
  const lama = folder.slice(simpan);
  for (const nama of lama) await rm(join(akar, nama), { recursive: true, force: true });
  return lama.length;
}

export interface HasilCadangan {
  berhasil: boolean;
  folder: string | null;
  pesan: string;
}

/** Satu cadangan lengkap. Ditulis ke folder sementara dulu, lalu diganti nama, sehingga cadangan setengah jadi tidak pernah terhitung. */
export async function buatCadangan(): Promise<HasilCadangan> {
  const akar = folderCadangan();
  await prisma.cadangan.updateMany({
    where: { berhasil: null, mulai: { lt: new Date(Date.now() - 2 * 3600_000) } },
    data: { berhasil: false, selesai: new Date(), pesan: "Terputus (worker atau server mati saat mencadangkan)." },
  });
  const catatan = await prisma.cadangan.create({ data: {} });
  const nama = namaFolder(catatan.mulai);
  const sementara = join(akar, `.${nama}.sementara`);
  try {
    await mkdir(sementara, { recursive: true });
    await cadangkanDb(join(sementara, "basis-data.dump"));
    const jumlahBerkas = await zipFolder(akarUnggahan(), join(sementara, "unggahan.zip"));
    const [migrasi] = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1`;
    await writeFile(join(sementara, "info.json"), JSON.stringify({ waktu: catatan.mulai.toISOString(), migrasiTerakhir: migrasi?.migration_name ?? null, jumlahBerkas }, null, 2));
    await rename(sementara, join(akar, nama));
    const ukuranMb = Math.round((await ukuranFolder(join(akar, nama))) / 10_485.76) / 100;
    const dihapus = await pangkasCadangan(akar, jumlahSimpan());
    const pesan = `${jumlahBerkas} berkas unggahan${dihapus ? `; ${dihapus} cadangan lama dihapus` : ""}.`;
    await prisma.cadangan.update({ where: { id: catatan.id }, data: { berhasil: true, selesai: new Date(), folder: nama, ukuranMb, pesan } });
    return { berhasil: true, folder: nama, pesan };
  } catch (e) {
    await rm(sementara, { recursive: true, force: true }).catch(() => undefined);
    const pesan = e instanceof Error ? e.message : String(e);
    await prisma.cadangan.update({ where: { id: catatan.id }, data: { berhasil: false, selesai: new Date(), pesan } });
    return { berhasil: false, folder: null, pesan };
  }
}

/**
 * Pulihkan satu folder cadangan ke basis data `databaseUrl` (sudah ada; isinya ditimpa) dan folder unggahan
 * `folderUnggahan`. Dipakai skrip scripts/cadangan.ts dan uji pemulihan.
 */
export async function pulihkanCadangan(folder: string, tujuan: { databaseUrl: string; folderUnggahan: string }): Promise<{ jumlahBerkas: number }> {
  const { url, sandi } = koneksiDb(tujuan.databaseUrl);
  const perintah = pecahPerintah(process.env.CADANGAN_PG_RESTORE || "pg_restore");
  await jalankan(perintah, ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error", `--dbname=${url}`], sandi, { masuk: join(folder, "basis-data.dump") });
  const zip = await JSZip.loadAsync(await readFile(join(folder, "unggahan.zip")));
  const akar = resolve(tujuan.folderUnggahan);
  let jumlahBerkas = 0;
  for (const berkas of Object.values(zip.files)) {
    if (berkas.dir) continue;
    const penuh = resolve(akar, berkas.name);
    if (!penuh.startsWith(akar + sep)) throw new Error(`Lokasi berkas tidak sah di cadangan: ${berkas.name}`);
    await mkdir(dirname(penuh), { recursive: true });
    await writeFile(penuh, await berkas.async("nodebuffer"));
    jumlahBerkas++;
  }
  return { jumlahBerkas };
}

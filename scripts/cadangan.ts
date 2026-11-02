/**
 * Cadangan manual dan pemulihan (revisi 22 Okt 2026). Lihat docs/PANDUAN-SERVER.md.
 *
 *   npm run cadangan                     buat satu cadangan sekarang (sama dengan jadwal harian di worker)
 *   npm run cadangan -- daftar           daftar folder cadangan di CADANGAN_DIR
 *   npm run cadangan -- pulihkan <folder> --db <url> --unggahan <folder>
 *       pulihkan ke basis data <url> (dibuat bila belum ada; ISINYA DITIMPA) dan folder unggahan <folder>.
 *       Untuk uji pemulihan, pakai basis data terpisah, mis. .../led_lamteknik_pulih.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Client } from "pg";
import { prisma } from "@/modules/bersama/db";
import { buatCadangan, folderCadangan, pulihkanCadangan } from "@/modules/bersama/proses/cadangan";

function opsi(argumen: string[], nama: string): string | undefined {
  const i = argumen.indexOf(nama);
  return i >= 0 ? argumen[i + 1] : undefined;
}

async function pastikanDb(url: string) {
  const u = new URL(url);
  const nama = u.pathname.replace(/^\//, "");
  u.pathname = "/postgres";
  u.search = "";
  const c = new Client({ connectionString: u.toString() });
  await c.connect();
  if ((await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [nama])).rowCount === 0) {
    await c.query(`CREATE DATABASE "${nama.replace(/"/g, "")}"`);
    console.log(`Basis data ${nama} dibuat.`);
  }
  await c.end();
}

async function utama() {
  const [perintah, ...argumen] = process.argv.slice(2);
  if (!perintah || perintah === "buat") {
    const h = await buatCadangan();
    console.log(h.berhasil ? `Cadangan dibuat: ${join(folderCadangan(), h.folder!)} (${h.pesan})` : `Cadangan gagal: ${h.pesan}`);
    if (!h.berhasil) process.exitCode = 1;
  } else if (perintah === "daftar") {
    const akar = folderCadangan();
    const folder = (await readdir(akar).catch(() => [])).filter((n) => n.startsWith("cadangan-")).sort().reverse();
    for (const f of folder) {
      const info = JSON.parse(await readFile(join(akar, f, "info.json"), "utf8").catch(() => "{}"));
      console.log(`${f}  migrasi ${info.migrasiTerakhir ?? "?"}  ${info.jumlahBerkas ?? "?"} berkas`);
    }
    if (!folder.length) console.log(`Belum ada cadangan di ${akar}.`);
  } else if (perintah === "pulihkan" && argumen[0]) {
    const db = opsi(argumen, "--db");
    const unggahan = opsi(argumen, "--unggahan");
    if (!db || !unggahan) throw new Error("Wajib: --db <url> dan --unggahan <folder>");
    const folder = resolve(folderCadangan(), argumen[0]);
    await pastikanDb(db);
    const h = await pulihkanCadangan(folder, { databaseUrl: db, folderUnggahan: unggahan });
    console.log(`Dipulihkan dari ${folder}: basis data dan ${h.jumlahBerkas} berkas unggahan.`);
  } else {
    console.log("Pakai: npm run cadangan [-- buat | daftar | pulihkan <folder> --db <url> --unggahan <folder>]");
  }
}

utama()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

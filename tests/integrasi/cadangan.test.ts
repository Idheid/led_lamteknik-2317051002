import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "pg";
import { prisma } from "@/lib/db";
import { GalatAkses, type Pengguna } from "@/lib/akses";
import { statusCadangan } from "@/lib/data/cadangan";
import { simpanProdi } from "@/lib/data/organisasi";
import { buatCadangan, folderCadangan, koneksiDb, namaFolder, pecahPerintah, pulihkanCadangan } from "@/lib/proses/cadangan";
import { bersihkanDb, buatSuperAdmin, siapkanPj } from "./bantu";

/**
 * Revisi 22 Okt 2026 tahap 6: cadangan harian basis data + unggahan, sisakan N terakhir, status untuk admin, dan
 * uji pemulihan ke basis data terpisah. Butuh pg_dump/pg_restore 17 (CADANGAN_PG_DUMP/CADANGAN_PG_RESTORE di .env);
 * bila tidak tersedia, uji yang memanggilnya dilewati.
 */

const pgDump = pecahPerintah(process.env.CADANGAN_PG_DUMP || "pg_dump");
const adaPgDump = spawnSync(pgDump[0], [...pgDump.slice(1), "--version"], { encoding: "utf8" }).stdout?.includes("17");
const URL_PULIH = (() => {
  const u = new URL(process.env.DATABASE_URL!);
  u.pathname = "/led_lamteknik_pulih";
  return u.toString();
})();

let admin: Pengguna;
let pj: Pengguna;

before(async () => {
  await bersihkanDb();
  await prisma.cadangan.deleteMany();
  admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  await simpanProdi(pj, { nama: "Teknik Cadangan", jenjang: "S1", kodePddikti: "22222", identitas: {} });
  process.env.CADANGAN_DIR = await mkdtemp(join(tmpdir(), "led-cadangan-"));
  await mkdir(join(process.env.UPLOAD_DIR!, "dokumen"), { recursive: true });
  await writeFile(join(process.env.UPLOAD_DIR!, "dokumen", "renstra.pdf"), "%PDF-1.4 isi uji");
});

after(async () => {
  await prisma.$disconnect();
});

test("Nama folder memakai waktu WIB; kata sandi tidak masuk URL perintah", () => {
  assert.equal(namaFolder(new Date("2026-10-21T19:00:05Z")), "cadangan-20261022-020005");
  assert.deepEqual(pecahPerintah('"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe" -v'), ["C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe", "-v"]);
  const k = koneksiDb("postgresql://led:r4h451a@db:5432/led_lamteknik?schema=public");
  assert.equal(k.url, "postgresql://led@db:5432/led_lamteknik");
  assert.equal(k.sandi, "r4h451a");
});

test("Cadangan gagal tercatat untuk admin, tanpa folder setengah jadi dan tanpa kata sandi", async () => {
  const lama = process.env.CADANGAN_PG_DUMP;
  process.env.CADANGAN_PG_DUMP = "perintah-pg-dump-tidak-ada";
  try {
    const h = await buatCadangan();
    assert.equal(h.berhasil, false);
    assert.match(h.pesan, /tidak ditemukan/);
  } finally {
    process.env.CADANGAN_PG_DUMP = lama;
  }
  assert.deepEqual(await readdir(folderCadangan()), []);
  await assert.rejects(statusCadangan(pj), GalatAkses);
  const s = await statusCadangan(admin);
  assert.equal(s.terakhir?.berhasil, false);
  assert.equal(s.terakhirBerhasil, null);
  assert.ok(!s.terakhir?.pesan?.includes(koneksiDb(process.env.DATABASE_URL!).sandi || "\u0000"));
});

test("Cadangan harian: basis data + unggahan, sisakan N terakhir, lalu dipulihkan ke basis data uji", { skip: !adaPgDump && "pg_dump 17 tidak tersedia" }, async () => {
  process.env.CADANGAN_SIMPAN = "2";
  const hasil = [];
  for (let i = 0; i < 3; i++) {
    hasil.push(await buatCadangan());
    await new Promise((r) => setTimeout(r, 1100)); // nama folder per detik
  }
  assert.ok(hasil.every((h) => h.berhasil), JSON.stringify(hasil));
  const folder = (await readdir(folderCadangan())).sort();
  assert.deepEqual(folder, [hasil[1].folder, hasil[2].folder], "hanya 2 cadangan terbaru yang disimpan");
  assert.match(hasil[2].pesan, /1 berkas unggahan; 1 cadangan lama dihapus/);
  const info = JSON.parse(await readFile(join(folderCadangan(), hasil[2].folder!, "info.json"), "utf8"));
  const migrasi = (await readdir(join(process.cwd(), "prisma", "migrations"), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.equal(info.migrasiTerakhir, migrasi.at(-1), "info.json mencatat migrasi terakhir yang diterapkan");

  const s = await statusCadangan(admin);
  assert.equal(s.terakhir?.berhasil, true);
  assert.ok((s.terakhir?.ukuranMb ?? -1) >= 0);

  // pemulihan ke basis data terpisah (dibuat ulang bersih) dan folder unggahan baru
  const pos = new URL(URL_PULIH);
  pos.pathname = "/postgres";
  pos.search = "";
  const c = new Client({ connectionString: pos.toString() });
  await c.connect();
  await c.query("DROP DATABASE IF EXISTS led_lamteknik_pulih WITH (FORCE)");
  await c.query("CREATE DATABASE led_lamteknik_pulih");
  await c.end();
  const unggahan = await mkdtemp(join(tmpdir(), "led-pulih-"));
  const p = await pulihkanCadangan(join(folderCadangan(), hasil[2].folder!), { databaseUrl: URL_PULIH, folderUnggahan: unggahan });
  assert.equal(p.jumlahBerkas, 1);
  assert.equal(await readFile(join(unggahan, "dokumen", "renstra.pdf"), "utf8"), "%PDF-1.4 isi uji");
  const tanpaOpsi = new URL(URL_PULIH);
  tanpaOpsi.search = "";
  const d = new Client({ connectionString: tanpaOpsi.toString() });
  await d.connect();
  const prodi = await d.query(`SELECT nama FROM "Prodi"`);
  const akun = await d.query(`SELECT count(*)::int AS n FROM "user"`);
  const vektor = await d.query(`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
  await d.end();
  assert.deepEqual(prodi.rows.map((r) => r.nama), ["Teknik Cadangan"]);
  assert.equal(akun.rows[0].n, await prisma.user.count());
  assert.equal(vektor.rowCount, 1, "ekstensi pgvector ikut dipulihkan");
});

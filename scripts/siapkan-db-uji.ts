/**
 * Menyiapkan basis data uji integrasi: buat bila belum ada, lalu terapkan migrasi.
 * Basis data pengembangan tidak disentuh.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";
import { urlDbUji } from "./url-db-uji";

async function main() {
  const url = new URL(urlDbUji());
  const nama = url.pathname.replace(/^\//, "");
  const admin = new URL(url);
  admin.pathname = "/postgres";
  admin.search = "";
  const c = new Client({ connectionString: admin.toString() });
  await c.connect();
  const ada = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [nama]);
  if (ada.rowCount === 0) {
    await c.query(`CREATE DATABASE "${nama.replace(/"/g, "")}"`);
    console.log(`Basis data uji ${nama} dibuat.`);
  }
  await c.end();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.toString() } });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

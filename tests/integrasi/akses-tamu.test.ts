import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { bersihkanDb, buatAdmin, imporSeed, penggunaDari } from "./bantu";

/**
 * Gabung LKPS G1 (= Rencana 18 Nov S1): setiap fungsi lapisan data yang menerima Pengguna menolak Tamu dengan
 * GalatAkses (selain ganti kata sandi sendiri dan pencatat log). Fungsi dicari otomatis dari src/modules/*\/data, jadi
 * fungsi baru (termasuk modul LKPS) ikut teruji.
 */

// G2: dashboard hanya baca untuk Tamu (kolom aman saja, diuji di dashboard.test.ts)
const BOLEH_TAMU = new Set(["gantiKataSandiSendiri", "catatAktivitas", "dataDashboardTamu", "riwayatAkreditasiTamu"]);
let tamu: Pengguna;

function berkas(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    return statSync(f).isDirectory() ? berkas(f) : /\.ts$/.test(f) ? [f] : [];
  });
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  await buatAdmin();
  const u = await prisma.user.create({
    data: { id: "tamu-uji", name: "Tamu Uji", email: "tamu@uji.test", emailVerified: true, role: "TAMU" },
  });
  tamu = await penggunaDari(u.id);
});

after(() => prisma.$disconnect());

test("akun Tamu terbaca sebagai peran TAMU tanpa prodi", () => {
  assert.equal(tamu.peran, "TAMU");
  assert.equal(tamu.prodiId, null);
});

test("semua fungsi data yang menerima Pengguna menolak Tamu dengan GalatAkses", async () => {
  const akar = process.cwd();
  const modul = berkas(join(akar, "src/modules")).filter((f) => /[\\/]data[\\/]/.test(f));
  const diuji: string[] = [];
  const lolos: string[] = [];
  for (const f of modul) {
    const s = readFileSync(f, "utf8");
    const nama = [...s.matchAll(/export async function (\w+)\(\s*p: Pengguna/g)].map((m) => m[1]);
    if (nama.length === 0) continue;
    const m = await import(pathToFileURL(f).href);
    for (const n of nama) {
      if (BOLEH_TAMU.has(n)) continue;
      diuji.push(n);
      try {
        await m[n](tamu, "id-tidak-ada", {}, {}, {});
        lolos.push(`${relative(akar, f)} ${n}: berhasil`);
      } catch (e) {
        if (!(e instanceof GalatAkses)) lolos.push(`${relative(akar, f)} ${n}: ${e instanceof Error ? `${e.name} ${e.message.slice(0, 80)}` : String(e)}`);
      }
    }
  }
  assert.ok(diuji.length > 100, `hanya ${diuji.length} fungsi`);
  assert.deepEqual(lolos, [], "fungsi yang tidak menolak Tamu dengan GalatAkses");
});

test("Tamu tidak bisa masuk lewat pembuatan akun tanpa peran: peran bawaan Tamu, bukan Tim Prodi", () => {
  const auth = readFileSync(join(process.cwd(), "src/modules/bersama/auth.ts"), "utf8");
  assert.match(auth, /defaultRole: "TAMU"/);
});

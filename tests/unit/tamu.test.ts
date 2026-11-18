import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { berandaPeran, menuPeran } from "../../src/components/shell/menu-peran";
import { berandaPeran as berandaSesi, LABEL_PERAN, PERAN, peranAkses } from "../../src/modules/bersama/peran";
import { tamuDitolak } from "../../src/modules/bersama/domain/tamu";

/** Gabung LKPS G1 (= Rencana 18 Nov S1): peran Tamu hanya melihat dashboard akreditasi. */

function berkas(dir: string, cocok: (f: string) => boolean): string[] {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    return statSync(f).isDirectory() ? berkas(f, cocok) : cocok(f) ? [f] : [];
  });
}

test("peran Tamu: label, tanpa hak plugin admin, beranda dashboard", () => {
  assert.ok(PERAN.includes("TAMU"));
  assert.equal(LABEL_PERAN.TAMU, "Tamu");
  assert.deepEqual(peranAkses.TAMU.statements, {});
  assert.equal(berandaPeran("TAMU"), "/dashboard");
  assert.equal(berandaSesi("TAMU"), "/dashboard");
  // satu fungsi beranda: sidebar dan sesi sama untuk semua peran
  for (const p of PERAN) assert.equal(berandaPeran(p), berandaSesi(p), p);
});

test("menu Tamu hanya Dashboard akreditasi, di modul mana pun", () => {
  for (const k of ["led", "lkps"] as const) {
    const href = menuPeran("TAMU", k).flatMap((g) => g.item.map((i) => i.href));
    assert.deepEqual(href, ["/dashboard"], k);
  }
});

test("pembungkus aksi dan rute menolak Tamu kecuali ditandai bolehTamu", () => {
  assert.equal(tamuDitolak("TAMU"), true);
  assert.equal(tamuDitolak("TAMU", { bolehTamu: true }), false);
  for (const p of ["ADMIN", "TIM_PRODI", "ASESOR"]) assert.equal(tamuDitolak(p), false, p);
});

test("setiap rute API lewat jalankanRute dan setiap aksi server lewat jalankanAksi (penjaga Tamu berlaku)", () => {
  const akar = process.cwd();
  const rute = berkas(join(akar, "src/app/api"), (f) => /route\.ts$/.test(f))
    .filter((f) => !/[\\/]auth[\\/]\[\.\.\.all\][\\/]/.test(f));
  assert.ok(rute.length > 10);
  for (const f of rute) assert.match(readFileSync(f, "utf8"), /jalankanRute\(/, relative(akar, f));

  const aksi = berkas(join(akar, "src/app"), (f) => /\.ts$/.test(f)).filter((f) => /^"use server";/.test(readFileSync(f, "utf8")));
  for (const f of aksi) {
    const s = readFileSync(f, "utf8");
    const nama = relative(akar, f).replace(/\\/g, "/");
    // satu-satunya aksi tanpa sesi: admin pertama di halaman login (hanya bila belum ada admin)
    if (nama === "src/app/login/aksi.ts") continue;
    const ekspor = (s.match(/^export async function/gm) ?? []).length;
    const bungkus = (s.match(/jalankanAksi\(/g) ?? []).length;
    assert.ok(bungkus >= ekspor, `${nama}: ${ekspor} aksi, ${bungkus} jalankanAksi`);
  }
  // hanya ganti kata sandi sendiri yang boleh untuk Tamu
  const boleh = aksi.filter((f) => /bolehTamu: true/.test(readFileSync(f, "utf8"))).map((f) => relative(akar, f).replace(/\\/g, "/"));
  assert.deepEqual(boleh, ["src/app/akun/aksi.ts"]);
});

test("halaman: semua layout/halaman ber-wajibLogin selain beranda, LKPS dibatasi, dashboard menerima Tamu", () => {
  const akar = process.cwd();
  const lkps = readFileSync(join(akar, "src/app/lkps/layout.tsx"), "utf8");
  assert.match(lkps, /wajibPeran\("ADMIN", "TIM_PRODI", "ASESOR"\)/);
  assert.match(readFileSync(join(akar, "src/app/dashboard/layout.tsx"), "utf8"), /wajibPeran\("ADMIN", "TAMU"\)/);
  const halaman = berkas(join(akar, "src/app"), (f) => /(page|layout)\.tsx$/.test(f))
    .filter((f) => /wajibLogin\(/.test(readFileSync(f, "utf8")))
    .map((f) => relative(akar, f).replace(/\\/g, "/"))
    .sort();
  // wajibLogin (peran apa pun) hanya di halaman awal (Tamu dialihkan ke dashboard) dan ganti kata sandi
  assert.deepEqual(halaman, ["src/app/akun/ganti-sandi/page.tsx", "src/app/page.tsx"]);
});

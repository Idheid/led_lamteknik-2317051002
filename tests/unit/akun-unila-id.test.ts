import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { skemaAkun, skemaUbahIdentitasAkun } from "../../src/modules/bersama/validasi";
import { caraMasukAkun, labelCaraMasuk } from "../../src/modules/bersama/sso/penyedia";

/** Rencana 18 Nov S4: validasi UNILA ID, cara masuk, dan akun tanpa kata sandi. */

const akar = join(__dirname, "..", "..");
const baca = (f: string) => readFileSync(join(akar, f), "utf8");

test("UNILA ID: dipangkas, huruf kecil, kosong = null, karakter dibatasi", () => {
  const dasar = { nama: "A", email: "a@uji.test", kataSandi: "SandiA#123" };
  assert.equal(skemaAkun.parse({ ...dasar, usernameSso: "  Budi.S_01 " }).usernameSso, "budi.s_01");
  assert.equal(skemaAkun.parse({ ...dasar, usernameSso: "   " }).usernameSso, null);
  assert.equal(skemaAkun.parse(dasar).usernameSso, null);
  assert.equal(skemaUbahIdentitasAkun.parse({ nama: "A", usernameSso: null }).usernameSso, null);
  assert.equal(skemaAkun.safeParse({ ...dasar, usernameSso: "budi santoso" }).success, false);
  assert.equal(skemaAkun.safeParse({ ...dasar, usernameSso: "budi@unila.ac.id" }).success, false);
  assert.equal(skemaAkun.safeParse({ ...dasar, usernameSso: "x".repeat(65) }).success, false);
});

test("Cara masuk: sandi, SSO, atau keduanya", () => {
  assert.equal(labelCaraMasuk(caraMasukAkun([{ providerId: "credential" }])), "Sandi");
  assert.equal(labelCaraMasuk(caraMasukAkun([{ providerId: "sso-unila" }])), "SSO");
  assert.equal(labelCaraMasuk(caraMasukAkun([{ providerId: "sso-unila" }, { providerId: "credential" }])), "Sandi dan SSO");
  assert.equal(labelCaraMasuk(caraMasukAkun([])), "-");
});

test("Akun tanpa kata sandi: menu Ganti kata sandi disembunyikan dan halamannya mengalihkan", () => {
  assert.match(baca("src/components/shell/menu-pengguna.tsx"), /\{punyaSandi && \(\s*<DropdownMenuItem asChild>\s*<Link href="\/akun\/ganti-sandi">/);
  assert.match(baca("src/components/shell/shell-aplikasi.tsx"), /punyaSandi=\{pengguna\.punyaSandi !== false\}/);
  assert.match(baca("src/app/page.tsx"), /punyaSandi=\{p\.punyaSandi !== false\}/);
  assert.match(baca("src/app/akun/ganti-sandi/page.tsx"), /if \(p\.punyaSandi === false\) redirect\(berandaPeran\(p\.peran\)\)/);
  const sesi = baca("src/modules/bersama/sesi.ts");
  assert.match(sesi, /punyaSandi: sandi > 0/);
  assert.match(sesi, /wajibGantiSandi: sandi > 0 && /);
  // Kelola akun: atur ulang sandi hanya untuk akun bersandi; kolom Cara masuk dan penyaring Tamu baru
  const halaman = baca("src/app/admin/akun/page.tsx");
  assert.match(halaman, /punyaSandi=\{cara\.sandi\}/);
  assert.match(halaman, /<TableHead>Cara masuk<\/TableHead>/);
  assert.match(halaman, /href="\/admin\/akun\?saring=tamu"/);
});

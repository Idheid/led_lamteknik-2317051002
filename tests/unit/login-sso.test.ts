import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BATAS_LOGIN_GAGAL, LAMA_KUNCI_DETIK, pesanTerkunci, statusKunci } from "../../src/modules/bersama/domain/login-gagal";
import { PESAN_GALAT_SSO, pesanGalatSso } from "../../src/modules/bersama/sso/pesan";
import { ssoAktif } from "../../src/modules/bersama/sso/konfigurasi";

/** Rencana 18 Nov S3: halaman login dua pilihan dan batas login gagal. */

const akar = join(__dirname, "..", "..");
const t0 = new Date("2026-11-23T08:00:00Z");
const detik = (n: number) => new Date(t0.getTime() + n * 1000);

test("batas login gagal: 3 kali dalam 300 detik → terkunci sampai kegagalan tertua berumur 300 detik", () => {
  assert.equal(BATAS_LOGIN_GAGAL, 3);
  assert.equal(LAMA_KUNCI_DETIK, 300);
  assert.deepEqual(statusKunci([detik(0), detik(10)], detik(20)), { terkunci: false, sisaDetik: 0 });
  assert.deepEqual(statusKunci([detik(0), detik(10), detik(20)], detik(30)), { terkunci: true, sisaDetik: 270 });
  // waktu dipalsukan: 5 menit sesudah kegagalan pertama → boleh lagi
  assert.equal(statusKunci([detik(0), detik(10), detik(20)], detik(300)).terkunci, false);
  // kegagalan lama di luar jendela tidak dihitung
  assert.equal(statusKunci([detik(-400), detik(-350), detik(10)], detik(20)).terkunci, false);
});

test("pesan terkunci dalam menit, dibulatkan ke atas", () => {
  assert.equal(pesanTerkunci(270), "Terlalu banyak percobaan. Coba lagi dalam 5 menit.");
  assert.equal(pesanTerkunci(30), "Terlalu banyak percobaan. Coba lagi dalam 1 menit.");
});

test("pesan galat SSO: kode dikenal → teks tetap; kode lain tidak pernah ditampilkan mentah", () => {
  assert.equal(pesanGalatSso("sso_mahasiswa"), PESAN_GALAT_SSO.sso_mahasiswa);
  assert.equal(Object.keys(PESAN_GALAT_SSO).length, 5);
  assert.equal(pesanGalatSso("<script>alert(1)</script>"), null);
  assert.equal(pesanGalatSso("toString"), null);
  assert.equal(pesanGalatSso(["sso_gagal"]), null);
  assert.equal(pesanGalatSso(undefined), null);
});

test("saklar SSO: hanya SSO_AKTIF=true; tombol SSO dirender hanya bila aktif", () => {
  assert.equal(ssoAktif({}), false);
  assert.equal(ssoAktif({ SSO_AKTIF: "false" }), false);
  assert.equal(ssoAktif({ SSO_AKTIF: "1" }), false);
  assert.equal(ssoAktif({ SSO_AKTIF: " TRUE " }), true);
  const form = readFileSync(join(akar, "src/app/login/form-login.tsx"), "utf8");
  assert.match(form, /\{sso && \(/);
  assert.match(form, /Masuk dengan SSO Unila/);
  const halaman = readFileSync(join(akar, "src/app/login/page.tsx"), "utf8");
  assert.match(halaman, /const sso = ssoAktif\(\);/);
  assert.match(halaman, /galatSso=\{pesanGalatSso\(galat\)\}/);
  // 23 Nov 2026: foto latar dan logo LAM Teknik hanya dari public/login (tanpa gambar dari situs lain), dengan cadangan
  const aset = readFileSync(join(akar, "src/app/login/aset.ts"), "utf8");
  assert.match(aset, /"public", "login"/);
  assert.doesNotMatch(halaman + form + aset, /https?:\/\/[^"'\s]*\.(png|jpe?g|svg|webp)/i);
  assert.match(halaman, /aset\.latar \|\| aset\.logo \? \(/);
});

test("S3 tambahan: logo dan foto latar ada, dan semua jenis gambarnya tidak dialihkan proxy ke /login", async () => {
  const { existsSync: ada } = await import("node:fs");
  const { join: gabung } = await import("node:path");
  const { config } = await import("../../src/proxy");
  const akar = gabung(__dirname, "..", "..");
  assert.ok(ada(gabung(akar, "public/login/logo-lam-teknik.png")));
  assert.ok(ada(gabung(akar, "public/login/latar.webp")));
  const pola = new RegExp(`^${config.matcher[0]}$`);
  for (const f of ["/login/latar.webp", "/login/latar.jpg", "/login/latar.jpeg", "/login/logo-lam-teknik.png", "/login/logo-lam-teknik.svg"]) {
    assert.equal(pola.test(f), false, f);
  }
  for (const h of ["/dashboard", "/admin/akun", "/login"]) assert.equal(pola.test(h), true, h);
});

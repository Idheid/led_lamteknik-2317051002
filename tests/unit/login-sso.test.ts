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
  // halaman login tidak memakai logo Unila/LAM Teknik
  assert.doesNotMatch(halaman + form, /<img|<Image|next\/image|logo-sampul|\.(png|jpe?g|svg)/i);
});

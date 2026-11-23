import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { domainEmail, putuskan } from "../../src/modules/bersama/sso/aturan";
import { URL_MULAI_BAWAAN, konfigurasiSso } from "../../src/modules/bersama/sso/konfigurasi";
import { stateCocok, tujuanAman } from "../../src/modules/bersama/sso/state";
import type { HasilSso } from "../../src/modules/bersama/sso/penyedia";

/** Rencana 18 Nov S5: aturan login SSO, konfigurasi, state, tiket tiruan. */

process.env.BETTER_AUTH_SECRET ??= "rahasia-uji-unit-sso-0123456789abcdef";

const akar = join(__dirname, "..", "..");
const k = { domainEmailDitolak: ["students.unila.ac.id"] };
const dosen: HasilSso = { username: "budi", nama: "Budi", email: "budi@unila.ac.id", aktif: true, status: "dosen" };

test("putuskan: semua cabang dan urutannya", () => {
  // 1. nonaktif didahulukan (walaupun mahasiswa dan akunnya ada)
  assert.deepEqual(putuskan({ ...dosen, aktif: false, status: "mahasiswa" }, { id: "u1", banned: true }, k), { jenis: "tolak", kode: "sso_nonaktif" });
  // 2. mahasiswa: lewat status atau domain email, sebelum pencocokan akun
  assert.deepEqual(putuskan({ ...dosen, status: "Mahasiswa" }, { id: "u1", banned: false }, k), { jenis: "tolak", kode: "sso_mahasiswa" });
  assert.deepEqual(putuskan({ ...dosen, email: "x@Students.Unila.ac.id", status: null }, null, k), { jenis: "tolak", kode: "sso_mahasiswa" });
  // 3. akun dinonaktifkan
  assert.deepEqual(putuskan(dosen, { id: "u1", banned: true }, k), { jenis: "tolak", kode: "sso_dinonaktifkan" });
  // 4. akun ada → masuk (banned null = aktif)
  assert.deepEqual(putuskan(dosen, { id: "u1", banned: null }, k), { jenis: "masuk", userId: "u1" });
  assert.deepEqual(putuskan(dosen, { id: "u1", banned: false }, k), { jenis: "masuk", userId: "u1" });
  // 5. tidak ada → Tamu; email kosong boleh
  assert.deepEqual(putuskan({ ...dosen, email: null }, null, k), { jenis: "buatTamu" });
  assert.deepEqual(putuskan(dosen, null, { domainEmailDitolak: [] }), { jenis: "buatTamu" });
  assert.equal(domainEmail("a@B.c"), "b.c");
  assert.equal(domainEmail("tanpa-at"), null);
});

test("konfigurasi: bawaan mati dan mode akses; tiruan ditolak di produksi; domain dinormalkan", () => {
  const b = konfigurasiSso({});
  assert.deepEqual([b.aktif, b.mode, b.appKey, b.urlMulai, b.domainEmailDitolak], [false, "akses", null, URL_MULAI_BAWAAN, []]);
  assert.equal(konfigurasiSso({ SSO_AKTIF: "true", SSO_MODE: "tiruan", NODE_ENV: "development" }).mode, "tiruan");
  assert.throws(() => konfigurasiSso({ SSO_MODE: "tiruan", NODE_ENV: "production" }), /tidak boleh dipakai di produksi/);
  assert.throws(() => konfigurasiSso({ SSO_MODE: "cas" }), /SSO_MODE/);
  assert.deepEqual(konfigurasiSso({ SSO_DOMAIN_EMAIL_DITOLAK: " @Students.Unila.ac.id, ,mhs.test " }).domainEmailDitolak, ["students.unila.ac.id", "mhs.test"]);
});

test("state dan tujuan: waktu konstan, kosong ditolak, hanya jalur dalam aplikasi", () => {
  assert.equal(stateCocok("abc", "abc"), true);
  assert.equal(stateCocok("abc", "abd"), false);
  assert.equal(stateCocok("abc", "abcd"), false);
  assert.equal(stateCocok(null, "abc"), false);
  assert.equal(stateCocok("", ""), false);
  assert.equal(tujuanAman("/led"), "/led");
  for (const x of ["//jahat.test", "/\\jahat.test", "https://jahat.test", "/login", "/api/sso/mulai", "", null]) assert.equal(tujuanAman(x), null, String(x));
});

test("tiket tiruan: sah, diubah, kedaluwarsa", async () => {
  const { bacaTiketTiruan, buatTiketTiruan } = await import("../../src/modules/bersama/sso/tiruan");
  const t = buatTiketTiruan({ ...dosen, username: " Budi.S ", email: "BUDI@unila.ac.id" }, 1_000);
  assert.deepEqual(bacaTiketTiruan(t, 1_000), { username: "budi.s", nama: "Budi", email: "budi@unila.ac.id", aktif: true, status: "dosen" });
  const [isi, ttd] = t.split(".");
  const palsu = Buffer.from(JSON.stringify({ h: { ...dosen, username: "admin" }, k: 10 ** 13 })).toString("base64url");
  assert.throws(() => bacaTiketTiruan(`${palsu}.${ttd}`, 1_000), /Tanda/);
  assert.throws(() => bacaTiketTiruan(`${isi}.${ttd}x`, 1_000), /Tanda/);
  assert.throws(() => bacaTiketTiruan(t, 1_000 + 3 * 60_000), /kedaluwarsa/);
  assert.throws(() => bacaTiketTiruan("asal", 1_000), /tidak sah/);
});

test("penyedia Access belum dikonfigurasi dan tidak menebak parameter", async () => {
  const { penyediaAkses } = await import("../../src/modules/bersama/sso/akses");
  assert.throws(() => penyediaAkses.urlMasuk("s"), /Penyedia Access belum dikonfigurasi/);
  await assert.rejects(penyediaAkses.bacaHasil(new Request("http://x/")), /belum dikonfigurasi/);
  const isi = readFileSync(join(akar, "src/modules/bersama/sso/akses.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(isi, /app_key|nm_pengguna|a_aktif|fetch\(/);
});

test("rute SSO: tiruan mati di produksi; endpoint sesi hanya server; sesi tidak ditulis manual", () => {
  const tiruan = readFileSync(join(akar, "src/app/api/sso/tiruan/route.ts"), "utf8");
  assert.match(tiruan, /process\.env\.NODE_ENV === "production"/);
  const plugin = readFileSync(join(akar, "src/modules/bersama/sso/plugin.ts"), "utf8");
  assert.match(plugin, /SERVER_ONLY: true/);
  assert.match(plugin, /setSessionCookie\(ctx/);
  const kembali = readFileSync(join(akar, "src/app/api/sso/kembali/route.ts"), "utf8");
  assert.doesNotMatch(kembali, /session_token|cookies\.set\(/);
  for (const r of ["mulai", "kembali", "tiruan"]) assert.ok(existsSync(join(akar, `src/app/api/sso/${r}/route.ts`)), r);
});

test("S6: tombol Keluar memakai /api/sso/keluar dan berpindah penuh; tiruan memberi alamat keluar tiruan", async () => {
  const menu = readFileSync(join(akar, "src/components/shell/menu-pengguna.tsx"), "utf8");
  assert.match(menu, /fetch\("\/api\/sso\/keluar", \{ method: "POST" \}\)/);
  assert.match(menu, /window\.location\.assign\(tujuan\)/);
  assert.match(menu, /await authClient\.signOut\(\)/, "cadangan bila rute gagal");
  const { penyediaTiruan } = await import("../../src/modules/bersama/sso/tiruan");
  assert.equal(penyediaTiruan.urlKeluar("http://x.test/login"), "/api/sso/tiruan/keluar?kembali=http%3A%2F%2Fx.test%2Flogin");
  assert.match(readFileSync(join(akar, "src/app/api/sso/tiruan/keluar/route.ts"), "utf8"), /process\.env\.NODE_ENV !== "production"/);
});

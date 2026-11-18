import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { penolakanRute } from "../../src/modules/bersama/domain/tamu";

/**
 * Gabung LKPS G4: tabel rute LKPS (RENCANA-GABUNG-LKPS G4 butir 4) dan penjaga sesi. Route Handler tidak bisa dijalankan
 * di uji node (butuh server Next untuk sesi), jadi penjaganya diuji lewat fungsi murni `penolakanRute` yang dipakai
 * `jalankanRute`, ditambah pemeriksaan bahwa setiap rute LKPS lewat `jalankanRute`.
 */

const akar = process.cwd();
const API = join(akar, "src/app/api/lkps");

function berkas(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    return statSync(f).isDirectory() ? berkas(f) : /route\.ts$/.test(f) ? [f] : [];
  });
}

/** Rute tujuan → metode (asal kode Ghalib di komentar). */
const TABEL: Record<string, string[]> = {
  kerjasama: ["GET", "POST"], // /api/kerjasama
  mahasiswa: ["GET", "POST"], // /api/mahasiswa
  sdm: ["GET", "POST"], // /api/sdm
  keuangan: ["GET", "POST"], // /api/keuangan
  pendidikan: ["GET", "POST"], // /api/pendidikan
  penelitian: ["GET", "POST"], // /api/penelitian
  pkm: ["GET", "POST"], // /api/pkm
  luaran: ["GET", "POST"], // /api/luaran
  penjaminan: ["GET", "POST"], // /api/penjaminan
  identitas: ["GET", "POST"], // /api/identitas
  "kriteria/[id]": ["GET", "POST"], // /api/kriteria/[id]
  konfigurasi: ["GET", "POST"], // /api/konfigurasi
  computation: ["GET"], // /api/computation
  impor: ["POST"], // /api/ingestion
  ekspor: ["GET"], // /api/export
  bukti: ["GET", "POST"], // /api/upload (+ unduh baru)
};

test("tabel rute LKPS lengkap dan rute yang dibuang tidak ada", () => {
  const ada = berkas(API).map((f) => relative(API, f).replace(/\\/g, "/").replace(/\/route\.ts$/, "")).sort();
  assert.deepEqual(ada, Object.keys(TABEL).sort());
  for (const [r, metode] of Object.entries(TABEL)) {
    const s = readFileSync(join(API, r, "route.ts"), "utf8");
    const ekspor = [...s.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]).sort();
    assert.deepEqual(ekspor, [...metode].sort(), r);
  }
  for (const dibuang of ["prodi", "admin", "notifications", "sync-led", "upload", "export", "ingestion"]) {
    assert.equal(existsSync(join(API, dibuang)), false, dibuang);
  }
});

test("setiap rute LKPS lewat jalankanRute; semua kecuali konfigurasi memakai prodi aktif dari server", () => {
  for (const f of berkas(API)) {
    const s = readFileSync(f, "utf8");
    const nama = relative(API, f).replace(/\\/g, "/");
    const metode = (s.match(/export (?:async )?function (GET|POST)\b/g) ?? []).length;
    assert.ok((s.match(/jalankanRute\(/g) ?? []).length >= metode, nama);
    if (!nama.startsWith("konfigurasi/") && !nama.startsWith("bukti/")) {
      assert.ok((s.match(/prodiAktifWajib\(/g) ?? []).length >= metode, `${nama}: prodiAktifWajib`);
    }
    assert.doesNotMatch(s, /prodiId:\s*body|prodiId:\s*r\.prodiId|public[\\/]uploads/, nama);
  }
});

test("penjaga rute: tanpa login 401, Tamu 403, wajib ganti sandi 403, peran lain lolos", () => {
  assert.equal(penolakanRute(null)?.status, 401);
  assert.equal(penolakanRute({ peran: "TAMU" })?.status, 403);
  assert.equal(penolakanRute({ peran: "ADMIN", wajibGantiSandi: true })?.status, 403);
  for (const peran of ["ADMIN", "TIM_PRODI", "ASESOR"]) assert.equal(penolakanRute({ peran }), null, peran);
  // unduh bukti juga lewat jalankanRute: tanpa login berhenti di 401 sebelum berkas dibaca
  const bukti = readFileSync(join(API, "bukti/route.ts"), "utf8");
  assert.match(bukti, /export function GET[\s\S]*?return jalankanRute\(async \(p\) => \{\s*const kunci/);
  const rute = readFileSync(join(akar, "src/modules/bersama/rute.ts"), "utf8");
  assert.match(rute, /penolakanRute\(p\)/);
});

test("tidak ada berkas LKPS di public/ dan dependensi xlsx tidak dipakai", () => {
  assert.equal(existsSync(join(akar, "public/uploads")), false);
  const pkg = JSON.parse(readFileSync(join(akar, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  assert.equal(pkg.dependencies.xlsx, undefined);
  assert.ok(pkg.dependencies.exceljs);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/**
 * Batas modul (31 Okt 2026): satu website, tiga folder modul di src/modules.
 * - lkps dan led boleh memakai bersama.
 * - lkps tidak memakai led (LED yang membaca LKPS lewat src/modules/lkps/index.ts, bukan sebaliknya).
 * - bersama tidak memakai lkps; bersama memakai led hanya di tempat yang tercatat di IZIN_BERSAMA_KE_LED
 *   (melanjutkan pekerjaan LED setelah kunci API baru ditambahkan, dan instrumen bawaan saat pemasangan pertama).
 */
const AKAR = process.cwd();
const SRC = join(AKAR, "src");

const IZIN_BERSAMA_KE_LED = new Set([
  "bersama/data/kunci-api.ts -> led/data/dokumen",
  "bersama/data/kunci-api.ts -> led/data/tugas-generate",
  "bersama/data/kunci-api.ts -> led/data/unggah-instrumen",
  "bersama/data/pemasangan.ts -> led/data/impor-instrumen",
]);

function berkasTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return berkasTs(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

/** Modul tujuan setiap impor (alias @/modules/... atau jalur relatif), mis. "led/data/dokumen". */
function imporModul(berkas: string): string[] {
  const isi = readFileSync(berkas, "utf8");
  const hasil: string[] = [];
  for (const m of isi.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g)) {
    const spes = m[1];
    let abs: string | null = null;
    if (spes.startsWith("@/")) abs = join(SRC, spes.slice(2));
    else if (spes.startsWith(".")) abs = resolve(join(berkas, ".."), spes);
    if (!abs) continue;
    const r = relative(join(SRC, "modules"), abs).split(sep).join("/");
    if (!r.startsWith("..")) hasil.push(r.replace(/\.(ts|tsx)$/, ""));
  }
  return hasil;
}

function pelanggaran(modul: string, boleh: (dari: string, ke: string) => boolean): string[] {
  const salah: string[] = [];
  for (const f of berkasTs(join(SRC, "modules", modul))) {
    const dari = relative(join(SRC, "modules"), f).split(sep).join("/");
    for (const ke of imporModul(f)) if (!boleh(dari, ke)) salah.push(`${dari} -> ${ke}`);
  }
  return salah;
}

test("modul LKPS tidak memakai modul LED", () => {
  assert.deepEqual(pelanggaran("lkps", (_d, ke) => !ke.startsWith("led/")), []);
});

test("modul bersama tidak memakai LKPS dan hanya memakai LED di tempat yang diizinkan", () => {
  assert.deepEqual(pelanggaran("bersama", (d, ke) => {
    if (ke.startsWith("lkps/")) return false;
    if (ke.startsWith("led/")) return IZIN_BERSAMA_KE_LED.has(`${d} -> ${ke}`);
    return true;
  }), []);
});

test("modul LED tidak memakai isi dalam modul LKPS selain pintunya (index.ts)", () => {
  assert.deepEqual(pelanggaran("led", (_d, ke) => !ke.startsWith("lkps/") || ke === "lkps" || ke === "lkps/index"), []);
});

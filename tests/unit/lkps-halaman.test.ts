import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { KRITERIA_LKPS, menuLkps, menuPeran } from "../../src/components/shell/menu-peran";

/** Gabung LKPS G5 (RENCANA-GABUNG-LKPS G5): halaman LKPS di kerangka LED, menu sidebar, dan gaya terlingkup. */

const akar = join(__dirname, "..", "..");
const komponen = join(akar, "src/modules/lkps/komponen");

function berkasTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? berkasTsx(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

test("menu LKPS: beranda, identitas, K1–K9, impor, ekspor; struktur kriteria hanya Admin UPPS", () => {
  const admin = menuLkps("ADMIN").item.map((i) => i.href);
  const tim = menuLkps("TIM_PRODI").item.map((i) => i.href);
  const asesor = menuLkps("ASESOR").item.map((i) => i.href);
  for (const h of ["/lkps", "/lkps/identitas", "/lkps/impor", "/lkps/ekspor", ...KRITERIA_LKPS.map((k) => k.href)]) {
    assert.ok(admin.includes(h) && tim.includes(h) && asesor.includes(h), h);
  }
  assert.equal(KRITERIA_LKPS.length, 9);
  assert.ok(admin.includes("/lkps/konfigurasi"));
  assert.ok(!tim.includes("/lkps/konfigurasi") && !asesor.includes("/lkps/konfigurasi"));
  // menu lama "Data LKPS" / "Kelengkapan LKPS prodi" diganti
  assert.ok(!menuPeran("ADMIN", "lkps").flatMap((g) => g.item).some((i) => /Kelengkapan LKPS|Data LKPS/.test(i.judul)));
});

test("menu LKPS: kriteria tambahan konfigurasi aktif masuk sesudah K9", () => {
  const item = menuLkps("TIM_PRODI", [{ id: "k10", kode: "K10", nama: "Kriteria Kustom" }]).item;
  const i9 = item.findIndex((i) => i.href === "/lkps/penjaminan");
  assert.equal(item[i9 + 1].href, "/lkps/kriteria/k10");
  assert.equal(menuPeran("ASESOR", "lkps", [{ id: "x", kode: "K10", nama: "X" }])[0].item.some((i) => i.href === "/lkps/kriteria/x"), true);
  // kode bebas yang panjang diganti K{nomor urut}
  assert.equal(menuLkps("TIM_PRODI", [{ id: "k11", kode: "Kriteria 11", nama: "Y", nomorUrut: 11 }]).item.find((i) => i.href === "/lkps/kriteria/k11")?.kode, "K11");
});

test("setiap menu LKPS punya halaman di src/app/lkps", () => {
  for (const it of [...menuLkps("ADMIN").item, { href: "/lkps/kriteria/[id]" }]) {
    assert.ok(existsSync(join(akar, "src/app", it.href, "page.tsx")), it.href);
  }
});

test("halaman klien LKPS hanya memanggil /api/lkps dan tidak memakai sesi/izin kode asal", () => {
  for (const f of berkasTsx(komponen)) {
    // komentar boleh menyebut nama kode asal
    const isi = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of isi.matchAll(/['"`]\/api\/([^'"`]*)/g)) assert.ok(m[1].startsWith("lkps/"), `${f}: /api/${m[1]}`);
    assert.doesNotMatch(isi, /@\/lib\/|useSession|OPERATOR_PRODI|ADMIN_UPPS|SUPER_ADMIN/, f);
    assert.doesNotMatch(isi, /sync-led/, f);
  }
});

test("G7: gaya kode asal dihapus; halaman LKPS hanya memakai komponen LED", () => {
  assert.equal(existsSync(join(komponen, "gaya-lkps.css")), false);
  assert.equal(existsSync(join(komponen, "bersama/ikon-lencana.tsx")), false);
  const kelasAsal = /className=["'`{][^"'`]*(card|btn|badge|page-content|form-input|form-select|section-title|empty-state|data-table|table-container|modal-[a-z]+|score-[a-z]+|icon-badge)/;
  for (const f of berkasTsx(komponen)) {
    const isi = readFileSync(f, "utf8");
    assert.doesNotMatch(isi, kelasAsal, f);
    assert.doesNotMatch(isi, /var\(--lkps-|lkps-klasik|eslint-disable|confirm\(|alert\(/, f);
  }
});

test("layout LKPS: pemilih prodi untuk Admin/reviewer, tanpa gaya kode asal", () => {
  const layout = readFileSync(join(akar, "src/app/lkps/layout.tsx"), "utf8");
  assert.doesNotMatch(layout, /gaya-lkps|lkps-klasik/);
  assert.match(layout, /p\.peran !== "TIM_PRODI" && <PemilihProdi/);
  const rootLayout = readFileSync(join(akar, "src/app/layout.tsx"), "utf8");
  assert.doesNotMatch(rootLayout, /gaya-lkps/);
  const konfig = readFileSync(join(akar, "src/app/lkps/konfigurasi/page.tsx"), "utf8");
  assert.match(konfig, /wajibPeran\("ADMIN"\)/);
});

test("penanda modul: MODUL_LKPS.siap true", async () => {
  const { MODUL_LKPS } = await import("../../src/modules/lkps/index");
  assert.equal(MODUL_LKPS.siap, true);
});

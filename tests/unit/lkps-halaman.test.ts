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

test("gaya-lkps.css: semua selektor di bawah .lkps-klasik, variabel berawalan --lkps-, tanpa @import", () => {
  const css = readFileSync(join(komponen, "gaya-lkps.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(css, /@import|:root|(^|[\s,}])(body|html)\s*[{,]/);
  // definisi variabel hanya --lkps-*
  for (const m of css.matchAll(/(^|[;{\s])--([\w-]+)\s*:/g)) assert.ok(m[2].startsWith("lkps-"), m[2]);
  // setiap aturan (bukan @media/@keyframes atau isi keyframes) diawali .lkps-klasik
  let dalamKeyframes = 0;
  for (const kepala of css.matchAll(/([^{}]+)\{/g)) {
    const sel = kepala[1].trim();
    if (sel.startsWith("@keyframes")) {
      assert.match(sel, /@keyframes lkps-/);
      dalamKeyframes = 1;
      continue;
    }
    if (sel.startsWith("@media")) continue;
    if (dalamKeyframes && /^(from|to|\d+%)/.test(sel)) continue;
    dalamKeyframes = 0;
    for (const s of sel.split(",")) assert.ok(s.trim().startsWith(".lkps-klasik"), s);
  }
});

test("layout LKPS: gaya hanya diimpor di layout LKPS, konten dibungkus .lkps-klasik, pemilih prodi untuk Admin/reviewer", () => {
  const layout = readFileSync(join(akar, "src/app/lkps/layout.tsx"), "utf8");
  assert.match(layout, /import "@\/modules\/lkps\/komponen\/gaya-lkps\.css"/);
  assert.match(layout, /className="lkps-klasik/);
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

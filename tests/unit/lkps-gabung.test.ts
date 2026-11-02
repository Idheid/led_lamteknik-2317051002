import { test } from "node:test";
import assert from "node:assert/strict";
import { gabungTabelLkps, ringkasTabelTerbaca } from "@/modules/led/data-lkps/gabung";

test("Revisi 31 Okt 2026: tabel LKPS dari banyak berkas digabung, berkas terbaru menang, urut seperti template", () => {
  const lama = { tabel: [{ sheet: "4a", isi: "lama" }, { sheet: "2b", isi: "lama" }, { sheet: "1", isi: "lama" }] };
  const baru = { tabel: [{ sheet: "4a", isi: "baru" }, { sheet: "6d", isi: "baru" }] };
  const g = gabungTabelLkps([baru, lama]);
  assert.deepEqual(g.map((t) => t.sheet), ["1", "2b", "4a", "6d"]);
  assert.equal(g.find((t) => t.sheet === "4a")?.isi, "baru");
  assert.deepEqual(gabungTabelLkps([]), []);
});

test("Revisi 31 Okt 2026: daftar tabel terbaca dan belum ada mengikuti jenjang", () => {
  const r = ringkasTabelTerbaca(["1", "4a", "3a2"], "S1");
  assert.ok(r.terbaca.includes("1") && r.terbaca.includes("4.a"));
  assert.ok(!r.terbaca.includes("3.a.2"), "tabel khusus PPI tidak dihitung untuk Sarjana");
  assert.ok(r.belum.includes("2.b"));
  assert.ok(r.belum.includes("2.a (2a1)") && r.belum.includes("2.a (2a2)"), "sheet yang berbagi kode tabel dibedakan");
  assert.ok(!r.belum.includes("4.a"));
  assert.equal(r.terbaca.length + r.belum.length, ringkasTabelTerbaca([], "S1").belum.length);
});

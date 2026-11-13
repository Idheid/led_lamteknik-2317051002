import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bacaCsv, bacaCsvObjek, tulisCsv } from "../../src/modules/led/domain/csv";
import {
  hitungRetrieval, labelDariCsv, peringkatDariCsv, ringkasanCsvBaris, tabelMarkdown, bacaRelevan,
} from "../../src/modules/led/domain/metrik-retrieval";
import { susunPool } from "../../src/modules/led/domain/pool-pencarian";
import { bacaDaftarKonfigurasi, konfigurasiAktif, konfigurasiBawaan } from "../../src/modules/led/domain/konfigurasi-pencarian";

/** Rencana 10 Nov T2: data uji pencarian, dicocokkan dengan docs/uji/hitungan-manual-retrieval.md. */

const dekat = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-3, `${a} ≈ ${b}`);

test("precision@k dan recall@k fikstur sama dengan hitungan manual", () => {
  const baris = bacaCsvObjek(readFileSync("tests/fikstur/retrieval/label-contoh.csv", "utf8"));
  const h = hitungRetrieval(labelDariCsv(baris), peringkatDariCsv(baris, ["A-lama"]), [1, 3, 5, 8]);
  const s1 = h.perSubBagian.find((x) => x.subBagian === "L1 | C.1-LB")!;
  assert.equal(s1.jumlahRelevan, 4);
  dekat(s1.precision["1"], 1); dekat(s1.recall["1"], 0.25);
  dekat(s1.precision["3"], 2 / 3); dekat(s1.recall["3"], 0.5);
  dekat(s1.precision["5"], 0.4); dekat(s1.recall["5"], 0.5);
  dekat(s1.precision["8"], 0.375); dekat(s1.recall["8"], 0.75);
  assert.equal(s1.tanpaLabelDiAtas, 1, "p5 belum dilabel di k teratas");
  const s2 = h.perSubBagian.find((x) => x.subBagian === "L1 | C.2-LB")!;
  assert.equal(s2.recall["5"], null);
  assert.ok(!h.perSubBagian.some((x) => x.subBagian === "L1 | C.3-LB"), "sub-bagian tanpa label tidak dinilai");
  const r = h.rata["A-lama"];
  dekat(r["1"].precision, 0.5); dekat(r["1"].recall, 0.25);
  dekat(r["3"].precision, 1 / 3); dekat(r["3"].recall, 0.5);
  dekat(r["5"].precision, 0.2); dekat(r["5"].recall, 0.5);
  dekat(r["8"].precision, 0.1875); dekat(r["8"].recall, 0.75);
  assert.equal(r["8"].nPrecision, 2);
  assert.equal(r["8"].nRecall, 1);
  assert.equal(h.barisTanpaLabel, 3);
  assert.deepEqual(h.subBagianTanpaRelevan, ["L1 | C.2-LB"]);

  const md = tabelMarkdown(h, { "A-lama": 8 });
  assert.match(md, /\| A-lama \(k sistem = 8\) \| 1,000|\| A-lama \(k sistem = 8\) \| 0,500/);
  assert.match(md, /Baris tanpa label: 3/);
  const ringkas = ringkasanCsvBaris(h);
  assert.ok(ringkas.baris.some((b) => b[1] === "(rata-rata)" && b[0] === "A-lama"));
});

test("nilai relevan salah ketik ditolak, ya/tidak diterima", () => {
  assert.equal(bacaRelevan(" Ya "), 1);
  assert.equal(bacaRelevan("tidak"), 0);
  assert.equal(bacaRelevan(""), null);
  assert.throws(() => bacaRelevan("2"), /relevan tidak dikenal/);
});

test("CSV: koma, kutip, dan baris baru di dalam sel bolak-balik utuh", () => {
  const csv = tulisCsv(["a", "b"], [["koma, di sini", 'kutip "x"'], ["baris\nbaru", 7]]);
  assert.deepEqual(bacaCsv(csv), [["a", "b"], ["koma, di sini", 'kutip "x"'], ["baris\nbaru", "7"]]);
  assert.deepEqual(bacaCsvObjek("﻿led,relevan\r\nX,1\r\n"), [{ led: "X", relevan: "1" }]);
});

test("pool: 20 teratas setiap jalur + k teratas gabungan, tanpa duplikat, membawa peringkat per konfigurasi", () => {
  const vektor = Array.from({ length: 30 }, (_, i) => `v${i + 1}`);
  const kata = Array.from({ length: 30 }, (_, i) => `k${i + 1}`);
  // potongan "x" peringkat 25 di kedua jalur: tidak masuk 20 teratas jalur mana pun, tetapi masuk k teratas gabungan
  vektor[24] = "x";
  kata[24] = "x";
  const pool = susunPool({ "A-lama": { vektor, kataKunci: kata, k: 8 } }, 20);
  const ids = pool.map((b) => b.potonganId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("v20") && ids.includes("k20") && !ids.includes("v21"));
  const x = pool.find((b) => b.potonganId === "x")!;
  assert.deepEqual([x.peringkat["A-lama"].v, x.peringkat["A-lama"].kk], [25, 25]);
  assert.ok(x.peringkat["A-lama"].g! <= 8, "potongan yang dipakai sistem ikut pool");
  assert.equal(pool[0].terbaik, 1);
});

test("konfigurasi: setelah T6 ketiganya aktif, C-unsur bawaan; nilai lingkungan tidak sah diabaikan", () => {
  assert.deepEqual(konfigurasiAktif(), ["A-lama", "B-bm25", "C-unsur"]);
  assert.equal(konfigurasiBawaan(undefined), "C-unsur", "bawaan = konfigurasi aktif terakhir");
  assert.equal(konfigurasiBawaan("A-lama"), "A-lama");
  assert.equal(konfigurasiBawaan("B-bm25"), "B-bm25");
  assert.equal(konfigurasiBawaan("ngawur"), "C-unsur");
  assert.deepEqual(bacaDaftarKonfigurasi("A-lama, A-lama,B-bm25,C-unsur"), ["A-lama", "B-bm25", "C-unsur"]);
  assert.throws(() => bacaDaftarKonfigurasi("Z"), /tidak dikenal/);
});

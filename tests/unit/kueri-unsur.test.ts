import { test } from "node:test";
import assert from "node:assert/strict";
import { drafTanpaBukti, kueriPerUnsur, pilihPerUnsur, urutanSistemUnsur, type HasilKueri, type InfoPotongan } from "../../src/modules/led/domain/kueri-unsur";

/** Rencana 10 Nov T6: kueri per unsur skor 4, jaminan per unsur, batas per dokumen, dan tumpang tindih. */

const kueri = kueriPerUnsur("Visi misi", "Jelaskan visi misi program studi. ".repeat(20), [
  { kode: "1", indikator: "Kejelasan visi", unsurSkor4: ["visi unik", "melibatkan pemangku kepentingan"] },
  { kode: "2", indikator: "Strategi", unsurSkor4: ["strategi terukur"] },
]);

function info(daftar: [string, string, number][]): Map<string, InfoPotongan> {
  return new Map(daftar.map(([id, dok, urutan]) => [id, { dokumenId: dok, urutan }]));
}

test("kueri: satu umum (judul + 400 karakter instruksi) dan satu per unsur skor 4", () => {
  assert.deepEqual(kueri.map((q) => q.kunci), ["umum", "1#1", "1#2", "2#1"]);
  assert.ok(kueri[0].teks.length <= "Visi misi. ".length + 400);
  assert.equal(kueri[2].teks, "Kejelasan visi. melibatkan pemangku kepentingan");
  assert.deepEqual([kueri[3].butir, kueri[3].unsur], ["2", "strategi terukur"]);
});

test("setiap unsur berkandidat mendapat potongan walau kalah di peringkat gabungan", () => {
  // kueri umum dan unsur 1#1 didominasi dokumen A; unsur 2#1 hanya cocok dengan potongan c9 di dokumen C
  const h: HasilKueri[] = [
    { kueri: kueri[0], vektor: ["a1", "a5", "a9", "b1"], kataKunci: ["a1", "a5", "a9"] },
    { kueri: kueri[1], vektor: ["a1", "a5", "b1"], kataKunci: ["a5", "a1"] },
    { kueri: kueri[2], vektor: ["b1", "b5"], kataKunci: [] },
    { kueri: kueri[3], vektor: ["c9"], kataKunci: [] },
  ];
  const i = info([["a1", "A", 1], ["a5", "A", 5], ["a9", "A", 9], ["b1", "B", 1], ["b5", "B", 5], ["c9", "C", 9]]);
  const r = pilihPerUnsur(h, i, { k: 4, maksPerDokumen: 3 });
  const ids = r.terpilih.map((t) => t.id);
  assert.ok(ids.includes("c9"), "unsur 2#1 dijamin");
  assert.ok(ids.includes("b1"), "unsur 1#2 dijamin");
  assert.equal(r.terpilih.find((t) => t.id === "c9")!.asal, "2#1");
  assert.equal(ids.length, 4);
  assert.deepEqual([...r.unsurBerkandidat].sort(), ["1#1", "1#2", "2#1"]);
});

test("paling banyak 3 potongan per dokumen dan potongan bersebelahan (tumpang tindih) dilewati", () => {
  const h: HasilKueri[] = [{ kueri: kueri[0], vektor: ["a1", "a2", "a4", "a6", "a8", "b1"], kataKunci: [] }];
  const i = info([["a1", "A", 1], ["a2", "A", 2], ["a4", "A", 4], ["a6", "A", 6], ["a8", "A", 8], ["b1", "B", 1]]);
  const ids = pilihPerUnsur(h, i, { k: 10, maksPerDokumen: 3 }).terpilih.map((t) => t.id);
  assert.ok(!ids.includes("a2"), "a2 bersebelahan dengan a1");
  assert.equal(ids.filter((x) => x.startsWith("a")).length, 3);
  assert.deepEqual(ids, ["a1", "a4", "a6", "b1"]);
});

test("jaminan satu per unsur boleh melebihi k; putaran kedua hanya bila ada ruang", () => {
  const banyak = kueriPerUnsur("J", "I", [{ kode: "1", indikator: "Ind", unsurSkor4: ["u1", "u2", "u3"] }]);
  const h: HasilKueri[] = [
    { kueri: banyak[0], vektor: [], kataKunci: [] },
    { kueri: banyak[1], vektor: ["x1", "x2"], kataKunci: [] },
    { kueri: banyak[2], vektor: ["y1", "y2"], kataKunci: [] },
    { kueri: banyak[3], vektor: ["z1", "z2"], kataKunci: [] },
  ];
  const i = info([["x1", "X", 1], ["x2", "X", 5], ["y1", "Y", 1], ["y2", "Y", 5], ["z1", "Z", 1], ["z2", "Z", 5]]);
  assert.equal(pilihPerUnsur(h, i, { k: 2, maksPerDokumen: 3 }).terpilih.length, 3, "tiga unsur, masing-masing satu");
  assert.equal(pilihPerUnsur(h, i, { k: 6, maksPerDokumen: 3 }).terpilih.length, 6, "bila ada ruang, dua per unsur");
  assert.equal(pilihPerUnsur(h, i, { k: 4, maksPerDokumen: 3 }).terpilih.length, 4);
});

test("unsur tanpa kandidat tidak berkandidat; urutan sistem = terpilih lalu sisa gabungan; draf tanpa bukti", () => {
  const h: HasilKueri[] = [
    { kueri: kueri[0], vektor: ["a1", "a5"], kataKunci: [] },
    { kueri: kueri[1], vektor: [], kataKunci: [] },
    { kueri: kueri[2], vektor: [], kataKunci: [] },
    { kueri: kueri[3], vektor: ["a5"], kataKunci: [] },
  ];
  const r = pilihPerUnsur(h, info([["a1", "A", 1], ["a5", "A", 5]]), { k: 1, maksPerDokumen: 3 });
  assert.deepEqual([...r.unsurBerkandidat], ["2#1"]);
  assert.deepEqual(urutanSistemUnsur(r), ["a5", "a1"], "a5 dipilih lewat jaminan unsur meski a1 teratas");
  const p = drafTanpaBukti([{ butir: "1", unsur: "visi unik" }], ["SK visi misi"]);
  assert.deepEqual(p.map((x) => x.teks), ["[BELUM ADA BUKTI: visi unik] (butir 1)", "Dokumen yang diharapkan untuk bagian ini: SK visi misi."]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { cekBukti, cekParagraf, normalKutipan, pecahKalimat, terapkanCekKutipan, turunkanUnsur } from "../../src/modules/led/domain/kutipan";

/** Rencana 10 Nov T7: kutipan bukti dicek kode (0 token). */

const SUMBER = new Map([
  ["D1", "Rapat tinjauan kurikulum dilaksanakan pada 12 Maret 2025 dan dihadiri 24 dosen serta perwakilan alumni.\nHasil rapat menetapkan pemu-\ntakhiran 6 mata kuliah."],
  ["J", "Prodi memiliki 3 mitra industri aktif."],
]);
const DATA = new Map([["M-PDS3", "PDS3 = 41,67%"], ["T-4.a", "Tabel 4.a"], ["J", "Prodi memiliki 3 mitra industri aktif."]]);

test("normalisasi: spasi, tanda kutip, tanda hubung pemenggal, huruf besar/kecil", () => {
  assert.equal(normalKutipan("“Rapat”   TINJAUAN\nkurikulum"), '"rapat" tinjauan kurikulum');
  assert.equal(normalKutipan("pemu-\ntakhiran"), "pemutakhiran");
});

test("kutipan persis (beda spasi/huruf) diterima; rekaan, berelipsis, dan sumber asing ditolak", () => {
  const h = cekBukti([
    { id: "B1", sumber: "D1", kutipan: "dihadiri  24 DOSEN serta perwakilan alumni" },
    { id: "B2", sumber: "D1", kutipan: "Hasil rapat menetapkan pemutakhiran 6 mata kuliah." },
    { id: "B3", sumber: "D1", kutipan: "dihadiri 30 dosen dan mahasiswa" },
    { id: "B4", sumber: "D1", kutipan: "Rapat tinjauan … perwakilan alumni" },
    { id: "B5", sumber: "D9", kutipan: "dihadiri 24 dosen" },
  ], SUMBER);
  assert.deepEqual(h.map((x) => x.sah), [true, true, false, false, false]);
  assert.match(h[2].alasan!, /tidak ditemukan/);
  assert.match(h[3].alasan!, /…/);
  assert.match(h[4].alasan!, /tidak ada di konteks/);
});

test("paragraf hanya bersandar pada bukti ditolak → tidak_didukung; M/T/J atau penanda tetap didukung; angka harus dirujuk", () => {
  const bukti = cekBukti([{ id: "B1", sumber: "D1", kutipan: "dihadiri 24 dosen" }, { id: "B2", sumber: "D1", kutipan: "rekaan saja di sini" }], SUMBER);
  const p = cekParagraf([
    { teks: "Rapat dihadiri 24 dosen.", sumber: ["D1"], bukti: ["B1"] },
    { teks: "Prodi bekerja sama dengan 10 industri.", sumber: ["D1"], bukti: ["B2"] },
    { teks: "Kualifikasi doktor 41,67%.", sumber: ["M-PDS3"], bukti: [] },
    { teks: "[BELUM ADA BUKTI: kerja sama internasional]", sumber: [], bukti: [] },
    { teks: "Rapat dihadiri 30 dosen.", sumber: ["D1"], bukti: ["B1"] },
  ], bukti, { bukti: new Map([["B1", "dihadiri 24 dosen"]]), data: DATA });
  assert.deepEqual(p.map((x) => x.status), ["didukung", "tidak_didukung", "didukung", "didukung", "didukung"]);
  assert.deepEqual(p[1].buktiDitolak, ["B2"]);
  assert.deepEqual(p[4].angkaTanpaRujukan, ["30"], "angka tidak ada di kutipan yang dirujuk");
  assert.deepEqual(p[0].angkaTanpaRujukan, []);
});

test("unsur terpenuhi tanpa bukti sah atau data diturunkan; dengan bukti sah atau M tetap", () => {
  const bukti = cekBukti([{ id: "B1", sumber: "D1", kutipan: "dihadiri 24 dosen" }, { id: "B2", sumber: "D1", kutipan: "tidak ada di sumber" }], SUMBER);
  const r = turunkanUnsur([
    { butir: "1", unsur: "a", status: "terpenuhi", bukti: ["B1"] },
    { butir: "1", unsur: "b", status: "terpenuhi", bukti: ["B2"] },
    { butir: "1", unsur: "c", status: "terpenuhi", sumber: ["M-PDS3"] },
    { butir: "1", unsur: "d", status: "sebagian" },
  ], bukti, new Set(DATA.keys()));
  assert.deepEqual(r.unsur.map((u) => u.status), ["terpenuhi", "belum_ada_bukti", "terpenuhi", "sebagian"]);
  assert.deepEqual(r.diturunkan, [{ butir: "1", unsur: "b" }]);
});

test("terapkan: penanda disisipkan untuk unsur yang diturunkan; ringkasan kalimat", () => {
  const { keluaran, ringkasan } = terapkanCekKutipan({
    bukti: [{ id: "B1", sumber: "D1", kutipan: "hasil karangan" }],
    paragraf: [{ teks: "Kurikulum dimutakhirkan. Rapat rutin digelar.", sumber: ["D1"], bukti: ["B1"] }],
    unsur: [{ butir: "2", unsur: "kurikulum mutakhir", status: "terpenuhi", bukti: ["B1"] }],
  }, SUMBER, DATA);
  assert.equal(keluaran.unsur[0].status, "belum_ada_bukti");
  assert.equal(keluaran.paragraf.at(-1)!.teks, "[BELUM ADA BUKTI: kurikulum mutakhir]");
  assert.deepEqual(ringkasan.jumlah, { buktiSah: 0, buktiDitolak: 1, kalimatTidakDidukung: 2 });
  assert.deepEqual(pecahKalimat("Satu. Dua? 3 tiga."), ["Satu.", "Dua?", "3 tiga."]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buktiParagraf, cekPerbaikan, gantiParagraf, kalimatMenahan, kunciTahan, kutipanSetelahPerbaikan, labelAturan,
  paragrafPerluPerbaikan, susunPenggunaPeriksa, terapkanLabelAi, type ItemPeriksa,
} from "../../src/modules/led/domain/periksa-bagian";
import { terapkanCekKutipan } from "../../src/modules/led/domain/kutipan";
import { keluaranKeDokumen, paragrafBersumber } from "../../src/modules/led/domain/narasi";
import { kunciKalimat, type KalimatTerperiksa } from "../../src/modules/led/domain/verifikasi";

/** Rencana 10 Nov T8: pemeriksaan per bagian (aturan, AI gabungan, perbaikan terarah sekali, gerbang ekspor). */

const SUMBER = new Map([["D1", "Rapat tinjauan kurikulum dihadiri 24 dosen dan perwakilan alumni pada Maret 2025."]]);
const DATA = new Map([["M-PDS3", "PDS3 = 41,67%"]]);
const keluaran = {
  bukti: [{ id: "B1", sumber: "D1", kutipan: "dihadiri 24 dosen dan perwakilan alumni" }, { id: "B2", sumber: "D1", kutipan: "rektor menetapkan visi" }],
  paragraf: [
    { teks: "Rapat tinjauan dihadiri 24 dosen. Kualifikasi doktor 41,67%.", sumber: ["D1", "M-PDS3"], bukti: ["B1"] },
    { teks: "Visi ditetapkan rektor setiap tahun.", sumber: ["D1"], bukti: ["B2"] },
  ],
  unsur: [],
  dokumenKurang: [],
};
const { ringkasan: kutipan } = terapkanCekKutipan(keluaran, SUMBER, DATA);
const kalimat = (teks: string, paragraf: number, label: KalimatTerperiksa["label"] = "sesuai"): KalimatTerperiksa =>
  ({ teks, paragraf, sumber: [], label, alasan: "aturan" });

test("Langkah 1: label aturan digabung cek kutipan; hanya label dari kutipan yang pasti menahan ekspor", () => {
  const r = labelAturan([
    kalimat("Rapat tinjauan dihadiri 24 dosen.", 0),
    kalimat("Kualifikasi doktor 41,67%.", 0, "sebagian"),
    kalimat("Visi ditetapkan rektor setiap tahun.", 1),
  ], kutipan);
  assert.deepEqual(r.kalimat.map((k) => k.label), ["sesuai", "sebagian", "tidak_didukung"]);
  assert.deepEqual(r.pasti, [kunciKalimat("Visi ditetapkan rektor setiap tahun.")]);
  assert.deepEqual(kunciTahan(r.kalimat, r.pasti, false), r.pasti, "tanpa AI: label kata kunci bukan dasar gerbang");
});

test("Langkah 2: prompt gabungan berisi kutipan dan baris M/T, bukan potongan utuh; satu daftar nomor untuk banyak sub-bagian", () => {
  const teksSumber = { D1: "x".repeat(4000) + " teks potongan utuh", "M-PDS3": "PDS3 = 41,67%" };
  const it = (kode: string): ItemPeriksa => ({
    kode,
    kalimat: [kalimat("Rapat dihadiri 24 dosen.", 0), kalimat("Visi ditetapkan rektor.", 1)],
    bukti: (i) => buktiParagraf(i, keluaran.paragraf[i].sumber, kutipan, teksSumber),
  });
  const { teks, peta } = susunPenggunaPeriksa([it("C.1-a"), it("C.1-b")]);
  assert.equal(peta.length, 4);
  assert.match(teks, /\[s1\.B1\] \(D1\) dihadiri 24 dosen/);
  assert.match(teks, /\[s2\.M-PDS3\] PDS3 = 41,67%/);
  assert.match(teks, /4\. \(tanpa bukti\) Visi ditetapkan rektor\./, "B2 ditolak; D1 hanya lewat kutipan");
  assert.ok(!teks.includes("teks potongan utuh"));
  const hasil = terapkanLabelAi([it("C.1-a"), it("C.1-b")], peta, [{ nomor: 4, label: "tidak_didukung", alasan: "tidak ada di bukti" }]);
  assert.equal(hasil[1][1].label, "tidak_didukung");
  assert.match(hasil[0][0].alasan, /AI tidak menilai/);
});

test("Langkah 3: paragraf bermasalah dipilih, hasil perbaikan dicek kode, paragraf diganti atau dihapus", () => {
  const doc = keluaranKeDokumen(keluaran);
  const par = paragrafBersumber(doc);
  const label = [kalimat("Rapat tinjauan dihadiri 24 dosen.", 0), kalimat("Visi ditetapkan rektor setiap tahun.", 1, "tidak_didukung")];
  const daftar = paragrafPerluPerbaikan(label, par, (i) => buktiParagraf(i, [...par[i].sumber, "M-PDS3"], kutipan, { "M-PDS3": "PDS3 = 41,67%" }), 0);
  assert.deepEqual(daftar.map((d) => d.paragraf), [1]);
  const h = cekPerbaikan(daftar[0], { teks: "Visi ditinjau 30 dosen [B1].", bukti: ["B1", "M-PDS3"] }, []);
  assert.deepEqual(h.buktiSah, ["M-PDS3"], "B1 bukan bukti sah paragraf 2");
  assert.deepEqual(h.buktiDitolak, ["B1"]);
  assert.deepEqual(h.angkaTanpaRujukan, ["30"]);
  assert.equal(h.teks, "Visi ditinjau 30 dosen.", "kode bukti mentah dibuang dari teks");
  const baru = gantiParagraf(doc, new Map([[0, "Ganti."], [1, null]]));
  assert.deepEqual(paragrafBersumber(baru).map((p) => [p.teks, p.sumber]), [["Ganti.", ["D1", "M-PDS3"]]]);
  const k = kutipanSetelahPerbaikan(kutipan, new Map([[0, { teks: null, buktiSah: [], buktiDitolak: [], angkaTanpaRujukan: [] }]]));
  assert.deepEqual(k!.paragraf.map((p) => [p.indeks, p.status]), [[0, "tidak_didukung"]], "paragraf sesudah yang dihapus bergeser");
});

test("gerbang ekspor: kalimat yang disunting atau dikonfirmasi tidak lagi menahan", () => {
  const tahan = [kunciKalimat("Visi ditetapkan rektor."), kunciKalimat("Akreditasi unggul sejak 2010.")];
  assert.deepEqual(kalimatMenahan(tahan, ["Visi ditetapkan rektor.", "Akreditasi unggul sejak 2010."], []).length, 2);
  assert.deepEqual(kalimatMenahan(tahan, ["Visi ditetapkan senat.", "Akreditasi unggul sejak 2010."], []), ["Akreditasi unggul sejak 2010."]);
  assert.deepEqual(kalimatMenahan(tahan, ["Akreditasi unggul sejak 2010."], [{ kunci: tahan[1], teks: "", alasan: "SK menyusul", oleh: "PJ", waktu: "" }]), []);
});

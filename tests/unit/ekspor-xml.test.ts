import { test } from "node:test";
import assert from "node:assert/strict";
import { gantiTeks, pecahBody, teksElemen, teksKotak } from "../../src/lib/ekspor/xml";
import { isiTabel } from "../../src/lib/ekspor/isi-data";
import { judulSingkat, siapkanDokumen } from "../../src/lib/ekspor/template";

const p = (isi: string, ppr = "") => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${isi}</w:p>`;
const r = (t: string) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
const dok = (body: string) => `<w:document><w:body>${body}<w:sectPr/></w:body></w:document>`;

test("ganti teks yang terpecah di beberapa run tanpa mengubah format", () => {
  const x = p(`<w:r><w:rPr><w:b/></w:rPr><w:t>Perguruan Tinggi:</w:t></w:r>${r(" .....")}${r("......")}`);
  const y = gantiTeks(x, /\.{5,}.*$/, () => "Universitas Contoh");
  assert.equal(teksElemen(y), "Perguruan Tinggi: Universitas Contoh");
  assert.ok(y.includes("<w:b/>"));
  assert.equal(teksElemen(gantiTeks(p(r("a &amp; b")), /b$/, () => "<c>")), "a & <c>");
});

test("teks kotak tidak tercampur dengan teks paragraf", () => {
  const x = p(`${r("Luar")}<w:r><mc:AlternateContent><mc:Choice><w:txbxContent>${p(r("Dalam"))}</w:txbxContent></mc:Choice><mc:Fallback><w:txbxContent>${p(r("Dalam"))}</w:txbxContent></mc:Fallback></mc:AlternateContent></w:r>`);
  assert.equal(teksElemen(x), "Luar");
  assert.equal(teksKotak(x), "Dalam");
  assert.equal(pecahBody(dok(x + p(r("dua")))).elemen.length, 2, "paragraf di dalam kotak tidak dihitung tingkat atas");
});

test("penyiapan template: instruksi, catatan, kotak diganti placeholder; judul tetap; sub-bagian jenjang lain dihapus", () => {
  const kotak = p(`<w:r><w:drawing><wps:wsp/></w:drawing></w:r>`);
  const body = [
    p(r("Latar Belakang"), NUM),
    p(r("Bagian ini menjelaskan latar belakang, tujuan, dan rasional terkait profil dosen dan tenaga kependidikan."), '<w:ind w:left="720"/>'),
    p(r("(Penjelasan disampaikan oleh pengusul dari program studi untuk semua program).")),
    kotak,
    p(r("Kecukupan dosen PPI"), NUM),
    p(r("Bagian ini menjelaskan kecukupan jumlah dosen tetap program profesi insinyur pada program studi.")),
    kotak,
    p(r("Sistem Tata Pamong"), NUM),
    p(r("Bagian ini menjelaskan kelengkapan struktur organisasi dan kebijakan operasional UPPS secara lengkap."), NUM),
    p(r("(Penjelasan disampaikan oleh pengusul dari program studi untuk semua program).")),
  ].join("");
  const h = siapkanDokumen(dok(body), [
    { kode: "C.4-LB", judul: "Latar Belakang", tipe: "bersama", instruksi: ["Bagian ini menjelaskan latar belakang, tujuan, dan rasional terkait profil dosen dan tenaga kependidikan."], berlaku: true },
    { kode: "C.4-PPI", judul: "Kecukupan dosen PPI", tipe: "iku", instruksi: ["Bagian ini menjelaskan kecukupan jumlah dosen tetap program profesi insinyur pada program studi."], berlaku: false },
    { kode: "C.2-I", judul: "Sistem Tata Pamong: struktur organisasi dan kebijakan operasional", tipe: "iku", instruksi: ["Bagian ini menjelaskan kelengkapan struktur organisasi dan kebijakan operasional UPPS secara lengkap."], berlaku: true },
  ]);
  const teks = pecahBody(h.xml).elemen.map((e) => teksElemen(e.xml));
  assert.deepEqual(teks, ["Latar Belakang", "{{C.4-LB}}", "Sistem Tata Pamong", "Struktur organisasi dan kebijakan operasional", "{{C.2-I}}"]);
  assert.deepEqual(h.laporan, { placeholder: ["C.4-LB", "C.2-I"], dihapus: ["C.4-PPI"], tidakDitemukan: [] });
  assert.equal(h.indentasi["C.4-LB"], 720);
  assert.equal(judulSingkat("Sistem Tata Pamong: struktur organisasi"), "Struktur organisasi");
});

test("isi tabel: baris contoh diganti data, baris judul dan Jumlah tetap", () => {
  const sel = (t: string) => `<w:tc>${p(r(t))}</w:tc>`;
  const tr = (...t: string[]) => `<w:tr>${t.map(sel).join("")}</w:tr>`;
  const tbl = `<w:tbl>${tr("No.", "Nama")}${tr("1", "2")}${tr("1", "")}${tr("2", "")}${tr("…", "")}${tr("Jumlah", "")}</w:tbl>`;
  const hasil = isiTabel(tbl, [["1", "Ani"], ["2", "Budi"], ["3", "Citra"]]);
  const baris = [...hasil.matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)].map((m) => teksElemen(m[0].replace(/<\/?w:(tr|tc)>/g, "")));
  assert.deepEqual(baris, ["No.Nama", "12", "1Ani", "2Budi", "3Citra", "Jumlah"]);
});

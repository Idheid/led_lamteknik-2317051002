import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { cariBentukLogo, infoGambar, RID_LOGO, sisipkanLogo } from "../../src/modules/led/ekspor/logo";

/** D8: logo perguruan tinggi menggantikan bentuk "Logo Perguruan Tinggi" di halaman muka template LED. */

// PNG 2×1 piksel
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mNk+M9QzwAEjDAGACCCAgL+1tZqAAAAAElFTkSuQmCC", "base64");
// JPEG minimal: SOI, APP0 singkat, SOF0 tinggi 3 lebar 5
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x03, 0x00, 0x05, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
]);

test("infoGambar membaca jenis dan ukuran PNG/JPEG, menolak berkas lain", () => {
  assert.deepEqual(infoGambar(PNG), { jenis: "png", lebar: 2, tinggi: 1 });
  assert.deepEqual(infoGambar(JPEG), { jenis: "jpeg", lebar: 5, tinggi: 3 });
  assert.equal(infoGambar(Buffer.from("GIF89a bukan logo")), null);
});

for (const nama of ["template-ledps-2025.docx", "template-led-lama-2022.docx", "template-format-lain.docx"]) {
  test(`logo disisipkan di halaman muka: ${nama}`, async () => {
    const zip = await JSZip.loadAsync(readFileSync(`tests/fikstur/instrumen/${nama}`));
    const doc = await zip.file("word/document.xml")!.async("string");
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    const ct = await zip.file("[Content_Types].xml")!.async("string");
    const r = cariBentukLogo(doc);
    assert.ok(r, "bentuk logo ditemukan");
    const bentuk = doc.slice(r[0], r[1]);
    assert.match(bentuk, /^<mc:AlternateContent>/);
    assert.match(bentuk, /Logo/);

    const h = sisipkanLogo(doc, rels, ct, { jenis: "png", lebar: 400, tinggi: 200 })!;
    assert.ok(h);
    const teks = h.document.replace(/<[^>]+>/g, "");
    assert.ok(!/Logo\s*Perguruan\s*Tinggi/.test(teks), "tulisan kotak logo hilang");
    assert.ok(h.document.includes(`r:embed="${RID_LOGO}"`));
    // ukuran mengikuti kotak asal dengan rasio 2:1, posisi digeser ke tengah
    const ext = /<wp:anchor[\s\S]*?<wp:extent cx="(\d+)" cy="(\d+)"/.exec(h.document.slice(r[0]))!;
    assert.equal(Math.round(Number(ext[1]) / Number(ext[2])), 2);
    assert.match(h.rels, new RegExp(`Id="${RID_LOGO}"[^>]*Target="media/logo-sampul.png"`));
    assert.match(h.contentTypes, /Extension="png"/i);
    assert.equal(h.media, "word/media/logo-sampul.png");
    // seimbang: jumlah AlternateContent buka = tutup
    assert.equal((h.document.match(/<mc:AlternateContent>/g) ?? []).length, (h.document.match(/<\/mc:AlternateContent>/g) ?? []).length);
  });
}

test("template tanpa kotak logo: tidak diubah", () => {
  assert.equal(sisipkanLogo("<w:document><w:body><w:p/></w:body></w:document>", "<Relationships></Relationships>", "<Types></Types>", { jenis: "png", lebar: 1, tinggi: 1 }), null);
});

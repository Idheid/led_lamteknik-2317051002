// Spike ekspor: isi placeholder {{kode}} di template LEDPS dengan narasi, tabel, dan gambar.
// Butuh: template_placeholder.docx dan indentasi.json (dari siapkan-template.py), gambar.png.
import fs from 'node:fs';
import * as d from 'docx';

const { patchDocument, PatchType, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, LineRuleType } = d;
const indentasi = JSON.parse(fs.readFileSync('indentasi.json', 'utf8'));

const HURUF = { font: 'Arial', size: 22 }; // Arial 11 (gaya Normal template)
const run = (text, opsi = {}) => new TextRun({ text, ...HURUF, ...opsi });
const para = (kode, isi, opsi = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 120 }, // spasi 1,15
  indent: { left: indentasi[kode] ?? 0 },
  children: typeof isi === 'string' ? [run(isi)] : isi,
  ...opsi,
});
const judulTabel = (kode, t) => new Paragraph({ keepNext: true, alignment: AlignmentType.CENTER, indent: { left: indentasi[kode] ?? 0 }, spacing: { before: 120, after: 60 }, children: [run(t, { size: 21 })] });
const sel = (t, bold = false) => new TableCell({ children: [new Paragraph({ children: [run(t, { size: 20, bold })] })] });

const img = fs.readFileSync('gambar.png');
const lebar = Math.round(12 * 37.795); // 12 cm, maks 17,1 cm; rasio asli dipertahankan
const tinggi = Math.round(lebar * 700 / 1200);

const contoh = 'Paragraf contoh hasil generate. Teksnya rata kiri-kanan, memakai Arial 11 dan spasi 1,15, dan sejajar dengan judul sub-bagiannya. Instruksi template, catatan biru, dan kotak isian sudah dihapus dan digantikan narasi ini.';
const patches = {};
for (const kode of Object.keys(indentasi)) {
  patches[kode] = { type: PatchType.DOCUMENT, children: [para(kode, `[${kode}] ${contoh}`)] };
}
patches['I-1'].children.push(para('I-1', [run('Istilah asing seperti '), run('tracer study', { italics: true }), run(' dicetak miring sesuai kaidah penulisan.')]));
patches['C.1-IKU-a'].children.push(
  judulTabel('C.1-IKU-a', 'Tabel 2.3. Contoh tabel uji ekspor'),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    indent: { size: indentasi['C.1-IKU-a'], type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: [sel('No.', true), sel('Jenis VMTS', true), sel('Tahun', true)] }),
      new TableRow({ children: [sel('1'), sel('Visi keilmuan program studi'), sel('2025/2026')] }),
      new TableRow({ children: [sel('2'), sel('Misi program studi'), sel('2024/2025')] }),
    ],
  }),
  new Paragraph({ keepNext: true, alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new ImageRun({ type: 'png', data: img, transformation: { width: lebar, height: tinggi } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run('Gambar 2.1. Contoh gambar dari unggahan', { size: 21 })] }),
);

const hasil = await patchDocument({ outputType: 'nodebuffer', data: fs.readFileSync('template_placeholder.docx'), keepOriginalStyles: true, patches });
fs.writeFileSync('hasil.docx', hasil);
console.log('hasil.docx ditulis');

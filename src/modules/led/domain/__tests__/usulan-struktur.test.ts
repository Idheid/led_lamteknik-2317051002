import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gabungUsulanAi, kerangkaTemplate, perkiraanToken, promptStruktur } from '../usulan-struktur.ts';
import type { ParagrafTemplate } from '../template-led.ts';

const p = (teks: string, gaya: string, o: Partial<ParagrafTemplate> = {}): ParagrafTemplate => ({ teks, gaya, numId: null, ilvl: 0, kotak: false, ...o });
const PANJANG = 'Judul yang sangat panjang '.repeat(6).trim();

const TEMPLATE = [
  p('BAB I PENDAHULUAN', 'Heading 1'),
  p('Bagian ini menjelaskan latar belakang penyusunan LED oleh UPPS secara rinci.', 'Normal'),
  p('Kriteria Akreditasi', 'Heading 2'),
  p('Diferensiasi Misi', 'Heading 3'),
  p('Latar Belakang', 'List Paragraph', { numId: '5', ilvl: 1 }),
  p('Isi narasi contoh yang tidak boleh dikirim karena bukan judul dan cukup panjang untuk dianggap isi. '.repeat(3), 'Normal'),
  p(PANJANG, 'Heading 3'),
  p('', '', { tabel: true }),
  p('DAFTAR ISI 1', 'toc 1'),
];

test('I4: hanya kerangka judul yang dikirim (gaya, bernomor, tingkat, 120 karakter pertama), tanpa isi narasi', () => {
  const k = kerangkaTemplate(TEMPLATE);
  assert.deepEqual(k.map((x) => x.teks.slice(0, 20)), ['BAB I PENDAHULUAN', 'Kriteria Akreditasi', 'Diferensiasi Misi', 'Latar Belakang', PANJANG.slice(0, 20)]);
  assert.ok(k.every((x) => x.teks.length <= 120));
  assert.deepEqual(k[3], { gaya: 'List Paragraph', bernomor: true, ilvl: 1, teks: 'Latar Belakang' });
  const { sistem, pengguna, jumlahJudul, gaya } = promptStruktur(TEMPLATE, ['Diferensiasi Misi', 'Akuntabilitas']);
  assert.equal(jumlahJudul, 5);
  assert.ok(!pengguna.includes('Isi narasi contoh'), 'isi narasi tidak dikirim');
  assert.ok(!pengguna.includes('Bagian ini menjelaskan'), 'instruksi tidak dikirim');
  assert.match(pengguna, /## KRITERIA DI MATRIKS PENILAIAN \(2\)\n1\. Diferensiasi Misi\n2\. Akuntabilitas/);
  assert.match(pengguna, /Heading 3 \| tidak \| 0 \| Diferensiasi Misi/);
  assert.deepEqual([...gaya].sort(), ['Heading 1', 'Heading 2', 'Heading 3', 'List Paragraph', 'Normal']);
  assert.match(sistem, /- kriteria: Kriteria/);
  assert.ok(!promptStruktur(TEMPLATE, []).pengguna.includes('KRITERIA DI MATRIKS'), 'tanpa matriks, tanpa daftar kriteria');
  const t = perkiraanToken(sistem, pengguna, gaya.length);
  assert.ok(t > (sistem.length + pengguna.length) / 4 && t < 5000);
});

test('I4: keluaran AI hanya menjadi usulan; gaya yang tidak ada di template diabaikan, "biasa" berarti tidak dipetakan', () => {
  const u = gabungUsulanAi({
    peran: [
      { gaya: 'Heading 1', peran: 'bab', alasan: 'Memuat BAB I sampai IV.' },
      { gaya: 'Heading 3', peran: 'kriteria', alasan: 'Tepat dua kali di bawah Kriteria Akreditasi.' },
      { gaya: '(tanpa gaya)', peran: 'biasa', alasan: 'Isi biasa.' },
      { gaya: 'Gaya Karangan', peran: 'sub1', alasan: 'Tidak ada di template.' },
    ],
  }, ['Heading 1', 'Heading 3', '']);
  assert.deepEqual(u.gaya, { 'Heading 1': 'bab', 'Heading 3': 'kriteria' });
  assert.deepEqual(Object.keys(u.alasan), ['Heading 1', 'Heading 3', '']);
});

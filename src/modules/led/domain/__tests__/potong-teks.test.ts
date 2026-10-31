import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potongTeks, rapikanTeks } from '../potong-teks.ts';
import { gabungRRF } from '../rrf.ts';

const kalimat = (i: number) => `Kalimat contoh nomor ${i} menjelaskan kegiatan program studi secara rinci dan lengkap.`;
const paragraf = (n: number, awal = 0) => Array.from({ length: n }, (_, i) => kalimat(awal + i)).join(' ');

test('teks pendek menjadi satu potongan', () => {
  const p = potongTeks(['Satu paragraf pendek saja.']);
  assert.equal(p.length, 1);
  assert.equal(p[0].teks, 'Satu paragraf pendek saja.');
  assert.equal(p[0].halaman, 1);
});

test('potongan 800–1.200 karakter, berakhir di batas kalimat, tumpang tindih ±15%', () => {
  const p = potongTeks([paragraf(80)]);
  assert.ok(p.length > 3);
  p.forEach((x, i) => {
    assert.ok(x.teks.length <= 1200, `potongan ${i} terlalu panjang: ${x.teks.length}`);
    if (i < p.length - 1) {
      assert.ok(x.teks.length >= 780, `potongan ${i} terlalu pendek: ${x.teks.length}`);
      assert.ok(x.teks.endsWith('.'), `potongan ${i} tidak berakhir di batas kalimat`);
      const ekor = x.teks.slice(-60);
      assert.ok(p[i + 1].teks.includes(ekor.slice(-30)), `potongan ${i + 1} tidak tumpang tindih`);
    }
  });
  // tumpang tindih tidak lebih dari ±20% (tidak menggandakan isi)
  const total = p.reduce((s, x) => s + x.teks.length, 0);
  assert.ok(total < paragraf(80).length * 1.25);
});

test('nomor halaman mengikuti halaman tempat potongan dimulai; DOCX tanpa halaman', () => {
  const p = potongTeks([paragraf(15), paragraf(15, 100), paragraf(15, 200)]);
  assert.equal(p[0].halaman, 1);
  assert.ok(p.some((x) => x.halaman === 2) && p.some((x) => x.halaman === 3));
  assert.ok(p.every((x, i) => i === 0 || (x.halaman ?? 0) >= (p[i - 1].halaman ?? 0)));
  assert.ok(potongTeks([paragraf(30)], undefined, false).every((x) => x.halaman === null));
  assert.deepEqual(potongTeks(['', '   ']), []);
});

test('kata sangat panjang tanpa spasi tetap dipotong ≤ 1.200 karakter', () => {
  const p = potongTeks(['x'.repeat(3000)]);
  assert.ok(p.length >= 3 && p.every((x) => x.teks.length <= 1200));
});

test('rapikan teks: spasi ganda dan baris kosong berlebih', () => {
  assert.equal(rapikanTeks('a  b\r\n\r\n\r\n\r\nc \n d'), 'a b\n\nc\nd');
});

test('reciprocal rank fusion mengutamakan dokumen yang muncul di kedua daftar', () => {
  const h = gabungRRF([['a', 'b', 'c'], ['c', 'd', 'a']]);
  assert.equal(h[0].id, 'a'); // 1/61 + 1/63
  assert.equal(h[1].id, 'c'); // 1/63 + 1/61 (seri skor, urut id)
  assert.deepEqual(h.find((x) => x.id === 'd')?.peringkat, [null, 2]);
  assert.ok(Math.abs(h[0].skor - (1 / 61 + 1 / 63)) < 1e-12);
  assert.deepEqual(gabungRRF([[], []]), []);
});

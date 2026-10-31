import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periksaKonsistensi, teksPerbedaan, type MetrikAcuan } from '../konsistensi.ts';
import type { DokTiptap } from '../narasi.ts';

const dok = (p: [string, string][]): DokTiptap => ({
  type: 'doc',
  content: p.map(([sumber, teks]) => ({ type: 'paragraph', attrs: { sumber }, content: [{ type: 'text', text: teks }] })),
}) as unknown as DokTiptap;

const metrik = new Map<string, MetrikAcuan>([
  ['M-NDTPS', { kode: 'M-NDTPS', nama: 'Jumlah DTPS', nilai: 12 }],
  ['M-PDS3', { kode: 'M-PDS3', nama: 'Persentase DTPS doktor', nilai: 41.67 }],
]);

test('angka metrik yang sama dibandingkan antar sub-bagian dan dengan LKPS; angka yang berbeda tertangkap', () => {
  const hasil = periksaKonsistensi([
    { subKode: 'C.4-IKU-a.i', label: 'C.4 3.a.i', bagianKode: 'C.4', doc: dok([['M-NDTPS, J', 'Program studi memiliki 12 DTPS pada TS 2025/2026.']]) },
    { subKode: 'C.2-LB', label: 'C.2 1', bagianKode: 'C.2', doc: dok([['M-NDTPS', 'Sebanyak 11 DTPS mengampu 5 mata kuliah inti.']]) },
    { subKode: 'C.4-IKU-a.iii', label: 'C.4 3.a.iii', bagianKode: 'C.4', doc: dok([['M-PDS3', 'Persentase DTPS doktor 41,67% dan rasio dosen 1 : 18.']]) },
    { subKode: 'C.1-LB', label: 'C.1 1', bagianKode: 'C.1', doc: dok([['J', 'Tidak merujuk metrik, 99 kegiatan.']]) },
  ], metrik);
  assert.equal(hasil.length, 1);
  const [p] = hasil;
  assert.deepEqual([p.metrik, p.temuan.subKode, p.temuan.angka, p.kunci], ['M-NDTPS', 'C.2-LB', 11, 'M-NDTPS|C.2-LB|11']);
  assert.equal(teksPerbedaan(p), 'Jumlah DTPS (LKPS 12): C.4 3.a.i menyebut 12; C.2 1 menyebut 11');
});

test('tahun dan angka kecil penomoran tidak dianggap klaim metrik', () => {
  const hasil = periksaKonsistensi([
    { subKode: 'C.4-IKU-a.i', label: 'C.4', bagianKode: 'C.4', doc: dok([['M-NDTPS', 'Pada 2024 ada 12 DTPS di 3 laboratorium.']]) },
  ], metrik);
  assert.deepEqual(hasil, []);
});

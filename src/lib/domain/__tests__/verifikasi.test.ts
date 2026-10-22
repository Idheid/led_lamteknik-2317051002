import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kunciKalimat, pecahKalimat, periksaKalimat, ringkasVerifikasi, teksRingkas } from '../verifikasi.ts';
import type { DokTiptap } from '../narasi.ts';

const dok = (p: [string, string][]): DokTiptap => ({
  type: 'doc',
  content: p.map(([sumber, teks]) => ({ type: 'paragraph', attrs: { sumber }, content: [{ type: 'text', text: teks }] })),
}) as unknown as DokTiptap;

test('pecah kalimat: desimal, singkatan, dan hlm. tidak memecah', () => {
  assert.deepEqual(pecahKalimat('Rasio dosen 1 : 18,5 pada TS. Dr. Ani memimpin tim (hlm. 3) dengan baik. Selesai!'), [
    'Rasio dosen 1 : 18,5 pada TS.', 'Dr. Ani memimpin tim (hlm. 3) dengan baik.', 'Selesai!',
  ]);
  assert.equal(kunciKalimat('  Visi,  keilmuan! '), 'visi keilmuan');
});

test('label per kalimat: sesuai, sebagian, tidak didukung (angka di luar sumber), tanpa sumber, belum ada bukti', () => {
  const sumber = {
    J: 'Visi keilmuan ditinjau setiap tahun dalam lokakarya kurikulum bersama 24 pemangku kepentingan.',
    'M-NDTPS': 'Jumlah DTPS = 12',
  };
  const hasil = periksaKalimat(dok([
    ['J', 'Visi keilmuan ditinjau setiap tahun melalui lokakarya kurikulum bersama 24 pemangku kepentingan. Lokakarya ini menjadikan prodi unggul secara internasional dan berdaya saing global.'],
    ['M-NDTPS', 'Jumlah DTPS sebanyak 15 orang.'],
    ['', 'Kalimat tanpa sumber apa pun di sini.'],
    ['J', 'Tinjauan kurikulum dilakukan. [BELUM ADA BUKTI: notulen lokakarya]'],
  ]), sumber, { tahunSah: [2025] });
  assert.deepEqual(hasil.map((k) => k.label), ['sesuai', 'tidak_didukung', 'tidak_didukung', 'tidak_didukung', 'sesuai', 'sebagian']);
  assert.match(hasil[2].alasan, /Angka 15 tidak ada di sumber M-NDTPS/);
  assert.match(hasil[3].alasan, /tidak mencantumkan kode sumber/);
  const r = ringkasVerifikasi(hasil);
  assert.equal(teksRingkas(r), '6 kalimat: 2 sesuai, 1 sebagian, 3 tidak didukung');
});

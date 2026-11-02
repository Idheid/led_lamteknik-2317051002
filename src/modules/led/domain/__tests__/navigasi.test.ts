import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bagianBerikutnya, pecahUnsurSkor4, peringatanSebelumGenerate, persenPosisi, posisiSub, statusSubBagian, subLanjutkan,
} from '../navigasi.ts';

test('status sub-bagian: selesai > ada draf > ada jawaban > belum; data/otomatis tidak di-generate', () => {
  assert.equal(statusSubBagian({ tipe: 'iku', adaDraf: false }), 'belum');
  assert.equal(statusSubBagian({ tipe: 'iku', adaDraf: false, jawaban: '   ' }), 'belum');
  assert.equal(statusSubBagian({ tipe: 'iku', adaDraf: false, jawaban: 'Ada fakta' }), 'ada_jawaban');
  assert.equal(statusSubBagian({ tipe: 'bersama', adaDraf: true, jawaban: 'x', statusDraf: 'draf' }), 'ada_draf');
  assert.equal(statusSubBagian({ tipe: 'narasi', adaDraf: true, statusDraf: 'selesai' }), 'selesai');
  assert.equal(statusSubBagian({ tipe: 'data', adaDraf: false, jawaban: 'x' }), 'data');
  assert.equal(statusSubBagian({ tipe: 'otomatis', adaDraf: false }), 'data');
});

test('Lanjutkan membuka sub-bagian pertama yang belum selesai', () => {
  assert.equal(subLanjutkan([
    { kode: 'A', status: 'data' }, { kode: 'B', status: 'selesai' }, { kode: 'C', status: 'ada_draf' }, { kode: 'D', status: 'belum' },
  ]), 'C');
  assert.equal(subLanjutkan([{ kode: 'A', status: 'selesai' }]), 'A', 'semua selesai: kembali ke yang pertama');
  assert.equal(subLanjutkan([]), null);
});

test('posisi, Sebelumnya/Berikutnya, dan bagian berikutnya', () => {
  const urut = ['C.4-LB', 'C.4-KEB', 'C.4-IKU-a', 'C.4-AF'];
  assert.deepEqual(posisiSub(urut, 'C.4-IKU-a'), { nomor: 3, total: 4, sebelumnya: 'C.4-KEB', berikutnya: 'C.4-AF' });
  assert.deepEqual(posisiSub(urut, 'C.4-LB'), { nomor: 1, total: 4, sebelumnya: null, berikutnya: 'C.4-KEB' });
  assert.equal(posisiSub(urut, 'C.4-AF')?.berikutnya, null);
  assert.equal(posisiSub(urut, 'X'), null);
  assert.equal(persenPosisi({ nomor: 3, total: 4 }), 75);
  assert.equal(bagianBerikutnya(['C.1', 'C.2', 'C.3'], 'C.2'), 'C.3');
  assert.equal(bagianBerikutnya(['C.1', 'C.2'], 'C.2'), null);
});

test('unsur skor 4 dipecah dari deskriptor resmi menurut nomor (1), (2), …', () => {
  assert.deepEqual(
    pecahUnsurSkor4('VMTS UPPS mempertimbangkan: (1) linearitas visi PT; (2) kesesuaian dengan Renstra; dan (3) tinjau ulang periodik.'),
    ['Linearitas visi PT', 'Kesesuaian dengan Renstra', 'Tinjau ulang periodik'],
  );
  assert.deepEqual(
    pecahUnsurSkor4('UPPS memiliki aspek (1) s.d. (3): dokumen legal; dokumen AMI; dokumen RTM.'),
    ['Dokumen legal', 'Dokumen AMI', 'Dokumen RTM'],
  );
  assert.deepEqual(pecahUnsurSkor4('PJP ≥ 50%.'), ['PJP ≥ 50%.'], 'tanpa nomor: satu unsur');
  assert.deepEqual(pecahUnsurSkor4('Nilai (2) saja tanpa (1) berurutan'), ['Nilai (2) saja tanpa (1) berurutan']);
  assert.deepEqual(pecahUnsurSkor4('  '), []);
});

test('unsur skor 4 data instrumen Sarjana 2025 sama dengan hasil pemecahan deskriptornya', () => {
  const data = JSON.parse(readFileSync(new URL('../../../../../data/instrumen/lamteknik-2025-pasca.json', import.meta.url), 'utf8')) as {
    butir: { kode: string; deskriptorSkor4: string; unsurSkor4: string[] }[];
  };
  for (const b of data.butir) assert.deepEqual(b.unsurSkor4, pecahUnsurSkor4(b.deskriptorSkor4), `butir ${b.kode}`);
});

test('AF/SWOT diberi peringatan bila belum ada draf IKU', () => {
  assert.match(peringatanSebelumGenerate('C.4-AF', 0) ?? '', /belum punya draf IKU/);
  assert.match(peringatanSebelumGenerate('C.4-SWOT', 0) ?? '', /^SWOT/);
  assert.equal(peringatanSebelumGenerate('C.4-AF', 2), null);
  assert.equal(peringatanSebelumGenerate('C.4-IKU-a', 0), null);
});

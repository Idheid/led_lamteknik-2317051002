import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kodeSumberManual, nilaiButirAngka } from '../butir-angka.ts';
import type { HasilButirAngka } from '../metrik-lkps.ts';

const hasil = (lengkap: boolean): HasilButirAngka => ({
  butir: 'R', judul: 'Rumus', tabel: ['4.a'], utama: 'M-X', metrik: [{ kode: 'M-X', nama: 'X', nilai: lengkap ? 12 : null, satuan: 'angka' }],
  skor: lengkap ? 3 : null, catatan: [], lengkap,
});

test('butir angka: rumus bila LKPS terbaca, nilai manual bila tanpa rumus atau rumus gagal', () => {
  const daftar = nilaiButirAngka({
    butir: [
      { kode: '26', jenis: 'angka', kodeRumus: '26' },
      { kode: '27', jenis: 'angka', kodeRumus: '27' },
      { kode: '99', jenis: 'angka', kodeRumus: null },
      { kode: '98', jenis: 'angka', kodeRumus: null },
      { kode: '1', jenis: 'narasi', kodeRumus: null },
    ],
    adaLkps: true,
    hitung: (k) => (k === '26' ? hasil(true) : hasil(false)),
    manual: new Map([['27', { nilai: '45%', keterangan: 'dihitung manual' }], ['99', { nilai: '1 : 18', keterangan: null }], ['98', { nilai: '  ', keterangan: null }]]),
  });
  assert.deepEqual(daftar.map((d) => [d.butir, d.sumber, d.perluManual]), [
    ['26', 'rumus', false],
    ['27', 'manual', true],
    ['99', 'manual', true],
    ['98', 'belum', true],
  ]);
  assert.equal(daftar[0].hasil?.butir, '26', 'hasil rumus dilabeli kode butir instrumen');
  assert.match(daftar[1].alasan ?? '', /tidak bisa membaca LKPS \(Tabel 4\.a/);
  assert.match(daftar[2].alasan ?? '', /tidak punya rumus/);
});

test('butir angka berumus tanpa LKPS: tunggu LKPS, kecuali nilai manual sudah diisi', () => {
  const [a, b] = nilaiButirAngka({
    butir: [{ kode: '26', jenis: 'angka', kodeRumus: '26' }, { kode: '27', jenis: 'angka', kodeRumus: '27' }],
    adaLkps: false,
    hitung: () => { throw new Error('tidak dipanggil tanpa LKPS'); },
    manual: new Map([['27', { nilai: '3', keterangan: null }]]),
  });
  assert.deepEqual([a.sumber, a.perluManual], ['belum', false]);
  assert.match(a.alasan ?? '', /setelah LKPS diunggah/);
  assert.deepEqual([b.sumber, b.perluManual], ['manual', true]);
  assert.equal(kodeSumberManual('43-I'), 'M-NILAI-43-I');
});

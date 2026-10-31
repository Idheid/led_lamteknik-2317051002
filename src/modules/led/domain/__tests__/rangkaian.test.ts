import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataKosongHalamanAwal, subAwalSusun, subBelumSelesai, urutanBagianSusun } from '../rangkaian.ts';

test('Revisi 31 Okt 2026: urutan Susun seluruh LED = C.1–C.7, II.A, II.B, III, I, IV, lalu AWAL', () => {
  const versi = ['AWAL', 'I', 'II.A', 'II.B', 'C.1', 'C.2', 'C.10', 'C.3', 'C.4', 'C.5', 'C.6', 'C.7', 'III', 'IV', 'LAMPIRAN'];
  assert.deepEqual(urutanBagianSusun(versi), ['C.1', 'C.2', 'C.3', 'C.4', 'C.5', 'C.6', 'C.7', 'C.10', 'II.A', 'II.B', 'III', 'I', 'IV', 'AWAL']);
  assert.deepEqual(urutanBagianSusun(['C.2', 'IV', 'C.1']), ['C.1', 'C.2', 'IV'], 'bagian yang tidak ada dilewati');
});

test('Revisi 31 Okt 2026: halaman awal yang disusun hanya kata pengantar lalu ringkasan; sub-bagian selesai dilewati', () => {
  assert.deepEqual(subAwalSusun(['AWAL-RINGKASAN', 'AWAL-MUKA', 'AWAL-PENGANTAR']), ['AWAL-PENGANTAR', 'AWAL-RINGKASAN']);
  assert.deepEqual(subBelumSelesai(['C.1-IKU-a', 'C.1-LB', 'C.1-AF'], new Set(['C.1-LB'])), ['C.1-IKU-a', 'C.1-AF']);
});

test('Revisi 31 Okt 2026: data kosong halaman yang terisi otomatis', () => {
  const k = dataKosongHalamanAwal({
    prodi: { nama: 'Teknik Sipil', jenjang: 'S1', kodePddikti: null },
    identitas: { skPendirian: 'SK 1', peringkatAkreditasi: 'A', kota: '' },
    fakultas: { nama: 'Fakultas Teknik', perguruanTinggi: 'Universitas Lampung', alamat: null, kota: 'Bandar Lampung' },
    jumlahTim: 0,
  });
  assert.deepEqual(k.muka, [], 'kota dari fakultas dipakai bila identitas prodi kosong');
  assert.ok(k.identitas.includes('Kode PDDikti'));
  assert.ok(k.identitas.includes('Tanggal SK pendirian'));
  assert.ok(!k.identitas.includes('SK pendirian perguruan tinggi'));
  assert.deepEqual(k.tim, ['Susunan tim penyusun']);
  assert.deepEqual(dataKosongHalamanAwal({ prodi: { nama: 'X', jenjang: 'S1', kodePddikti: '1' }, identitas: {}, fakultas: null, jumlahTim: 2 }).muka,
    ['Nama fakultas', 'Nama perguruan tinggi', 'Kota']);
});

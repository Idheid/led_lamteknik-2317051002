import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hitungAnggaran, usulanHalamanKriteria, rentangKata, PENGATURAN_BAWAAN } from '../anggaran.ts';
import type { BagianAnggaran, ButirAnggaran, JenisBagian } from '../anggaran.ts';

const seed = JSON.parse(readFileSync(new URL('../../../../../data/instrumen/lamteknik-2025-pasca.json', import.meta.url), 'utf8'));
const a = seed.anggaranBawaan;
const bagian: BagianAnggaran[] = Object.keys(a.halamanPerBagian).map((kode) => ({
  kode, jenis: a.jenisBagianAnggaran[kode] as JenisBagian, halaman: a.halamanPerBagian[kode],
}));
const butir: ButirAnggaran[] = seed.butir.map((b: { kode: string; bagian: string; bobot: number; jenis: 'narasi' | 'angka' }) => ({
  kode: b.kode, bagian: b.bagian, bobot: b.bobot, jenis: b.jenis,
}));

test('total halaman 150 dan 103 untuk kriteria', () => {
  const h = hitungAnggaran(bagian, butir);
  assert.equal(h.totalHalaman, 150);
  assert.equal(h.halamanUntukKriteria, 103);
  assert.equal(h.melebihiBatas, false);
});

test('usulan halaman kriteria sama dengan dokumen rencana setelah dibulatkan', () => {
  const u = usulanHalamanKriteria(bagian, butir);
  const bulat = Object.fromEntries(Object.entries(u).map(([k, v]) => [k, Math.round(v)]));
  assert.deepEqual(bulat, { 'C.1': 4, 'C.2': 8, 'C.3': 29, 'C.4': 11, 'C.5': 10, 'C.6': 20, 'C.7': 21 });
});

test('target kata sama dengan lembar kerja Matriks butir LED', () => {
  const h = hitungAnggaran(bagian, butir);
  const t = Object.fromEntries(h.butir.map((x) => [x.kode, x.targetKata]));
  assert.equal(t['1'], 610);
  assert.equal(t['2'], 370);
  assert.equal(t['3'], 120);
  assert.equal(t['4-I'], 460);
  assert.equal(t['6-II'], 200);
  assert.equal(t['30'], 50);
  assert.equal(t['48'], 1330);
  assert.equal(t['58-I'], 2130);
  assert.equal(t['60'], 2530);
  const c1 = h.bagian.find((b) => b.kode === 'C.1');
  assert.deepEqual(c1?.kataBersama, { LB: 120, KEB: 120, AF: 180, SWOT: 180 });
  const pendek = h.butir.filter((x) => x.pendek).map((x) => x.kode);
  assert.ok(pendek.includes('30') && pendek.includes('3'));
});

test('butir di bagian yang tidak ada ditolak', () => {
  assert.throws(() => hitungAnggaran(bagian, [{ kode: 'X', bagian: 'C.9', bobot: 1, jenis: 'narasi' }]));
});

test('rentang kata +/- 15%', () => {
  assert.deepEqual(rentangKata(400), { min: 340, maks: 460 });
  assert.equal(PENGATURAN_BAWAAN.kataPerHalaman, 425);
});

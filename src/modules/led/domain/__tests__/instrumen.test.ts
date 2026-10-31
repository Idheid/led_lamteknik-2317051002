import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  berlakuUntukJenjang, bacaVarian, jenjangBerlaku, kodeBersama, kodeSalinan, varianUntukJenjang,
} from '../instrumen.ts';
import { bacaAnggaran, targetKataSubBagian } from '../anggaran-proyek.ts';
import { hitungAnggaran, usulanHalamanKriteria } from '../anggaran.ts';

const seed = JSON.parse(readFileSync(new URL('../../../../../data/instrumen/lamteknik-2025-pasca.json', import.meta.url), 'utf8'));

interface SubSeed { kode: string; tipe: string; berlakuUntuk: string[]; jenjangOverride?: string[]; varian: unknown }
interface BagianSeed { kode: string; subBagian: SubSeed[] }

test('angka pemeriksaan seed: 14 bagian, 125 sub-bagian, 110 berlaku Sarjana, 72 butir, bobot 100,01', () => {
  const bagian = seed.bagian as BagianSeed[];
  const sub = bagian.flatMap((b) => b.subBagian);
  assert.equal(bagian.length, 14);
  assert.equal(sub.length, 125);
  assert.equal(sub.filter((s) => berlakuUntukJenjang(s, 'S1')).length, 110);
  const butirS1 = (seed.butir as { jenjang: string; bobot: number }[]).filter((b) => b.jenjang === 'S1');
  assert.equal(butirS1.length, 72);
  assert.equal(Math.round(butirS1.reduce((s, b) => s + b.bobot, 0) * 100) / 100, 100.01);
});

test('C.3 untuk Sarjana: 19 sub-bagian IKU + 4 sub-bagian bersama; khusus Magister/Doktor tidak tampil', () => {
  const c3 = (seed.bagian as BagianSeed[]).find((b) => b.kode === 'C.3') as BagianSeed;
  const tampil = c3.subBagian.filter((s) => berlakuUntukJenjang(s, 'S1'));
  assert.equal(tampil.filter((s) => s.tipe === 'iku').length, 19);
  assert.equal(tampil.filter((s) => s.tipe === 'bersama').length, 4);
  for (const kode of ['C.3-IKU-a.06', 'C.3-IKU-a.07', 'C.3-IKU-a.08', 'C.3-IKU-b.03']) {
    assert.ok(!tampil.some((s) => s.kode === kode), `${kode} tidak boleh tampil untuk S1`);
  }
});

test('jenjangOverride menimpa berlakuUntuk', () => {
  assert.deepEqual(jenjangBerlaku({ berlakuUntuk: ['PPI'], jenjangOverride: ['S1', 'PPI'] }), ['S1', 'PPI']);
  assert.deepEqual(jenjangBerlaku({ berlakuUntuk: ['PPI'], jenjangOverride: [] }), ['PPI']);
  assert.equal(berlakuUntukJenjang({ berlakuUntuk: ['PPI'] }, 'S1'), false);
});

test('varian instruksi dipilih sesuai jenjang', () => {
  const v = bacaVarian([
    { instruksi: 'A', jenjang: ['S1', 'D3'] },
    { instruksi: 'B', jenjang: ['S2'], catatanTemplate: 'catatan' },
    { rusak: true },
  ]);
  assert.equal(v.length, 2);
  assert.equal(varianUntukJenjang(v, 'S2')?.instruksi, 'B');
  assert.equal(varianUntukJenjang(v, 'S1')?.instruksi, 'A');
  assert.equal(varianUntukJenjang(v, 'PPI')?.instruksi, 'A');
  assert.equal(varianUntukJenjang([], 'S1'), null);
});

test('kode versi salinan unik', () => {
  assert.equal(kodeSalinan('V1', ['V1']), 'V1-SALINAN');
  assert.equal(kodeSalinan('V1', ['V1', 'V1-SALINAN']), 'V1-SALINAN-2');
  assert.equal(kodeSalinan('V1', ['V1', 'V1-SALINAN', 'V1-SALINAN-2']), 'V1-SALINAN-3');
});

test('kode sub-bagian bersama dikenali', () => {
  assert.equal(kodeBersama('C.3-LB'), 'LB');
  assert.equal(kodeBersama('C.1-SWOT'), 'SWOT');
  assert.equal(kodeBersama('C.3-IKU-a.01'), null);
});

test('anggaran proyek dari salinan anggaranBawaan: C.1 4, C.2 8, C.3 29, C.4 11, C.5 10, C.6 20, C.7 21; total 150', () => {
  const { pengaturan, bagian } = bacaAnggaran(seed.anggaranBawaan);
  const butir = (seed.butir as { kode: string; bagian: string; bobot: number; jenis: 'narasi' | 'angka' }[])
    .map((b) => ({ kode: b.kode, bagian: b.bagian, bobot: b.bobot, jenis: b.jenis }));
  const h = hitungAnggaran(bagian, butir, pengaturan);
  const kriteria = Object.fromEntries(h.bagian.filter((b) => b.jenis === 'kriteria').map((b) => [b.kode, b.halaman]));
  assert.deepEqual(kriteria, { 'C.1': 4, 'C.2': 8, 'C.3': 29, 'C.4': 11, 'C.5': 10, 'C.6': 20, 'C.7': 21 });
  assert.equal(h.totalHalaman, 150);
  const usulan = usulanHalamanKriteria(bagian, butir, pengaturan);
  assert.deepEqual(Object.fromEntries(Object.entries(usulan).map(([k, v]) => [k, Math.round(v)])), kriteria);
});

test('target kata sub-bagian: bersama dari kataBersama, IKU dari butirnya, bab narasi dibagi rata', () => {
  const { pengaturan, bagian } = bacaAnggaran(seed.anggaranBawaan);
  const butir = (seed.butir as { kode: string; bagian: string; bobot: number; jenis: 'narasi' | 'angka'; subBagian: string }[]);
  const h = hitungAnggaran(bagian, butir.map((b) => ({ kode: b.kode, bagian: b.bagian, bobot: b.bobot, jenis: b.jenis })), pengaturan);
  const c1 = (seed.bagian as BagianSeed[]).find((b) => b.kode === 'C.1') as BagianSeed;
  const sub = c1.subBagian.filter((s) => berlakuUntukJenjang(s, 'S1')).map((s) => ({
    kode: s.kode, tipe: s.tipe, butir: butir.filter((b) => b.subBagian === s.kode).map((b) => b.kode),
  }));
  const t = targetKataSubBagian(h, 'C.1', sub);
  assert.equal(t['C.1-LB'], 120);
  assert.equal(t['C.1-SWOT'], 180);
  const iku = sub.filter((s) => s.tipe === 'iku');
  const totalIku = iku.reduce((n, s) => n + (t[s.kode] ?? 0), 0);
  // 65% dari 4 halaman x 425 kata = 1.105 kata, selisih pembulatan per butir maksimal 10 kata per butir
  assert.ok(Math.abs(totalIku - 1105) <= 10 * iku.length);
  const bab4 = targetKataSubBagian(h, 'IV', [{ kode: 'IV-1', tipe: 'narasi', butir: [] }, { kode: 'IV-D', tipe: 'data', butir: [] }]);
  assert.equal(bab4['IV-1'], 850);
  assert.equal(bab4['IV-D'], null);
});

test('bacaAnggaran tahan terhadap JSON rusak', () => {
  const { pengaturan, bagian } = bacaAnggaran({ halamanPerBagian: { X: 'a' }, jenisBagianAnggaran: { X: 'aneh' } });
  assert.equal(pengaturan.batasHalamanTotal, 150);
  assert.deepEqual(bagian, [{ kode: 'X', jenis: 'bab', halaman: 0 }]);
  assert.deepEqual(bacaAnggaran(null).bagian, []);
});

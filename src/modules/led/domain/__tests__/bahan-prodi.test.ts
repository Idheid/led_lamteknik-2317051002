import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contohBahanProdi, labelKodeSumber } from '../bahan-prodi.ts';

test('Perbaikan 1 Nov 2026 (P3): contoh isian Bahan dari prodi sesuai sub-bagian', () => {
  assert.match(contohBahanProdi('C.1-IKU-a'), /VMTS ditetapkan dengan SK Dekan/);
  assert.match(contohBahanProdi('C.7-LB'), /audit mutu internal/);
  assert.match(contohBahanProdi('C.4-AF'), /faktor pendukung/);
  assert.match(contohBahanProdi('C.2-SWOT'), /kekuatan/);
  assert.match(contohBahanProdi('IV-1'), /^Contoh: fakta yang belum ada di dokumen/);
});

test('Perbaikan 1 Nov 2026 (P3): kode sumber J ditulis "J = Bahan dari prodi"', () => {
  assert.equal(labelKodeSumber('J'), 'J = Bahan dari prodi');
  assert.equal(labelKodeSumber('D1, J, T-4a'), 'D1, J = Bahan dari prodi, T-4a');
  assert.equal(labelKodeSumber('D1,M-PDS3'), 'D1, M-PDS3');
});

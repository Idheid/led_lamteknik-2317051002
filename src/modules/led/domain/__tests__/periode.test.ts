import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syaratPeriodeBerikutnya, teksKonfirmasiPeriode } from '../periode.ts';

test('L4: tombol Mulai LED periode berikutnya tampil di Menu LED bila salah satu syarat terpenuhi', () => {
  const dasar = { ambang: null, hasilTercatat: false, statusReview: 'draf', eksporFinal: false };
  assert.equal(syaratPeriodeBerikutnya(dasar).tampilDiMenu, false);
  assert.match(syaratPeriodeBerikutnya(dasar).alasan, /^LED aktif belum selesai/);
  assert.equal(syaratPeriodeBerikutnya({ ...dasar, ambang: 18 }).tampilDiMenu, true);
  assert.equal(syaratPeriodeBerikutnya({ ...dasar, hasilTercatat: true }).tampilDiMenu, true);
  assert.equal(syaratPeriodeBerikutnya({ ...dasar, statusReview: 'layak' }).tampilDiMenu, true);
  assert.equal(syaratPeriodeBerikutnya({ ...dasar, statusReview: 'direview', eksporFinal: true }).tampilDiMenu, true);
  assert.equal(teksKonfirmasiPeriode('LED Sipil 2026', 'Instrumen LAM Teknik 2030 Sarjana'),
    'LED Sipil 2026 akan diarsipkan (tetap bisa dibuka dan diekspor). LED baru memakai instrumen Instrumen LAM Teknik 2030 Sarjana.');
});

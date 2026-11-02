import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAngka, formatPersen, formatRupiah, hitungKata, ekstrakAngka, angkaTidakBerdasar, statusPanjang } from '../teks.ts';

test('format angka Indonesia', () => {
  assert.equal(formatAngka(1234.5), '1.234,5');
  assert.equal(formatAngka(3.256, 2), '3,26');
  assert.equal(formatPersen(0.4567), '45,67%');
  assert.equal(formatRupiah(20000000), 'Rp20.000.000');
});

test('hitung kata', () => {
  assert.equal(hitungKata('  Program studi memiliki 12 DTPS. '), 5);
  assert.equal(hitungKata('<p>Satu <em>dua</em></p>'), 2);
  assert.equal(hitungKata(''), 0);
});

test('ekstrak angka format Indonesia', () => {
  const a = ekstrakAngka('Rerata IPK 3,25; dana Rp20.000.000; PDS3 45,5 %; NDTPS 12 orang pada 2025/2026.');
  // "PDS3" adalah nama metrik, bukan angka
  assert.deepEqual(a.map((x) => x.nilai), [3.25, 20000000, 45.5, 12, 2025, 2026]);
  assert.equal(a[2].persen, true);
});

test('angka tidak berdasar terdeteksi', () => {
  const teks = 'Jumlah DTPS 14 orang dengan PDS3 50% dan rerata IPK 3,41 pada 2025/2026, mencakup (1) dan (2).';
  const sah = [14, 0.5];
  const salah = angkaTidakBerdasar(teks, sah, { tahunSah: [2025, 2026] });
  assert.deepEqual(salah.map((x) => x.teks), ['3,41']);
});

test('status panjang', () => {
  assert.equal(statusPanjang(400, 400), 'pas');
  assert.equal(statusPanjang(330, 400), 'kurang');
  assert.equal(statusPanjang(470, 400), 'lebih');
});

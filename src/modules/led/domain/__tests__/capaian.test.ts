import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angkaTeks, hitungCapaian, teksCapaian, teksTren, trenTabel } from '../capaian.ts';

test('persen capaian dan status tercapai; lebih kecil lebih baik', () => {
  assert.deepEqual(hitungCapaian(12, 15), { capaian: 12, target: 15, persen: 80, tercapai: false });
  assert.deepEqual(hitungCapaian(16, 15), { capaian: 16, target: 15, persen: 106.7, tercapai: true });
  assert.deepEqual(hitungCapaian(4.5, 4, true), { capaian: 4.5, target: 4, persen: 88.9, tercapai: false }, 'masa studi 4,5 tahun, target 4');
  assert.equal(hitungCapaian(3.8, 4, true)?.tercapai, true);
  assert.equal(hitungCapaian(null, 4), null);
  assert.equal(hitungCapaian(3, 0), null);
  assert.equal(angkaTeks('37,5%'), 37.5);
  assert.equal(angkaTeks('1.250'), 1250);
  assert.equal(teksCapaian(hitungCapaian(12, 15)!, 'judul'), 'capaian 12 judul dari target 15 judul (80% dari target), belum tercapai');
});

test('tren TS-2, TS-1, TS dari kolom tabel LKPS', () => {
  const t = {
    kolom: [
      { kunci: 'B', label: 'Sumber Pembiayaan' },
      { kunci: 'C', label: 'Jumlah Judul Penelitian / TS-2' }, { kunci: 'D', label: 'TS-1' }, { kunci: 'E', label: 'TS' },
      { kunci: 'F', label: 'Jumlah' },
    ],
    baris: [{ sel: { B: 'PT', C: 2, D: 3, E: 4 } }, { sel: { B: 'Nasional', C: '1', D: 1, E: '3' } }],
  };
  const [x] = trenTabel(t);
  assert.deepEqual(x, { judul: 'Jumlah Judul Penelitian', nilai: [3, 4, 7], arah: 'naik' });
  assert.equal(teksTren(x), 'Jumlah Judul Penelitian: 3 (TS-2), 4 (TS-1), 7 (TS), naik');
  // beberapa kelompok (Tabel 6.a): mahasiswa aktif dan mahasiswa asing
  const enam = {
    kolom: [
      { kunci: 'D', label: 'Jumlah Mahasiswa Aktif / TS-2' }, { kunci: 'E', label: 'TS-1' }, { kunci: 'F', label: 'TS' },
      { kunci: 'G', label: 'Jumlah Mahasiswa Asing Penuh Waktu (Full-time) / TS-2' }, { kunci: 'H', label: 'TS-1' }, { kunci: 'I', label: 'TS' },
    ],
    baris: [{ sel: { D: 400, E: 380, F: 380, G: 0, H: 0, I: 0 } }],
  };
  assert.deepEqual(trenTabel(enam).map((x) => [x.judul, x.arah]), [['Jumlah Mahasiswa Aktif', 'turun']], 'kelompok kosong dilewati');
  assert.deepEqual(trenTabel({ kolom: [{ kunci: 'A', label: 'No' }], baris: [] }), []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barisIdentitas, nilaiIdentitas } from '../halaman-muka.ts';
import { dataKosongHalamanAwal } from '../rangkaian.ts';

const FAKULTAS = {
  nama: 'Fakultas Teknik', perguruanTinggi: 'Universitas Lampung', alamat: 'Jl. Sumantri Brojonegoro 1', kota: 'Bandar Lampung', telepon: '0721-701609',
  skPendirian: '195 Tahun 1965', tanggalSkPendirian: '23 September 1965', pejabatSkPendirian: null,
};

test('D9: identitas pengusul beserta asal datanya (institusi, Program studi, riwayat, prodi)', () => {
  const b = barisIdentitas({
    fakultas: FAKULTAS,
    identitas: { telepon: '0721-111', email: 'sipil@unila.ac.id', laman: 'sipil.unila.ac.id', peringkatAkreditasi: 'Unggul', pejabatSkPendirian: 'Presiden RI' },
    prodi: { nama: 'Teknik Sipil', namaJenjang: 'Sarjana' },
  });
  const cari = (k: string) => b.find((x) => x.kunci === k)!;
  assert.deepEqual([cari('perguruanTinggi').nilai, cari('perguruanTinggi').asal], ['Universitas Lampung', 'institusi']);
  assert.deepEqual([cari('jenisProgram').nilai, cari('jenisProgram').asal], ['Sarjana', 'admin']);
  assert.deepEqual([cari('alamat').nilai, cari('alamat').asal], ['Jl. Sumantri Brojonegoro 1', 'institusi'], 'alamat prodi kosong: cadangan institusi');
  assert.deepEqual([cari('telepon').nilai, cari('telepon').asal], ['0721-111', 'prodi'], 'telepon prodi didahulukan');
  assert.equal(cari('emailWebsite').nilai, 'sipil@unila.ac.id / sipil.unila.ac.id');
  assert.deepEqual([cari('skPendirian').nilai, cari('skPendirian').asal], ['195 Tahun 1965', 'institusi']);
  assert.deepEqual([cari('pejabatSkPendirian').nilai, cari('pejabatSkPendirian').asal], ['Presiden RI', 'prodi'], 'data lama identitas prodi sebagai cadangan');
  assert.deepEqual([cari('peringkatAkreditasi').nilai, cari('peringkatAkreditasi').asal], ['Unggul', 'riwayat']);
  assert.deepEqual([cari('skPembukaan').nilai, cari('skPembukaan').asal], ['', 'prodi']);
  assert.equal(b.length, 16, 'urutan dan jumlah baris sesuai template identitas pengusul');
});

test('D9: nilai identitas tanpa institusi tetap lengkap kuncinya', () => {
  const n = nilaiIdentitas({ fakultas: null, identitas: {}, prodi: { nama: 'X', namaJenjang: 'Magister' } });
  assert.equal(n.perguruanTinggi, '');
  assert.equal(n.namaProdi, 'X');
  assert.equal(Object.keys(n).length, 16);
});

test('D9: logo dilaporkan kosong hanya bila diketahui belum diunggah', () => {
  const dasar = { prodi: { nama: 'X', jenjang: 'S1', kodePddikti: '1' }, identitas: {}, fakultas: FAKULTAS, jumlahTim: 1 };
  assert.ok(dataKosongHalamanAwal({ ...dasar, adaLogo: false }).muka.includes('Logo perguruan tinggi'));
  assert.ok(!dataKosongHalamanAwal({ ...dasar, adaLogo: true }).muka.includes('Logo perguruan tinggi'));
  assert.ok(!dataKosongHalamanAwal(dasar).muka.includes('Logo perguruan tinggi'));
});

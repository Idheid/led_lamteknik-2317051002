import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  jadwalMundur, kalimatSisa, labelSisa, sisaBulan, statusTonggak, tambahBulan, tanggalIso, usulanBatasPengajuan, warnaKesiapan,
} from '../kesiapan.ts';

const t = (s: string) => new Date(`${s}T00:00:00Z`);

test('jadwal kerja dihitung mundur dari batas pengajuan; tanggal yang diubah PJ dipakai', () => {
  const j = jadwalMundur(t('2027-03-31'));
  assert.deepEqual(j.map((x) => [x.kode, x.tanggal]), [
    ['lkps', '2027-02-03'], ['kriteria', '2027-02-17'], ['bab', '2027-03-03'], ['review', '2027-03-17'], ['ekspor', '2027-03-31'],
  ]);
  const u = jadwalMundur(t('2027-03-31'), { kriteria: '2027-02-28', bab: 'bukan tanggal' });
  assert.deepEqual([u[1].tanggal, u[1].diubah, u[2].tanggal, u[2].diubah], ['2027-02-28', true, '2027-03-03', false]);
});

test('status tonggak: tercapai, terlewat (merah), mendatang', () => {
  const hariIni = t('2027-02-20');
  assert.equal(statusTonggak('2027-02-17', false, hariIni), 'terlewat');
  assert.equal(statusTonggak('2027-02-17', true, hariIni), 'tercapai');
  assert.equal(statusTonggak('2027-02-20', false, hariIni), 'mendatang');
});

test('sisa bulan dan tanda warna (merah ≤ 6 bulan belum layak, kuning ≤ 12 bulan)', () => {
  const hariIni = t('2026-10-22');
  assert.equal(sisaBulan(t('2027-03-31'), hariIni), 5);
  assert.equal(sisaBulan(t('2027-04-21'), hariIni), 5, 'bulan belum penuh tidak dihitung');
  assert.equal(sisaBulan(t('2026-09-30'), hariIni), -1);
  assert.equal(sisaBulan(null, hariIni), null);
  assert.equal(warnaKesiapan(5, 'draf'), 'merah');
  assert.equal(warnaKesiapan(5, 'layak'), 'kuning');
  assert.equal(warnaKesiapan(12, 'direview'), 'kuning');
  assert.equal(warnaKesiapan(13, 'draf'), null);
  assert.equal(warnaKesiapan(null, 'draf'), null);
  assert.equal(labelSisa(5), '5 bulan lagi');
  assert.equal(labelSisa(-1), 'akreditasi sudah berakhir');
});

test('usulan batas pengajuan 6 bulan sebelum akreditasi berakhir; tambah bulan menjaga akhir bulan', () => {
  assert.equal(tanggalIso(usulanBatasPengajuan(t('2027-08-31'))), '2027-02-28');
  assert.equal(tanggalIso(tambahBulan(t('2026-01-31'), 1)), '2026-02-28');
});

test('kalimatSisa: kalimat utuh untuk pil sisa waktu', () => {
  assert.equal(kalimatSisa(null), 'Tanggal akreditasi belum diisi');
  assert.equal(kalimatSisa(-2), 'Akreditasi sudah berakhir');
  assert.equal(kalimatSisa(0), 'Akreditasi berakhir bulan ini');
  assert.equal(kalimatSisa(5), 'Akreditasi berakhir 5 bulan lagi');
});

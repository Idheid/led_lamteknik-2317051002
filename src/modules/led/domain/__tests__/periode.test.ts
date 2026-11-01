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

test('L5: bahan dari prodi dipetakan per kode, lalu per judul bila instrumen berganti', async () => {
  const { petakanBahan, dokumenDicentangBawaan, bolehSumberPeriodeLalu, cariNarasiLalu } = await import('../periode.ts');
  const lama = [
    { kode: 'C.1-LB', judul: 'Latar Belakang', isi: 'Visi keilmuan sejak 2010.' },
    { kode: 'C.1-IKU-a', judul: 'Mekanisme Penyusunan VMTS', isi: 'Lokakarya tahunan.' },
    { kode: 'C.9-X', judul: 'Kriteria yang dihapus', isi: 'Tidak ada padanan.' },
    { kode: 'C.2-KEB', judul: 'Kebijakan', isi: '  ' },
  ];
  const baru = [
    { kode: 'C.1-LB', judul: 'Latar Belakang' },
    { kode: 'C.1-IKU-b', judul: 'Mekanisme penyusunan VMTS' },
    { kode: 'C.2-KEB', judul: 'Kebijakan' },
  ];
  const h = petakanBahan(lama, baru, 2026);
  assert.deepEqual(h.salin, [
    { kode: 'C.1-LB', dariKode: 'C.1-LB', isi: '[dari LED 2026] Visi keilmuan sejak 2010.' },
    { kode: 'C.1-IKU-b', dariKode: 'C.1-IKU-a', isi: '[dari LED 2026] Lokakarya tahunan.' },
  ]);
  assert.deepEqual(h.belum.map((x) => x.kode), ['C.9-X'], 'bahan kosong tidak dihitung');
  assert.equal(dokumenDicentangBawaan(2025, 2031), false, 'lebih tua dari 5 tahun');
  assert.equal(dokumenDicentangBawaan(2026, 2031), true);
  assert.equal(dokumenDicentangBawaan(null, 2031), true);
  assert.equal(bolehSumberPeriodeLalu('C.3-AF'), true);
  assert.equal(bolehSumberPeriodeLalu('C.3-SWOT'), true);
  assert.equal(bolehSumberPeriodeLalu('C.3-LB'), false);
  assert.equal(cariNarasiLalu([{ kode: 'C.1-IKU-a', judul: 'Mekanisme Penyusunan VMTS', teks: 'x' }], { kode: 'C.1-IKU-b', judul: 'mekanisme penyusunan VMTS' })?.teks, 'x');
});

test('L5: narasi periode lalu masuk prompt sebagai sumber P dengan pesan pembanding', async () => {
  const { susunPengguna, kodeSumberSah } = await import('../prompt.ts');
  const k = {
    prodi: { nama: 'Teknik', jenjang: 'S1', upps: 'FT', perguruanTinggi: 'U' }, ts: { tahunAkademik: '2030/2031', petaLabel: {} },
    subBagian: { kode: 'C.1-AF', label: '4', judul: 'Analisis Faktor', instruksi: 'x', tipe: 'bersama' }, butir: [], metrik: [], tabel: [], potongan: [],
    targetKata: 300, narasiLalu: 'Capaian 2025 belum memenuhi target.',
  };
  assert.match(susunPengguna(k), /## NARASI LED PERIODE LALU \[P\] \(periode lalu: gunakan untuk membandingkan, bukan disalin\)\nCapaian 2025/);
  assert.ok(kodeSumberSah(k).has('P'));
  assert.ok(!kodeSumberSah({ ...k, narasiLalu: null }).has('P'));
  assert.ok(!susunPengguna({ ...k, narasiLalu: null }).includes('PERIODE LALU'));
});

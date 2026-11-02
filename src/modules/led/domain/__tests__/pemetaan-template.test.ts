import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daftarGaya, polaCatatanSah, pratinjauPemetaan, usulanPemetaan } from '../pemetaan-template.ts';
import { bacaPemetaan, uraiTemplate, untukJenjang, type ParagrafTemplate, type PeranGaya } from '../template-led.ts';

const p = (teks: string, gaya: string, o: Partial<ParagrafTemplate> = {}): ParagrafTemplate => ({ teks, gaya, numId: null, ilvl: 0, kotak: false, ...o });

/** Template mini berformat lain: judul bergaya Heading, sub-bagian tidak bernomor. */
const LAIN = [
  p('LAPORAN EVALUASI DIRI PROGRAM STUDI', 'Title'),
  p('BAB I PENDAHULUAN', 'Heading 1'),
  p('Bagian ini menjelaskan latar belakang penyusunan LED.', 'Normal', { kotak: true }),
  p('BAB II LAPORAN EVALUASI DIRI', 'Heading 1'),
  p('A. Struktur Tim Penyusun', 'Heading 2'),
  p('Bagian ini menjelaskan tim penyusun.', 'Normal', { kotak: true }),
  p('Kriteria Akreditasi', 'Heading 2'),
  p('Diferensiasi Misi', 'Heading 3'),
  p('Latar Belakang', 'Judul Kecil'),
  p('Uraikan latar belakang kriteria ini.', 'Isi'),
  p('(Penjelasan disampaikan oleh pengusul pada program Sarjana)', 'Catatan'),
  p('', 'Normal', { kotak: true }),
  p('Kebijakan', 'Judul Kecil'),
  p('Uraikan kebijakan.', 'Isi', { kotak: true }),
  p('Akuntabilitas', 'Heading 3'),
  p('Latar Belakang', 'Judul Kecil'),
  p('Uraikan latar belakang akuntabilitas.', 'Isi', { kotak: true }),
  p('BAB III PROGRAM PENGEMBANGAN', 'Heading 1'),
  p('Bagian ini menjelaskan program pengembangan.', 'Normal', { kotak: true }),
];

test('I3: tanpa pemetaan perilakunya seperti biasa (template berformat lain tidak terbaca kriterianya)', () => {
  const u = uraiTemplate(LAIN);
  assert.equal(u.filter((b) => b.jenis === 'kriteria').length, 0);
  assert.equal(bacaPemetaan(null), null);
  assert.equal(bacaPemetaan({ gaya: {} }), null, 'pemetaan kosong dianggap tidak ada');
});

test('I3: dengan pemetaan, peran gaya menggantikan aturan nama gaya', () => {
  const peta = { gaya: { 'Heading 1': 'bab', 'Heading 2': 'bagian2', 'Heading 3': 'kriteria', 'Judul Kecil': 'sub1', Isi: 'instruksi', Title: 'abaikan' } } as const;
  const u = uraiTemplate(LAIN, { gaya: { ...peta.gaya } });
  assert.deepEqual(u.map((b) => `${b.kode}:${b.nama}`), [
    'I:BAB I PENDAHULUAN', 'II.A:A. Struktur Tim Penyusun', 'C.1:Diferensiasi Misi', 'C.2:Akuntabilitas', 'III:BAB III PROGRAM PENGEMBANGAN',
  ]);
  const c1 = u.find((b) => b.kode === 'C.1')!;
  assert.deepEqual(c1.sub.map((s) => s.judul), ['Latar Belakang', 'Kebijakan']);
  assert.deepEqual(c1.sub[0].varian[0].jenjang, ['S1'], 'catatan jenjang dibaca');
  assert.equal(c1.sub[1].varian[0].instruksi, 'Uraikan kebijakan.');
  assert.equal(untukJenjang(u, 'D3').find((b) => b.kode === 'C.1')!.sub.length, 1);

  // pola catatan sendiri dan tabel sebagai kotak isian
  const tabel = [
    p('BAB II LAPORAN', 'Heading 1'), p('Kriteria Akreditasi', 'Heading 2'), p('Akuntabilitas', 'Heading 3'),
    p('Latar Belakang', 'Judul Kecil'), p('Uraikan latar belakang.', 'Isi'), p('[khusus Magister]', 'Isi'), p('', '', { tabel: true }),
    p('Kebijakan', 'Judul Kecil'), p('Uraikan kebijakan.', 'Isi'), p('', '', { tabel: true }),
  ];
  const t = uraiTemplate(tabel, { gaya: { 'Heading 1': 'bab', 'Heading 2': 'bagian2', 'Heading 3': 'kriteria', 'Judul Kecil': 'sub1' }, polaCatatan: '^\\[khusus', kotak: 'tabel' });
  const k = t.find((b) => b.kode === 'C.1')!;
  assert.deepEqual(k.sub.map((s) => s.judul), ['Latar Belakang', 'Kebijakan']);
  assert.equal(k.sub[0].varian[0].catatanTemplate, '[khusus Magister]');
});

test('I3: usulan awal tanpa AI, tabel gaya, dan pratinjau dengan peringatan', () => {
  const u = usulanPemetaan(LAIN, { jumlahKriteria: 2 });
  assert.deepEqual(u.gaya, { 'Heading 1': 'bab', 'Heading 2': 'bagian2', 'Heading 3': 'kriteria' });
  const g = daftarGaya(LAIN);
  assert.equal(g[0].gaya, 'Heading 1');
  assert.equal(g[0].jumlah, 3);
  assert.deepEqual(g[0].contoh, ['BAB I PENDAHULUAN', 'BAB II LAPORAN EVALUASI DIRI', 'BAB III PROGRAM PENGEMBANGAN']);

  const ok = pratinjauPemetaan(LAIN, u, { jenjang: 'S1', kriteriaMatriks: 2 });
  assert.equal(ok.jumlahKriteria, 2);
  assert.deepEqual(ok.peringatan, []);
  assert.equal(ok.bagian.find((b) => b.kode === 'C.1')!.sub.S1, 1, 'judul kecil tanpa nomor belum dipetakan: satu blok');
  // deepEqual di atas mempersempit tipe u.gaya; kembalikan ke Record peran
  const gayaLengkap: Record<string, PeranGaya> = { ...(u.gaya as Record<string, PeranGaya>), 'Judul Kecil': 'sub1' };
  const lengkap = pratinjauPemetaan(LAIN, { gaya: gayaLengkap }, { jenjang: 'S1', kriteriaMatriks: 2 });
  assert.equal(lengkap.bagian.find((b) => b.kode === 'C.1')!.sub.S1, 2);
  assert.deepEqual(lengkap.bagian.find((b) => b.kode === 'C.1')!.judul, ['Latar Belakang', 'Kebijakan']);
  const beda = pratinjauPemetaan(LAIN, u, { jenjang: 'S1', kriteriaMatriks: 7 });
  assert.deepEqual(beda.peringatan, ['Jumlah kriteria (2) tidak sama dengan Matriks Penilaian (7).']);
  const kosong = pratinjauPemetaan(LAIN, null, { jenjang: 'S1' });
  assert.ok(kosong.peringatan.includes('Belum ada kriteria yang terbaca. Pilih gaya yang berperan sebagai Kriteria.'));
});

test('I3: pola catatan jenjang harus regex sah yang tidak cocok dengan teks kosong', () => {
  assert.equal(polaCatatanSah('disampaikan oleh pengusul'), true);
  assert.equal(polaCatatanSah('(tidak ditutup'), false);
  assert.equal(polaCatatanSah('.*'), false);
});

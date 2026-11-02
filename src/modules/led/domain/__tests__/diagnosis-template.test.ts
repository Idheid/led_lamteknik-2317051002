import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosisTemplate, teksRingkasan } from '../diagnosis-template.ts';
import type { BagianHasilTemplate, ParagrafTemplate } from '../template-led.ts';

const p = (teks: string, gaya = '', numId: string | null = null, ilvl = 0): ParagrafTemplate => ({ teks, gaya, numId, ilvl, kotak: false });
const OPSI = { jenjang: 'S1', tahun: 2025 };

function kriteria(nama: string, jenjang: string[]): BagianHasilTemplate {
  return {
    kode: 'C.1', nama, jenis: 'kriteria', pengantar: null,
    sub: [{ jalur: [], judul: 'Latar Belakang', peran: 'LB', varian: [{ instruksi: 'Bagian ini …', jenjang, catatanTemplate: null }] }],
  };
}

test('I2: berkas rusak dan bukan Template LED', () => {
  const rusak = diagnosisTemplate(null, [], OPSI);
  assert.equal(rusak.kode, 'rusak');
  assert.equal(rusak.pesan, 'Berkas tidak bisa dibuka sebagai dokumen Word.');
  assert.equal(rusak.langkah, 'Simpan ulang sebagai .docx lalu unggah lagi.');
  const lkps = diagnosisTemplate([p('Peringatan Pengisian Laporan Evaluasi Diri (LED)'), p('Peringatan')], [], OPSI);
  assert.equal(lkps.kode, 'bukan-template');
  assert.equal(lkps.pesan, 'Berkas ini bukan Template LED (terbaca: Peringatan Pengisian Laporan Evaluasi Diri (LED) · Peringatan).');
  assert.equal(lkps.langkah, 'Unggah Template LEDPS dari LAM Teknik.');
});

test('I2: struktur LED lama (kriteria Visi, Misi, …; Tata Pamong …) tanpa kriteria C.x', () => {
  const par = [
    p('LAPORAN EVALUASI DIRI PROGRAM STUDI', 'heading 1'),
    p('Kriteria Akreditasi', 'heading 3', '8'),
    ...['Visi, Misi, Tujuan, dan Strategi', 'Tata Pamong, Tata Kelola dan Kerja sama', 'Mahasiswa', 'Sumber Daya Manusia',
      'Keuangan, Sarana dan Prasarana', 'Pendidikan', 'Penelitian', 'Pengabdian kepada Masyarakat', 'Luaran dan Capaian Tridharma Perguruan Tinggi']
      .flatMap((k) => [p(k, 'heading 3', '7', 1), p('Kebijakan', 'heading 3', '7', 2)]),
  ];
  const d = diagnosisTemplate(par, [], OPSI);
  assert.equal(d.kode, 'struktur-lama');
  assert.equal(d.pesan, 'Template ini memakai struktur LED lama (9 kriteria). Instrumen tahun 2025 memakai kriteria pada Matriks.');
  assert.equal(d.bisaDipetakan, false);
  assert.equal(d.ringkasan.gaya[0].gaya, 'heading 3');
  assert.equal(d.ringkasan.gaya[0].jumlah, 19);
});

test('I2: format judul tidak dikenali bukan jalan buntu; ringkasan memuat BAB, kriteria, gaya judul beserta contoh', () => {
  const par = [
    p('LAPORAN EVALUASI DIRI PROGRAM STUDI', 'Title'),
    p('BAB I PENDAHULUAN', 'Heading 1'),
    p('BAB II LAPORAN EVALUASI DIRI', 'Heading 1'),
    p('Kriteria Akreditasi', 'Heading 2'),
    p('Diferensiasi Misi', 'Heading 2'),
    p('Latar Belakang', 'Heading 3'),
    p('Bagian ini menjelaskan latar belakang.', 'Normal'),
  ];
  const d = diagnosisTemplate(par, [], OPSI);
  assert.equal(d.kode, 'format-lain');
  assert.equal(d.bisaDipetakan, true);
  assert.equal(d.pesan, 'Format judul template ini berbeda dari template yang dikenal sistem.');
  assert.equal(d.langkah, 'Tentukan sendiri judulnya lewat Pemetaan judul, atau minta usulan AI.');
  assert.equal(d.ringkasan.jumlahParagraf, 7);
  assert.deepEqual(d.ringkasan.bab, ['BAB I PENDAHULUAN', 'BAB II LAPORAN EVALUASI DIRI']);
  assert.deepEqual(d.ringkasan.gaya.map((g) => `${g.gaya}:${g.jumlah}`), ['Heading 1:2', 'Heading 2:2', 'Title:1', 'Heading 3:1']);
  assert.equal(d.ringkasan.gaya[0].contoh, 'BAB I PENDAHULUAN');
  assert.match(teksRingkasan(d.ringkasan), /^7 paragraf\. BAB: BAB I PENDAHULUAN; BAB II LAPORAN EVALUASI DIRI\. kriteria: .*gaya judul: Heading 1 \(2, mis\. "BAB I PENDAHULUAN"\)/);
});

test('I2: jenjang tidak ada di template, dan template yang cocok', () => {
  const par = [p('LAPORAN EVALUASI DIRI PROGRAM STUDI')];
  const d = diagnosisTemplate(par, [kriteria('Akuntabilitas', ['D3', 'S1'])], { jenjang: 'PPI', tahun: 2025 });
  assert.equal(d.kode, 'jenjang-tidak-ada');
  assert.equal(d.pesan, 'Template terbaca (1 kriteria), tetapi tidak ada bagian untuk Program Profesi Insinyur. Jenjang yang ada: Diploma Tiga, Sarjana.');
  const ok = diagnosisTemplate(par, [kriteria('Akuntabilitas', ['D3', 'S1'])], OPSI);
  assert.equal(ok.kode, 'cocok');
  assert.deepEqual(ok.ringkasan.kriteria, ['Akuntabilitas']);
});

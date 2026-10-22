import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dokumenDirujuk, judulDariLegenda, kodeParagraf, rujukanSingkat, type DokumenRujukan, type KonteksRujukan } from '../rujukan.ts';
import type { DokTiptap } from '../narasi.ts';

const dok: DokumenRujukan[] = [
  { id: 'a', judul: 'Renstra FT Unila 2021–2025', namaBerkas: 'renstra.pdf', tahunTerbit: 2021, tautanBukti: 'https://drive/x', bersama: true },
  { id: 'b', judul: null, namaBerkas: 'notulen-rapat.docx', tahunTerbit: null, tautanBukti: null, bersama: false },
];
const k: KonteksRujukan = {
  legenda: {
    U1: 'Bahan bersama UPPS: Renstra FT Unila 2021–2025, hlm. 4',
    D1: 'Dokumen: notulen-rapat.docx',
    'T-4a': 'LKPS Tabel 4.a Dosen Tetap Perguruan Tinggi',
    'M-NDTPS': 'Metrik sistem: Jumlah DTPS',
    'M-NILAI-27': 'Nilai hitung butir 27 diisi penyusun',
    J: 'Jawaban penyusun di formulir',
  },
  dokumen: dok,
  tabelMetrik: new Map([['M-NDTPS', ['4.a']]]),
};

test('rujukan singkat per paragraf dari kode sumber', () => {
  assert.equal(rujukanSingkat(['T-4a', 'U1'], k), '(LKPS Tabel 4.a; Renstra FT Unila 2021–2025, 2021)');
  assert.equal(rujukanSingkat(['D1'], k), '(notulen-rapat, t.t.)', 'tanpa tahun: t.t.; judul dari nama berkas');
  assert.equal(rujukanSingkat(['M-NDTPS', 'M-NILAI-27'], k), '(LKPS Tabel 4.a, diolah; LKPS, dihitung tim penyusun)');
  assert.equal(rujukanSingkat(['J', 'M-TIM'], k), '(Tim Penyusun LED)', 'sama → sekali');
  assert.equal(rujukanSingkat(['X9'], k), null);
  assert.equal(rujukanSingkat([], k), null);
  assert.deepEqual(kodeParagraf({ sumber: 'D1, T-4a' }), ['D1', 'T-4a']);
  assert.deepEqual(judulDariLegenda('Dokumen: SK Dekan, hlm. 2'), { judul: 'SK Dekan', bersama: false });
});

test('dokumen yang dirujuk narasi, urut kemunculan pertama, tanpa ganda', () => {
  const isi = (sumber: string[]): DokTiptap => ({
    type: 'doc',
    content: sumber.map((s) => ({ type: 'paragraph', attrs: { sumber: s }, content: [{ type: 'text', text: 'x' }] })),
  }) as unknown as DokTiptap;
  const hasil = dokumenDirujuk([
    { isi: isi(['D1', 'T-4a']), legenda: k.legenda },
    { isi: isi(['U1, D1']), legenda: k.legenda },
  ], dok);
  assert.deepEqual(hasil.map((d) => d.id), ['b', 'a']);
});

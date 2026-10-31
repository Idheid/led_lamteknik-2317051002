import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaRentangHalaman, butirDariBobot, deteksiTabelBobot } from '../bobot.ts';
import { bagianDariKonteks, gabungButir, periksaInstrumen, type ButirAi } from '../ekstraksi-instrumen.ts';
import { kelompokBaris, susunMatriks, type BarisMatriks } from '../matriks.ts';
import { jenjangCatatan, petakanSubBagian, uraiTemplate, type ParagrafTemplate } from '../template-led.ts';

test('rentang halaman tabel bobot', () => {
  assert.deepEqual(bacaRentangHalaman('223-227'), [223, 224, 225, 226, 227]);
  assert.deepEqual(bacaRentangHalaman('223 – 224, 230'), [223, 224, 230]);
  assert.deepEqual(bacaRentangHalaman('5 s.d. 6'), [5, 6]);
  assert.deepEqual(bacaRentangHalaman(''), []);
  assert.throws(() => bacaRentangHalaman('227-223'));
  assert.throws(() => bacaRentangHalaman('abc'));
});

test('kode butir dari tabel bobot: satu bobot → n, beberapa bobot → n-I, n-II', () => {
  const b = butirDariBobot([
    { no: 3, elemen: 'A', sub: [{ bobot: 0.22, indikator: 'x' }], halaman: 1 },
    { no: 4, elemen: 'B', sub: [{ bobot: 1.18, indikator: 'y' }, { bobot: 0.58, indikator: 'z' }], halaman: 1 },
  ]);
  assert.deepEqual(b.map((x) => `${x.kode}:${x.bobot}`), ['3:0.22', '4-I:1.18', '4-II:0.58']);
});

test('deteksi letak tabel bobot per jenjang dari teks halaman', () => {
  const t = ['PROGRAM SARJANA TERAPAN', 'LAMPIRAN:\nBOBOT PENILAIAN AKREDITASI\n1.05', '0.64\n', 'Form Laporan Asesmen Kecukupan\n1.00',
    'PROGRAM SARJANA', 'LAMPIRAN:\nBOBOT PENILAIAN\n1.14', '0.22'];
  assert.deepEqual(deteksiTabelBobot(t), [
    { jenjang: 'STr', halamanMulai: 2, halamanAkhir: 3 },
    { jenjang: 'S1', halamanMulai: 6, halamanAkhir: 7 },
  ]);
});

test('matriks: baris disusun per kolom dari posisi teks, berlanjut ke halaman berikutnya', () => {
  const judul = ['No', 'Kriteria', 'Indikator', '4', '3', '2', '1', '0'].map((t, i) => ({ x: [60, 113, 205, 325, 427, 530, 632, 734][i], y: 520, lebar: 10, teks: t }));
  const sel = (x: number, y: number, teks: string) => ({ x, y, lebar: 50, teks });
  const h1 = [...judul, sel(60, 490, 'I. Diferensiasi Misi (Visi, Misi)'), sel(60, 457, '1'), sel(91, 457, 'Kekhasan'), sel(91, 445, 'VMTS'),
    sel(180, 457, 'Pernyataan VMTS'), sel(180, 445, 'Tabel 1 LKPS.'), sel(282, 457, 'VMTS dengan:'), sel(282, 445, '(1) Linearitas;'),
    sel(385, 457, 'Skor tiga'), sel(91, 300, 'x'), sel(180, 300, 'y'), sel(282, 300, 'z'), sel(60, 29, 'kaki halaman')];
  const h2 = [...judul, sel(282, 500, '(2) Renstra.'), sel(91, 480, 'a'), sel(180, 480, 'b'), sel(60, 470, '2'), sel(91, 470, 'Mekanisme')];
  const r = susunMatriks([{ nomor: 2, item: h1 }, { nomor: 3, item: h2 }]);
  assert.equal(r.baris.length, 2);
  const [b1, b2] = r.baris;
  assert.equal(b1.no, '1');
  assert.deepEqual(b1.halaman, [2, 3]);
  assert.deepEqual(b1.konteks, ['I. Diferensiasi Misi (Visi, Misi)']);
  assert.equal(b1.kriteria, 'Kekhasan VMTS x a');
  assert.equal(b1.skor[0], 'VMTS dengan:\n(1) Linearitas; z\n(2) Renstra.');
  assert.equal(b1.skor[1], 'Skor tiga');
  assert.equal(b2.kriteria, 'Mekanisme');
  assert.equal(kelompokBaris([b1, b2, b1], 2).length, 2);
});

test('jenjang dari catatan biru template', () => {
  assert.equal(jenjangCatatan('(Penjelasan disampaikan oleh pengusul dari program studi untuk semua program).').length, 10);
  assert.deepEqual(jenjangCatatan('(Data dan analisis disampaikan oleh pengusul dari program studi pada program Sarjana / Sarjana Terapan / Magister).'), ['S1', 'STr', 'S2']);
  assert.deepEqual(jenjangCatatan('(Data dan analisis disampaikan oleh pengusul dari program studi pada Program Profesi Insinyur).'), ['PPI']);
});

test('template: blok instruksi menjadi sub-bagian; varian jenjang digabung; kode dari versi rujukan', () => {
  const p = (teks: string, o: Partial<ParagrafTemplate> = {}): ParagrafTemplate => ({ teks, gaya: '', numId: null, ilvl: 0, kotak: false, ...o });
  const paragraf = [
    p('BAB I PENDAHULUAN', { gaya: 'I. Judul Besar' }),
    p('(Diisi oleh pengusul dari program studi untuk semua program).'),
    p('BAB II STRUKTUR LAPORAN EVALUASI DIRI', { gaya: 'I. Judul Besar' }),
    p('Kriteria Akreditasi', { gaya: 'II. Sub Judul' }),
    p('Diferensiasi Misi', { gaya: 'C.1. Diferensiasi Misi (Visi' }),
    p('Latar Belakang', { numId: '2', ilvl: 0 }),
    p('Bagian ini menjelaskan latar belakang VMTS.'),
    p('(Penjelasan disampaikan oleh pengusul dari program studi untuk semua program).', { kotak: true }),
    p('Indikator Kinerja Utama (IKU)', { numId: '2', ilvl: 0 }),
    p('Jabatan akademik DTPS', { numId: '4', ilvl: 1 }),
    p('Bagian ini menjelaskan jabatan akademik untuk sarjana.'),
    p('(Data dan analisis disampaikan oleh pengusul dari program studi pada program Sarjana).', { kotak: true }),
    p('Bagian ini menjelaskan jabatan akademik guru besar untuk doktor.'),
    p('(Data dan analisis disampaikan oleh pengusul dari program studi pada program Doktor).', { kotak: true }),
    p('Topik baru yang belum ada sebelumnya', { numId: '4', ilvl: 1 }),
    p('Bagian ini menjelaskan hal baru. (Penjelasan disampaikan oleh pengusul dari program studi untuk semua program).', { kotak: true }),
  ];
  const u = uraiTemplate(paragraf);
  assert.deepEqual(u.map((b) => b.kode), ['I', 'C.1']);
  const c1 = u[1];
  assert.deepEqual(c1.sub.map((s) => [s.judul, s.peran, s.varian.length]), [['Latar Belakang', 'LB', 1], ['Jabatan akademik DTPS', 'IKU', 2], ['Topik baru yang belum ada sebelumnya', 'IKU', 1]]);
  assert.deepEqual(c1.sub[1].varian.map((v) => v.jenjang), [['S1'], ['S3']]);
  assert.equal(c1.sub[2].varian[0].instruksi, 'Bagian ini menjelaskan hal baru.', 'catatan biru di akhir instruksi dipisahkan');
  const peta = petakanSubBagian(u, [
    { bagianKode: 'I', kode: 'I-1', label: '', judul: 'Pendahuluan', grup: null, tipe: 'narasi', instruksi: ['Gambaran umum UPPS dan prodi.'] },
    { bagianKode: 'C.1', kode: 'C.1-IKU-a.v', label: '3.a.v', judul: 'Jabatan akademik DTPS', grup: 'a. Profil', tipe: 'iku', instruksi: ['Bagian ini menjelaskan jabatan akademik untuk sarjana.'] },
  ]);
  assert.equal(peta[0].sub[0].kode, 'I-1');
  assert.equal(peta[0].sub[0].varian[0].instruksi, 'Gambaran umum UPPS dan prodi.', 'template tanpa instruksi: instruksi rujukan dipakai');
  assert.deepEqual(peta[1].sub.map((s) => [s.kode, s.dariRujukan]), [['C.1-LB', null], ['C.1-IKU-a.v', 'C.1-IKU-a.v'], ['C.1-IKU-baru01', null]]);
});

test('gabung keluaran AI dengan tabel bobot dan pemeriksaan otomatis', () => {
  const baris: BarisMatriks = { no: '5', halaman: [3], konteks: ['II. Akuntabilitas'], kriteria: 'Komitmen', indikator: 'I. a II. b', skor: ['(1) satu; (2) dua.', '', '', '', ''] };
  const ai = (sub: string | null): ButirAi => ({
    no: '5', sub, elemen: 'Komitmen', indikator: `Ind ${sub}`, skor4: 'Memenuhi: (1) satu; (2) dua.', skor3: 's3', skor2: '-', skor1: '', skor0: '',
    tabelLkps: ['1'], jenis: 'narasi', kodeRumus: '6-I', subBagian: ['C.2-IKU-a', 'X-TIDAK-ADA'],
  });
  const sub = [{ kode: 'C.2-IKU-a', bagianKode: 'C.2', judul: 'Komitmen', grup: null }];
  const rumus = [{ kode: '6-I', judul: 'Kerja sama', rumus: null }];
  // satu bobot untuk dua sub-indikator → dibagi rata dan ditandai
  const d = gabungButir({ baris: [baris], ai: [ai('I'), ai('II')], bobot: [{ kode: '5', no: 5, sub: null, elemen: '', indikator: '', bobot: 2.93 }], sub, rumus });
  assert.deepEqual(d.map((x) => [x.kode, x.bobot]), [['5-I', 1.46], ['5-II', 1.47]]);
  assert.ok(d.every((x) => x.usulanAi.includes('bobot') && x.usulanAi.includes('subBagian')));
  assert.deepEqual(d[0].subBagian, ['C.2-IKU-a'], 'kode sub-bagian karangan AI dibuang');
  assert.equal(d[0].kodeRumus, null, 'rumus hanya untuk butir angka');
  assert.equal(d[0].deskriptorSkor2, null);
  assert.deepEqual(d[0].unsurSkor4, ['Satu', 'Dua']);
  assert.equal(d[0].bagianKode, 'C.2');
  assert.deepEqual(bagianDariKonteks(['B. PROGRAM PENGEMBANGAN BERKELANJUTAN'], ['AWAL', 'II.B', 'C.1', 'III']), ['II.B', 'III']);

  const cek = periksaInstrumen(
    [{ kode: '1', no: 1, bobot: 60, deskriptorSkor4: 'x', jumlahSub: 1, dikonfirmasi: true }, { kode: '3', no: 3, bobot: 40.01, deskriptorSkor4: '', jumlahSub: 0, dikonfirmasi: false }],
    [{ kode: 'C.1-LB', tipe: 'bersama', instruksi: [''] }, { kode: 'AWAL-MUKA', tipe: 'data', instruksi: [] }],
  );
  assert.equal(cek.totalBobot, 100.01);
  assert.equal(cek.galat.length, 5, cek.galat.join(' | '));
  assert.match(cek.galat.join(' '), /tidak ada nomor 2/);
  assert.match(cek.galat.join(' '), /C\.1-LB/);
  assert.deepEqual(periksaInstrumen([{ kode: '1', no: 1, bobot: 100, deskriptorSkor4: 'x', jumlahSub: 1, dikonfirmasi: true }], []).galat, []);
  assert.match(periksaInstrumen([{ kode: '1', no: 1, bobot: 99.9, deskriptorSkor4: 'x', jumlahSub: 1, dikonfirmasi: true }], []).galat[0], /Total bobot/);
});

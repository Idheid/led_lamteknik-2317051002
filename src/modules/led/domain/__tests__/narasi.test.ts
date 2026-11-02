import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bandingkanTeks, keluaranKeDokumen, kolomPribadi, kumpulkanAngkaSah, paragrafBersumber, periksaDokumen, ringkasIku,
  samarkanTeks, statusGabungan, tabelKeMarkdown, tahunSah, teksDokumen, teksKeInline, urutkanUntukGenerate,
} from '../narasi.ts';
import type { KonteksSubBagian } from '../prompt.ts';

test('penyamaran NIDN/NIP/NIM/NIK di teks; angka rupiah dan tahun tidak tersentuh', () => {
  const t = samarkanTeks('Dosen NIDN 0012345678, NIP 198501012010121001, dana Rp20.000.000 tahun 2025, NIM 2015061001.');
  assert.equal(t, 'Dosen NIDN [ID disamarkan], NIP [ID disamarkan], dana Rp20.000.000 tahun 2025, NIM [ID disamarkan].');
  assert.equal(kolomPribadi('NIDN/NIDK'), 'id');
  assert.equal(kolomPribadi('Nama Mahasiswa'), 'nama');
  assert.equal(kolomPribadi('Nama Dosen'), null);
  assert.equal(kolomPribadi('Jumlah Mahasiswa'), null);
});

test('tabel LKPS ke Markdown: label TS diganti, kolom kosong dibuang, kolom pribadi disamarkan, angka format Indonesia', () => {
  const md = tabelKeMarkdown({
    kode: '6.h.1', judul: 'Tugas akhir',
    kolom: [
      { kunci: 'A', label: 'No' }, { kunci: 'B', label: 'Nama Mahasiswa' }, { kunci: 'C', label: 'NIM' },
      { kunci: 'D', label: 'Judul TS-1' }, { kunci: 'E', label: 'IPK' }, { kunci: 'F', label: 'Kosong' },
    ],
    baris: [
      { nomorBaris: 5, sel: { A: 1, B: 'Budi Santoso', C: '2015061001', D: 'Sistem A', E: 3.456 } },
      { nomorBaris: 6, sel: { A: 2, B: 'Siti', C: '2015061002', D: 'Sistem B', E: 3.5 } },
      { nomorBaris: 7, sel: {} },
    ],
  }, 2025);
  assert.ok(md.includes('Judul 2024/2025'));
  assert.ok(!md.includes('Kosong'));
  assert.ok(!md.includes('Budi') && !md.includes('2015061001'));
  assert.ok(md.includes('Mahasiswa 1') && md.includes('[ID disamarkan]'));
  assert.ok(md.includes('3,46'));
  assert.equal(md.split('\n').length, 4);
  assert.equal(tabelKeMarkdown({ kode: 'x', judul: '', kolom: [{ kunci: 'A', label: 'A' }], baris: [] }, 2025), '(tabel kosong)');
});

test('keluaran LLM menjadi dokumen Tiptap dengan sumber per paragraf; istilah asing miring', () => {
  assert.deepEqual(teksKeInline('Program *outcome-based* **penting**.'), [
    { type: 'text', text: 'Program ' },
    { type: 'text', text: 'outcome-based', marks: [{ type: 'italic' }] },
    { type: 'text', text: ' penting.' },
  ]);
  const doc = keluaranKeDokumen(
    { paragraf: [{ teks: 'Paragraf satu.', sumber: ['D1', 'J'] }, { teks: 'Paragraf dua.', sumber: ['M-6-I_RI'] }], unsur: [], dokumenKurang: [] },
    [{ judul: 'Tabel metrik', kepala: ['Metrik', 'Nilai'], baris: [['RI', '1,5%']], sumber: ['M-6-I_RI'] }],
  );
  assert.equal(doc.content[0].attrs?.peran, 'judul-tabel');
  assert.equal(doc.content[1].type, 'table');
  assert.deepEqual(paragrafBersumber(doc), [
    { teks: 'Paragraf satu.', sumber: ['D1', 'J'] },
    { teks: 'Paragraf dua.', sumber: ['M-6-I_RI'] },
  ]);
  assert.equal(teksDokumen(doc, { tanpaTabel: true }), 'Paragraf satu.\n\nParagraf dua.');
  assert.ok(teksDokumen(doc).includes('RI | 1,5%'));
});

const konteks: KonteksSubBagian = {
  prodi: { nama: 'Teknik Uji', jenjang: 'S1', upps: 'FT', perguruanTinggi: 'Univ Uji' },
  ts: { tahunAkademik: '2025/2026', petaLabel: { TS: '2025/2026' } },
  subBagian: { kode: 'C.4-IKU', label: '3', judul: 'IKU', instruksi: 'Jelaskan rasio dosen.', tipe: 'iku' },
  butir: [{ kode: '12', elemen: 'Dosen', indikator: 'Rasio mahasiswa per dosen 15 sampai 25', jenis: 'angka', deskriptorSkor4: 'Rasio 15-25', unsurSkor4: ['rasio ideal'] }],
  jawabanForm: 'Prodi merekrut 4 dosen baru pada 2024.',
  metrik: [{ id: 'M-12_RMD', nama: 'Rasio mahasiswa/dosen', nilaiTeks: '22,5' }],
  tabel: [{ id: 'T-4.a', judul: 'Dosen tetap', markdown: '| Nama | Jumlah |\n| --- | --- |\n| A | 18 |' }],
  potongan: [{ id: 'D1', sumber: 'renstra.pdf', teks: 'Target rekrutmen 6 dosen sampai 2027 dengan anggaran Rp1.500.000.000.' }],
  targetKata: 100,
};

test('pemeriksaan angka: angka dari konteks lolos, angka karangan (konteks fiktif) tertangkap', () => {
  const sah = kumpulkanAngkaSah(konteks, [0.225]);
  const rujukan = { angkaSah: sah, tahunSah: tahunSah(2025), target: 10, sumberSah: ['D1', 'J', 'M-12_RMD', 'T-4.a'] };
  const baik = keluaranKeDokumen({
    paragraf: [{ teks: 'Rasio mahasiswa per dosen 22,5 dengan 18 dosen tetap. Prodi merekrut 4 dosen pada 2024 dan menargetkan 6 dosen sampai 2027 senilai Rp1.500.000.000.', sumber: ['M-12_RMD', 'T-4.a', 'J', 'D1'] }],
    unsur: [], dokumenKurang: [],
  });
  const h = periksaDokumen(baik, rujukan);
  assert.deepEqual(h.angkaTidakBerdasar, []);
  assert.deepEqual(h.masalahSumber, []);
  assert.equal(h.panjang, 'lebih');

  const karangan = keluaranKeDokumen({
    paragraf: [
      { teks: 'Rasio mahasiswa per dosen 19,8 dan 93% lulusan bekerja. [BELUM ADA BUKTI: data pelacakan lulusan]', sumber: ['M-12_RMD'] },
      { teks: 'Paragraf tanpa sumber.', sumber: [] },
      { teks: 'Mengutip dokumen lain.', sumber: ['D9'] },
    ],
    unsur: [], dokumenKurang: [],
  });
  const h2 = periksaDokumen(karangan, rujukan);
  assert.deepEqual(h2.angkaTidakBerdasar, ['19,8', '93%']);
  assert.deepEqual(h2.belumAdaBukti, ['data pelacakan lulusan']);
  assert.deepEqual(h2.masalahSumber.map((m) => m.jenis), ['tanpa_sumber', 'sumber_tidak_dikenal']);
});

test('urutan generate kriteria: IKU, LB dan KEB, AF, SWOT; data dan otomatis dilewati', () => {
  const sub = [
    { kode: 'C.1-LB', tipe: 'bersama', urutan: 1 },
    { kode: 'C.1-KEB', tipe: 'bersama', urutan: 2 },
    { kode: 'C.1-IKU-a', tipe: 'iku', urutan: 3 },
    { kode: 'C.1-IKU-b', tipe: 'iku', urutan: 4 },
    { kode: 'C.1-AF', tipe: 'bersama', urutan: 5 },
    { kode: 'C.1-SWOT', tipe: 'bersama', urutan: 6 },
    { kode: 'C.1-TBL', tipe: 'data', urutan: 7 },
  ];
  assert.deepEqual(urutkanUntukGenerate(sub).map((s) => s.kode), ['C.1-IKU-a', 'C.1-IKU-b', 'C.1-LB', 'C.1-KEB', 'C.1-AF', 'C.1-SWOT']);
});

test('ringkasan IKU, perbandingan versi, status gabungan', () => {
  const r = ringkasIku([{ judul: 'Visi', teks: 'Kalimat satu. Kalimat dua. Kalimat tiga.', unsur: [{ status: 'terpenuhi' }, { status: 'belum_ada_bukti' }] }]);
  assert.equal(r, '- Visi: Kalimat satu. Kalimat dua. (unsur skor 4: 1 terpenuhi, 0 sebagian, 1 belum ada bukti)');

  const d = bandingkanTeks('Prodi memiliki 18 dosen tetap.', 'Prodi memiliki 20 dosen tetap aktif.');
  assert.deepEqual(d.filter((x) => x.jenis !== 'sama').map((x) => `${x.jenis}:${x.teks.trim()}`), ['hapus:18', 'tambah:20', 'tambah:aktif']);
  assert.equal(d.filter((x) => x.jenis !== 'tambah').map((x) => x.teks).join(''), 'Prodi memiliki 18 dosen tetap.');

  assert.equal(statusGabungan([]), 'belum');
  assert.equal(statusGabungan(['belum', 'belum']), 'belum');
  assert.equal(statusGabungan(['draf', 'belum']), 'draf');
  assert.equal(statusGabungan(['draf', 'disunting']), 'disunting');
  assert.equal(statusGabungan(['selesai', 'draf']), 'disunting');
  assert.equal(statusGabungan(['selesai', 'selesai']), 'selesai');
});

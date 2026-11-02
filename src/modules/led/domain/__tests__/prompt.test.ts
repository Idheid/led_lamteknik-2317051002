import { test } from 'node:test';
import assert from 'node:assert/strict';
import { susunSistem, susunPengguna, kodeSumberSah, periksaKeluaran, PENANDA_BELUM_ADA_BUKTI } from '../prompt.ts';
import type { KonteksSubBagian } from '../prompt.ts';

const k: KonteksSubBagian = {
  prodi: { nama: 'Teknik Contoh', jenjang: 'Sarjana', upps: 'Fakultas Teknik', perguruanTinggi: 'Universitas Lampung' },
  ts: { tahunAkademik: '2025/2026', petaLabel: { TS: '2025/2026', 'TS-1': '2024/2025' } },
  subBagian: { kode: 'C.4-IKU-a.iii', label: '3.a.iii', judul: 'Kualifikasi akademik DTPS', grup: 'a. Profil Dosen', instruksi: 'Bagian ini menjelaskan ...', tipe: 'iku' },
  kriteria: { kode: 'C.4', nama: 'Sumber Daya Manusia' },
  butir: [{ kode: '27', elemen: 'Profil dosen', indikator: 'Kualifikasi akademik DTPS', jenis: 'angka', deskriptorSkor4: 'PDS3 >= 50%', unsurSkor4: ['PDS3 >= 50%'] }],
  jawabanForm: 'Dua dosen sedang studi S3.',
  metrik: [{ id: 'M-PDS3', nama: 'PDS3', nilaiTeks: '41,67%' }],
  tabel: [{ id: 'T-4.a', judul: 'Profil Dosen', markdown: '| Nama | Pendidikan |\n|---|---|' }],
  potongan: [{ id: 'D1', sumber: 'Renstra.pdf', teks: 'Target doktor 60% pada 2028.' }],
  ringkasanIku: null,
  targetKata: 220,
};

test('prompt sistem memuat aturan anti-halusinasi', () => {
  const s = susunSistem();
  assert.match(s, /hanya fakta/i);
  assert.ok(s.includes(PENANDA_BELUM_ADA_BUKTI));
  assert.match(s, /mengevaluasi capaian, bukan hanya menceritakan pelaksanaan/, 'revisi 22 Okt 2026: evaluasi capaian');
});

test('prompt pengguna memuat konteks, peta TS, dan target', () => {
  const u = susunPengguna(k);
  for (const x of ['C.4 Sumber Daya Manusia', 'TS-1 = 2024/2025', '[M-PDS3] PDS3 = 41,67%', '[T-4.a]', '[D1] (Renstra.pdf)', 'Sekitar 220 kata', 'JAWABAN PENYUSUN [J]']) {
    assert.ok(u.includes(x), `tidak memuat: ${x}`);
  }
  assert.ok(!u.includes('RINGKASAN INDIKATOR'));
});

test('pemeriksaan keluaran: sumber tidak dikenal dan unsur hilang', () => {
  assert.deepEqual([...kodeSumberSah(k)].sort(), ['D1', 'J', 'M-PDS3', 'T-4.a']);
  const masalah = periksaKeluaran(k, {
    paragraf: [{ teks: 'PDS3 41,67%.', sumber: ['M-PDS3'] }, { teks: 'Lain.', sumber: ['D9'] }, { teks: 'Tanpa.', sumber: [] }],
    unsur: [], dokumenKurang: [],
  });
  assert.deepEqual(masalah.map((m) => m.jenis).sort(), ['sumber_tidak_dikenal', 'tanpa_sumber', 'unsur_hilang']);
});

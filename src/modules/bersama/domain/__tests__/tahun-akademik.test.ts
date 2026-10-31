import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTahunAkademik, parseTahunAkademik, tsDariTanggalPengajuan, petaTS, gantiLabelTS, tahunMulaiDariLabel, selisihDariLabel,
  pilihanTs, tsBawaan, labelTsPengajuan,
} from '../tahun-akademik.ts';

test('format dan parse tahun akademik', () => {
  assert.equal(formatTahunAkademik(2025), '2025/2026');
  assert.equal(parseTahunAkademik('2025/2026'), 2025);
  assert.equal(parseTahunAkademik(' 2024 / 2025 '), 2024);
  assert.throws(() => parseTahunAkademik('2025/2027'));
  assert.throws(() => parseTahunAkademik('2025-2026'));
});

test('TS bawaan dari tanggal pengajuan (bulan mulai Agustus)', () => {
  assert.equal(tsDariTanggalPengajuan(new Date('2026-10-15T00:00:00Z')), 2025); // Okt 2026 -> 2025/2026
  assert.equal(tsDariTanggalPengajuan(new Date('2026-08-01T00:00:00Z')), 2025);
  assert.equal(tsDariTanggalPengajuan(new Date('2026-07-31T00:00:00Z')), 2024); // 2025/2026 belum selesai
  assert.equal(tsDariTanggalPengajuan(new Date('2026-03-01T00:00:00Z')), 2024);
});

test('peta label TS sampai TS-7', () => {
  const p = petaTS(2025);
  assert.equal(p['TS'], '2025/2026');
  assert.equal(p['TS-1'], '2024/2025');
  assert.equal(p['TS-2'], '2023/2024');
  assert.equal(p['TS-7'], '2018/2019');
  assert.equal(Object.keys(p).length, 8);
});

test('label ke tahun', () => {
  assert.equal(selisihDariLabel('TS'), 0);
  assert.equal(selisihDariLabel('TS-3'), 3);
  assert.equal(selisihDariLabel('TS - 2'), 2);
  assert.equal(selisihDariLabel('DTPS'), null);
  assert.equal(tahunMulaiDariLabel('TS-2', 2025), 2023);
});

test('ganti label TS di teks tanpa menyentuh DTPS/NDTPS', () => {
  const t = gantiLabelTS('Data TS-2 s.d. TS menunjukkan NDTPS naik; DTPS (TS-1) aktif.', 2025);
  assert.equal(t, 'Data 2023/2024 s.d. 2025/2026 menunjukkan NDTPS naik; DTPS (2024/2025) aktif.');
});

test('Revisi 31 Okt 2026: dua pilihan TS untuk tahun pengajuan P = (P-1)/P dan (P-2)/(P-1)', () => {
  const p = pilihanTs(2027);
  assert.deepEqual(p.map((x) => x.tsTahunMulai), [2026, 2025]);
  assert.deepEqual(p.map((x) => x.label), ['TS 2026/2027', 'TS 2025/2026']);
  assert.match(p[0].keterangan, /2026\/2027 sudah lengkap/);
  assert.match(p[1].keterangan, /sebelum tahun akademik 2026\/2027 selesai/);
  assert.throws(() => pilihanTs(2027.5));
});

test('Revisi 31 Okt 2026: TS bawaan dari tanggal acuan, dibatasi ke dua pilihan', () => {
  // pengajuan Oktober 2027: 2026/2027 sudah selesai
  assert.equal(tsBawaan(2027, new Date('2027-10-01T00:00:00Z')), 2026);
  // pengajuan Maret 2027: 2026/2027 belum selesai
  assert.equal(tsBawaan(2027, new Date('2027-03-01T00:00:00Z')), 2025);
  // tanggal acuan jauh dari tahun pengajuan: tetap salah satu pilihan
  assert.equal(tsBawaan(2029, new Date('2026-10-01T00:00:00Z')), 2027);
  assert.equal(tsBawaan(2025, new Date('2030-10-01T00:00:00Z')), 2024);
});

test('Revisi 31 Okt 2026: label kartu LED memakai TS dan tahun pengajuan', () => {
  assert.equal(labelTsPengajuan(2026, 2027), 'TS 2026/2027 · pengajuan 2027');
});

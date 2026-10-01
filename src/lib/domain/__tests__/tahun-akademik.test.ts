import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTahunAkademik, parseTahunAkademik, tsDariTanggalPengajuan, petaTS, gantiLabelTS, tahunMulaiDariLabel, selisihDariLabel,
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

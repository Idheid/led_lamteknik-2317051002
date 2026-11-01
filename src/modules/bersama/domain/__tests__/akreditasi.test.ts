import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaSk, labelArsipLed, riwayatBerlakuTerbaru, samarkanAngkaPanjang, tanggalIndonesia } from '../akreditasi.ts';

/** Teks SK fiktif (bukan SK asli), meniru susunan SK akreditasi LAM Teknik. */
const SK_FIKTIF = `
LEMBAGA AKREDITASI MANDIRI PROGRAM STUDI KETEKNIKAN
KEPUTUSAN LAM TEKNIK
Nomor: 0123/SK/LAM-TEKNIK/AK/VIII/2026
TENTANG
STATUS DAN PERINGKAT AKREDITASI PROGRAM SARJANA TEKNIK CONTOH UNIVERSITAS CONTOH
MEMUTUSKAN
Menetapkan status akreditasi Program Studi Sarjana Teknik Contoh dengan peringkat Terakreditasi Unggul.
Akreditasi berlaku sejak tanggal 20 Agustus 2026 sampai dengan tanggal 19 Agustus 2031.
Ditetapkan di Jakarta pada tanggal 18 Agustus 2026
Ketua, NIP 197001011995031001`;

test('L1: bantuan isi dari teks SK tanpa AI (tanggal, nomor, peringkat)', () => {
  assert.deepEqual(bacaSk(SK_FIKTIF), {
    berlakuSampai: '2031-08-19',
    berlakuMulai: '2026-08-20',
    tanggalSk: '2026-08-18',
    nomorSk: '0123/SK/LAM-TEKNIK/AK/VIII/2026',
    peringkat: 'Terakreditasi Unggul',
  });
  const singkat = bacaSk('Nomor 45/SK/LAM/2027 ... status Terakreditasi, berlaku s.d. 01-02-2032');
  assert.deepEqual(singkat, { berlakuSampai: '2032-02-01', nomorSk: '45/SK/LAM/2027', peringkat: 'Terakreditasi' });
  assert.equal(bacaSk('dinyatakan Tidak Terakreditasi').peringkat, 'Tidak Terakreditasi');
  assert.deepEqual(bacaSk('Surat undangan rapat tanpa pola'), {}, 'pola tidak dikenali: kosong, bukan tebakan');
});

test('L1: tanggal Indonesia, penyamaran angka panjang, riwayat terbaru, label arsip', () => {
  assert.equal(tanggalIndonesia('20 Agustus 2030'), '2030-08-20');
  assert.equal(tanggalIndonesia('2/9/2031'), '2031-09-02');
  assert.equal(tanggalIndonesia('31 Februari 2030'), null);
  assert.equal(tanggalIndonesia('20 Agustusan 2030'), null);
  assert.equal(samarkanAngkaPanjang('NIP 197001011995031001 dan nomor 0123/SK'), 'NIP [disamarkan] dan nomor 0123/SK');
  const t = (s: string) => new Date(s);
  const r = riwayatBerlakuTerbaru([
    { status: 'berlaku', peringkat: 'Baik', nomorSk: null, berlakuSampai: t('2026-01-01'), createdAt: t('2021-01-01') },
    { status: 'menunggu', peringkat: 'Unggul', nomorSk: null, berlakuSampai: t('2031-01-01'), createdAt: t('2026-05-01') },
    { status: 'berlaku', peringkat: 'Terakreditasi', nomorSk: 'x', berlakuSampai: t('2030-01-01'), createdAt: t('2025-01-01') },
  ]);
  assert.equal(r?.peringkat, 'Terakreditasi', 'yang menunggu konfirmasi tidak dipakai');
  assert.equal(riwayatBerlakuTerbaru([]), null);
  assert.equal(labelArsipLed(2026, 'Terakreditasi Unggul'), 'Diajukan 2026 · Terakreditasi Unggul');
});

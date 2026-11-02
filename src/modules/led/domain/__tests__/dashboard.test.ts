import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jumlahPerTab, masaBerlaku, masukTab, persenLed, statusLpmpp } from '../dashboard.ts';

const t = (s: string) => new Date(`${s}T00:00:00.000Z`);

test('Desain form 2: masa berlaku dan hitung mundur (Kritis ≤ 6 bulan, Perhatian ≤ 18 bulan)', () => {
  const hari = t('2025-08-25');
  assert.deepEqual(masaBerlaku(t('2025-11-15'), hari), { label: 'Kritis', hari: 82, teks: '82 hari lagi' });
  assert.deepEqual(masaBerlaku(t('2026-09-14'), hari), { label: 'Perhatian', hari: 385, teks: '12 bulan lagi' });
  const aktif = masaBerlaku(t('2028-01-20'), hari);
  assert.equal(aktif.label, 'Aktif');
  assert.equal(aktif.teks, '2,4 tahun');
  assert.deepEqual(masaBerlaku(t('2025-08-15'), hari), { label: 'Berakhir', hari: -10, teks: 'lewat 10 hari' });
  assert.equal(masaBerlaku(null, hari).label, 'Belum diisi');
});

test('Desain form 2: status LPMPP dari alur review dan data LED', () => {
  const dasar = { adaLed: true, statusReview: 'draf', eksporFinal: false, hasil: null } as const;
  assert.equal(statusLpmpp(dasar), 'penyusunan');
  assert.equal(statusLpmpp({ ...dasar, statusReview: 'direview' }), 'direview');
  assert.equal(statusLpmpp({ ...dasar, statusReview: 'perlu_revisi' }), 'perlu-revisi');
  assert.equal(statusLpmpp({ ...dasar, statusReview: 'layak' }), 'layak');
  assert.equal(statusLpmpp({ ...dasar, statusReview: 'layak', eksporFinal: true }), 'ekspor-final');
  assert.equal(statusLpmpp({ ...dasar, hasil: 'menunggu' }), 'hasil-menunggu');
  assert.equal(statusLpmpp({ adaLed: false, statusReview: null, eksporFinal: false, hasil: 'berlaku' }), 'hasil-dicatat');
  assert.equal(statusLpmpp({ adaLed: false, statusReview: null, eksporFinal: false, hasil: null }), 'belum-ada-led');
});

test('Desain form 2: kelengkapan LED, tab, dan jumlah per tab', () => {
  assert.equal(persenLed({ total: 100, draf: 80, selesai: 60 }), 70);
  assert.equal(persenLed(null), null);
  const hari = t('2025-08-25');
  const baris = [
    { masa: masaBerlaku(t('2025-11-15'), hari), peringkat: 'Baik Sekali', status: 'perlu-revisi' as const, perluLedBaru: false },
    { masa: masaBerlaku(t('2028-01-20'), hari), peringkat: 'Unggul', status: 'ekspor-final' as const, perluLedBaru: false },
    { masa: masaBerlaku(t('2028-01-20'), hari), peringkat: 'Terakreditasi Unggul', status: 'direview' as const, perluLedBaru: false },
    { masa: masaBerlaku(t('2029-01-20'), hari), peringkat: 'Baik', status: 'belum-ada-led' as const, perluLedBaru: true },
  ];
  assert.equal(masukTab(baris[0], 'prioritas'), true);
  assert.equal(masukTab(baris[3], 'prioritas'), true, 'perlu LED baru');
  assert.equal(masukTab(baris[1], 'review'), false);
  assert.deepEqual(jumlahPerTab(baris), { semua: 4, prioritas: 2, unggul: 2, review: 2 });
});

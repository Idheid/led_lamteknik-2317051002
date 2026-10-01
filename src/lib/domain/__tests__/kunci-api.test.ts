import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetKuotaBerikutnya, pilihKunci, klasifikasiGalat, tandaiSetelahGalat, statusEfektif, pesanKunciHabis } from '../kunci-api.ts';
import type { KunciAPI } from '../kunci-api.ts';

const k = (id: string, pemilik: KunciAPI['pemilik'], urutan: number, status: KunciAPI['status'] = 'aktif', habisSampai: Date | null = null): KunciAPI =>
  ({ id, label: id, pemilik, status, habisSampai, urutan, dibuatPada: new Date('2026-10-01T00:00:00Z') });

test('reset kuota = tengah malam waktu Pasifik (PDT dan PST)', () => {
  // 1 Okt 2026 20:00 PDT -> reset 2 Okt 00:00 PDT = 07:00Z = 14:00 WIB
  assert.equal(resetKuotaBerikutnya(new Date('2026-10-02T03:00:00Z')).toISOString(), '2026-10-02T07:00:00.000Z');
  // 1 Des 2026 02:00 PST -> reset 2 Des 00:00 PST = 08:00Z = 15:00 WIB
  assert.equal(resetKuotaBerikutnya(new Date('2026-12-01T10:00:00Z')).toISOString(), '2026-12-02T08:00:00.000Z');
  // hari pergantian jam (1 Nov 2026): 31 Okt 23:00 PDT -> reset 1 Nov 00:00 PDT = 07:00Z
  assert.equal(resetKuotaBerikutnya(new Date('2026-11-01T06:00:00Z')).toISOString(), '2026-11-01T07:00:00.000Z');
});

test('kunci penanggung jawab dipakai dulu, lalu cadangan super admin', () => {
  const now = new Date('2026-10-02T03:00:00Z');
  const daftar = [k('admin1', 'super_admin', 1), k('pj2', 'penanggung_jawab', 2), k('pj1', 'penanggung_jawab', 1, 'kuota_habis', new Date('2026-10-02T07:00:00Z'))];
  assert.equal(pilihKunci(daftar, now)?.id, 'pj2');
  const semuaPjHabis = daftar.map((x) => x.pemilik === 'penanggung_jawab' ? { ...x, status: 'kuota_habis' as const, habisSampai: new Date('2026-10-02T07:00:00Z') } : x);
  assert.equal(pilihKunci(semuaPjHabis, now)?.id, 'admin1');
  assert.equal(pilihKunci(semuaPjHabis, now, { pakaiCadanganAdmin: false }), null);
  // setelah reset, kunci pj1 aktif lagi
  assert.equal(pilihKunci(semuaPjHabis, new Date('2026-10-02T07:00:01Z'))?.id, 'pj1');
});

test('klasifikasi galat Gemini', () => {
  assert.equal(klasifikasiGalat({ status: 429, message: 'RESOURCE_EXHAUSTED', detail: { quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' } }), 'kuota_harian');
  assert.equal(klasifikasiGalat({ status: 429, message: 'Quota exceeded', detail: { quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' } }), 'batas_per_menit');
  assert.equal(klasifikasiGalat({ status: 400, message: 'API key not valid. Please pass a valid API key.' }), 'tidak_valid');
  assert.equal(klasifikasiGalat({ status: 503, message: 'UNAVAILABLE' }), 'sementara');
  assert.equal(klasifikasiGalat({ status: 400, message: 'Invalid argument' }), 'lain');
});

test('status setelah galat dan pesan untuk pengguna', () => {
  const now = new Date('2026-10-02T03:00:00Z');
  const habis = tandaiSetelahGalat(k('pj1', 'penanggung_jawab', 1), 'kuota_harian', now);
  assert.equal(habis.status, 'kuota_habis');
  assert.equal(habis.habisSampai?.toISOString(), '2026-10-02T07:00:00.000Z');
  assert.equal(statusEfektif(habis, now), 'kuota_habis');
  assert.equal(tandaiSetelahGalat(k('x', 'penanggung_jawab', 1), 'batas_per_menit', now).status, 'aktif');
  assert.match(pesanKunciHabis([habis], now), /14[.:]00 WIB/);
});

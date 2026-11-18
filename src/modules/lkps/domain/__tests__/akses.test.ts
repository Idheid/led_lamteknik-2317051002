import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GalatAkses, type Pengguna } from '../../../bersama/akses.ts';
import {
  bolehBacaLkps,
  bolehEksporLkps,
  bolehTulisLkps,
  jenisProgramDariJenjang,
  pastikanBacaLkps,
  pastikanEksporLkps,
  pastikanTulisLkps,
  pastikanUnggahBukti,
  type AreaLkps,
} from '../akses.ts';
import { alamatBukti, kenaliBukti, kunciDariAlamat, uraiKunci } from '../bukti.ts';
import { skemaGantiKerjasama, skemaMbkm } from '../validasi.ts';

/** Gabung LKPS G4: matriks hak modul LKPS (RENCANA-GABUNG-LKPS G4 butir 1) dan kunci bukti. */

const AREA: AreaLkps[] = ['kriteria', 'identitas', 'konfigurasi', 'ekspor'];
const orang = (peran: Pengguna['peran'], prodiId: string | null = null): Pengguna => ({ id: peran, nama: peran, email: '', peran, prodiId });

test('matriks hak: kriteria hanya Tim Prodi, identitas Admin + Tim Prodi, konfigurasi Admin, Tamu tidak ada', () => {
  const tulis = (peran: Pengguna['peran']) => AREA.filter((a) => bolehTulisLkps(peran, a));
  assert.deepEqual(tulis('TIM_PRODI'), ['kriteria', 'identitas']);
  assert.deepEqual(tulis('ADMIN'), ['identitas', 'konfigurasi']);
  assert.deepEqual(tulis('ASESOR'), []);
  assert.deepEqual(tulis('TAMU'), []);
  for (const a of AREA) {
    for (const p of ['ADMIN', 'TIM_PRODI', 'ASESOR'] as const) assert.ok(bolehBacaLkps(p, a), `${p} ${a}`);
    assert.equal(bolehBacaLkps('TAMU', a), false, a);
  }
  assert.deepEqual((['ADMIN', 'TIM_PRODI', 'ASESOR', 'TAMU'] as const).filter(bolehEksporLkps), ['ADMIN', 'TIM_PRODI', 'ASESOR']);
});

test('Tim Prodi hanya prodinya; Admin dan Asesor membaca prodi mana pun; Admin tidak menulis isian kriteria', () => {
  const timA = orang('TIM_PRODI', 'A');
  pastikanBacaLkps(timA, 'kriteria', 'A');
  pastikanTulisLkps(timA, 'kriteria', 'A');
  assert.throws(() => pastikanBacaLkps(timA, 'kriteria', 'B'), GalatAkses);
  assert.throws(() => pastikanTulisLkps(timA, 'identitas', 'B'), GalatAkses);
  assert.throws(() => pastikanEksporLkps(timA, 'B'), GalatAkses);
  assert.throws(() => pastikanTulisLkps(timA, 'konfigurasi', null), GalatAkses);
  // Tim Prodi tanpa prodi tidak bisa apa-apa
  assert.throws(() => pastikanBacaLkps(orang('TIM_PRODI'), 'kriteria', null), GalatAkses);

  const admin = orang('ADMIN');
  pastikanBacaLkps(admin, 'kriteria', 'B');
  pastikanTulisLkps(admin, 'identitas', 'B');
  pastikanTulisLkps(admin, 'konfigurasi', null);
  pastikanUnggahBukti(admin, 'B'); // tanda tangan tim penyusun
  assert.throws(() => pastikanTulisLkps(admin, 'kriteria', 'B'), GalatAkses);

  const asesor = orang('ASESOR');
  pastikanBacaLkps(asesor, 'kriteria', 'B');
  pastikanEksporLkps(asesor, 'B');
  assert.throws(() => pastikanTulisLkps(asesor, 'kriteria', 'B'), GalatAkses);
  assert.throws(() => pastikanUnggahBukti(asesor, 'B'), GalatAkses);

  const tamu = orang('TAMU');
  for (const a of AREA) assert.throws(() => pastikanBacaLkps(tamu, a, 'A'), GalatAkses);
  assert.throws(() => pastikanEksporLkps(tamu, 'A'), GalatAkses);
});

test('kunci bukti: hanya lkps/<prodi>/bukti/<uuid>-<nama>, tanpa jalan keluar folder', () => {
  const kunci = 'lkps/prodiA/bukti/123e4567-e89b-12d3-a456-426614174000-MoU_2025.pdf';
  assert.deepEqual(uraiKunci(kunci), { prodiId: 'prodiA', nama: 'MoU_2025.pdf' });
  assert.equal(kunciDariAlamat(alamatBukti(kunci)!), kunci);
  assert.equal(kunciDariAlamat(kunci), kunci);
  for (const buruk of [
    'lkps/prodiA/../prodiB/bukti/123e4567-e89b-12d3-a456-426614174000-x.pdf',
    'lkps/prodiA/bukti/../../led/rahasia.pdf',
    '/uploads/bukti/123_MoU.pdf',
    'https://contoh.test/a.pdf',
    'lkps/prodiA/bukti/bukan-uuid-x.pdf',
  ]) {
    assert.equal(kunciDariAlamat(buruk), null, buruk);
  }
});

test('jenis bukti dari isi berkas, bukan hanya ekstensi', () => {
  assert.ok(kenaliBukti('a.pdf', Buffer.from('%PDF-1.7 isi')));
  assert.equal(kenaliBukti('a.pdf', Buffer.from('<html>')), null);
  assert.ok(kenaliBukti('a.xlsx', Buffer.from('PK\x03\x04')));
  assert.ok(kenaliBukti('a.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])));
  assert.equal(kenaliBukti('a.exe', Buffer.from('MZ')), null);
});

test('validasi: tanggal kerja sama dan tahun MBKM kosong ditolak (kode asal memakai hari ini)', () => {
  const kerjasama = { namaLembaga: 'PT A', tingkat: 'Nasional', judulKegiatan: 'Magang', jenisKerjasama: 'N1' };
  assert.equal(skemaGantiKerjasama.safeParse({ rows: [{ ...kerjasama, tanggalMulai: '', tanggalAkhir: '2027-01-01' }] }).success, false);
  assert.equal(skemaGantiKerjasama.safeParse({ rows: [{ ...kerjasama, tanggalMulai: '2026-01-01', tanggalAkhir: '2027-01-01' }] }).success, true);
  const mbkm = { namaMahasiswa: 'Budi', nim: '1', namaMitra: 'PT A', dosenPembimbing: 'Dr. C' };
  assert.equal(skemaMbkm.safeParse({ ...mbkm, tahun: '' }).success, false);
  assert.equal(skemaMbkm.safeParse({ ...mbkm, tahun: '2026' }).data?.tahun, 2026);
});

test('jenis program diturunkan dari jenjang (keputusan G0 no. 4)', () => {
  for (const j of ['D1', 'D2', 'D3', 'STr', 'S2Tr', 'S3Tr']) assert.equal(jenisProgramDariJenjang(j), 'Vokasi', j);
  for (const j of ['S1', 'S2', 'S3', 'PPI']) assert.equal(jenisProgramDariJenjang(j), 'Akademik', j);
});

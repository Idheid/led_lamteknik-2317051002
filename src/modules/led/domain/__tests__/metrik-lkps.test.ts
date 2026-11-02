import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  akhirTs, angka, awalRentang, BUTIR_ANGKA_SARJANA, hitungButir, kerjaSamaSah, skorTigaTingkat, tanggal, tercentang,
  type TabelMetrik,
} from '../metrik-lkps.ts';

const k = { tsTahunMulai: 2025 };
const dekat = (a: number | null, b: number, tol = 1e-4) => assert.ok(a !== null && Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('angka menerima angka Excel dan teks format Indonesia', () => {
  assert.equal(angka(12), 12);
  assert.equal(angka('1.250.000'), 1250000);
  assert.equal(angka('3,25'), 3.25);
  assert.equal(angka('Rp20.000.000'), 20000000);
  assert.equal(angka('45%'), 45);
  assert.equal(angka(''), null);
  assert.equal(angka('-'), null);
  assert.equal(angka('abc'), null);
});

test('tanda centang dan tanggal', () => {
  assert.ok(tercentang('V') && tercentang('√') && tercentang('v'));
  assert.ok(!tercentang('') && !tercentang(null) && !tercentang('Tidak'));
  assert.equal(tanggal('2024-05-10')?.toISOString().slice(0, 10), '2024-05-10');
  assert.equal(tanggal('10/05/2024')?.toISOString().slice(0, 10), '2024-05-10');
  assert.equal(tanggal(45422)?.toISOString().slice(0, 10), '2024-05-10'); // nomor seri Excel
  assert.equal(tanggal('besok'), null);
});

test('rentang TS: akhir 31/08 tahun akhir TS, 3 tahun mulai 1/09 TS-2', () => {
  assert.equal(akhirTs(k).toISOString().slice(0, 10), '2026-08-31');
  assert.equal(awalRentang(k, 3).toISOString().slice(0, 10), '2023-09-01');
  assert.equal(awalRentang(k, 5).toISOString().slice(0, 10), '2021-09-01');
});

test('skor tiga tingkat sesuai rumus matriks', () => {
  assert.equal(skorTigaTingkat(3, 7, 0, 2, 6, 8), 4); // RI > a dan RN > b
  dekat(skorTigaTingkat(2, 4, 3, 2, 6, 8), 3.75); // RI = a (disesuaikan) → A = 1
  dekat(skorTigaTingkat(0, 0, 0, 2, 6, 8), 0);
  dekat(skorTigaTingkat(0, 6, 0, 2, 6, 8), 3.75); // RN ≥ b → RN = b → B = 1
  dekat(skorTigaTingkat(0, 0, 100, 2, 6, 8), 3.75 * 0.5); // RW dibatasi c → C = 1
  dekat(skorTigaTingkat(1, 3, 4, 2, 6, 8), 3.75 * (0.5 + 0.5 + 0.25 - 0.25 - 0.125 - 0.125 + 0.0625));
});

test('kerja sama sah bila beririsan dengan 4 tahun sampai akhir TS dan bukti terisi', () => {
  const b = (H: string, I: string, L: string | null = 'SPK') => ({ sel: { B: 'Mitra', D: 'V', F: 'Judul', H, I, L } });
  assert.ok(kerjaSamaSah(b('2023-01-01', '2027-01-01'), k));
  assert.ok(kerjaSamaSah(b('2020-01-01', '2023-01-01'), k)); // berakhir di dalam rentang
  assert.ok(kerjaSamaSah(b('2020-01-01', '2030-01-01'), k)); // melingkupi rentang
  assert.ok(!kerjaSamaSah(b('2015-01-01', '2019-01-01'), k));
  assert.ok(!kerjaSamaSah(b('2023-01-01', '2027-01-01', null), k)); // tanpa bukti
});

test('penyebut nol menghasilkan metrik null dan skor null, bukan pembagian tak hingga', () => {
  const kosong: TabelMetrik[] = [{ sheet: '4a', baris: [] }];
  const h27 = hitungButir('27', kosong, k);
  assert.equal(h27?.skor, null);
  assert.equal(h27?.lengkap, false);
  assert.equal(hitungButir('40', kosong, k)?.skor, null);
  assert.equal(hitungButir('99', kosong, k), null);
});

test('semua butir angka Sarjana di seed punya fungsi metrik', () => {
  const seed = JSON.parse(readFileSync(new URL('../../../../../data/instrumen/lamteknik-2025-pasca.json', import.meta.url), 'utf8'));
  const angkaSeed = (seed.butir as { kode: string; jenis: string; jenjang: string }[])
    .filter((b) => b.jenjang === 'S1' && b.jenis === 'angka').map((b) => b.kode);
  for (const kode of angkaSeed) assert.ok(BUTIR_ANGKA_SARJANA.includes(kode), `butir ${kode} belum punya rumus`);
  assert.equal(BUTIR_ANGKA_SARJANA[0], '6-I');
});

test('skor dibatasi minimum sesuai catatan matriks', () => {
  const tabel: TabelMetrik[] = [{
    sheet: '4a',
    baris: Array.from({ length: 10 }, (_, i) => ({ nomorBaris: i, sel: { B: `D${i}`, D: 'Dosen Tetap', J: 'V', K: 'Asisten Ahli' } })),
  }];
  assert.equal(hitungButir('28', tabel, k)?.skor, 2); // PGBLKL 0% → 2 + 0
  assert.equal(hitungButir('27', tabel, k)?.skor, 2);
});

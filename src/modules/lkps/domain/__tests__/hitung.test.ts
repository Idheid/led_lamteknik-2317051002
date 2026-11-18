import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hitungIndikatorPenelitian,
  hitungIndikatorRK,
  hitungIndikatorRMD,
  hitungTotalAkreditasi,
  type IndikatorScore,
} from '../hitung.ts';

/**
 * Gabung LKPS G4: mesin hitung LKPS kode asal (computation-engine.ts Ghalib) dipindah tanpa perubahan rumus. Nilai
 * harapan di bawah dihitung dengan tangan; langkahnya di docs/uji/hitungan-manual-lkps-gabung.md.
 */

test('hitungIndikatorRK: KK = (3·N1 + 2·N2 + N3) / NDTPS, skor = min(4, KK), bobot 5', () => {
  // (3×2 + 2×3 + 4) / 5 = 16 / 5 = 3,2 → skor 3,2; tertimbang 3,2 × 5 / 4 = 4,0
  const a = hitungIndikatorRK(2, 3, 4, 5);
  assert.equal(a.nilaiRiil, 3.2);
  assert.equal(a.skor, 3.2);
  assert.equal(a.bobot, 5);
  assert.equal(a.nilaiTertimbang, 4);
  assert.equal(a.status, 'Baik Sekali');
  // (3×10) / 5 = 6 ≥ 4 → skor 4 (Unggul)
  const b = hitungIndikatorRK(10, 0, 0, 5);
  assert.equal(b.skor, 4);
  assert.equal(b.nilaiTertimbang, 5);
  assert.equal(b.status, 'Unggul');
  // NDTPS 0 dianggap 1: (3×1)/1 = 3
  assert.equal(hitungIndikatorRK(1, 0, 0, 0).skor, 3);
});

test('hitungIndikatorRMD: RMD = mahasiswa / NDTPS dengan faktor a (NDTPS 5–12) dan b (RMD 15–25)', () => {
  // 200/10 = 20 → b = 1; a = (10−5)/7 = 5/7; skor = 1 + 3·(5/7) = 22/7 = 3,142… → 3,14; tertimbang 3,14 × 10 / 4 = 7,85
  const a = hitungIndikatorRMD(200, 10);
  assert.equal(a.nilaiRiil, 20);
  assert.equal(a.skor, 3.14);
  assert.equal(a.nilaiTertimbang, 7.85);
  assert.equal(a.status, 'Baik Sekali');
  // 400/12 = 33,33 → b = (35 − 33,33)/10 = 0,1667; NDTPS ≥ 12 di luar 15–25 → skor = 1 + 3·0,1667 = 1,5
  const b = hitungIndikatorRMD(400, 12);
  assert.equal(b.nilaiRiil, 33.33);
  assert.equal(b.skor, 1.5);
  assert.equal(b.nilaiTertimbang, 3.75);
  assert.equal(b.status, 'Perlu Perbaikan');
  // 300/12 = 25 (dalam 15–25) dan NDTPS ≥ 12 → skor 4
  assert.equal(hitungIndikatorRMD(300, 12).skor, 4);
  // 400/10 = 40 > 35 → skor 0
  assert.equal(hitungIndikatorRMD(400, 10).skor, 0);
});

test('hitungIndikatorPenelitian: RPD = jumlah 3 tahun / 3 / NDTPS, RPD ≥ 1 → 4, selainnya RPD × 4; bobot 10', () => {
  // 18 / 3 / 4 = 1,5 ≥ 1 → skor 4; tertimbang 10
  const a = hitungIndikatorPenelitian(18, 4);
  assert.equal(a.nilaiRiil, 1.5);
  assert.equal(a.skor, 4);
  assert.equal(a.nilaiTertimbang, 10);
  // 6 / 3 / 4 = 0,5 → skor 2,0 (Baik); tertimbang 5
  const b = hitungIndikatorPenelitian(6, 4);
  assert.equal(b.nilaiRiil, 0.5);
  assert.equal(b.skor, 2);
  assert.equal(b.nilaiTertimbang, 5);
  assert.equal(b.status, 'Baik');
});

function indikator(kriteriaId: number, skor: number, kode = `K${kriteriaId}`, nilaiRiil = skor): IndikatorScore {
  return { kode, nama: kode, kriteriaId, nilaiRiil, skor, bobot: 1, nilaiTertimbang: 0, keterangan: '', status: 'Baik' };
}

test('hitungTotalAkreditasi: kriteria tanpa indikator memakai skor 3,0; skor kriteria = rata-rata × bobot', () => {
  // semua kosong: 3 × (5+10+25+10+15+10+5+25+5) = 3 × 110 = 330 → Baik Sekali (301–360)
  const kosong = hitungTotalAkreditasi([]);
  assert.equal(kosong.skorTotal, 330);
  assert.equal(kosong.prediksiPeringkat, 'Baik Sekali');
  assert.equal(kosong.kriteria.length, 9);
  assert.equal(kosong.kriteria.reduce((s, k) => s + k.bobotKriteria, 0), 110);

  // K1 = RK(2,3,4,5) skor 3,2 → 3,2 × 5 = 16; sisanya 3 × 105 = 315; total 331 → Baik Sekali
  const satu = hitungTotalAkreditasi([hitungIndikatorRK(2, 3, 4, 5)]);
  assert.equal(satu.kriteria[0].skorTertimbang, 16);
  assert.equal(satu.skorTotal, 331);
  assert.equal(satu.prediksiPeringkat, 'Baik Sekali');
});

test('hitungTotalAkreditasi: semua skor 4 = 440; Unggul hanya bila syarat NDTPS ≥ 12 terpenuhi', () => {
  const semua4 = (ndtps: number) => [
    ...[1, 2, 4, 5, 6, 7, 8, 9].map((k) => indikator(k, 4)),
    indikator(3, 4, '3.NDTPS', ndtps),
  ];
  const unggul = hitungTotalAkreditasi(semua4(12));
  assert.equal(unggul.skorTotal, 440);
  assert.equal(unggul.syaratPerluTerpenuhi, true);
  assert.equal(unggul.prediksiPeringkat, 'Unggul');

  const kurangDosen = hitungTotalAkreditasi(semua4(10));
  assert.equal(kurangDosen.skorTotal, 440);
  assert.equal(kurangDosen.syaratPerluTerpenuhi, false);
  assert.equal(kurangDosen.prediksiPeringkat, 'Baik Sekali');
  assert.equal(kurangDosen.catatanSyaratPerlu.length, 1);

  // dua indikator di satu kriteria dirata-rata: K2 (2 + 4)/2 = 3 → 3 × 10 = 30
  const rata = hitungTotalAkreditasi([indikator(2, 2), indikator(2, 4)]);
  assert.equal(rata.kriteria[1].skorRataRata, 3);
  assert.equal(rata.kriteria[1].skorTertimbang, 30);
  // di bawah 200 → Tidak Terakreditasi: semua skor 1 → 110
  assert.equal(hitungTotalAkreditasi([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => indikator(k, 1))).prediksiPeringkat, 'Tidak Terakreditasi');
});

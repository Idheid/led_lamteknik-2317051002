import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bacaAturanStatus, buatJangkar, cariJangkar, hitungNilaiAkhir, perkiraanStatus, perluAlasan, skorSah, statusSetelah, teksPolos,
} from '../review.ts';
import type { DokTiptap } from '../narasi.ts';

const dok = (...par: string[]): DokTiptap => ({ type: 'doc', content: par.map((t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })) });

test('teksPolos: paragraf (juga di daftar dan tabel) dipisah baris baru', () => {
  const d = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Satu ' }, { type: 'text', text: 'dua.', marks: [{ type: 'bold' }] }] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Butir.' }] }] }] },
      { type: 'image', attrs: { src: 'x' } },
      { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sel' }] }] }] }] },
      { type: 'paragraph' },
    ],
  } as DokTiptap;
  assert.equal(teksPolos(d), 'Satu dua.\nButir.\nSel\n');
});

test('Jangkar tetap menempel saat kalimat lain diubah, memilih kemunculan dengan konteks yang cocok, dan hilang bila kalimatnya dihapus', () => {
  const awal = teksPolos(dok('Dosen tetap 12 orang. Visi dirumuskan bersama.', 'Visi dirumuskan bersama. Evaluasi tiap tahun.'));
  const i = awal.lastIndexOf('Visi dirumuskan bersama.');
  const j = buatJangkar(awal, i - 1, i + 'Visi dirumuskan bersama.'.length + 1)!;
  assert.equal(j.teks, 'Visi dirumuskan bersama.', 'spasi di tepi blok dibuang');
  assert.deepEqual(cariJangkar(awal, j), { mulai: i, akhir: i + j.teks.length });

  // PJ mengubah kalimat lain di paragraf pertama: posisi bergeser, jangkar tetap pada kemunculan kedua
  const ubah = teksPolos(dok('Dosen tetap 14 orang, seluruhnya bergelar doktor. Visi dirumuskan bersama.', 'Visi dirumuskan bersama. Evaluasi tiap tahun.'));
  const k = ubah.lastIndexOf('Visi dirumuskan bersama.');
  assert.deepEqual(cariJangkar(ubah, j), { mulai: k, akhir: k + j.teks.length });

  // kalimat yang diblok dihapus/diubah: teks asli berubah
  assert.equal(cariJangkar(teksPolos(dok('Dosen tetap 14 orang.', 'Visi disusun bersama. Evaluasi tiap tahun.')), j), null);
  assert.equal(buatJangkar('abc   ', 3, 6), null);
});

test('Alur status catatan: PJ hanya menandai diperbaiki, asesor menerima atau membuka lagi', () => {
  assert.equal(statusSetelah('PJ', 'terbuka', 'diperbaiki'), 'diperbaiki');
  assert.equal(statusSetelah('PJ', 'diperbaiki', 'diterima'), null);
  assert.equal(statusSetelah('PJ', 'diperbaiki', 'dibuka'), null);
  assert.equal(statusSetelah('ASESOR', 'diperbaiki', 'diterima'), 'diterima');
  assert.equal(statusSetelah('ASESOR', 'terbuka', 'diterima'), null, 'belum diperbaiki');
  assert.equal(statusSetelah('ASESOR', 'diperbaiki', 'dibuka'), 'terbuka');
  assert.equal(statusSetelah('ASESOR', 'diterima', 'dibuka'), 'terbuka');
  assert.equal(statusSetelah('ASESOR', 'terbuka', 'diperbaiki'), null);
});

test('Nilai akhir bobot × skor (maks 400) dan perkiraan status menurut ambang', () => {
  const butir = [{ kode: '1', bobot: 60 }, { kode: '2', bobot: 40 }];
  const n = hitungNilaiAkhir(butir, new Map([['1', 4], ['2', 3.5]]));
  assert.deepEqual(n, { total: 380, maksimum: 400, dinilai: 2, jumlahButir: 2, lengkap: true });
  assert.equal(hitungNilaiAkhir(butir, new Map([['1', 3]])).lengkap, false);
  const aturan = bacaAturanStatus({
    aturan: [
      { status: 'Terakreditasi Unggul', naMin: 361, masaBerlakuTahun: 5 },
      { status: 'Terakreditasi Unggul', naMin: 331, naMaksEksklusif: 361, masaBerlakuTahun: 3 },
      { status: 'Terakreditasi', naMin: 200, masaBerlakuTahun: 5 },
      { status: 'Tidak Terakreditasi', naMaksEksklusif: 200 },
    ],
  });
  assert.equal(perkiraanStatus(380, aturan)?.masaBerlakuTahun, 5);
  assert.equal(perkiraanStatus(361, aturan)?.masaBerlakuTahun, 5);
  assert.equal(perkiraanStatus(360.99, aturan)?.masaBerlakuTahun, 3);
  assert.equal(perkiraanStatus(250, aturan)?.status, 'Terakreditasi');
  assert.equal(perkiraanStatus(199.5, aturan)?.status, 'Tidak Terakreditasi');
  assert.deepEqual(bacaAturanStatus(null), []);
});

test('Skor sah 0-4 dua desimal; skor berbeda dari sistem wajib beralasan', () => {
  assert.ok(skorSah(0) && skorSah(4) && skorSah(3.25));
  assert.ok(!skorSah(4.5) && !skorSah(-1) && !skorSah(3.333) && !skorSah(Number.NaN));
  assert.equal(perluAlasan(3, 3.004), false);
  assert.equal(perluAlasan(3, 3.5), true);
  assert.equal(perluAlasan(3, null), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BATAS_HALAMAN, LEBAR_GAMBAR_MAKS_PX, bersihkanJudul, masalahJudul, nomorBab, perkiraanHalaman, periksaSebelumEkspor,
  skalaGambar, ukuranGambar,
} from '../ekspor.ts';
import type { DokTiptap } from '../narasi.ts';

test('nomor bab untuk penomoran tabel/gambar', () => {
  assert.equal(nomorBab('I'), 1);
  assert.equal(nomorBab('II.A'), 2);
  assert.equal(nomorBab('C.4'), 2);
  assert.equal(nomorBab('III'), 3);
  assert.equal(nomorBab('IV'), 4);
  assert.equal(nomorBab('AWAL'), null);
});

test('ukuran gambar dari kepala berkas PNG, GIF, JPEG; skala rasio asli, lebar maks 17,1 cm', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mNk+M9QzwAEjDAGACCCAgL+1tZqAAAAAElFTkSuQmCC', 'base64');
  assert.deepEqual(ukuranGambar(png), { lebar: 2, tinggi: 1, jenis: 'png' });
  const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xc8, 0x00, 0, 0]);
  assert.deepEqual(ukuranGambar(gif), { lebar: 320, tinggi: 200, jenis: 'gif' });
  // JPEG minimal: SOI, APP0 (panjang 4), SOF0 tinggi 300 lebar 400
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x01, 0x90, 0x03, 0, 0, 0, 0]);
  assert.deepEqual(ukuranGambar(jpg), { lebar: 400, tinggi: 300, jenis: 'jpg' });
  assert.equal(ukuranGambar(Buffer.from('bukan gambar')), null);
  assert.equal(LEBAR_GAMBAR_MAKS_PX, 646);
  assert.deepEqual(skalaGambar(2000, 1000), { lebar: 646, tinggi: 323 });
  assert.deepEqual(skalaGambar(300, 200), { lebar: 300, tinggi: 200 }, 'gambar kecil tidak diperbesar');
});

const doc = (content: DokTiptap['content']): DokTiptap => ({ type: 'doc', content });
const tabel = { type: 'table', content: [] };

test('judul tabel dan gambar wajib ada; nomor lama dibuang', () => {
  assert.equal(bersihkanJudul('Tabel 2.3. Data dosen', 'Tabel'), 'Data dosen');
  assert.equal(bersihkanJudul('Gambar 1: Struktur', 'Gambar'), 'Struktur');
  assert.deepEqual(masalahJudul(doc([{ type: 'paragraph', attrs: { peran: 'judul-tabel' }, content: [{ type: 'text', text: 'Data' }] }, tabel])), []);
  assert.deepEqual(masalahJudul(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'Tabel berikut berisi data' }] }, tabel])), []);
  assert.deepEqual(masalahJudul(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'Data dosen' }] }, tabel])).map((m) => m.jenis), ['tabel']);
  assert.deepEqual(masalahJudul(doc([{ type: 'image', attrs: { src: 'x' } }])).map((m) => m.jenis), ['gambar']);
});

test('pemeriksaan sebelum ekspor: status selesai, draf, penanda belum ada bukti', () => {
  const h = periksaSebelumEkspor(
    [{ kode: 'C.1', nama: 'VMTS', status: 'disunting', jumlahSub: 2 }, { kode: 'C.2', nama: 'Akuntabilitas', status: 'selesai', jumlahSub: 1 }, { kode: 'LAMPIRAN', nama: 'Lampiran', status: 'belum', jumlahSub: 0 }],
    [
      { kode: 'C.1-LB', label: 'C.1 Latar', bagianKode: 'C.1', doc: null },
      { kode: 'C.1-KEB', label: 'C.1 Kebijakan', bagianKode: 'C.1', doc: doc([{ type: 'paragraph', content: [{ type: 'text', text: 'x [BELUM ADA BUKTI: SK] y [BELUM ADA BUKTI: notulen]' }] }]) },
      { kode: 'C.2-LB', label: 'C.2 Latar', bagianKode: 'C.2', doc: doc([{ type: 'paragraph', content: [{ type: 'text', text: 'Lengkap.' }] }]) },
    ],
  );
  assert.equal(h.galat.length, 3);
  assert.match(h.galat[0], /C\.1 VMTS belum ditandai selesai/);
  assert.match(h.galat[1], /C\.1 Latar belum punya draf/);
  assert.match(h.galat[2], /2 penanda/);
});

test('perkiraan halaman dan batas 150', () => {
  assert.equal(BATAS_HALAMAN, 150);
  assert.equal(perkiraanHalaman({ kata: 40000, barisTabel: 250, gambar: 5, kataPerHalaman: 400, halamanTetap: 10 }), 122);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perbaikiJson } from '../json.ts';

test('perbaikiJson: pagar kode, teks pembuka, dan koma berlebih diperbaiki; jawaban kosong/terpotong null', () => {
  assert.deepEqual(perbaikiJson('```json\n{"a":[1,2]}\n```'), { a: [1, 2] });
  assert.deepEqual(perbaikiJson('Berikut hasilnya:\n{"a":"x"} Semoga membantu.'), { a: 'x' });
  assert.deepEqual(perbaikiJson('{"a":[1,2,],"b":{"c":1,},}'), { a: [1, 2], b: { c: 1 } });
  assert.equal(perbaikiJson(''), null);
  assert.equal(perbaikiJson(null), null);
  assert.equal(perbaikiJson('{"paragraf":[{"teks":"terpotong di teng'), null);
  assert.equal(perbaikiJson('tidak ada json'), null);
});

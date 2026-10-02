import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bacaDaftarModel, modelEmbedding, modelNarasi, modelUsang, penjelasanModel, pilihCadanganBawaan,
  pilihEmbeddingBawaan, pilihModelNarasiBawaan, versiModel,
} from '../model-llm.ts';

const contoh = {
  models: [
    { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
    { name: 'models/gemini-3-flash-preview', displayName: 'Gemini 3 Flash Preview', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.1-flash-lite', displayName: 'Gemini 3.1 Flash-Lite', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3-flash-image', displayName: 'Gemini 3 Flash Image', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-embedding-001', displayName: 'Gemini Embedding 001', supportedGenerationMethods: ['embedContent', 'countTokens'] },
    { name: 'models/imagen-4.0', displayName: 'Imagen 4', supportedGenerationMethods: ['predict'] },
    { nama: 'rusak' },
  ],
};

test('daftar model dibaca dan dipisah menurut metode', () => {
  const d = bacaDaftarModel(contoh);
  assert.equal(d.length, 7);
  assert.equal(d[0].kode, 'gemini-2.5-flash');
  assert.deepEqual(modelNarasi(d).map((m) => m.kode), ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']);
  assert.deepEqual(modelEmbedding(d).map((m) => m.kode), ['gemini-embedding-001']);
  assert.deepEqual(bacaDaftarModel(null), []);
});

test('model narasi bawaan dari keluarga 3.x jenis flash; cadangan dan embedding', () => {
  const d = bacaDaftarModel(contoh);
  assert.equal(pilihModelNarasiBawaan(d), 'gemini-3-flash-preview');
  assert.deepEqual(pilihCadanganBawaan(d, 'gemini-3-flash-preview'), ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']);
  assert.equal(pilihEmbeddingBawaan(d), 'gemini-embedding-001');
  // versi stabil diutamakan dari pratinjau pada versi yang sama
  const stabil = bacaDaftarModel({ models: [...contoh.models, { name: 'models/gemini-3-flash', supportedGenerationMethods: ['generateContent'] }] });
  assert.equal(pilihModelNarasiBawaan(stabil), 'gemini-3-flash');
  assert.equal(pilihModelNarasiBawaan(bacaDaftarModel({ models: [contoh.models[0]] })), null);
});

test('versi, model usang, dan penjelasan', () => {
  assert.equal(versiModel('gemini-3.1-flash-lite'), 3.1);
  assert.equal(versiModel('gemma-3-27b'), 0);
  assert.ok(modelUsang('gemini-2.5-flash') && !modelUsang('gemini-3-flash-preview'));
  assert.match(penjelasanModel('gemini-3-flash-preview'), /Disarankan.*pratinjau/s);
  assert.match(penjelasanModel('gemini-embedding-001'), /vektor/);
  assert.match(penjelasanModel('gemini-3.1-flash-lite'), /hemat/);
});

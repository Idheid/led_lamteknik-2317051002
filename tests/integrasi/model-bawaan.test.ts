import "./siapan";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import { MODEL_CADANGAN_BAWAAN, MODEL_NARASI_BAWAAN, pengaturanLlm } from "@/modules/bersama/data/kunci-api";
import { bersihkanDb } from "./bantu";

/** Rencana 10 Nov T1: model bawaan gemini-3.8-flash; migrasi data tidak menimpa pilihan Admin. */
const SQL = readFileSync(resolve(process.cwd(), "prisma/migrations/20261113090000_model_narasi_38/migration.sql"), "utf8");

async function jalankanMigrasi() {
  await prisma.$executeRawUnsafe(SQL);
}

before(async () => {
  await bersihkanDb();
});

test("baris baru memakai gemini-3.8-flash dengan cadangan gemini-3.5-flash-lite", async () => {
  const a = await pengaturanLlm();
  assert.equal(MODEL_NARASI_BAWAAN, "gemini-3.8-flash");
  assert.equal(a.modelNarasi, "gemini-3.8-flash");
  assert.deepEqual(a.modelCadangan, MODEL_CADANGAN_BAWAAN);
  assert.equal(a.modelEmbedding, "gemini-embedding-001");
});

test("migrasi data: bawaan lama gemini-3-flash-preview diganti, cadangan yang sudah dipilih tetap", async () => {
  await prisma.pengaturanLLM.update({ where: { id: "utama" }, data: { modelNarasi: "gemini-3-flash-preview", modelCadangan: ["gemini-3.1-flash-lite"] } });
  await jalankanMigrasi();
  const a = await pengaturanLlm();
  assert.equal(a.modelNarasi, "gemini-3.8-flash");
  assert.deepEqual(a.modelCadangan, ["gemini-3.1-flash-lite"]);

  await prisma.pengaturanLLM.update({ where: { id: "utama" }, data: { modelNarasi: "gemini-3-flash-preview", modelCadangan: [] } });
  await jalankanMigrasi();
  assert.deepEqual((await pengaturanLlm()).modelCadangan, ["gemini-3.5-flash-lite"], "cadangan kosong diisi bawaan");
});

test("migrasi data tidak menimpa model pilihan Admin dan aman dijalankan ulang", async () => {
  await prisma.pengaturanLLM.update({ where: { id: "utama" }, data: { modelNarasi: "gemini-3.1-pro-preview", modelCadangan: ["gemini-3.8-flash"] } });
  await jalankanMigrasi();
  await jalankanMigrasi();
  const a = await pengaturanLlm();
  assert.equal(a.modelNarasi, "gemini-3.1-pro-preview");
  assert.deepEqual(a.modelCadangan, ["gemini-3.8-flash"]);
});

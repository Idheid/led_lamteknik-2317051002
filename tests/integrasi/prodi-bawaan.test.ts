import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { bacaProdiBawaan, isiProdiBawaan } from "@/modules/bersama/data/prodi-bawaan";
import { bersihkanDb } from "./bantu";

/** Revisi 31 Okt 2026 tahap 3: 16 prodi LAM Teknik FT Unila sudah terisi; seed idempoten menurut nama + jenjang. */

before(bersihkanDb);
after(() => prisma.$disconnect());

test("Revisi 31 Okt tahap 3: basis data kosong berisi 16 prodi FT Unila dan identitas fakultas bawaan", async () => {
  assert.equal(bacaProdiBawaan().prodi.length, 16);
  assert.deepEqual(await isiProdiBawaan(), { dibuat: 16, dilewati: 0 });
  assert.equal(await prisma.prodi.count(), 16);

  const sipil = await prisma.prodi.findFirstOrThrow({ where: { nama: "Teknik Sipil", jenjang: "S1" } });
  assert.equal(sipil.akreditasiBerlakuSampai?.toISOString().slice(0, 10), "2026-12-20");
  assert.deepEqual(sipil.identitas, { peringkatAkreditasi: "A" });
  assert.equal(sipil.kodePddikti, null, "kode PDDikti diisi admin");
  // nama sama, jenjang berbeda = prodi berbeda
  assert.equal(await prisma.prodi.count({ where: { nama: "Teknik Sipil" } }), 3);
  assert.deepEqual(
    (await prisma.prodi.findMany({ where: { jenjang: { in: ["STr", "PPI"] } }, orderBy: { jenjang: "asc" } })).map((x) => [x.jenjang, (x.identitas as { peringkatAkreditasi: string }).peringkatAkreditasi]),
    [["PPI", "Terakreditasi Unggul"], ["STr", "Baik"]],
  );
  const f = await prisma.fakultas.findUniqueOrThrow({ where: { id: "utama" } });
  assert.deepEqual([f.nama, f.perguruanTinggi, f.kota], ["Fakultas Teknik", "Universitas Lampung", "Bandar Lampung"]);
});

test("Revisi 31 Okt tahap 3: seed kedua tidak membuat data ganda, tidak menimpa ubahan admin, dan tidak menghapus prodi tambahan", async () => {
  const elektro = await prisma.prodi.findFirstOrThrow({ where: { nama: "Teknik Elektro", jenjang: "S1" } });
  await prisma.prodi.update({ where: { id: elektro.id }, data: { kodePddikti: "20201", identitas: { peringkatAkreditasi: "Unggul", skPendirian: "SK 1/1965" } } });
  await prisma.prodi.create({ data: { nama: "Teknik Informatika", jenjang: "S1" } });
  await prisma.fakultas.update({ where: { id: "utama" }, data: { nama: "FT Unila", kota: null } });

  assert.deepEqual(await isiProdiBawaan(), { dibuat: 0, dilewati: 16 });
  assert.deepEqual(await isiProdiBawaan(), { dibuat: 0, dilewati: 16 });
  assert.equal(await prisma.prodi.count(), 17, "tidak ganda, prodi tambahan tetap ada");
  const lagi = await prisma.prodi.findUniqueOrThrow({ where: { id: elektro.id } });
  assert.equal(lagi.kodePddikti, "20201");
  assert.deepEqual(lagi.identitas, { peringkatAkreditasi: "Unggul", skPendirian: "SK 1/1965" });
  const f = await prisma.fakultas.findUniqueOrThrow({ where: { id: "utama" } });
  assert.deepEqual([f.nama, f.kota], ["FT Unila", "Bandar Lampung"], "hanya kolom kosong yang diisi");
});

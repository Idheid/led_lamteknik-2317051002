import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { isiKonfigurasiAwalLkps } from "@/modules/lkps/data/konfigurasi-awal";
import { LAM_TEKNIK_2024_TEMPLATE } from "@/modules/lkps/domain/templat";
import { bersihkanDb } from "./bantu";

/** Gabung LKPS G3: skema modul LKPS (model Lkps*, prodiId wajib, keputusan G0) dan seed konfigurasi idempoten. */

let prodiA: string;
let prodiB: string;

before(async () => {
  await bersihkanDb();
  prodiA = (await prisma.prodi.create({ data: { nama: "Teknik A", jenjang: "S1" } })).id;
  prodiB = (await prisma.prodi.create({ data: { nama: "Teknik B", jenjang: "D3" } })).id;
});

after(() => prisma.$disconnect());

test("seed konfigurasi LKPS bawaan idempoten: kriteria dan tabel dari templat Ghalib", async () => {
  const a = await isiKonfigurasiAwalLkps();
  assert.deepEqual(a, { dibuat: true, kriteria: LAM_TEKNIK_2024_TEMPLATE.length });
  const b = await isiKonfigurasiAwalLkps();
  assert.equal(b.dibuat, false);
  assert.equal(await prisma.lkpsRegulasi.count(), 1);
  assert.equal(await prisma.lkpsKriteriaConfig.count(), LAM_TEKNIK_2024_TEMPLATE.length);
  const tabel = await prisma.lkpsTabelConfig.count();
  assert.equal(tabel, LAM_TEKNIK_2024_TEMPLATE.reduce((s, k) => s + k.tabelList.length, 0));
  const satu = await prisma.lkpsTabelConfig.findFirstOrThrow();
  assert.ok(JSON.parse(satu.formatKolom!).kolom, "formatKolom berisi metadata kolom");
});

test("NIDN unik per prodi: dosen yang sama boleh di dua prodi, tidak boleh dua kali di satu prodi", async () => {
  const dosen = (prodiId: string) => ({ nama: "Dosen Sama", nidn: "0011223344", jabatanAkademik: "Lektor", prodiId });
  await prisma.lkpsDosenTetap.create({ data: dosen(prodiA) });
  await prisma.lkpsDosenTetap.create({ data: dosen(prodiB) });
  await assert.rejects(prisma.lkpsDosenTetap.create({ data: dosen(prodiA) }), /Unique constraint/);
});

test("isian tabel dinamis per prodi: satu baris per (prodi, tabel)", async () => {
  const tabel = await prisma.lkpsTabelConfig.findFirstOrThrow();
  await prisma.lkpsIsianTabel.create({ data: { prodiId: prodiA, tabelId: tabel.id, baris: [{ a: 1 }] } });
  await prisma.lkpsIsianTabel.create({ data: { prodiId: prodiB, tabelId: tabel.id, baris: [{ a: 2 }] } });
  await assert.rejects(prisma.lkpsIsianTabel.create({ data: { prodiId: prodiA, tabelId: tabel.id } }), /Unique constraint/);
  const a = await prisma.lkpsIsianTabel.findUniqueOrThrow({ where: { prodiId_tabelId: { prodiId: prodiA, tabelId: tabel.id } } });
  assert.deepEqual(a.baris, [{ a: 1 }]);
});

test("anak dosen membawa prodiId; prodi yang masih punya data LKPS tidak bisa dihapus (Restrict)", async () => {
  const d = await prisma.lkpsDosenTetap.findFirstOrThrow({ where: { prodiId: prodiA } });
  await prisma.lkpsEwmp.create({ data: { dosenId: d.id, prodiId: prodiA, sksPenelitian: 2 } });
  await prisma.lkpsBimbinganTa.create({ data: { dosenId: d.id, prodiId: prodiA, bimbinganPSSendiriTS: 3 } });
  assert.equal(await prisma.lkpsEwmp.count({ where: { prodiId: prodiA } }), 1);
  await assert.rejects(prisma.prodi.delete({ where: { id: prodiA } }), /Foreign key constraint|violates RESTRICT|constraint/i);
});

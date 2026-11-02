import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { batalkanTugas, lanjutkanTugas, mulaiSusunSeluruh, rencanaSusunSeluruh, tugasProyek } from "@/modules/led/data/generate";
import { prosesTugasGenerate } from "@/modules/led/proses/generate";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/**
 * Revisi 31 Okt 2026 tahap 6: Susun seluruh LED (LLM_NARASI=uji). Supaya cepat, sub-bagian C.2–C.7, II.B, III, dan I
 * ditandai selesai lebih dulu: rangkaian yang tersisa C.1 → II.A → IV → AWAL (kata pengantar, ringkasan).
 */

let tim: Pengguna;
let timLain: Pengguna;
let proyekId: string;

const tugasUrut = () => prisma.tugasGenerate.findMany({ where: { proyekId }, orderBy: { createdAt: "asc" } });

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim } = await siapkanProdi(admin, { nama: "Teknik Rangkaian", jenjang: "S1", kodePddikti: "88888", identitas: {} }));
  ({ tim: timLain } = await siapkanProdi(admin, { nama: "Teknik Lain", jenjang: "S1", kodePddikti: "88889", identitas: {} }));
  const proyek = await buatProyek(tim, { nama: "LED Rangkaian", tahunPengajuan: 2026 });
  proyekId = proyek.id;
  const sub = await prisma.subBagian.findMany({
    where: { bagian: { versiId: proyek.versiId, kode: { in: ["C.2", "C.3", "C.4", "C.5", "C.6", "C.7", "II.B", "III", "I"] } } },
    select: { id: true },
  });
  await prisma.bagianDraf.createMany({ data: sub.map((s) => ({ proyekId, subBagianId: s.id, status: "selesai" as const })) });
  process.env.LLM_NARASI = "uji";
  process.env.LLM_NARASI_UJI_JEDA_MS = "0";
});
after(async () => {
  process.env.LLM_NARASI = "";
  await prisma.$disconnect();
});

test("Revisi 31 Okt tahap 6: rencana melewati sub-bagian selesai; urutan C.1, II.A, IV, lalu kata pengantar dan ringkasan", async () => {
  const r = await rencanaSusunSeluruh(tim, proyekId);
  assert.deepEqual(r.bagian.map((b) => b.kode), ["C.1", "II.A", "IV", "AWAL"]);
  assert.deepEqual(r.bagian.find((b) => b.kode === "AWAL")?.sub, ["AWAL-PENGANTAR", "AWAL-RINGKASAN"], "sampul, identitas, tim tidak disusun AI");
  assert.equal(r.jumlahSub, r.bagian.reduce((a, b) => a + b.sub.length, 0));
  await assert.rejects(mulaiSusunSeluruh(timLain, proyekId), GalatAkses);
});

test("Revisi 31 Okt tahap 6: rangkaian berjalan berurutan, berhenti saat kunci habis, lanjut, lalu Batalkan menghentikan seluruhnya", async () => {
  const t1 = await mulaiSusunSeluruh(tim, proyekId);
  assert.deepEqual([t1.bagianKode, t1.rangkaianKe, t1.rangkaianTotal, t1.bagianBerikutnya], ["C.1", 1, 4, ["II.A", "IV", "AWAL"]]);
  await assert.rejects(mulaiSusunSeluruh(tim, proyekId), /Masih ada penyusunan/);
  assert.deepEqual((await tugasProyek(tim, proyekId))[0].rangkaian, { ke: 1, total: 4 }, "banner: Bagian 1 dari 4");

  assert.equal(await prosesTugasGenerate(t1.id), "selesai");
  let semua = await tugasUrut();
  assert.equal(semua.length, 2, "tugas bagian berikutnya dibuat setelah C.1 selesai");
  const t2 = semua[1];
  assert.deepEqual([t2.bagianKode, t2.rangkaianKe, t2.bagianBerikutnya], ["II.A", 2, ["IV", "AWAL"]]);
  const draf = await prisma.bagianDraf.count({ where: { proyekId, subBagian: { bagian: { kode: "C.1" } }, versiAktifId: { not: null } } });
  assert.equal(draf, t1.subBagianKode.length, "semua sub-bagian C.1 tersusun");

  // kunci habis (tanpa mode uji dan tanpa kunci): berhenti rapi, rangkaian tidak maju
  process.env.LLM_NARASI = "";
  assert.equal(await prosesTugasGenerate(t2.id), "tertunda");
  assert.equal((await tugasUrut()).length, 2);
  process.env.LLM_NARASI = "uji";
  await lanjutkanTugas(tim, t2.id);
  assert.equal(await prosesTugasGenerate(t2.id), "selesai");
  semua = await tugasUrut();
  assert.equal(semua.length, 3);
  const t3 = semua[2];
  assert.deepEqual([t3.bagianKode, t3.rangkaianKe, t3.bagianBerikutnya], ["IV", 3, ["AWAL"]]);

  // Batalkan menghentikan seluruh rangkaian: AWAL tidak pernah dibuat
  await batalkanTugas(tim, t3.id);
  assert.equal(await prosesTugasGenerate(t3.id), "dilewati");
  semua = await tugasUrut();
  assert.equal(semua.length, 3);
  assert.deepEqual(semua.map((t) => t.status), ["selesai", "selesai", "dibatalkan"]);
  assert.deepEqual(semua[2].bagianBerikutnya, []);
});

test("Revisi 31 Okt tahap 6: rangkaian baru menyusun sisa sampai kata pengantar dan ringkasan paling akhir", async () => {
  // tandai C.1 dan II.A selesai: sisa IV lalu AWAL
  const sub = await prisma.bagianDraf.findMany({ where: { proyekId, subBagian: { bagian: { kode: { in: ["C.1", "II.A"] } } } }, select: { id: true } });
  await prisma.bagianDraf.updateMany({ where: { id: { in: sub.map((s) => s.id) } }, data: { status: "selesai" } });
  const t = await mulaiSusunSeluruh(tim, proyekId);
  assert.deepEqual([t.bagianKode, t.rangkaianTotal], ["IV", 2]);
  assert.equal(await prosesTugasGenerate(t.id), "selesai");
  const akhir = (await tugasUrut()).at(-1)!;
  assert.deepEqual([akhir.bagianKode, akhir.subBagianKode, akhir.rangkaianKe], ["AWAL", ["AWAL-PENGANTAR", "AWAL-RINGKASAN"], 2]);
  assert.equal(await prosesTugasGenerate(akhir.id), "selesai");
  assert.equal((await tugasUrut()).length, 5, "rangkaian berakhir setelah AWAL");
  const ringkasan = await prisma.bagianDraf.findFirst({ where: { proyekId, subBagian: { kode: "AWAL-RINGKASAN" } } });
  assert.ok(ringkasan?.versiAktifId, "ringkasan eksekutif tersusun");
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Revisi 31 Okt 2026 tahap 4: LED baru memilih TS dari dua pilihan untuk tahun pengajuan (P−1)/P atau (P−2)/(P−1). */

let tim: Pengguna[] = [];

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  tim = [];
  for (const [i, nama] of ["Teknik Satu", "Teknik Dua", "Teknik Tiga", "Teknik Empat"].entries()) {
    tim.push((await siapkanProdi(admin, { nama, jenjang: "S1", kodePddikti: `9000${i}`, identitas: {} })).tim);
  }
});
after(() => prisma.$disconnect());

test("Revisi 31 Okt tahap 4: LED baru dengan TS (P−1)/P dan (P−2)/(P−1); TS kosong = (P−1)/P", async () => {
  const a = await buatProyek(tim[0], { nama: "LED Teknik Satu TS 2026/2027", tahunPengajuan: 2027, tsTahunMulai: 2026 });
  assert.deepEqual([a.tahunPengajuan, a.tsTahunMulai], [2027, 2026]);
  const b = await buatProyek(tim[1], { nama: "LED Teknik Dua TS 2025/2026", tahunPengajuan: 2027, tsTahunMulai: "2025" });
  assert.deepEqual([b.tahunPengajuan, b.tsTahunMulai], [2027, 2025]);
  const c = await buatProyek(tim[2], { nama: "LED Teknik Tiga", tahunPengajuan: 2027 });
  assert.equal(c.tsTahunMulai, 2026);
});

test("Revisi 31 Okt tahap 4: TS di luar dua pilihan ditolak", async () => {
  for (const ts of [2024, 2027, 2020]) {
    await assert.rejects(buatProyek(tim[3], { nama: "LED Teknik Empat", tahunPengajuan: 2027, tsTahunMulai: ts }), /Pilih salah satu TS/);
  }
  assert.equal(await prisma.proyekLED.count({ where: { prodiId: tim[3].prodiId! } }), 0);
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { catatHasilAkreditasi } from "@/modules/led/data/akreditasi";
import { dataDashboard } from "@/modules/led/data/dashboard";
import { jumlahPerTab } from "@/modules/led/domain/dashboard";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Desain form 2 (2 Nov 2026): Dashboard akreditasi Fakultas/UPPS. */

let admin: Pengguna;
const HARI = new Date("2026-11-25T00:00:00.000Z");

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
});

after(async () => {
  await prisma.$disconnect();
});

test("Dashboard: lembaga dan peringkat dari riwayat, masa berlaku, status LPMPP, tab; hanya Admin UPPS", async () => {
  const a = await siapkanProdi(admin, { nama: "Teknik Kritis", jenjang: "S1", kodePddikti: "60001", akreditasiBerlakuSampai: "2027-03-01",
    identitas: { peringkatAkreditasi: "Baik Sekali", lembagaAkreditasi: "BAN-PT" } }, "tim.60001@uji.test");
  const ledA = await buatProyek(a.tim, { tahunPengajuan: 2027 });
  await prisma.proyekLED.update({ where: { id: ledA.id }, data: { statusReview: "perlu_revisi" } });
  const b = await siapkanProdi(admin, { nama: "Teknik Unggul", jenjang: "S1", kodePddikti: "60002", identitas: {} }, "tim.60002@uji.test");
  const ledB = await buatProyek(b.tim, { tahunPengajuan: 2026 });
  await prisma.proyekLED.update({ where: { id: ledB.id }, data: { statusReview: "layak" } });
  await catatHasilAkreditasi(admin, { prodiId: b.prodi.id, proyekId: ledB.id, peringkat: "Terakreditasi Unggul", berlakuSampai: "2031-11-30" });

  await assert.rejects(dataDashboard(a.tim), GalatAkses);
  const baris = await dataDashboard(admin, HARI);
  const ba = baris.find((x) => x.prodi.id === a.prodi.id)!;
  const bb = baris.find((x) => x.prodi.id === b.prodi.id)!;
  assert.deepEqual([ba.lembaga, ba.peringkat, ba.masa.label, ba.status, ba.led?.id], ["BAN-PT", "Baik Sekali", "Kritis", "perlu-revisi", ledA.id]);
  assert.equal(ba.masa.teks, "96 hari lagi");
  assert.ok(ba.ledPersen !== null && ba.ledPersen >= 0);
  assert.deepEqual([bb.lembaga, bb.peringkat, bb.masa.label, bb.status, bb.led], ["LAM Teknik", "Terakreditasi Unggul", "Aktif", "hasil-dicatat", null]);
  assert.equal(bb.statusAkun, "baik");
  const jumlah = jumlahPerTab(baris);
  assert.ok(jumlah.prioritas >= 1 && jumlah.unggul >= 1 && jumlah.review >= 1);
  assert.equal(jumlah.semua, baris.length);
});

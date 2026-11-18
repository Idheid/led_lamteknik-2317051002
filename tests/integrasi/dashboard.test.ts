import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { catatHasilAkreditasi } from "@/modules/led/data/akreditasi";
import { dataDashboard, dataDashboardTamu, riwayatAkreditasiTamu } from "@/modules/led/data/dashboard";
import { ingatkanTimProdi } from "@/modules/bersama/data/pengingat-akreditasi";
import { jumlahPerTab } from "@/modules/led/domain/dashboard";
import { bersihkanDb, buatAdmin, imporSeed, penggunaDari, siapkanFakultas, siapkanProdi } from "./bantu";

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

test("Gabung LKPS G2: dashboard Tamu tanpa email atau nama akun, tanpa reviewer; Ingatkan ditolak untuk Tamu", async () => {
  const u = await prisma.user.create({ data: { id: "tamu-dashboard", name: "Tamu", email: "tamu.dashboard@uji.test", emailVerified: true, role: "TAMU" } });
  const tamu = await penggunaDari(u.id);
  await assert.rejects(dataDashboard(tamu), GalatAkses);
  const p = await prisma.prodi.findFirstOrThrow({ where: { kodePddikti: "60001" } });
  const asesor = await prisma.user.create({ data: { id: "asesor-dashboard", name: "Reviewer Rahasia", email: "reviewer.rahasia@uji.test", emailVerified: true, role: "ASESOR" } });
  await prisma.proyekLED.updateMany({ where: { prodiId: p.id }, data: { asesorId: asesor.id } });

  const admin2 = await dataDashboard(admin, HARI);
  const tamuBaris = await dataDashboardTamu(tamu, HARI);
  assert.equal(tamuBaris.length, admin2.length);
  const json = JSON.stringify(tamuBaris);
  // akun Tim Prodi prodi uji (siapkanProdi) dan reviewer tidak boleh ikut terkirim
  for (const larangan of ["tim.60001@uji.test", "tim.60002@uji.test", "@uji.test", "Reviewer Rahasia", "loginTerakhir", "statusAkun", "akun", "bolehCatat", "catatanTerbuka"]) {
    assert.ok(!json.includes(larangan), `bocor: ${larangan}`);
  }
  const t = tamuBaris.find((x) => x.prodi.id === p.id)!;
  const a = admin2.find((x) => x.prodi.id === p.id)!;
  assert.deepEqual([t.lembaga, t.peringkat, t.masa.label, t.status, t.lkpsPersen, t.ledPersen], [a.lembaga, a.peringkat, a.masa.label, a.status, a.lkpsPersen, a.ledPersen]);
  assert.ok(t.led && !("id" in t.led), "id LED tidak dikirim ke Tamu");
  assert.ok((await riwayatAkreditasiTamu(tamu, p.id)).every((r) => !("berkasSkLokasi" in r)));
  await assert.rejects(ingatkanTimProdi(tamu, p.id), GalatAkses);
});

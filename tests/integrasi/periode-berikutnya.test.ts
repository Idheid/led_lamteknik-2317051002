import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { infoPeriodeBerikutnya, mulaiLedPeriodeBerikutnya } from "@/modules/led/data/periode";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** L4 (2 Nov 2026): Mulai LED periode berikutnya. */

let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
});

after(async () => {
  await prisma.$disconnect();
});

test("L4: LED lama diarsipkan dan LED baru dibuat dalam satu transaksi; gagal di tengah tidak mengarsipkan", async () => {
  const { prodi, tim } = await siapkanProdi(admin, { nama: "Teknik Periode", jenjang: "S1", kodePddikti: "70001", akreditasiBerlakuSampai: "2032-01-01", identitas: {} }, "tim.70001@uji.test");
  const { tim: timLain } = await siapkanProdi(admin, { nama: "Teknik Tetangga", jenjang: "S1", kodePddikti: "70002", identitas: {} }, "tim.70002@uji.test");
  const lama = await buatProyek(tim, { tahunPengajuan: 2026 });
  const lainLama = await buatProyek(timLain, { tahunPengajuan: 2026 });

  let info = await infoPeriodeBerikutnya(tim, new Date("2026-11-25T00:00:00.000Z"));
  assert.equal(info?.lama.id, lama.id);
  assert.equal(info?.syarat.tampilDiMenu, false, "LED draf dan akreditasi masih jauh: hanya di Pengaturan LED");
  info = await infoPeriodeBerikutnya(tim, new Date("2030-08-01T00:00:00.000Z"));
  assert.equal(info?.syarat.tampilDiMenu, true, "≤ 18 bulan sebelum berakhir");
  await assert.rejects(infoPeriodeBerikutnya(admin), GalatAkses);
  await assert.rejects(mulaiLedPeriodeBerikutnya(admin, { tahunPengajuan: 2031 }), GalatAkses);

  // penyusunan masih berjalan: ditolak, LED lama tetap aktif, tidak ada LED baru
  const tugas = await prisma.tugasGenerate.create({ data: { proyekId: lama.id, judul: "Uji", subBagianKode: [], status: "berjalan" } });
  await assert.rejects(mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031 }), /penyusunan berjalan.*LED lama tidak diarsipkan/);
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lama.id } })).diarsipkanPada, null);
  assert.equal(await prisma.proyekLED.count({ where: { prodiId: prodi.id } }), 1);
  await prisma.tugasGenerate.delete({ where: { id: tugas.id } });

  // instrumen jenjang belum aktif: ditolak sebelum apa pun berubah
  const aktif = await prisma.versiInstrumen.findMany({ where: { aktif: true }, select: { id: true } });
  await prisma.versiInstrumen.updateMany({ where: { aktif: true }, data: { aktif: false } });
  await assert.rejects(mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031 }), /belum aktif/);
  await prisma.versiInstrumen.updateMany({ where: { id: { in: aktif.map((x) => x.id) } }, data: { aktif: true } });
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lama.id } })).diarsipkanPada, null);

  const { lama: diarsip, baru } = await mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031, tsTahunMulai: 2030 });
  assert.equal(diarsip.id, lama.id);
  assert.ok((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lama.id } })).diarsipkanPada);
  assert.equal(baru.prodiId, prodi.id);
  assert.equal(baru.tahunPengajuan, 2031);
  assert.equal(baru.tsTahunMulai, 2030);
  assert.equal(await prisma.proyekLED.count({ where: { prodiId: prodi.id, diarsipkanPada: null } }), 1, "tetap satu LED aktif");
  // prodi lain tidak tersentuh
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lainLama.id } })).diarsipkanPada, null);
  assert.equal(await prisma.logAktivitas.count({ where: { aksi: "mulai_periode_berikutnya", objekId: baru.id } }), 1);
});

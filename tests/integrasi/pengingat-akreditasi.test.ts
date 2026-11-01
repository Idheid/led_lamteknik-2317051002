import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { ingatkanTimProdi, kirimPengingatAkreditasi, statusPeriodeProdi } from "@/modules/bersama/data/pengingat-akreditasi";
import { buatProyek } from "@/modules/led/data/proyek";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** L2 (2 Nov 2026): pengingat akreditasi berakhir 18/12/6 bulan, sekali per ambang. */

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

const prodi = (nama: string, kode: string, sampai: string) =>
  siapkanProdi(admin, { nama, jenjang: "S1", kodePddikti: kode, akreditasiBerlakuSampai: sampai, identitas: {} }, `tim.${kode}@uji.test`);

const lonceng = (userId: string) => prisma.pemberitahuan.findMany({ where: { userId, pesan: { contains: "Mulai LED periode berikutnya" } }, orderBy: { createdAt: "asc" } });

test("L2: pengingat dikirim ke Tim Prodi dan Admin, sekali per ambang, hanya bila belum ada LED periode berikutnya", async () => {
  const a = await prodi("Teknik Ambang", "80001", "2027-11-20"); // 12 bulan lagi
  const b = await prodi("Teknik Jauh", "80002", "2028-12-01"); // > 18 bulan
  const c = await prodi("Teknik Sudah Mulai", "80003", "2027-11-20");
  await buatProyek(c.tim, { tahunPengajuan: 2027 }); // LED periode berikutnya sudah dibuat
  const d = await prodi("Teknik Lama", "80004", "2027-05-01"); // 6 bulan lagi, LED aktif masih periode lalu
  const lama = await buatProyek(d.tim, { tahunPengajuan: 2022 });
  await prisma.proyekLED.update({ where: { id: lama.id }, data: { createdAt: new Date("2021-06-01T00:00:00.000Z") } });

  const status = new Map((await statusPeriodeProdi(HARI)).map((s) => [s.prodiId, s]));
  assert.deepEqual([a, b, c, d].map((x) => [status.get(x.prodi.id)?.ambang, status.get(x.prodi.id)?.perluLedBaru]),
    [[12, true], [null, false], [12, false], [6, true]]);

  assert.equal(await kirimPengingatAkreditasi(HARI), 2);
  const pa = await lonceng(a.tim.id);
  assert.equal(pa.length, 1);
  assert.equal(pa[0].pesan, "Akreditasi Sarjana Teknik Ambang berakhir 20 Nov 2027 (11 bulan lagi). Mulai LED periode berikutnya.");
  assert.equal(pa[0].tautan, "/led");
  assert.equal((await lonceng(d.tim.id)).length, 1);
  assert.equal((await lonceng(b.tim.id)).length + (await lonceng(c.tim.id)).length, 0);
  const pAdmin = await lonceng(admin.id);
  assert.equal(pAdmin.length, 2);
  assert.ok(pAdmin.every((x) => x.tautan === "/led/pantau"));

  // hari berikutnya: tidak dikirim lagi untuk ambang yang sama
  assert.equal(await kirimPengingatAkreditasi(new Date("2026-11-26T00:00:00.000Z")), 0);
  assert.equal((await lonceng(a.tim.id)).length, 1);
  // ambang 6 bulan untuk prodi A tercapai → satu pengingat lagi
  assert.equal(await kirimPengingatAkreditasi(new Date("2027-05-20T00:00:00.000Z")), 1);
  assert.equal((await lonceng(a.tim.id)).length, 2);
  assert.deepEqual((await prisma.pengingatTerkirim.findMany({ where: { prodiId: a.prodi.id }, orderBy: { ambang: "desc" } })).map((x) => x.ambang), [12, 6]);
});

test("L2: Ingatkan Tim Prodi dari Pantau LED (hanya Admin UPPS)", async () => {
  const e = await prodi("Teknik Diingatkan", "80005", "2027-08-01");
  await assert.rejects(ingatkanTimProdi(e.tim, e.prodi.id), GalatAkses);
  assert.equal(await ingatkanTimProdi(admin, e.prodi.id, HARI), 1);
  assert.equal((await lonceng(e.tim.id)).length, 1);
  assert.equal(await prisma.logAktivitas.count({ where: { aksi: "ingatkan_tim_prodi", objekId: e.prodi.id } }), 1);
});

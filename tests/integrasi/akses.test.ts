import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna } from "@/lib/akses";
import {
  aturAktifAkun, aturUlangKataSandi, buatAkunPenanggungJawab, daftarUpps, hapusProdi, simpanProdi, simpanUpps,
} from "@/lib/data/organisasi";
import { ambilProyek, bagianProyek, buatProyek, daftarProyek, halamanBagian, simpanJawaban } from "@/lib/data/proyek";
import { bersihkanDb, bisaLogin, buatSuperAdmin, imporSeed, penggunaDari } from "./bantu";

before(async () => {
  await bersihkanDb();
  await imporSeed();
});
after(() => prisma.$disconnect());

test("F-01/F-02/F-07 super admin menyiapkan prodi; penanggung jawab hanya melihat prodinya", async () => {
  const admin = await buatSuperAdmin();
  assert.equal(await bisaLogin("admin@uji.test", "SandiAdmin#123"), true);

  const upps = await simpanUpps(admin, { kode: "FT-UJI", nama: "Fakultas Teknik", perguruanTinggi: "Universitas Uji", alamat: "" });
  await assert.rejects(simpanUpps(admin, { kode: "FT-UJI", nama: "Ganda", perguruanTinggi: "X", alamat: "" }), GalatPengguna);
  const identitas = { skPendirian: "SK 1/2000", peringkatAkreditasi: "Baik Sekali" };
  const ti = await simpanProdi(admin, { uppsId: upps.id, nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "55201", identitas });
  const sipil = await simpanProdi(admin, { uppsId: upps.id, nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "22201", identitas: {} });
  assert.equal((ti.identitas as { skPendirian: string }).skPendirian, "SK 1/2000");

  const akunTi = await buatAkunPenanggungJawab(admin, { prodiId: ti.id, nama: "PJ TI", email: "pj.ti@uji.test", kataSandi: "SandiTI#123" });
  const akunSipil = await buatAkunPenanggungJawab(admin, { prodiId: sipil.id, nama: "PJ Sipil", email: "pj.sipil@uji.test", kataSandi: "SandiSipil#123" });
  // satu akun per prodi
  await assert.rejects(
    buatAkunPenanggungJawab(admin, { prodiId: ti.id, nama: "Lain", email: "lain@uji.test", kataSandi: "SandiLain#123" }),
    GalatPengguna,
  );
  assert.equal(await bisaLogin("pj.ti@uji.test", "SandiTI#123"), true);
  assert.equal(await bisaLogin("pj.ti@uji.test", "salah-sandi"), false);

  const pjTi = await penggunaDari(akunTi.id);
  const pjSipil = await penggunaDari(akunSipil.id);
  assert.equal(pjTi.peran, "PENANGGUNG_JAWAB");
  assert.equal(pjTi.prodiId, ti.id);

  // penanggung jawab tidak bisa memakai fungsi super admin
  await assert.rejects(daftarUpps(pjTi), GalatAkses);
  await assert.rejects(simpanProdi(pjTi, { uppsId: upps.id, nama: "X", jenjang: "S1", kodePddikti: "", identitas: {} }), GalatAkses);

  const versi = await prisma.versiInstrumen.findFirstOrThrow({ where: { aktif: true } });
  const proyekTi = await buatProyek(pjTi, { nama: "LED TI", versiId: versi.id, tsTahunMulai: 2025 });
  const proyekSipil = await buatProyek(pjSipil, { nama: "LED Sipil", versiId: versi.id, tsTahunMulai: 2025 });
  assert.equal(proyekTi.prodiId, ti.id);
  assert.equal(proyekTi.jenjang, "S1");
  assert.deepEqual(proyekTi.anggaran, versi.anggaranBawaan);

  assert.deepEqual((await daftarProyek(pjTi)).map((x) => x.id), [proyekTi.id]);
  await assert.rejects(ambilProyek(pjTi, proyekSipil.id), GalatAkses);
  await assert.rejects(halamanBagian(pjTi, proyekSipil.id, "C.1"), GalatAkses);
  await assert.rejects(simpanJawaban(pjTi, { proyekId: proyekSipil.id, subBagianKode: "C.1-LB", isi: "x" }), GalatAkses);
  // prodi yang punya proyek tidak bisa dihapus
  await assert.rejects(hapusProdi(admin, ti.id), GalatPengguna);
});

test("F-01 menonaktifkan akun menolak login; mengatur ulang kata sandi", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  const pj = await prisma.user.findFirstOrThrow({ where: { email: "pj.sipil@uji.test" } });
  await aturAktifAkun(admin, pj.id, false);
  assert.equal(await bisaLogin("pj.sipil@uji.test", "SandiSipil#123"), false);
  await aturAktifAkun(admin, pj.id, true);
  assert.equal(await bisaLogin("pj.sipil@uji.test", "SandiSipil#123"), true);

  await aturUlangKataSandi(admin, { userId: pj.id, kataSandi: "SandiBaru#456" });
  assert.equal(await bisaLogin("pj.sipil@uji.test", "SandiSipil#123"), false);
  assert.equal(await bisaLogin("pj.sipil@uji.test", "SandiBaru#456"), true);
  assert.ok((await prisma.logAktivitas.count({ where: { objekId: pj.id } })) >= 3);
  await assert.rejects(aturAktifAkun(admin, admin.id, false), GalatPengguna);
});

test("F-07/UI sidebar C.1–C.7 sesuai versi; C.3 Sarjana = 19 IKU + 4 bersama; jawaban form tersimpan", async () => {
  const pj = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "pj.ti@uji.test" } })).id);
  const [proyek] = await daftarProyek(pj);
  const { bagian } = await bagianProyek(pj, proyek.id);
  assert.deepEqual(
    bagian.filter((b) => b.jenis === "kriteria").map((b) => b.kode),
    ["C.1", "C.2", "C.3", "C.4", "C.5", "C.6", "C.7"],
  );
  const h = await halamanBagian(pj, proyek.id, "C.3");
  assert.ok(h);
  const sub = h.bagian.subBagian;
  assert.equal(sub.filter((s) => s.tipe === "iku").length, 19);
  assert.equal(sub.filter((s) => s.tipe === "bersama").length, 4);
  assert.equal(sub.length, 23);
  for (const kode of ["C.3-IKU-a.06", "C.3-IKU-a.07", "C.3-IKU-a.08", "C.3-IKU-b.03"]) {
    assert.ok(!sub.some((s) => s.kode === kode), `${kode} tidak boleh tampil untuk Sarjana`);
  }
  // setiap sub-bagian IKU Sarjana punya butirnya
  assert.ok(sub.filter((s) => s.tipe === "iku").every((s) => s.butir.length >= 1));

  await simpanJawaban(pj, { proyekId: proyek.id, subBagianKode: "C.3-LB", isi: "Jawaban uji" });
  const lagi = await halamanBagian(pj, proyek.id, "C.3");
  assert.equal(lagi?.jawaban["C.3-LB"], "Jawaban uji");
});

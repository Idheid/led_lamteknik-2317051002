import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna } from "@/modules/bersama/akses";
import {
  ambilFakultas, aturAktifAkun, aturUlangKataSandi, buatAkunPenanggungJawab, daftarAkun, daftarProdi, hapusProdi,
  simpanFakultas, simpanProdi,
} from "@/modules/bersama/data/organisasi";
import {
  ambilProyek, aturArsipProyek, bagianProyek, buatProyek, daftarProyek, halamanBagian, simpanJawaban,
} from "@/modules/led/data/proyek";
import { daftarVersi } from "@/modules/led/data/instrumen";
import { daftarKunci } from "@/modules/bersama/data/kunci-api";
import { bersihkanDb, bisaLogin, buatSuperAdmin, imporSeed, penggunaDari } from "./bantu";

before(async () => {
  await bersihkanDb();
  await imporSeed();
});
after(() => prisma.$disconnect());

test("Revisi 19 Okt tahap 1: admin hanya Akun PJ dan Kunci API; PJ fakultas mengelola semua prodi", async () => {
  const admin = await buatSuperAdmin();
  assert.equal(await bisaLogin("admin@uji.test", "SandiAdmin#123"), true);
  const akun = await buatAkunPenanggungJawab(admin, { nama: "PJ Fakultas", email: "pj@uji.test", kataSandi: "SandiPJ#1234" });
  const pj = await penggunaDari(akun.id);
  assert.equal(pj.peran, "PENANGGUNG_JAWAB");
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: akun.id } })).wajibGantiSandi, true);
  // akun PJ kedua (pengganti) boleh dibuat; tidak ada aturan satu akun per prodi lagi
  await buatAkunPenanggungJawab(admin, { nama: "PJ Pengganti", email: "pj2@uji.test", kataSandi: "SandiPJ#1234" });

  // admin tidak bisa membuka pekerjaan penyusunan
  await assert.rejects(simpanFakultas(admin, { nama: "FT", perguruanTinggi: "U", alamat: "", kota: "" }), GalatAkses);
  await assert.rejects(simpanProdi(admin, { nama: "X", jenjang: "S1", kodePddikti: "", identitas: {} }), GalatAkses);
  await assert.rejects(daftarProdi(admin), GalatAkses);
  await assert.rejects(daftarVersi(admin), GalatAkses);
  await assert.rejects(daftarProyek(admin), GalatAkses);
  // admin tetap mengelola akun dan kunci cadangan; PJ tidak bisa mengelola akun
  assert.ok((await daftarAkun(admin)).length >= 3);
  await daftarKunci(admin);
  await assert.rejects(daftarAkun(pj), GalatAkses);
  await assert.rejects(buatAkunPenanggungJawab(pj, { nama: "X", email: "x@uji.test", kataSandi: "SandiPJ#1234" }), GalatAkses);

  // identitas fakultas (pengganti UPPS) dan prodi dikelola PJ
  await simpanFakultas(pj, { nama: "Fakultas Teknik", perguruanTinggi: "Universitas Uji", alamat: "Jl. Uji 1", kota: "Bandar Lampung" });
  assert.equal((await ambilFakultas())?.nama, "Fakultas Teknik");
  const ti = await simpanProdi(pj, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "55201", akreditasiBerlakuSampai: "2027-03-01", identitas: { skPendirian: "SK 1/2000" } });
  const sipil = await simpanProdi(pj, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "22201", akreditasiBerlakuSampai: "2026-12-01", identitas: {} });
  await simpanProdi(pj, { nama: "Teknik Kimia", jenjang: "S1", kodePddikti: "24201", identitas: {} });
  await assert.rejects(simpanProdi(pj, { nama: "Ganda", jenjang: "S1", kodePddikti: "55201", identitas: {} }), GalatPengguna);
  // diurutkan menurut tanggal akreditasi berakhir (paling dekat di atas, kosong di bawah)
  assert.deepEqual((await daftarProdi(pj)).map((x) => x.nama), ["Teknik Sipil", "Teknik Informatika", "Teknik Kimia"]);

  // PJ membuka LED semua prodi
  const ledTi = await buatProyek(pj, { prodiId: ti.id, nama: "LED TI", tahunPengajuan: 2026 });
  const ledSipil = await buatProyek(pj, { prodiId: sipil.id, nama: "LED Sipil", tahunPengajuan: 2026 });
  assert.equal(ledTi.jenjang, "S1");
  assert.equal(ledTi.tsTahunMulai, 2025, "TS dihitung dari tahun pengajuan (2026 → 2025/2026)");
  const versi = await prisma.versiInstrumen.findFirstOrThrow({ where: { aktif: true } });
  assert.equal(ledTi.versiId, versi.id, "instrumen otomatis = instrumen aktif jenjang prodi");
  assert.equal(versi.jenjangUtama, "S1");
  assert.deepEqual((await daftarProyek(pj)).map((x) => x.id).sort(), [ledTi.id, ledSipil.id].sort());
  await ambilProyek(pj, ledSipil.id);
  await assert.rejects(ambilProyek(admin, ledSipil.id), GalatAkses);
  await assert.rejects(hapusProdi(pj, ti.id), GalatPengguna, "prodi yang punya LED tidak bisa dihapus");
});

test("Revisi 19 Okt tahap 2: satu LED aktif per prodi; LED kedua ditolak sebelum LED lama diarsipkan; instrumen jenjang harus aktif", async () => {
  const pj = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "pj@uji.test" } })).id);
  const ti = await prisma.prodi.findFirstOrThrow({ where: { nama: "Teknik Informatika" } });
  const lama = await prisma.proyekLED.findFirstOrThrow({ where: { prodiId: ti.id } });
  await assert.rejects(buatProyek(pj, { prodiId: ti.id, nama: "LED TI 2031", tahunPengajuan: 2031 }), GalatPengguna);
  await aturArsipProyek(pj, lama.id, true);
  const baru = await buatProyek(pj, { prodiId: ti.id, nama: "LED TI 2031", tahunPengajuan: 2031 });
  assert.equal(baru.tsTahunMulai, 2030);
  // LED lama tidak bisa diaktifkan lagi selama LED baru aktif
  await assert.rejects(aturArsipProyek(pj, lama.id, false), GalatPengguna);

  const d3 = await simpanProdi(pj, { nama: "D3 Teknik Mesin", jenjang: "D3", kodePddikti: "21401", identitas: {} });
  await assert.rejects(buatProyek(pj, { prodiId: d3.id, nama: "LED D3", tahunPengajuan: 2026 }), /Instrumen jenjang Diploma Tiga belum aktif/);
});

test("F-01 menonaktifkan akun menolak login; mengatur ulang kata sandi", async () => {
  const admin = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "admin@uji.test" } })).id);
  const pj = await prisma.user.findFirstOrThrow({ where: { email: "pj2@uji.test" } });
  await aturAktifAkun(admin, pj.id, false);
  assert.equal(await bisaLogin("pj2@uji.test", "SandiPJ#1234"), false);
  await aturAktifAkun(admin, pj.id, true);
  assert.equal(await bisaLogin("pj2@uji.test", "SandiPJ#1234"), true);

  await aturUlangKataSandi(admin, { userId: pj.id, kataSandi: "SandiBaru#456" });
  assert.equal(await bisaLogin("pj2@uji.test", "SandiPJ#1234"), false);
  assert.equal(await bisaLogin("pj2@uji.test", "SandiBaru#456"), true);
  assert.ok((await prisma.logAktivitas.count({ where: { objekId: pj.id } })) >= 3);
  await assert.rejects(aturAktifAkun(admin, admin.id, false), GalatPengguna);
});

test("F-07/UI sidebar C.1–C.7 sesuai versi; C.3 Sarjana = 19 IKU + 4 bersama; jawaban form tersimpan", async () => {
  const pj = await penggunaDari((await prisma.user.findFirstOrThrow({ where: { email: "pj@uji.test" } })).id);
  const proyek = (await daftarProyek(pj)).find((x) => !x.diarsipkanPada)!;
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
  assert.ok(sub.filter((s) => s.tipe === "iku").every((s) => s.butir.length >= 1));

  await simpanJawaban(pj, { proyekId: proyek.id, subBagianKode: "C.3-LB", isi: "Jawaban uji" });
  const lagi = await halamanBagian(pj, proyek.id, "C.3");
  assert.equal(lagi?.jawaban["C.3-LB"], "Jawaban uji");
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import {
  ambilFakultas, ambilProdi, aturAktifAkun, aturUlangKataSandi, buatAkunTimProdi, daftarAkun, daftarProdi, hapusProdi,
  pindahProdiAkun, simpanFakultas, simpanIdentitasProdi, simpanProdi,
} from "@/modules/bersama/data/organisasi";
import {
  ambilProyek, aturArsipProyek, bagianProyek, buatProyek, daftarProyek, halamanBagian, simpanJawaban,
} from "@/modules/led/data/proyek";
import { simpanSuntingan } from "@/modules/led/data/generate";
import { daftarVersi } from "@/modules/led/data/instrumen";
import { daftarKunci, ringkasanKunci } from "@/modules/bersama/data/kunci-api";
import { bersihkanDb, bisaLogin, buatAdmin, buatTimProdi, imporSeed, penggunaDari } from "./bantu";

/**
 * Revisi 31 Okt 2026 (Pak Tris): tiga peran. Admin UPPS mengelola akun, prodi, fakultas, instrumen, kunci API; melihat
 * semua LED hanya baca. Tim Prodi menyusun LED prodinya sendiri (prodi dari akun; satu prodi boleh beberapa akun).
 */

let admin: Pengguna;
let timTi: Pengguna;
let timTi2: Pengguna;
let timSipil: Pengguna;

const dok = (teks: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: teks }] }] });

before(async () => {
  await bersihkanDb();
  await imporSeed();
});
after(() => prisma.$disconnect());

test("Revisi 31 Okt tahap 1: Admin UPPS mengelola fakultas, prodi, dan akun Tim Prodi; Tim Prodi terikat satu prodi", async () => {
  admin = await buatAdmin();
  assert.equal(admin.peran, "ADMIN");
  assert.equal(await bisaLogin("admin@uji.test", "SandiAdmin#123"), true);

  // identitas fakultas dan daftar prodi dikelola Admin UPPS
  await simpanFakultas(admin, { nama: "Fakultas Teknik", perguruanTinggi: "Universitas Uji", alamat: "Jl. Uji 1", kota: "Bandar Lampung" });
  assert.equal((await ambilFakultas())?.nama, "Fakultas Teknik");
  const ti = await simpanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "55201", akreditasiBerlakuSampai: "2027-03-01", identitas: { skPendirian: "SK 1/2000" } });
  const sipil = await simpanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "22201", akreditasiBerlakuSampai: "2026-12-01", identitas: {} });
  const kimia = await simpanProdi(admin, { nama: "Teknik Kimia", jenjang: "S1", kodePddikti: "24201", identitas: {} });
  await assert.rejects(simpanProdi(admin, { nama: "Ganda", jenjang: "S1", kodePddikti: "55201", identitas: {} }), GalatPengguna);
  // diurutkan menurut tanggal akreditasi berakhir (paling dekat di atas, kosong di bawah)
  assert.deepEqual((await daftarProdi(admin)).map((x) => x.nama), ["Teknik Sipil", "Teknik Informatika", "Teknik Kimia"]);

  // akun Tim Prodi wajib punya prodi; satu prodi boleh beberapa akun
  const akun = await buatAkunTimProdi(admin, { nama: "Tim TI", email: "tim.ti@uji.test", kataSandi: "SandiTim#1234", prodiId: ti.id });
  timTi = await penggunaDari(akun.id);
  assert.deepEqual([timTi.peran, timTi.prodiId], ["TIM_PRODI", ti.id]);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: akun.id } })).wajibGantiSandi, true);
  timTi2 = await buatTimProdi(admin, ti.id, "tim.ti2@uji.test", "Tim TI Kedua");
  timSipil = await buatTimProdi(admin, sipil.id, "tim.sipil@uji.test");
  await assert.rejects(buatAkunTimProdi(admin, { nama: "X", email: "x@uji.test", kataSandi: "SandiTim#1234", prodiId: "" }), /Pilih program studi/);
  await assert.rejects(buatAkunTimProdi(admin, { nama: "X", email: "x@uji.test", kataSandi: "SandiTim#1234", prodiId: "tidak-ada" }), GalatPengguna);
  assert.equal((await daftarAkun(admin)).find((a) => a.id === timTi.id)?.prodi?.nama, "Teknik Informatika", "daftar akun memuat prodi");

  // Tim Prodi tidak mengurus akun, prodi, fakultas, instrumen, atau kunci API
  await assert.rejects(daftarAkun(timTi), GalatAkses);
  await assert.rejects(buatAkunTimProdi(timTi, { nama: "X", email: "y@uji.test", kataSandi: "SandiTim#1234", prodiId: ti.id }), GalatAkses);
  await assert.rejects(simpanProdi(timTi, { nama: "X", jenjang: "S1", kodePddikti: "", identitas: {} }), GalatAkses);
  await assert.rejects(simpanFakultas(timTi, { nama: "FT", perguruanTinggi: "U", alamat: "", kota: "" }), GalatAkses);
  await assert.rejects(daftarVersi(timTi), GalatAkses);
  await assert.rejects(daftarKunci(timTi), GalatAkses);
  await daftarKunci(admin, "utama");
  await daftarKunci(admin, "cadangan");
  assert.equal((await ringkasanKunci()).milikFakultas, 0, "Tim Prodi hanya melihat status kunci");

  // Tim Prodi hanya melihat prodinya dan boleh mengubah identitasnya (B4), bukan prodi lain
  assert.deepEqual((await daftarProdi(timTi)).map((x) => x.id), [ti.id]);
  await simpanIdentitasProdi(timTi, ti.id, { skPendirian: "SK 2/2001", kota: "Bandar Lampung" });
  assert.equal(((await ambilProdi(timTi, ti.id))?.identitas as { skPendirian?: string }).skPendirian, "SK 2/2001");
  await assert.rejects(simpanIdentitasProdi(timTi, sipil.id, { kota: "X" }), GalatAkses);
  await assert.rejects(ambilProdi(timTi, sipil.id), GalatAkses);

  // prodi yang punya akun Tim Prodi tidak bisa dihapus sebelum akunnya dipindah
  const timKimia = await buatTimProdi(admin, kimia.id, "tim.kimia@uji.test");
  await assert.rejects(hapusProdi(admin, kimia.id), /1 akun Tim Prodi/);
  await assert.rejects(pindahProdiAkun(admin, admin.id, kimia.id), GalatPengguna, "hanya akun Tim Prodi yang terikat prodi");
  await pindahProdiAkun(admin, timKimia.id, sipil.id);
  assert.equal((await penggunaDari(timKimia.id)).prodiId, sipil.id);
  await hapusProdi(admin, kimia.id);
});

test("Revisi 31 Okt tahap 1: Tim Prodi membuat dan mengubah LED prodinya saja; Admin UPPS membaca semua LED tanpa mengubah", async () => {
  const ti = await prisma.prodi.findFirstOrThrow({ where: { nama: "Teknik Informatika" } });
  const sipil = await prisma.prodi.findFirstOrThrow({ where: { nama: "Teknik Sipil" } });

  // prodi selalu dari akun; Admin UPPS tidak membuat LED
  const ledTi = await buatProyek(timTi, { nama: "LED TI", tahunPengajuan: 2026 });
  assert.equal(ledTi.prodiId, ti.id);
  assert.equal(ledTi.jenjang, "S1");
  assert.equal(ledTi.tsTahunMulai, 2025, "TS dihitung dari tahun pengajuan (2026 → 2025/2026)");
  const versi = await prisma.versiInstrumen.findFirstOrThrow({ where: { aktif: true } });
  assert.equal(ledTi.versiId, versi.id, "instrumen otomatis = instrumen aktif jenjang prodi");
  await assert.rejects(buatProyek(admin, { nama: "LED Admin", tahunPengajuan: 2026 }), GalatAkses);
  // prodiId di masukan diabaikan: Tim Prodi tidak bisa membuat LED untuk prodi lain
  const ledSipil = await buatProyek(timSipil, { nama: "LED Sipil", tahunPengajuan: 2026, prodiId: ti.id } as never);
  assert.equal(ledSipil.prodiId, sipil.id);

  // Tim Prodi A tidak bisa membaca atau mengubah LED prodi B
  assert.deepEqual((await daftarProyek(timTi)).map((x) => x.id), [ledTi.id]);
  await assert.rejects(ambilProyek(timTi, ledSipil.id), GalatAkses);
  await assert.rejects(ambilProyek(timTi, ledSipil.id, { baca: true }), GalatAkses);
  await assert.rejects(bagianProyek(timTi, ledSipil.id), GalatAkses);
  await assert.rejects(simpanJawaban(timTi, { proyekId: ledSipil.id, subBagianKode: "C.1-LB", isi: "x" }), GalatAkses);
  await assert.rejects(simpanSuntingan(timTi, ledSipil.id, "C.1-IKU-a", dok("x")), GalatAkses);
  await assert.rejects(aturArsipProyek(timTi, ledSipil.id, true), GalatAkses);

  // Admin UPPS: semua LED hanya baca
  assert.deepEqual((await daftarProyek(admin)).map((x) => x.id).sort(), [ledTi.id, ledSipil.id].sort());
  await ambilProyek(admin, ledSipil.id, { baca: true });
  await assert.rejects(ambilProyek(admin, ledSipil.id), GalatAkses);
  await assert.rejects(simpanJawaban(admin, { proyekId: ledTi.id, subBagianKode: "C.1-LB", isi: "x" }), GalatAkses);
  await assert.rejects(simpanSuntingan(admin, ledTi.id, "C.1-IKU-a", dok("x")), GalatAkses);
  await assert.rejects(aturArsipProyek(admin, ledTi.id, true), GalatAkses);

  // dua akun Tim Prodi satu prodi sama-sama menyunting; riwayat versi mencatat penyuntingnya
  await simpanSuntingan(timTi, ledTi.id, "C.1-IKU-a", dok("Draf dari anggota tim pertama."));
  await simpanSuntingan(timTi2, ledTi.id, "C.1-IKU-a", dok("Draf diperbaiki anggota tim kedua."));
  const v = await prisma.versiDraf.findMany({ where: { bagianDraf: { proyekId: ledTi.id } }, orderBy: { nomor: "asc" } });
  assert.deepEqual(v.map((x) => x.dibuatOlehId), [timTi.id, timTi2.id]);
  assert.deepEqual((await daftarProyek(timTi2)).map((x) => x.id), [ledTi.id]);

  await assert.rejects(hapusProdi(admin, ti.id), GalatPengguna, "prodi yang punya LED tidak bisa dihapus");
});

test("Revisi 19 Okt tahap 2: satu LED aktif per prodi; LED kedua ditolak sebelum LED lama diarsipkan; instrumen jenjang harus aktif", async () => {
  const lama = await prisma.proyekLED.findFirstOrThrow({ where: { prodiId: timTi.prodiId! } });
  await assert.rejects(buatProyek(timTi, { nama: "LED TI 2031", tahunPengajuan: 2031 }), GalatPengguna);
  await aturArsipProyek(timTi, lama.id, true);
  const baru = await buatProyek(timTi2, { nama: "LED TI 2031", tahunPengajuan: 2031 });
  assert.equal(baru.tsTahunMulai, 2030);
  // LED lama tidak bisa diaktifkan lagi selama LED baru aktif
  await assert.rejects(aturArsipProyek(timTi, lama.id, false), GalatPengguna);

  const d3 = await simpanProdi(admin, { nama: "D3 Teknik Mesin", jenjang: "D3", kodePddikti: "21401", identitas: {} });
  const timD3 = await buatTimProdi(admin, d3.id, "tim.d3@uji.test");
  await assert.rejects(buatProyek(timD3, { nama: "LED D3", tahunPengajuan: 2026 }), /Instrumen jenjang Diploma Tiga belum aktif/);
});

test("F-01 menonaktifkan akun menolak login; mengatur ulang kata sandi", async () => {
  await aturAktifAkun(admin, timTi2.id, false);
  assert.equal(await bisaLogin("tim.ti2@uji.test", "SandiTim#123"), false);
  await aturAktifAkun(admin, timTi2.id, true);
  assert.equal(await bisaLogin("tim.ti2@uji.test", "SandiTim#123"), true);

  await aturUlangKataSandi(admin, { userId: timTi2.id, kataSandi: "SandiBaru#456" });
  assert.equal(await bisaLogin("tim.ti2@uji.test", "SandiTim#123"), false);
  assert.equal(await bisaLogin("tim.ti2@uji.test", "SandiBaru#456"), true);
  assert.ok((await prisma.logAktivitas.count({ where: { objekId: timTi2.id } })) >= 3);
  await assert.rejects(aturAktifAkun(admin, admin.id, false), GalatPengguna);
  await assert.rejects(aturAktifAkun(timTi, timTi2.id, false), GalatAkses);
});

test("F-07/UI sidebar C.1–C.7 sesuai versi; C.3 Sarjana = 19 IKU + 4 bersama; jawaban form tersimpan", async () => {
  const proyek = (await daftarProyek(timTi)).find((x) => !x.diarsipkanPada)!;
  const { bagian } = await bagianProyek(timTi, proyek.id);
  assert.deepEqual(
    bagian.filter((b) => b.jenis === "kriteria").map((b) => b.kode),
    ["C.1", "C.2", "C.3", "C.4", "C.5", "C.6", "C.7"],
  );
  const h = await halamanBagian(timTi, proyek.id, "C.3");
  assert.ok(h);
  const sub = h.bagian.subBagian;
  assert.equal(sub.filter((s) => s.tipe === "iku").length, 19);
  assert.equal(sub.filter((s) => s.tipe === "bersama").length, 4);
  assert.equal(sub.length, 23);
  for (const kode of ["C.3-IKU-a.06", "C.3-IKU-a.07", "C.3-IKU-a.08", "C.3-IKU-b.03"]) {
    assert.ok(!sub.some((s) => s.kode === kode), `${kode} tidak boleh tampil untuk Sarjana`);
  }
  assert.ok(sub.filter((s) => s.tipe === "iku").every((s) => s.butir.length >= 1));

  await simpanJawaban(timTi, { proyekId: proyek.id, subBagianKode: "C.3-LB", isi: "Jawaban uji" });
  const lagi = await halamanBagian(timTi, proyek.id, "C.3");
  assert.equal(lagi?.jawaban["C.3-LB"], "Jawaban uji");
});

test("Perbaikan 1 Nov P5: buatProyek tanpa nama memakai nama otomatis LED {prodi} {tahun} (TS {tahun akademik})", async () => {
  const lama = await prisma.proyekLED.findFirstOrThrow({ where: { prodiId: timSipil.prodiId!, diarsipkanPada: null } });
  await aturArsipProyek(timSipil, lama.id, true);
  const baru = await buatProyek(timSipil, { tahunPengajuan: 2027, tsTahunMulai: 2025 });
  assert.equal(baru.nama, "LED Teknik Sipil 2027 (TS 2025/2026)");
  assert.equal(baru.tsTahunMulai, 2025);
  // nama kosong juga memakai nama otomatis; nama yang diisi tetap dipakai apa adanya
  await aturArsipProyek(timSipil, baru.id, true);
  const kosong = await buatProyek(timSipil, { nama: "  ", tahunPengajuan: 2028 });
  assert.equal(kosong.nama, "LED Teknik Sipil 2028 (TS 2027/2028)");
  await aturArsipProyek(timSipil, kosong.id, true);
  const bernama = await buatProyek(timSipil, { nama: "LED Sipil Akreditasi Ulang", tahunPengajuan: 2028 });
  assert.equal(bernama.nama, "LED Sipil Akreditasi Ulang");
});

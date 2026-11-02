import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { daftarProdi, simpanProdi } from "@/modules/bersama/data/organisasi";
import { buatProyek } from "@/modules/led/data/proyek";
import { unggahLkps } from "@/modules/led/data/lkps";
import { simpanTimPenyusun } from "@/modules/led/data/ekspor";
import { kesiapanLed, kesiapanSemua, simpanJadwal } from "@/modules/led/data/kesiapan";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { susunKonteks } from "@/modules/led/proses/generate";
import { tambahBulan, tanggalIso } from "@/modules/led/domain/kesiapan";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Revisi 22 Okt 2026 tahap 2: deadline, kesiapan, persentase LKPS, jadwal kerja mundur. */

let admin: Pengguna;
let pj: Pengguna;
const hariIni = new Date();
const bulanLagi = (n: number) => tanggalIso(tambahBulan(new Date(Date.UTC(hariIni.getUTCFullYear(), hariIni.getUTCMonth(), 15)), n));

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
});
after(() => prisma.$disconnect());

test("Prodi paling dekat berakhir tampil paling atas; kesiapan, tanda warna, dan tonggak yang terlewat", async () => {
  const { prodi: jauh, tim: timSipil } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "1", identitas: {}, akreditasiBerlakuSampai: bulanLagi(20) });
  const { prodi: dekat, tim } = await siapkanProdi(admin, { nama: "Teknik Elektro", jenjang: "S1", kodePddikti: "2", identitas: {}, akreditasiBerlakuSampai: bulanLagi(5) });
  pj = tim;
  const tanpaLed = await simpanProdi(admin, { nama: "Teknik Kimia", jenjang: "S1", kodePddikti: "3", identitas: {}, akreditasiBerlakuSampai: bulanLagi(10) });
  assert.deepEqual((await daftarProdi(admin)).map((x) => x.id), [dekat.id, tanpaLed.id, jauh.id], "urut menurut akreditasi berakhir");
  assert.deepEqual((await daftarProdi(pj)).map((x) => x.id), [dekat.id], "Tim Prodi hanya melihat prodinya");

  const ledDekat = await buatProyek(pj, { nama: "LED Elektro", tahunPengajuan: 2026 });
  const ledJauh = await buatProyek(timSipil, { nama: "LED Sipil", tahunPengajuan: 2026 });
  // usulan awal batas pengajuan: 6 bulan sebelum akreditasi berakhir (prodi dekat: sudah lewat sebulan)
  assert.equal(tanggalIso(ledDekat.batasPengajuan!), bulanLagi(-1));

  const k = await kesiapanLed(ledDekat.id);
  assert.equal(k.warna, "merah", "sisa ≤ 6 bulan dan belum layak");
  assert.equal(k.review, "draf");
  assert.equal(k.lkpsPersen, null, "LKPS belum diunggah");
  assert.equal(k.sub.draf, 0);
  assert.ok(k.sub.total > 90, `sub-bagian berlaku untuk S1: ${k.sub.total}`);
  assert.ok(k.tonggak.every((t) => t.status === "terlewat"), "semua tonggak sudah lewat tanggal dan belum tercapai");
  assert.equal((await kesiapanLed(ledJauh.id)).warna, null);
  assert.equal((await kesiapanSemua(admin, [ledDekat.id, ledJauh.id])).size, 2, "Admin UPPS memantau semua LED");
  assert.deepEqual([...(await kesiapanSemua(pj, [ledDekat.id, ledJauh.id])).keys()], [ledDekat.id], "Tim Prodi hanya LED prodinya");

  // LKPS contoh: persentase terisi dihitung dari kolom wajib
  const b = await unggahLkps(pj, ledDekat.id, { nama: "lkps.xlsx", isi: readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")) });
  await prosesBerkasLkps(b.id);
  const persen = (await kesiapanLed(ledDekat.id)).lkpsPersen!;
  assert.ok(persen > 50 && persen <= 100, `LKPS terisi ${persen}%`);
});

test("Jadwal kerja: PJ mengubah batas pengajuan dan tonggak; Bab II.A memakai jadwal dan susunan tim tanpa nama", async () => {
  const led = await prisma.proyekLED.findFirstOrThrow({ where: { nama: "LED Elektro" } });
  const batas = bulanLagi(4);
  await assert.rejects(simpanJadwal(pj, led.id, { batasPengajuan: batas, jadwal: { kriteria: bulanLagi(6) } }), GalatPengguna, "tonggak melewati batas");
  await assert.rejects(simpanJadwal(admin, led.id, { batasPengajuan: batas, jadwal: {} }), GalatAkses);
  await simpanJadwal(pj, led.id, { batasPengajuan: batas, jadwal: { kriteria: bulanLagi(3) } });
  const k = await kesiapanLed(led.id);
  assert.equal(k.batasPengajuan, batas);
  const kriteria = k.tonggak.find((t) => t.kode === "kriteria")!;
  assert.deepEqual([kriteria.tanggal, kriteria.diubah], [bulanLagi(3), true]);
  assert.equal(k.tonggak.find((t) => t.kode === "ekspor")?.tanggal, batas);
  assert.ok(k.tonggak.every((t) => t.status === "mendatang"));

  await simpanTimPenyusun(pj, led.id, {
    dosen: [
      { nama: "Dr. Ani Lestari", nomorInduk: "0012345678", jabatan: "Ketua Tim", tugas: "Koordinator penyusunan" },
      { nama: "Budi Santoso", nomorInduk: "0023456789", jabatan: "Anggota", tugas: "Kriteria C.1–C.3" },
      { nama: "Citra Dewi", nomorInduk: "0034567890", jabatan: "Anggota", tugas: "Kriteria C.4–C.7" },
    ],
    tendik: [{ nama: "Dedi", nomorInduk: "198501012010121001", jabatan: "Tendik", tugas: "Administrasi data" }],
  });
  const { konteks, legenda } = await susunKonteks(led.id, "II.A-1");
  const tim = konteks.metrik.find((m) => m.id === "M-TIM")!;
  const jadwal = konteks.metrik.find((m) => m.id === "M-JADWAL")!;
  assert.match(tim.keterangan ?? "", /Anggota \(2 orang\): Kriteria C\.1–C\.3; Kriteria C\.4–C\.7/);
  assert.ok(!/Ani|Budi|Citra|Dedi|0012345678|198501012010121001/.test(JSON.stringify(konteks.metrik)), "nama dan nomor induk tidak dikirim ke LLM");
  assert.match(jadwal.keterangan ?? "", /Draf C\.1 sampai C\.7 selesai/);
  assert.ok(legenda["M-JADWAL"] && legenda["M-TIM"]);
  // sub-bagian lain tidak memuat jadwal
  assert.ok(!(await susunKonteks(led.id, "C.1-LB")).konteks.metrik.some((m) => m.id === "M-JADWAL"));
});

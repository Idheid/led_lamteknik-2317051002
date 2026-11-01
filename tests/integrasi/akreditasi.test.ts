import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { simpanProdi } from "@/modules/bersama/data/organisasi";
import { riwayatAkreditasiProdi } from "@/modules/bersama/data/akreditasi";
import { buatProyek } from "@/modules/led/data/proyek";
import {
  bacaSkAi, bacaSkPola, catatHasilAkreditasi, konfirmasiHasilAkreditasi, statusHasilAkreditasi, tolakHasilAkreditasi,
} from "@/modules/led/data/akreditasi";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** L1 (2 Nov 2026): catat hasil akreditasi dan riwayat akreditasi prodi. */

const LLM_SEBELUM = process.env.LLM_NARASI;
let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
});

after(async () => {
  if (LLM_SEBELUM === undefined) delete process.env.LLM_NARASI;
  else process.env.LLM_NARASI = LLM_SEBELUM;
  await prisma.$disconnect();
});

async function prodiDenganLed(nama: string, kode: string) {
  const { prodi, tim } = await siapkanProdi(admin, {
    nama, jenjang: "S1", kodePddikti: kode, akreditasiBerlakuSampai: "2026-12-31",
    identitas: { peringkatAkreditasi: "Baik Sekali", nomorSkAkreditasi: "1/SK/BAN-PT/2021" },
  }, `tim.${kode}@uji.test`);
  const led = await buatProyek(tim, { tahunPengajuan: 2026 });
  return { prodi, tim, led };
}

const HASIL = { peringkat: "Terakreditasi Unggul", nomorSk: "0123/SK/LAM-TEKNIK/AK/VIII/2026", tanggalSk: "2026-08-18", berlakuMulai: "2026-08-20", berlakuSampai: "2031-08-19" };

test("L1: data prodi menjadi riwayat awal; koreksi manual wajib beralasan", async () => {
  const { prodi } = await prodiDenganLed("Teknik Awal", "90001");
  let r = await riwayatAkreditasiProdi(admin, prodi.id);
  assert.deepEqual(r.map((x) => [x.jenis, x.status, x.peringkat]), [["awal", "berlaku", "Baik Sekali"]]);
  const masukan = {
    nama: prodi.nama, jenjang: "S1" as const, kodePddikti: "90001", akreditasiBerlakuSampai: "2027-03-31",
    identitas: { peringkatAkreditasi: "Baik Sekali", nomorSkAkreditasi: "1/SK/BAN-PT/2021" },
  };
  await assert.rejects(simpanProdi(admin, masukan, prodi.id), /Isi alasan koreksi/);
  await simpanProdi(admin, { ...masukan, alasanKoreksi: "Tanggal di SK salah ketik saat input awal." }, prodi.id);
  r = await riwayatAkreditasiProdi(admin, prodi.id);
  assert.deepEqual(r.map((x) => x.jenis), ["koreksi", "awal"]);
  assert.equal(r[0].alasan, "Tanggal di SK salah ketik saat input awal.");
  const baru = await prisma.prodi.findUniqueOrThrow({ where: { id: prodi.id } });
  assert.equal(baru.akreditasiBerlakuSampai?.toISOString().slice(0, 10), "2027-03-31");
  // mengubah data non-akreditasi tidak membuat riwayat dan tidak meminta alasan
  await simpanProdi(admin, { ...masukan, identitas: { ...masukan.identitas, kota: "Bandar Lampung" } }, prodi.id);
  assert.equal((await riwayatAkreditasiProdi(admin, prodi.id)).length, 2);
});

test("L1: Tim Prodi mencatat → menunggu; Admin mengonfirmasi → data prodi dari riwayat, LED diarsipkan berlabel", async () => {
  const { prodi, tim, led } = await prodiDenganLed("Teknik Konfirmasi", "90002");
  const { tim: timLain } = await prodiDenganLed("Teknik Lain", "90003");
  // LED masih draf: belum boleh dicatat
  await assert.rejects(catatHasilAkreditasi(tim, { prodiId: prodi.id, proyekId: led.id, ...HASIL }), /belum Layak diajukan/);
  const layak = await prisma.proyekLED.update({ where: { id: led.id }, data: { statusReview: "layak" } });
  assert.equal((await statusHasilAkreditasi(tim, layak)).boleh, true);
  await assert.rejects(catatHasilAkreditasi(timLain, { prodiId: prodi.id, proyekId: led.id, ...HASIL }), GalatAkses, "Tim Prodi prodi lain ditolak");
  await assert.rejects(statusHasilAkreditasi(timLain, layak), GalatAkses);
  await assert.rejects(catatHasilAkreditasi(tim, { prodiId: prodi.id, ...HASIL }), /dari LED yang diajukan/);

  const r = await catatHasilAkreditasi(tim, { prodiId: prodi.id, proyekId: led.id, ...HASIL });
  assert.equal(r.status, "menunggu");
  let p = await prisma.prodi.findUniqueOrThrow({ where: { id: prodi.id } });
  assert.equal(p.akreditasiBerlakuSampai?.toISOString().slice(0, 10), "2026-12-31", "belum berubah sebelum dikonfirmasi");
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: led.id } })).diarsipkanPada, null);
  assert.ok(await prisma.pemberitahuan.findFirst({ where: { userId: admin.id, tautan: `/pengaturan/prodi/${prodi.id}` } }), "Admin diberi tahu");
  await assert.rejects(catatHasilAkreditasi(tim, { prodiId: prodi.id, proyekId: led.id, ...HASIL }), /menunggu konfirmasi/);
  await assert.rejects(konfirmasiHasilAkreditasi(tim, r.id), GalatAkses);

  await konfirmasiHasilAkreditasi(admin, r.id);
  p = await prisma.prodi.findUniqueOrThrow({ where: { id: prodi.id } });
  assert.equal(p.akreditasiBerlakuSampai?.toISOString().slice(0, 10), "2031-08-19");
  const ident = p.identitas as Record<string, string>;
  assert.equal(ident.peringkatAkreditasi, "Terakreditasi Unggul");
  assert.equal(ident.nomorSkAkreditasi, HASIL.nomorSk);
  const arsip = await prisma.proyekLED.findUniqueOrThrow({ where: { id: led.id } });
  assert.ok(arsip.diarsipkanPada);
  assert.equal(arsip.labelArsip, "Diajukan 2026 · Terakreditasi Unggul");
  assert.ok(await prisma.pemberitahuan.findFirst({ where: { userId: tim.id, pesan: { contains: "dikonfirmasi" } } }));
  const riwayat = await riwayatAkreditasiProdi(tim, prodi.id);
  assert.deepEqual(riwayat.map((x) => [x.jenis, x.status]), [["hasil", "berlaku"], ["awal", "berlaku"]]);
  assert.equal(riwayat[0].proyekId, led.id);
});

test("L1: Admin mencatat langsung berlaku; tolak; kegagalan di tengah tidak mengarsipkan LED", async () => {
  const { prodi, tim, led } = await prodiDenganLed("Teknik Admin", "90004");
  await prisma.proyekLED.update({ where: { id: led.id }, data: { statusReview: "layak" } });
  // usulan Tim Prodi ditolak dengan alasan
  const usul = await catatHasilAkreditasi(tim, { prodiId: prodi.id, proyekId: led.id, ...HASIL, berlakuSampai: "2031-01-01" });
  await assert.rejects(tolakHasilAkreditasi(admin, usul.id, ""), /alasan/);
  await tolakHasilAkreditasi(admin, usul.id, "Tanggal berlaku tidak sesuai SK.");
  assert.equal((await prisma.riwayatAkreditasi.findUniqueOrThrow({ where: { id: usul.id } })).status, "ditolak");

  // penyusunan masih berjalan: catatan Admin gagal seluruhnya
  await prisma.tugasGenerate.create({ data: { proyekId: led.id, judul: "Uji", subBagianKode: [], status: "berjalan" } });
  const sebelum = await prisma.riwayatAkreditasi.count({ where: { prodiId: prodi.id } });
  await assert.rejects(catatHasilAkreditasi(admin, { prodiId: prodi.id, proyekId: led.id, ...HASIL }), GalatPengguna);
  assert.equal(await prisma.riwayatAkreditasi.count({ where: { prodiId: prodi.id } }), sebelum, "tidak ada riwayat tercatat");
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: led.id } })).diarsipkanPada, null, "LED tidak terlanjur diarsipkan");
  await prisma.tugasGenerate.deleteMany({ where: { proyekId: led.id } });

  const r = await catatHasilAkreditasi(admin, { prodiId: prodi.id, proyekId: led.id, ...HASIL });
  assert.equal(r.status, "berlaku");
  assert.equal(r.dikonfirmasiOlehId, admin.id);
  assert.equal((await prisma.prodi.findUniqueOrThrow({ where: { id: prodi.id } })).akreditasiBerlakuSampai?.toISOString().slice(0, 10), "2031-08-19");
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: led.id } })).labelArsip, "Diajukan 2026 · Terakreditasi Unggul");
  assert.ok(await prisma.pemberitahuan.findFirst({ where: { userId: tim.id, pesan: { contains: "Hasil akreditasi" } } }), "Tim Prodi diberi tahu");
  // Admin juga bisa mencatat SK tanpa LED (SK dari luar sistem)
  const tanpa = await catatHasilAkreditasi(admin, { prodiId: prodi.id, ...HASIL, berlakuSampai: "2032-01-01" });
  assert.equal(tanpa.proyekId, null);
});

async function pdfSk(teks: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const hal = doc.addPage([595, 842]);
  teks.forEach((t, i) => hal.drawText(t, { x: 40, y: 780 - i * 18, size: 10, font }));
  return Buffer.from(await doc.save());
}

test("L1: bantuan isi dari PDF SK tanpa AI, dan Baca dengan AI (mode uji) hanya mengisi usulan", async () => {
  const sk = await pdfSk([
    "KEPUTUSAN LAM TEKNIK",
    "Nomor: 0456/SK/LAM-TEKNIK/AK/IX/2026",
    "Menetapkan Program Sarjana Teknik Contoh dengan peringkat Terakreditasi.",
    "Akreditasi berlaku sejak tanggal 1 September 2026 sampai dengan tanggal 31 Agustus 2031.",
    "Ditetapkan di Jakarta pada tanggal 29 Agustus 2026",
  ]);
  const harap = { berlakuSampai: "2031-08-31", berlakuMulai: "2026-09-01", tanggalSk: "2026-08-29", nomorSk: "0456/SK/LAM-TEKNIK/AK/IX/2026", peringkat: "Terakreditasi" };
  assert.deepEqual(await bacaSkPola(admin, sk), harap);
  await assert.rejects(bacaSkPola(admin, Buffer.from("bukan pdf")), /PDF/);
  process.env.LLM_NARASI = "uji";
  const log = await prisma.logPemakaian.count({ where: { subBagianKode: "baca-sk-akreditasi" } });
  assert.deepEqual(await bacaSkAi(admin, sk), harap);
  assert.equal(await prisma.logPemakaian.count({ where: { subBagianKode: "baca-sk-akreditasi" } }), log + 1, "dicatat di LogPemakaian");
  assert.equal(await prisma.riwayatAkreditasi.count({ where: { nomorSk: harap.nomorSk } }), 0, "membaca SK tidak menyimpan apa pun");
});

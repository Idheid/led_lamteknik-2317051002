import "./siapan";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { lkpsAktif, unggahLkps } from "@/modules/led/data/lkps";
import { nilaiButirProyek } from "@/modules/led/data/nilai-butir";
import { bacaLkpsPdf, petaHalamanTabelPdf } from "@/modules/led/data-lkps/baca-pdf";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/**
 * Revisi 31 Okt 2026 tahap 8: LKPS dicetak PDF per tabel lalu diunggah sekaligus. Fikstur PDF utuh dipecah menjadi
 * satu PDF per tabel (pdf-lib); hasil gabungannya harus sama dengan membaca PDF utuh.
 */

const PDF = readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.pdf"));
const XLSX = readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx"));

let timA: Pengguna;
let timB: Pengguna;
let ledA: string;
let ledB: string;

async function pecahPerTabel(): Promise<{ sheet: string; isi: Buffer }[]> {
  const sumber = await PDFDocument.load(PDF);
  const hasil: { sheet: string; isi: Buffer }[] = [];
  for (const t of await petaHalamanTabelPdf(PDF)) {
    const doc = await PDFDocument.create();
    const halaman = await doc.copyPages(sumber, Array.from({ length: t.akhir - t.awal + 1 }, (_, i) => t.awal - 1 + i));
    for (const h of halaman) doc.addPage(h);
    hasil.push({ sheet: t.sheet, isi: Buffer.from(await doc.save()) });
  }
  return hasil;
}

async function unggahDanBaca(tim: Pengguna, proyekId: string, nama: string, isi: Buffer) {
  const b = await unggahLkps(tim, proyekId, { nama, isi });
  await prosesBerkasLkps(b.id);
  await new Promise((r) => setTimeout(r, 5)); // waktu unggah berurutan: berkas berikutnya selalu lebih baru
  return b;
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: timA } = await siapkanProdi(admin, { nama: "Teknik PDF Tabel", jenjang: "S1", kodePddikti: "55501", identitas: {} }));
  ({ tim: timB } = await siapkanProdi(admin, { nama: "Teknik PDF Utuh", jenjang: "S1", kodePddikti: "55502", identitas: {} }));
  ledA = (await buatProyek(timA, { nama: "LED PDF per tabel", tahunPengajuan: 2026 })).id;
  ledB = (await buatProyek(timB, { nama: "LED PDF utuh", tahunPengajuan: 2026 })).id;
});
after(() => prisma.$disconnect());

test("Revisi 31 Okt tahap 8: banyak PDF per tabel digabung dan hasilnya sama dengan membaca PDF utuh", async () => {
  const utuh = await bacaLkpsPdf(PDF, "S1");
  assert.ok(utuh.tabel.length > 20, `PDF utuh terbaca ${utuh.tabel.length} tabel`);
  const potong = await pecahPerTabel();
  assert.ok(potong.length >= utuh.tabel.length, "satu PDF per tabel");
  for (const x of potong) await unggahDanBaca(timA, ledA, `tabel-${x.sheet}.pdf`, x.isi);
  await unggahDanBaca(timB, ledB, "lkps-utuh.pdf", PDF);

  const a = (await lkpsAktif(timA, ledA))!;
  assert.ok(a.sumber.length > 1, "semua PDF per tabel menjadi sumber data");
  assert.deepEqual(a.tabel.map((t) => t.sheet).sort(), utuh.tabel.map((t) => t.sheet).sort());
  // nomorBaris PDF = nomor urut baris dalam berkas yang dibaca, jadi yang dibandingkan isi selnya
  const sel = (baris: { sel: unknown }[] | undefined) => baris?.map((b) => b.sel);
  for (const t of utuh.tabel) {
    assert.deepEqual(sel(a.tabel.find((x) => x.sheet === t.sheet)?.baris), sel(t.baris), `isi tabel ${t.kode} sama`);
  }
  // metrik butir angka sama dengan LED yang memakai PDF utuh
  const skor = async (tim: Pengguna, led: string) => (await nilaiButirProyek(tim, led)).daftar.map((n) => [n.butir, n.hasil?.skor ?? null]);
  assert.deepEqual(await skor(timA, ledA), await skor(timB, ledB));
});

test("Revisi 31 Okt tahap 8: tabel yang sama dari berkas lebih baru menang; Excel lengkap menggantikan semua sumber", async () => {
  const potong = await pecahPerTabel();
  const t4a = potong.find((x) => x.sheet === "4a")!;
  const sebelum = (await lkpsAktif(timA, ledA))!;
  const lama4a = sebelum.tabel.find((t) => t.sheet === "4a")!;
  const baru = await unggahDanBaca(timA, ledA, "tabel-4a-revisi.pdf", t4a.isi);
  const sesudah = (await lkpsAktif(timA, ledA))!;
  const tabel4a = await prisma.tabelLKPS.findFirstOrThrow({ where: { berkasId: baru.id, sheet: "4a" } });
  assert.equal(sesudah.tabel.find((t) => t.sheet === "4a")?.id, tabel4a.id, "tabel 4.a dari berkas terbaru");
  assert.notEqual(lama4a.id, tabel4a.id);
  assert.equal(sesudah.tabel.length, sebelum.tabel.length, "tabel lain tetap ada");

  await unggahDanBaca(timA, ledA, "lkps.xlsx", XLSX);
  const excel = (await lkpsAktif(timA, ledA))!;
  assert.deepEqual(excel.sumber.map((s) => s.jenis), ["xlsx"], "Excel lengkap menggantikan semua PDF");
  // PDF per tabel sesudah Excel: digabung dengan Excel
  await unggahDanBaca(timA, ledA, "tabel-4a-lagi.pdf", t4a.isi);
  const campur = (await lkpsAktif(timA, ledA))!;
  assert.deepEqual(campur.sumber.map((s) => s.jenis), ["pdf", "xlsx"]);
  assert.equal(campur.tabel.find((t) => t.sheet === "4a")?.perluDicek, true, "4.a dari PDF terbaru (perlu dicek)");
  assert.equal(campur.tabel.find((t) => t.sheet === "1")?.perluDicek, false, "tabel lain tetap dari Excel");
});

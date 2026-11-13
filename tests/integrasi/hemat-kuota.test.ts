import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Document, Packer, Paragraph } from "docx";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { hitunganEmbeddingUji } from "@/modules/bersama/llm/embedding";
import { buatProyek } from "@/modules/led/data/proyek";
import { teksOcrDokumen, unggahDokumen } from "@/modules/led/data/dokumen";
import { unggahLkps } from "@/modules/led/data/lkps";
import { perkiraanSusun } from "@/modules/led/data/perkiraan-susun";
import { prosesDokumen, PESAN_PAKAI_ULANG } from "@/modules/led/proses/dokumen";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesSiapkanKueri } from "@/modules/led/proses/siapkan-kueri";
import { prosesPeriksaBagian } from "@/modules/led/proses/periksa-bagian";
import {
  buatCacheKonteks, generateGabungan, generateSubBagian, rencanaSusun, sidikJari, susunKonteks, urutanSubBagian,
} from "@/modules/led/proses/generate";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Rencana 10 Nov T9: hemat kuota dan cepat (vektor kueri di muka, pakai ulang dokumen, cache konteks, sidik jari, perkiraan, gabung). */

process.env.GENERATE_JEDA_MAKS_MS = "0";
let admin: Pengguna;
let tim: Pengguna;
let timLain: Pengguna;
let proyekId: string;
let proyekLainId: string;
let berkasBukti: Buffer;
const panggilan: string[] = [];

async function docx(teks: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: teks.map((t) => new Paragraph(t)) }] })));
}

const TEKS_BUKTI = [
  "Laporan mutu program studi mencatat tata pamong, kerja sama, kurikulum, dan sumber daya yang dikelola secara terencana.",
  "Rapat tinjauan manajemen dilaksanakan setiap tahun dan hasilnya ditindaklanjuti oleh unit penjaminan mutu.",
];

function jawab(sistem: string, pengguna: string): string {
  if (sistem.startsWith("Anda pemeriksa fakta")) {
    panggilan.push("periksa");
    return JSON.stringify({ kalimat: [...pengguna.matchAll(/^(\d+)\. /gm)].map((m) => ({ nomor: Number(m[1]), label: "sesuai", alasan: "Sesuai bukti." })) });
  }
  if (sistem.includes("MODE GABUNG")) {
    panggilan.push("gabung");
    const kode = [...pengguna.matchAll(/^# SUB-BAGIAN \d+ \(kode ([^)]+)\)/gm)].map((m) => m[1]);
    return JSON.stringify({
      subBagian: kode.map((k) => ({
        kode: k,
        // kutipan dari D1 sah hanya bila D1 sub-bagian itu memuat teksnya
        bukti: [{ id: "B1", sumber: "D1", kutipan: "Rapat tinjauan manajemen dilaksanakan setiap tahun" }],
        paragraf: [{ teks: `Rapat tinjauan manajemen dilaksanakan setiap tahun (${k}).`, sumber: ["D1"], bukti: ["B1"] }],
        unsur: [],
        dokumenKurang: [],
      })),
    });
  }
  panggilan.push("narasi");
  const d = /\[(D\d+)\] \([^)]*\)\n([^\n]{12,})/.exec(pengguna);
  return JSON.stringify({
    bukti: d ? [{ id: "B1", sumber: d[1], kutipan: d[2].slice(0, 100) }] : [],
    paragraf: [{ teks: "Program studi menjalankan tata kelola mutu secara terencana.", sumber: d ? [d[1]] : [], bukti: d ? ["B1"] : [] }],
    unsur: [],
    dokumenKurang: [],
  });
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  ({ tim: timLain } = await siapkanProdi(admin, { nama: "Teknik Elektro", jenjang: "S1", kodePddikti: "2", identitas: {} }, "tim.elektro@uji.test"));
  proyekId = (await buatProyek(tim, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  proyekLainId = (await buatProyek(timLain, { nama: "LED TE 2026", tahunPengajuan: 2026 })).id;
  const b = await unggahLkps(tim, proyekId, { nama: "lkps.xlsx", isi: readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")) });
  await prosesBerkasLkps(b.id);
  // berkas yang sama persis (docx menyimpan waktu pembuatan, jadi dibuat sekali)
  berkasBukti = await docx(TEKS_BUKTI);
  const d = await unggahDokumen(tim, proyekId, { nama: "laporan-mutu.docx", isi: berkasBukti });
  await prosesDokumen(d.id);
  await tambahKunci(admin, { label: "Kunci", kunci: "AIzaSyKunciUjiHemat0000000000000000000001" });
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => {
      const sistem = opsi.prompt.filter((m) => m.role === "system").map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
      const pengguna = opsi.prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .map((c) => ("text" in c ? c.text : "")).join("\n");
      return {
        content: [{ type: "text", text: jawab(sistem, pengguna) }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
        warnings: [],
      };
    },
  }));
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("vektor kueri disiapkan di muka: generate sesudahnya tidak memanggil embedding kueri", async () => {
  const r = await prosesSiapkanKueri(proyekId);
  assert.ok(r.kueri > 50 && r.baru > 0);
  assert.equal(r.permintaan, Math.ceil(r.baru / 100), "batch 100 kueri per permintaan");
  assert.equal((await prosesSiapkanKueri(proyekId)).baru, 0, "kueri yang sudah ada dilewati");
  const awal = hitunganEmbeddingUji.kueri;
  await generateSubBagian(proyekId, "C.1-IKU-a");
  assert.equal(hitunganEmbeddingUji.kueri, awal, "0 embedding kueri saat generate");
});

test("konteks dengan cache per tugas identik dengan tanpa cache (C.1 dan C.4)", async () => {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const cache = buatCacheKonteks();
  for (const bagian of ["C.1", "C.4"]) {
    for (const kode of (await urutanSubBagian(proyek, bagian)).slice(0, 3)) {
      const tanpa = await susunKonteks(proyekId, kode);
      const dengan = await susunKonteks(proyekId, kode, cache);
      assert.deepEqual(dengan, tanpa, kode);
    }
  }
  assert.ok(cache.has("lkps") && cache.has("nilai") && cache.has("capaian") && cache.has("anggaran"));
});

test("sidik jari sama → Susun melewati sub-bagian tanpa memanggil AI; perkiraan cocok dengan panggilan tiruan", async () => {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const rencana = (await rencanaSusun(proyek)).filter((b) => ["C.1", "C.2"].includes(b.kode));
  const p = await perkiraanSusun(tim, proyekId);
  assert.equal(p.jumlah.kirim + p.jumlah.dilewati + p.jumlah.tanpaAi, (await rencanaSusun(proyek)).reduce((a, b) => a + b.sub.length, 0));
  assert.match(p.reset, /T(07|08):00:00/, "reset tengah malam waktu Pasifik");
  const diharapkan = p.bagian.filter((b) => ["C.1", "C.2"].includes(b.kode));
  assert.equal(diharapkan.reduce((a, b) => a + b.dilewati, 0), 1, "C.1-IKU-a sudah di-generate di uji pertama");

  panggilan.length = 0;
  const cache = buatCacheKonteks();
  for (const b of rencana) {
    for (const kode of b.sub) await generateSubBagian(proyekId, kode, { lewatiBilaSama: true, cache });
    await prosesPeriksaBagian(proyekId, b.kode, { segera: true });
  }
  assert.equal(panggilan.filter((x) => x === "narasi").length, diharapkan.reduce((a, b) => a + b.kirim, 0), "narasi = perkiraan dikirim ke AI");
  assert.equal(panggilan.filter((x) => x === "periksa").length, diharapkan.filter((b) => b.kirim > 0).length,
    "satu pemeriksaan per bagian (tiruan: semua sesuai, tanpa perbaikan) = batas bawah perkiraan");

  // putaran kedua: tidak ada yang berubah → semua dilewati, 0 panggilan
  panggilan.length = 0;
  for (const b of rencana) for (const kode of b.sub) assert.equal(await generateSubBagian(proyekId, kode, { lewatiBilaSama: true }), null, kode);
  assert.deepEqual(panggilan, []);
  const lagi = await perkiraanSusun(tim, proyekId);
  for (const b of lagi.bagian.filter((x) => ["C.1", "C.2"].includes(x.kode))) assert.equal(b.kirim + b.tanpaAi, 0, b.kode);

  // generate biasa (bukan Susun) tetap memanggil AI walau sama: "generate ulang paksa"
  const kodeAi = rencana[0].sub[0];
  await generateSubBagian(proyekId, kodeAi);
  assert.equal(panggilan.length, 1);
});

test("berkas sama di LED lain: potongan dan vektor disalin tanpa embedding; judul beda → hanya embeddingKonteks", async () => {
  const isi = berkasBukti;
  const awal = hitunganEmbeddingUji.dokumen;
  const salin = await unggahDokumen(timLain, proyekLainId, { nama: "laporan-mutu.docx", isi });
  await prosesDokumen(salin.id);
  const d = await prisma.dokumen.findUniqueOrThrow({ where: { id: salin.id } });
  assert.equal(d.status, "siap");
  assert.equal(d.pesan, PESAN_PAKAI_ULANG);
  assert.ok(d.dokumenSumberPakaiUlangId);
  assert.equal(hitunganEmbeddingUji.dokumen, awal, "kepala sama (nama berkas sama) → 0 embedding");
  const [a, b] = await Promise.all([d.dokumenSumberPakaiUlangId!, d.id].map((id) => prisma.$queryRaw<{ teks: string; v: string; k: string }[]>`
    SELECT "teks", "embedding"::text AS v, "embeddingKonteks"::text AS k FROM "Potongan" WHERE "dokumenId" = ${id} ORDER BY "urutan"`));
  assert.deepEqual(b, a);

  // judul lain → kepala berbeda → satu permintaan embedding untuk embeddingKonteks saja
  const lain = await unggahDokumen(timLain, proyekLainId, { nama: "salinan-laporan.docx", isi });
  await prisma.dokumen.update({ where: { id: lain.id }, data: { judul: "Laporan Mutu Fakultas" } });
  await prosesDokumen(lain.id);
  assert.equal(hitunganEmbeddingUji.dokumen, awal + 1);
  const dl = await prisma.dokumen.findUniqueOrThrow({ where: { id: lain.id } });
  assert.equal(dl.pesan, PESAN_PAKAI_ULANG);

  // Tim Prodi lain tidak bisa membuka dokumen sumber milik prodi pertama
  await assert.rejects(teksOcrDokumen(timLain, d.dokumenSumberPakaiUlangId!));

  // versi pemrosesan berbeda (misalnya aturan potong berubah) → diproses penuh
  await prisma.dokumen.updateMany({ where: { hash: d.hash }, data: { versiPemrosesan: "potong:lama" } });
  const ulang = await unggahDokumen(timLain, proyekLainId, { nama: "laporan-mutu-2.docx", isi });
  const sebelum = hitunganEmbeddingUji.dokumen;
  await prosesDokumen(ulang.id);
  const du = await prisma.dokumen.findUniqueOrThrow({ where: { id: ulang.id } });
  assert.equal(du.pesan, null);
  assert.equal(du.dokumenSumberPakaiUlangId, null);
  assert.ok(hitunganEmbeddingUji.dokumen > sebelum);
});

test("mode gabung: satu panggilan untuk beberapa sub-bagian, versi per sub-bagian berlabel gabung", async () => {
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const kode = (await urutanSubBagian(proyek, "C.2")).filter((k) => !/-IKU-|-(AF|SWOT)$/.test(k)).slice(0, 2);
  assert.equal(kode.length, 2);
  const model = "x";
  const daftar = await Promise.all(kode.map(async (x) => {
    const k = await susunKonteks(proyekId, x);
    return { k, sidik: sidikJari(k, model) };
  }));
  panggilan.length = 0;
  const v = await generateGabungan(proyekId, daftar);
  assert.deepEqual(panggilan, ["gabung"]);
  assert.equal(v.length, 2);
  for (const x of v) assert.equal(x!.modeGenerate, "gabung");
  const log = await prisma.logPemakaian.findFirstOrThrow({ where: { proyekId, subBagianKode: `gabung:${kode.join("+")}` } });
  assert.equal(log.berhasil, true);
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { buatProyek } from "@/modules/led/data/proyek";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { drafBagian, simpanSuntingan } from "@/modules/led/data/generate";
import { periksaEkspor } from "@/modules/led/data/ekspor";
import { konfirmasiKalimat } from "@/modules/led/data/verifikasi";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { generateSubBagian, urutanSubBagian } from "@/modules/led/proses/generate";
import { prosesPeriksaBagian } from "@/modules/led/proses/periksa-bagian";
import type { PemeriksaanT8 } from "@/modules/led/domain/periksa-bagian";
import { bacaDokumen } from "@/modules/led/domain/narasi";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/**
 * Rencana 10 Nov T8: pemeriksaan AI otomatis per bagian (satu panggilan untuk semua sub-bagian), perbaikan terarah
 * maksimal sekali, gerbang ekspor final, lencana status, dan antrean yang tidak mengulang versi yang sudah diperiksa.
 */

process.env.GENERATE_JEDA_MAKS_MS = "0";
const ASLI = "Visi program studi ditinjau setiap lima tahun bersama pemangku kepentingan dan alumni.";
let tim: Pengguna;
let proyekId: string;
let bagianKode: string;
let sub: string[];
const panggilan: string[] = [];

/** AI tiruan: narasi (B1 sah, B2 rekaan), pemeriksa (kalimat "rektor" tidak didukung), penyunting (tetap menyebut rektor). */
function jawab(sistem: string, pengguna: string): string {
  if (sistem.startsWith("Anda pemeriksa fakta")) {
    panggilan.push("periksa");
    const kalimat = [...pengguna.matchAll(/^(\d+)\. \([^)]*\) (.+)$/gm)].map((m) => ({
      nomor: Number(m[1]),
      label: /rektor/i.test(m[2]) ? "tidak_didukung" : "sesuai",
      alasan: /rektor/i.test(m[2]) ? "Penetapan oleh rektor tidak ada di bukti." : "Sesuai kutipan.",
    }));
    return JSON.stringify({ kalimat });
  }
  if (sistem.startsWith("Anda penyunting")) {
    panggilan.push("perbaikan");
    const n = [...pengguna.matchAll(/^## PARAGRAF (\d+)/gm)].map((m) => Number(m[1]));
    // sub-bagian pertama diperbaiki dengan benar; sub-bagian kedua tetap memuat klaim tanpa bukti
    return JSON.stringify({ paragraf: n.map((nomor) => nomor === 1
      ? { nomor, teks: "Visi program studi ditinjau setiap lima tahun.", bukti: ["B1"] }
      : { nomor, teks: "Visi ditetapkan rektor bersama senat.", bukti: ["B9"] }) });
  }
  panggilan.push("narasi");
  return JSON.stringify({
    bukti: [
      { id: "B1", sumber: "D1", kutipan: "Visi program studi ditinjau setiap lima tahun" },
      { id: "B2", sumber: "D1", kutipan: "Visi ditetapkan oleh rektor setiap tahun." },
    ],
    paragraf: [
      { teks: "Visi program studi ditinjau setiap lima tahun bersama pemangku kepentingan.", sumber: ["D1"], bukti: ["B1"] },
      { teks: "Visi ditetapkan oleh rektor setiap tahun.", sumber: ["D1"], bukti: ["B2"] },
    ],
    unsur: [],
    dokumenKurang: [],
  });
}

async function versiAktif(kode: string) {
  const bd = await prisma.bagianDraf.findFirstOrThrow({ where: { proyekId, subBagian: { kode } } });
  return prisma.versiDraf.findUniqueOrThrow({ where: { id: bd.versiAktifId! } });
}

const jumlahLog = (awalan: string) => prisma.logPemakaian.count({ where: { proyekId, subBagianKode: `${awalan}:${bagianKode}` } });

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  const proyek = await buatProyek(tim, { nama: "LED TI 2026", tahunPengajuan: 2026 });
  proyekId = proyek.id;
  const d = await unggahDokumen(tim, proyekId, { nama: "renstra.docx", isi: Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph(ASLI)] }] }))) });
  await prosesDokumen(d.id);
  await tambahKunci(admin, { label: "Kunci", kunci: "AIzaSyKunciUjiPeriksa000000000000000001" });
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
  const s = await prisma.subBagian.findFirstOrThrow({ where: { kode: "C.1-IKU-a" }, include: { bagian: true } });
  bagianKode = s.bagian.kode;
  sub = (await urutanSubBagian(proyek, bagianKode)).filter((k) => /-IKU-/.test(k)).slice(0, 2);
  assert.equal(sub.length, 2);
  for (const k of sub) await generateSubBagian(proyekId, k);
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("setelah generate: lencana sedang diperiksa, kutipan rekaan sudah menahan ekspor (Langkah 1), debounce menunda", async () => {
  const draf = await drafBagian(tim, proyekId, bagianKode);
  const a = draf[sub[0]].aktif!;
  assert.equal(a.pemeriksaan?.statusAi, "antre");
  assert.ok(!a.pemeriksaan?.kalimatAi);
  assert.deepEqual(a.pemeriksaan?.menahan, ["Visi ditetapkan oleh rektor setiap tahun."]);
  const r = await prosesPeriksaBagian(proyekId, bagianKode);
  assert.equal(r.status, "ditunda", "generate kurang dari 60 detik lalu");
  assert.equal(await jumlahLog("periksa"), 0);
});

test("satu panggilan pemeriksaan untuk semua sub-bagian, satu perbaikan, satu pemeriksaan ulang kalimat yang berubah", async () => {
  panggilan.length = 0;
  const r = await prosesPeriksaBagian(proyekId, bagianKode, { segera: true });
  assert.equal(r.status, "selesai");
  assert.equal(r.versi, 2);
  assert.equal(r.diperbaiki, 2);
  assert.deepEqual(panggilan, ["periksa", "perbaikan", "periksa"]);
  assert.equal(await jumlahLog("periksa"), 1);
  assert.equal(await jumlahLog("perbaikan"), 1);
  assert.equal(await jumlahLog("periksa-ulang"), 1);

  const v1 = await versiAktif(sub[0]);
  const p1 = v1.pemeriksaan as unknown as PemeriksaanT8;
  assert.equal(v1.asal, "perbaikan");
  assert.equal(p1.statusAi, "selesai");
  assert.deepEqual(p1.tahan, [], "sub-bagian pertama lolos setelah perbaikan");
  assert.ok(!JSON.stringify(bacaDokumen(v1.isi)).includes("rektor"));
  const asal = await prisma.versiDraf.findUniqueOrThrow({ where: { id: p1.perbaikan!.dariVersiId } });
  assert.equal((asal.pemeriksaan as unknown as PemeriksaanT8).diperbaiki, true);
  assert.equal(asal.asal, "generate");

  const p2 = (await versiAktif(sub[1])).pemeriksaan as unknown as PemeriksaanT8;
  assert.equal(p2.tahan!.length, 1, "kalimat yang tetap tidak didukung ditandai, tidak ada putaran kedua");
  assert.match(p2.kalimatAi!.hasil.find((k) => /rektor/.test(k.teks))!.alasan, /rektor/);
});

test("antrean tidak mengulang versi yang sudah diperiksa; perbaikan tidak terjadi dua kali", async () => {
  panggilan.length = 0;
  const r = await prosesPeriksaBagian(proyekId, bagianKode, { segera: true });
  assert.equal(r.status, "tidak-ada");
  assert.deepEqual(panggilan, []);
  assert.equal(await prisma.versiDraf.count({ where: { asal: "perbaikan", bagianDraf: { proyekId } } }), 2);
});

test("gerbang ekspor final: kalimat tidak didukung menahan sampai dikonfirmasi; suntingan membawa konfirmasi", async () => {
  const pesan = /kalimat tidak didukung bukti/;
  assert.ok((await periksaEkspor(tim, proyekId, "final")).galat.some((g) => pesan.test(g)));
  assert.ok(!(await periksaEkspor(tim, proyekId, "draf")).galat.some((g) => pesan.test(g)), "ekspor DRAF tetap bisa");
  const draf = await drafBagian(tim, proyekId, bagianKode);
  const kalimat = draf[sub[1]].aktif!.pemeriksaan!.menahan[0];
  assert.match(kalimat, /rektor/);
  await assert.rejects(konfirmasiKalimat(tim, proyekId, sub[1], kalimat, "pendek"), /alasan/);
  await konfirmasiKalimat(tim, proyekId, sub[1], kalimat, "SK rektor tentang visi diunggah menyusul minggu depan.");
  assert.ok(!(await periksaEkspor(tim, proyekId, "final")).galat.some((g) => pesan.test(g)));
  // suntingan kalimat lain: konfirmasi ikut; kalimat itu tetap tidak menahan
  const v = await versiAktif(sub[1]);
  const doc = bacaDokumen(v.isi);
  doc.content.push({ type: "paragraph", attrs: { sumber: "D1" }, content: [{ type: "text", text: "Kalimat tambahan dari penyusun." }] });
  await simpanSuntingan(tim, proyekId, sub[1], doc);
  const s = (await versiAktif(sub[1])).pemeriksaan as unknown as PemeriksaanT8;
  assert.equal(s.konfirmasi!.length, 1);
  assert.equal(s.tahan!.length, 1);
  assert.ok(!(await periksaEkspor(tim, proyekId, "final")).galat.some((g) => pesan.test(g)));
});

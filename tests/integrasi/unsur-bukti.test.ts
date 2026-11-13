import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { hitunganEmbeddingUji } from "@/modules/bersama/llm/embedding";
import { buatProyek } from "@/modules/led/data/proyek";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { cariPotongan, kueriSubBagian } from "@/modules/led/data/pencarian";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { generateSubBagian, MODEL_TANPA_AI } from "@/modules/led/proses/generate";
import type { JejakPencarian } from "@/modules/led/domain/konfigurasi-pencarian";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Rencana 10 Nov T6: konfigurasi C-unsur, pra-cek bukti (tanpa AI), dan vektor kueri tersimpan. */

process.env.GENERATE_JEDA_MAKS_MS = "0";
const SUB = "C.1-IKU-a";
const BAIK = JSON.stringify({ paragraf: [{ teks: "Visi ditinjau setiap lima tahun.", sumber: ["D1"] }], unsur: [], dokumenKurang: [] });
let panggilanLlm = 0;
let pj: Pengguna;
let pjKosong: Pengguna;
let proyekId: string;
let proyekKosong: string;

async function docx(paragraf: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] })));
}

async function versiTerakhir(proyek: string) {
  return prisma.versiDraf.findFirstOrThrow({ where: { bagianDraf: { proyekId: proyek, subBagian: { kode: SUB } } }, orderBy: { nomor: "desc" } });
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  ({ tim: pjKosong } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "2", identitas: {} }));
  proyekId = (await buatProyek(pj, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  proyekKosong = (await buatProyek(pjKosong, { nama: "LED Sipil 2026", tahunPengajuan: 2026 })).id;
  for (const [nama, isi] of [
    ["renstra.docx", ["Visi program studi ditinjau setiap lima tahun bersama pemangku kepentingan dan alumni.", "Misi dan tujuan dijabarkan dalam rencana strategis beserta indikator kinerja dan target tahunan."]],
    ["notulen.docx", ["Rapat tinjauan visi misi dihadiri dosen, mahasiswa, alumni, dan pengguna lulusan.", "Strategi pencapaian sasaran dipantau setiap semester oleh gugus kendali mutu."]],
  ] as const) {
    const d = await unggahDokumen(pj, proyekId, { nama, isi: await docx([...isi]) });
    await prosesDokumen(d.id);
  }
  await tambahKunci(admin, { label: "Kunci", kunci: "AIzaSyKunciUjiUnsurBukti0000000000000001" });
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async () => {
      panggilanLlm++;
      return {
        content: [{ type: "text", text: BAIK }],
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

test("sub-bagian tanpa bukti sama sekali (tanpa dokumen, J, M, T): AI tidak dipanggil, draf tanpa AI berpenanda per unsur", async () => {
  const sebelum = panggilanLlm;
  await generateSubBagian(proyekKosong, SUB);
  assert.equal(panggilanLlm, sebelum, "LLM tidak dipanggil");
  const v = await versiTerakhir(proyekKosong);
  assert.equal(v.model, MODEL_TANPA_AI);
  const unsur = v.unsur as { status: string; unsur: string }[];
  assert.ok(unsur.length > 0 && unsur.every((u) => u.status === "belum_ada_bukti"));
  const teks = JSON.stringify(v.isi);
  for (const u of unsur) assert.ok(teks.includes(`[BELUM ADA BUKTI: ${u.unsur.slice(0, 20)}`), u.unsur);
});

test("C-unsur: kueri umum + per unsur, setiap unsur mendapat potongan, paling banyak 3 per dokumen", async () => {
  const sebelum = panggilanLlm;
  await generateSubBagian(proyekId, SUB);
  assert.equal(panggilanLlm, sebelum + 1, "ada bukti: AI dipanggil sekali");
  const v = await versiTerakhir(proyekId);
  const j = v.pencarian as unknown as JejakPencarian;
  assert.equal(j.konfigurasi, "C-unsur");
  assert.equal(j.k, 10);
  assert.ok(j.kueri.length >= 2, "kueri umum + per unsur");
  const masuk = j.kandidat.filter((c) => c.masukKonteks);
  const unsurDipakai = new Set(masuk.map((c) => c.unsur).filter(Boolean));
  assert.equal(unsurDipakai.size, Math.min(j.kueri.length - 1, masuk.length), "setiap unsur berkandidat punya potongan");
  const perDokumen = new Map<string, number>();
  for (const c of masuk) perDokumen.set(c.dokumenId, (perDokumen.get(c.dokumenId) ?? 0) + 1);
  assert.ok([...perDokumen.values()].every((n) => n <= 3));
});

test("vektor kueri tersimpan: generate kedua tidak membuat embedding kueri", async () => {
  const awal = await prisma.embeddingKueri.count();
  assert.ok(awal > 0);
  hitunganEmbeddingUji.kueri = 0;
  await generateSubBagian(proyekId, SUB);
  assert.equal(hitunganEmbeddingUji.kueri, 0, "embedKueri tidak dipanggil");
  assert.equal(await prisma.embeddingKueri.count(), awal);
});

test("konfigurasi A dan B tetap memakai satu kueri gabungan (kueriGenerate)", async () => {
  const kueri = await kueriSubBagian(pj, proyekId, SUB);
  for (const konfigurasi of ["A-lama", "B-bm25"] as const) {
    const r = await cariPotongan(pj, proyekId, kueri, { subBagianKode: SUB, konfigurasi });
    assert.deepEqual(r.jejak.kueri, [kueri]);
    assert.equal(r.jejak.k, 8);
  }
});

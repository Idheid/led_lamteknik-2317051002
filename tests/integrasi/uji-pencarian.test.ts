import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { Document, Packer, Paragraph } from "docx";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { buatProyek } from "@/modules/led/data/proyek";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { generateSubBagian } from "@/modules/led/proses/generate";
import { eksporDataUjiPencarian, KEPALA_CSV_UJI } from "@/modules/led/data/uji-pencarian";
import { bacaCsvObjek } from "@/modules/led/domain/csv";
import { hitungRetrieval, labelDariCsv, peringkatDariCsv } from "@/modules/led/domain/metrik-retrieval";
import { konfigurasiBawaan, type JejakPencarian } from "@/modules/led/domain/konfigurasi-pencarian";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Rencana 10 Nov T2: jejak pencarian di versi draf, ekspor data uji pencarian, dan batas aksesnya. */

process.env.GENERATE_JEDA_MAKS_MS = "0";
const SUB = "C.1-IKU-a";
const BAIK = JSON.stringify({ paragraf: [{ teks: "Visi ditinjau setiap lima tahun.", sumber: ["J"] }], unsur: [], dokumenKurang: [] });
let panggilanLlm = 0;

let admin: Pengguna;
let pj: Pengguna;
let pjSipil: Pengguna;
let proyekId: string;

async function docx(paragraf: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] })));
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  ({ tim: pjSipil } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "2", identitas: {} }));
  proyekId = (await buatProyek(pj, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  for (const [nama, isi] of [
    ["renstra.docx", ["Visi program studi ditinjau setiap lima tahun bersama pemangku kepentingan.", "Misi dan tujuan dijabarkan dalam rencana strategis."]],
    ["notulen.docx", ["Rapat tinjauan visi misi dihadiri dosen dan alumni.", "Strategi pencapaian sasaran disepakati dalam rapat."]],
  ] as const) {
    const d = await unggahDokumen(pj, proyekId, { nama, isi: await docx([...isi]) });
    await prosesDokumen(d.id);
  }
  await tambahKunci(admin, { label: "Kunci", kunci: "AIzaSyKunciUjiPencarian00000000000000001" });
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
  await generateSubBagian(proyekId, SUB);
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("versi draf menyimpan jejak pencarian: konfigurasi, kueri, k, kandidat dan peringkat per jalur", async () => {
  const v = await prisma.versiDraf.findFirstOrThrow({ where: { bagianDraf: { proyekId, subBagian: { kode: SUB } } }, orderBy: { nomor: "desc" } });
  const j = v.pencarian as unknown as JejakPencarian;
  assert.equal(j.konfigurasi, konfigurasiBawaan(process.env.PENCARIAN_KONFIGURASI), "konfigurasi bawaan (B-bm25 setelah T5)");
  assert.equal(j.kueri.length, 1);
  assert.ok(j.kueri[0].length > 10);
  assert.equal(j.k, 8);
  assert.ok(j.kandidat.length > 0);
  const masuk = j.kandidat.filter((c) => c.masukKonteks);
  assert.ok(masuk.length > 0 && masuk.length <= 8);
  assert.deepEqual(j.kandidat.map((c) => c.peringkatGabungan), j.kandidat.map((_, i) => i + 1));
  for (const c of j.kandidat) assert.ok(c.peringkatVektor !== null || c.peringkatKataKunci !== null);
  // potongan yang masuk konteks sama dengan sumber dokumen D1, D2, ... di legenda versi
  const legendaD = Object.keys((v.sumber ?? {}) as Record<string, string>).filter((x) => /^D\d+$/.test(x));
  assert.equal(legendaD.length, masuk.length);
});

test("ekspor CSV data uji: pool per sub-bagian, kolom label kosong, masuk konteks dari jejak, tanpa panggilan LLM", async () => {
  const sebelum = panggilanLlm;
  const h = await eksporDataUjiPencarian(pj, proyekId);
  // SIMPAN_CSV_UJI=<jalur.csv> menyimpan contoh ekspor untuk diperiksa manual
  if (process.env.SIMPAN_CSV_UJI) writeFileSync(process.env.SIMPAN_CSV_UJI, h.csv);
  assert.equal(panggilanLlm, sebelum, "ekspor tidak memanggil LLM narasi");
  assert.equal(h.jumlahSubBagian, 1);
  assert.match(h.namaBerkas, /^data-uji-pencarian-LED-TI-2026\.csv$/);
  const baris = bacaCsvObjek(h.csv);
  assert.deepEqual(Object.keys(baris[0]), KEPALA_CSV_UJI);
  assert.equal(baris.length, h.jumlahBaris);
  assert.ok(baris.every((b) => b.sub_bagian === SUB && b.relevan === "" && b.catatan === "" && b.led_id === proyekId));
  assert.ok(baris.every((b) => b.cuplikan.length <= 300));
  assert.equal(new Set(baris.map((b) => b.potongan_id)).size, baris.length, "tanpa duplikat");
  const v = await prisma.versiDraf.findFirstOrThrow({ where: { bagianDraf: { proyekId, subBagian: { kode: SUB } } }, orderBy: { nomor: "desc" } });
  const masuk = new Set((v.pencarian as unknown as JejakPencarian).kandidat.filter((c) => c.masukKonteks).map((c) => c.potonganId));
  assert.deepEqual(new Set(baris.filter((b) => b.masuk_konteks === "1").map((b) => b.potongan_id)), masuk);
  for (const b of baris) {
    const p = JSON.parse(b.peringkat_per_konfigurasi);
    assert.ok("A-lama" in p && "B-bm25" in p, "peringkat setiap konfigurasi aktif");
  }

  // label buatan uji (di dunia nyata diisi manusia) → skrip hitung membaca CSV yang sama
  const berlabel = baris.map((b, i) => ({ ...b, relevan: i === 0 ? "1" : "0" }));
  const hasil = hitungRetrieval(labelDariCsv(berlabel), peringkatDariCsv(berlabel, ["A-lama"]), [1, 8]);
  assert.equal(hasil.perSubBagian.length, 1);
  assert.equal(hasil.rata["A-lama"]["8"].recall, 1, "satu-satunya potongan relevan ada di peringkat teratas pool");
});

test("akses: Tim Prodi hanya LED prodinya, Admin UPPS satu LED atau semua LED, reviewer ditolak", async () => {
  await assert.rejects(eksporDataUjiPencarian(pjSipil, proyekId), GalatAkses);
  await assert.rejects(eksporDataUjiPencarian(pj, null), GalatAkses, "semua LED hanya untuk Admin UPPS");
  const reviewer = { ...pj, peran: "ASESOR" as const, prodiId: null };
  await assert.rejects(eksporDataUjiPencarian(reviewer, proyekId), GalatAkses);
  assert.ok((await eksporDataUjiPencarian(admin, proyekId)).jumlahBaris > 0);
  const semua = await eksporDataUjiPencarian(admin, null);
  assert.equal(semua.namaBerkas, "data-uji-pencarian-semua-LED.csv");
  assert.ok(bacaCsvObjek(semua.csv).some((b) => b.led_id === proyekId));
});

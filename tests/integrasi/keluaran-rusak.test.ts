import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/lib/db";
import { tambahKunci } from "@/lib/data/kunci-api";
import { simpanPengaturan } from "@/lib/data/pengaturan";
import { aturModelUji } from "@/lib/llm/narasi";
import { panggilNarasi } from "@/lib/proses/llm-narasi";
import { bersihkanDb, buatSuperAdmin, imporSeed, siapkanPj } from "./bantu";

/**
 * Revisi 23 Okt 2026: "No object generated: could not parse the response". Jawaban yang dibungkus pagar kode
 * diperbaiki; jawaban rusak diulang sekali lalu pindah ke model cadangan; bila semua model rusak, pesan jelas.
 */

process.env.GENERATE_JEDA_MAKS_MS = "0";

const BAIK = JSON.stringify({ paragraf: [{ teks: "Visi ditinjau setiap lima tahun.", sumber: ["J"] }], unsur: [], dokumenKurang: [] });
/** jawaban per model: "pagar" (```json … ```), "rusak" (terpotong), "baik" */
let mode: Record<string, "pagar" | "rusak" | "baik"> = {};
const panggilan: string[] = [];

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatSuperAdmin();
  const pj = await siapkanPj(admin);
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: ["gemini-2.5-flash"], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false });
  await tambahKunci(pj, { label: "Kunci", kunci: "AIzaSyKunciKeluaranRusak0000000000000001" });
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async () => {
      panggilan.push(kode);
      const m = mode[kode] ?? "baik";
      const text = m === "pagar" ? `\`\`\`json\n${BAIK}\n\`\`\`` : m === "rusak" ? BAIK.slice(0, 40) : BAIK;
      return {
        content: [{ type: "text", text }],
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

const panggil = () => panggilNarasi({ prodiId: null, proyekId: null, subBagianKode: "C.1-IKU-a", sistem: "s", pengguna: "p" });

test("Jawaban berpagar kode diperbaiki tanpa mengulang panggilan", async () => {
  mode = { "gemini-3-flash-preview": "pagar" };
  panggilan.length = 0;
  const r = await panggil();
  assert.equal(r.keluaran.paragraf[0].teks, "Visi ditinjau setiap lima tahun.");
  assert.deepEqual(panggilan, ["gemini-3-flash-preview"]);
});

test("Jawaban rusak: diulang sekali, lalu model cadangan; tercatat keluaran_rusak", async () => {
  mode = { "gemini-3-flash-preview": "rusak", "gemini-2.5-flash": "baik" };
  panggilan.length = 0;
  const r = await panggil();
  assert.equal(r.model, "gemini-2.5-flash");
  assert.deepEqual(panggilan, ["gemini-3-flash-preview", "gemini-3-flash-preview", "gemini-2.5-flash"]);
  const log = await prisma.logPemakaian.findFirst({ where: { berhasil: false }, orderBy: { createdAt: "desc" } });
  assert.match(log!.galat!, /^keluaran_rusak: jawaban tidak terbaca \(finishReason stop, 40 karakter/);
});

test("Semua model rusak: pesan jelas untuk PJ, kunci tidak ditandai habis", async () => {
  mode = { "gemini-3-flash-preview": "rusak", "gemini-2.5-flash": "rusak" };
  await assert.rejects(panggil(), /dua kali mengirim jawaban yang tidak terbaca/);
  const k = await prisma.kunciAPI.findFirstOrThrow();
  assert.equal(k.status, "aktif");
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { tambahKunci } from "@/lib/data/kunci-api";
import { ambilPengaturan, muatDaftarModel, simpanPengaturan, ujiModel } from "@/lib/data/pengaturan";
import { aturModelUji } from "@/lib/llm/narasi";
import { bersihkanDb, buatSuperAdmin, imporSeed } from "./bantu";

const DAFTAR = {
  models: [
    { name: "models/gemini-2.5-flash", displayName: "Gemini 2.5 Flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview", supportedGenerationMethods: ["generateContent"], inputTokenLimit: 1048576 },
    { name: "models/gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash-Lite", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-embedding-001", displayName: "Gemini Embedding 001", supportedGenerationMethods: ["embedContent"] },
  ],
};

let admin: Pengguna;
const fetchAsli = globalThis.fetch;
const permintaan: { url: string; kunci: string | null }[] = [];

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes("generativelanguage.googleapis.com/v1beta/models?")) return fetchAsli(input, init);
    permintaan.push({ url, kunci: new Headers(init?.headers).get("x-goog-api-key") });
    return new Response(JSON.stringify(DAFTAR), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async () => ({
      content: [{ type: "text", text: "siap" }],
      finishReason: { unified: "stop", raw: "STOP" },
      usage: { inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
      warnings: [],
    }),
  }));
});

after(async () => {
  globalThis.fetch = fetchAsli;
  aturModelUji(null);
  await prisma.$disconnect();
});

test("Model LLM: daftar model dimuat dari models.list; model 2.5 diganti 3.x; pilihan divalidasi; uji model", async () => {
  await prisma.pengaturanLLM.upsert({
    where: { id: "utama" },
    create: { id: "utama", modelNarasi: "gemini-2.5-flash", modelCadangan: [], modelEmbedding: "gemini-embedding-001" },
    update: { modelNarasi: "gemini-2.5-flash", modelCadangan: [] },
  });
  await assert.rejects(muatDaftarModel(admin), GalatPengguna, "tanpa kunci tidak bisa memuat daftar");

  await tambahKunci(admin, { label: "Cadangan admin", kunci: "AIzaSyKunciAdminUji000000000000000000001" });
  const r = await muatDaftarModel(admin);
  assert.equal(r.jumlah, 4);
  assert.equal(r.diganti, "gemini-3-flash-preview");
  assert.equal(permintaan.length, 1);
  assert.equal(permintaan[0].kunci, "AIzaSyKunciAdminUji000000000000000000001", "kunci dikirim lewat header, bukan URL");
  assert.ok(!permintaan[0].url.includes("AIza"));

  const a = await ambilPengaturan(admin);
  assert.equal(a.atur.modelNarasi, "gemini-3-flash-preview");
  assert.deepEqual(a.atur.modelCadangan, ["gemini-3.1-flash-lite"]);
  assert.deepEqual(a.narasi.map((m) => m.kode), ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3.1-flash-lite"]);
  assert.deepEqual(a.embedding.map((m) => m.kode), ["gemini-embedding-001"]);

  await assert.rejects(
    simpanPengaturan(admin, { modelNarasi: "gemini-9-ultra", modelCadangan: [], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: true }),
    GalatPengguna,
  );
  await assert.rejects(
    simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: [], modelEmbedding: "gemini-3-flash-preview", pakaiCadanganAdmin: true }),
    GalatPengguna,
    "model narasi tidak boleh dipilih sebagai model embedding",
  );
  assert.equal(await simpanPengaturan(admin, {
    modelNarasi: "gemini-3.1-flash-lite", modelCadangan: ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
    modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false,
  }), 0);
  const b = await ambilPengaturan(admin);
  assert.deepEqual(b.atur.modelCadangan, ["gemini-3-flash-preview"], "cadangan tanpa duplikat dan tanpa model utama");
  assert.equal(b.atur.pakaiCadanganAdmin, false);

  const uji = await ujiModel(admin, "narasi", "gemini-3.1-flash-lite");
  assert.equal(uji.ok, true);
  assert.match(uji.pesan, /siap/);

  const pj = { ...admin, peran: "PENANGGUNG_JAWAB" as const };
  await assert.rejects(muatDaftarModel(pj), GalatAkses);
});

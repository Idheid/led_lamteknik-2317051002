import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import { drafBagian, mulaiGenerate, tugasProyek } from "@/modules/led/data/generate";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { kelompokGenerate, prosesTugasGenerate, teksSebagian } from "@/modules/led/proses/generate";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/**
 * Revisi 22 Okt 2026 tahap 1 (kecepatan generate): thinking rendah untuk narasi Gemini 3, batas waktu per panggilan,
 * keluaran dialirkan (pratinjau bertahap), sub-bagian IKU dikerjakan dua sekaligus.
 */

process.env.GENERATE_JEDA_MAKS_MS = "0";

let pj: Pengguna;
let admin: Pengguna;
let proyekId: string;

const pantau = {
  aktif: 0,
  maksAktif: 0,
  opsiPenyedia: [] as unknown[],
  model: [] as string[],
  /** model yang menggantung (tidak pernah menjawab sampai dibatalkan) */
  gantung: new Set<string>(),
  pratinjau: [] as string[],
};

function keluaran(pengguna: string) {
  const sumber = [...new Set([...pengguna.matchAll(/\[((?:D\d+)|(?:T-[\w.-]+)|(?:M-[\w-]+)|J)\]/g)].map((m) => m[1]))];
  const kutip = sumber.length ? sumber.slice(0, 1) : ["J"];
  const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((m) =>
    m[2].split(/; (?=\(\d+\))/).map((u) => ({ butir: m[1], unsur: u.trim(), status: "sebagian" as const, sumber: kutip })));
  return {
    paragraf: [
      { teks: "Program studi menjalankan kebijakan mutu secara konsisten dan terdokumentasi.", sumber: kutip },
      { teks: "Hasil pemantauan ditindaklanjuti dalam rapat tinjauan manajemen.", sumber: kutip },
    ],
    unsur,
    dokumenKurang: [],
  };
}

const usage = { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 60, text: 60, reasoning: undefined } };

function teksPengguna(prompt: { role: string; content: unknown }[]) {
  return prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
    .map((c: { text?: string }) => c.text ?? "").join("\n");
}

/** Tunggu sampai dibatalkan (meniru panggilan Gemini yang menggantung). */
function menggantung(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_, tolak) => {
    signal?.addEventListener("abort", () => tolak(signal.reason ?? new DOMException("dibatalkan", "AbortError")));
  });
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Contoh", jenjang: "S1", kodePddikti: "11111", identitas: {} }));
  proyekId = (await buatProyek(pj, { nama: "LED Uji", tahunPengajuan: 2026 })).id;
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: ["gemini-3.1-flash-lite"], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: true });
  await tambahKunci(admin, { label: "Kunci A", kunci: "AIzaSyKunciKecepatan000000000000000000001" });
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => {
      pantau.model.push(kode);
      pantau.opsiPenyedia.push(opsi.providerOptions);
      if (pantau.gantung.has(kode)) return menggantung(opsi.abortSignal);
      return { content: [{ type: "text", text: JSON.stringify(keluaran(teksPengguna(opsi.prompt))) }], finishReason: { unified: "stop", raw: "STOP" }, usage, warnings: [] };
    },
    doStream: async (opsi) => {
      pantau.model.push(kode);
      pantau.opsiPenyedia.push(opsi.providerOptions);
      if (pantau.gantung.has(kode)) return menggantung(opsi.abortSignal);
      pantau.aktif += 1;
      pantau.maksAktif = Math.max(pantau.maksAktif, pantau.aktif);
      const json = JSON.stringify(keluaran(teksPengguna(opsi.prompt)));
      // dialirkan per 40 karakter dengan jeda, supaya pratinjau sempat tersimpan
      const potong = json.match(/[\s\S]{1,40}/g)!;
      const chunks = [
        { type: "stream-start" as const, warnings: [] },
        { type: "text-start" as const, id: "t" },
        ...potong.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
        { type: "text-end" as const, id: "t" },
        { type: "finish" as const, finishReason: { unified: "stop" as const, raw: "STOP" }, usage },
      ];
      const stream = simulateReadableStream({ chunks, chunkDelayInMs: 120 }).pipeThrough(new TransformStream({
        flush() { pantau.aktif -= 1; },
        transform(c, ctrl) { ctrl.enqueue(c); },
      }));
      return { stream };
    },
  }));
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("kelompok generate: IKU berurutan dikerjakan bersamaan, sisanya satu per satu; teks sebagian untuk pratinjau", () => {
  const kode = ["C.1-IKU-a", "C.1-IKU-b", "C.1-IKU-c", "C.1-LB", "C.1-KEB", "C.1-AF", "C.1-SWOT"];
  assert.deepEqual(kelompokGenerate(kode, 0, 2), ["C.1-IKU-a", "C.1-IKU-b"]);
  assert.deepEqual(kelompokGenerate(kode, 2, 2), ["C.1-IKU-c"]);
  assert.deepEqual(kelompokGenerate(kode, 3, 2), ["C.1-LB"]);
  assert.deepEqual(kelompokGenerate(kode, 0, 1), ["C.1-IKU-a"]);
  assert.equal(teksSebagian({ paragraf: [{ teks: "Satu." }, undefined, { teks: "Dua" }] }), "Satu.\n\nDua");
  assert.equal(teksSebagian(null), "");
});

test("Generate dialirkan, dua IKU sekaligus, thinking rendah untuk Gemini 3, pratinjau tersimpan lalu dibersihkan", async () => {
  process.env.GENERATE_STREAM = "1";
  process.env.GENERATE_PARALEL = "2";
  try {
    const t = await mulaiGenerate(pj, proyekId, "C.1");
    // amati pratinjau selama tugas berjalan
    let berjalan = true;
    const amati = (async () => {
      while (berjalan) {
        const r = await tugasProyek(pj, proyekId);
        for (const x of r) for (const teks of Object.values(x.pratinjau)) pantau.pratinjau.push(teks);
        await new Promise((s) => setTimeout(s, 100));
      }
    })();
    assert.equal(await prosesTugasGenerate(t.id), "selesai");
    berjalan = false;
    await amati;
    assert.equal(pantau.maksAktif, 2, "paling banyak dua sub-bagian IKU dikerjakan bersamaan");
    assert.ok(pantau.pratinjau.some((x) => x.startsWith("Program studi menjalankan")), "teks sebagian tampil selama ditulis");
    assert.equal((await prisma.tugasGenerate.findUniqueOrThrow({ where: { id: t.id } })).pratinjau, null, "pratinjau dibersihkan");
    const draf = await drafBagian(pj, proyekId, "C.1");
    assert.equal(Object.values(draf).filter((d) => d.aktif).length, 7, "semua sub-bagian C.1 punya draf");
    assert.ok(pantau.opsiPenyedia.every((o) => (o as { google?: { thinkingConfig?: { thinkingLevel?: string } } })?.google?.thinkingConfig?.thinkingLevel === "low"),
      "narasi memakai thinking rendah");
  } finally {
    process.env.GENERATE_STREAM = "0";
    process.env.GENERATE_PARALEL = "1";
  }
});

test("Panggilan yang menggantung dihentikan setelah batas waktu, diulang sekali, lalu pindah ke model cadangan", async () => {
  process.env.GENERATE_BATAS_MS = "300";
  pantau.gantung.add("gemini-3-flash-preview");
  pantau.model.length = 0;
  try {
    const mulai = Date.now();
    const t = await mulaiGenerate(pj, proyekId, "C.1", "C.1-LB");
    assert.equal(await prosesTugasGenerate(t.id), "selesai");
    assert.ok(Date.now() - mulai < 15_000, "tidak macet lama");
    assert.deepEqual(pantau.model, ["gemini-3-flash-preview", "gemini-3-flash-preview", "gemini-3.1-flash-lite"]);
    const log = await prisma.logPemakaian.findMany({ where: { tugasId: t.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(log.map((l) => [l.model, l.berhasil]), [["gemini-3-flash-preview", false], ["gemini-3-flash-preview", false], ["gemini-3.1-flash-lite", true]]);
    assert.ok(log.slice(0, 2).every((l) => l.galat?.startsWith("batas_waktu")));
    assert.equal((await drafBagian(pj, proyekId, "C.1"))["C.1-LB"].aktif?.model, "gemini-3.1-flash-lite");
  } finally {
    delete process.env.GENERATE_BATAS_MS;
    pantau.gantung.clear();
  }
});

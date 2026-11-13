import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { buatProyek } from "@/modules/led/data/proyek";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { generateSubBagian } from "@/modules/led/proses/generate";
import type { RingkasanKutipan } from "@/modules/led/domain/kutipan";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Rencana 10 Nov T7: generate berbasis kutipan; kutipan dicek kode setelah keluaran diterima. */

process.env.GENERATE_JEDA_MAKS_MS = "0";
const SUB = "C.1-IKU-a";
const ASLI = "Visi program studi ditinjau setiap lima tahun bersama pemangku kepentingan dan alumni.";
let proyekId: string;

/** Model tiruan: B1 menyalin potongan D1 dengan spasi dan huruf berbeda (sah), B2 kutipan rekaan (ditolak). */
function keluaran(pengguna: string) {
  const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((m) =>
    m[2].split(/; (?=\(\d+\))/).map((u) => ({ butir: m[1], unsur: u.trim(), status: "terpenuhi" as const, sumber: ["D1"], bukti: ["B2"] })));
  return JSON.stringify({
    bukti: [
      { id: "B1", sumber: "D1", kutipan: "visi  PROGRAM studi ditinjau\nsetiap lima tahun" },
      { id: "B2", sumber: "D1", kutipan: "Visi program studi ditetapkan oleh rektor setiap tahun." },
    ],
    paragraf: [
      { teks: "Visi program studi ditinjau setiap lima tahun bersama pemangku kepentingan.", sumber: ["D1"], bukti: ["B1"] },
      { teks: "Visi ditetapkan oleh rektor setiap tahun.", sumber: ["D1"], bukti: ["B2"] },
    ],
    unsur,
    dokumenKurang: [],
  });
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  const { tim } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} });
  proyekId = (await buatProyek(tim, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  const d = await unggahDokumen(tim, proyekId, { nama: "renstra.docx", isi: Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph(ASLI)] }] }))) });
  await prosesDokumen(d.id);
  await tambahKunci(admin, { label: "Kunci", kunci: "AIzaSyKunciUjiKutipan00000000000000000001" });
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => {
      const pengguna = opsi.prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .map((c) => ("text" in c ? c.text : "")).join("\n");
      return {
        content: [{ type: "text", text: keluaran(pengguna) }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: { inputTokens: { total: 10, noCache: 4, cacheRead: 6, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
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

test("kutipan beda spasi diterima, kutipan rekaan ditolak dan kalimatnya tidak_didukung", async () => {
  const v = await prisma.versiDraf.findFirstOrThrow({ where: { bagianDraf: { proyekId, subBagian: { kode: SUB } } }, orderBy: { nomor: "desc" } });
  const k = (v.pemeriksaan as unknown as { kutipan: RingkasanKutipan }).kutipan;
  assert.deepEqual(k.bukti.map((b) => [b.id, b.sah]), [["B1", true], ["B2", false]]);
  assert.deepEqual(k.paragraf.map((p) => p.status), ["didukung", "tidak_didukung"]);
  assert.ok(k.kalimat.some((x) => x.label === "tidak_didukung" && /rektor/.test(x.teks)));
  assert.equal(k.jumlah.kalimatTidakDidukung, 1);
});

test("unsur terpenuhi yang hanya bersandar pada bukti ditolak diturunkan, penanda disisipkan, kode bukti tidak masuk narasi", async () => {
  const v = await prisma.versiDraf.findFirstOrThrow({ where: { bagianDraf: { proyekId, subBagian: { kode: SUB } } }, orderBy: { nomor: "desc" } });
  const unsur = v.unsur as unknown as { status: string; unsur: string }[];
  assert.ok(unsur.length > 0 && unsur.every((u) => u.status === "belum_ada_bukti"));
  const isi = JSON.stringify(v.isi);
  assert.match(isi, /\[BELUM ADA BUKTI:/);
  assert.ok(!/\bB[12]\b/.test(isi), "id bukti B1/B2 tidak tampil di narasi (dan di Word)");
  // keluaran mentah menyimpan bukti apa adanya untuk audit
  assert.equal((v.keluaranMentah as unknown as { keluaran: { bukti: unknown[] } }).keluaran.bukti.length, 2);
});

test("token cache dicatat di LogPemakaian", async () => {
  const log = await prisma.logPemakaian.findFirstOrThrow({ where: { proyekId, berhasil: true }, orderBy: { createdAt: "desc" } });
  assert.equal(log.tokenCache, 6);
});

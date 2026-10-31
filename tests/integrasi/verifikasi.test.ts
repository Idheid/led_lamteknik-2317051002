import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { simpanProdi } from "@/modules/bersama/data/organisasi";
import { buatProyek, simpanJawaban } from "@/modules/led/data/proyek";
import { unggahLkps } from "@/modules/led/data/lkps";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import { drafBagian, mulaiGenerate, simpanSuntingan } from "@/modules/led/data/generate";
import { periksaDenganAi } from "@/modules/led/data/verifikasi";
import { konsistensiProyek, simpanAlasanKonsistensi } from "@/modules/led/data/konsistensi";
import { periksaEkspor } from "@/modules/led/data/ekspor";
import { aturModelUji } from "@/modules/bersama/llm/narasi";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesTugasGenerate } from "@/modules/led/proses/generate";
import type { DokTiptap } from "@/modules/led/domain/narasi";
import { bersihkanDb, buatSuperAdmin, imporSeed, siapkanPj } from "./bantu";

/** Revisi 22 Okt 2026 tahap 5: verifikasi per kalimat (otomatis dan dengan AI) dan konsistensi angka antar kriteria. */

process.env.GENERATE_JEDA_MAKS_MS = "0";

let pj: Pengguna;
let admin: Pengguna;
let proyekId: string;
let ndtps = 0;
const promptVerifikasi: string[] = [];

function teksPengguna(prompt: { role: string; content: unknown }[]) {
  return prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
    .map((c: { text?: string }) => c.text ?? "").join("\n");
}

function keluaran(pengguna: string) {
  if (pengguna.includes("## KALIMAT")) {
    promptVerifikasi.push(pengguna);
    const nomor = [...pengguna.matchAll(/^(\d+)\. \(/gm)].map((m) => Number(m[1]));
    return { kalimat: nomor.map((n) => ({ nomor: n, label: n === 2 ? "sebagian" : "sesuai", alasan: n === 2 ? "Ada simpulan tambahan." : "Sesuai sumber." })) };
  }
  const m = /\[M-NDTPS\] [^=]+= ([\d.,]+)/.exec(pengguna);
  ndtps = m ? Number(m[1].replace(/\./g, "").replace(",", ".")) : 0;
  const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((x) =>
    x[2].split(/; (?=\(\d+\))/).map((u) => ({ butir: x[1], unsur: u.trim(), status: "sebagian" as const, sumber: ["J"] })));
  return {
    paragraf: [
      { teks: `Program studi memiliki ${m?.[1] ?? "0"} dosen tetap yang ditugaskan sebagai DTPS.`, sumber: ["M-NDTPS"] },
      { teks: "Kecukupan dosen ditinjau setiap tahun dalam rapat tinjauan manajemen. Hasil tinjauan menjadikan program studi paling unggul di Asia.", sumber: ["J"] },
    ],
    unsur,
    dokumenKurang: [],
  };
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  const prodi = await simpanProdi(pj, { nama: "Teknik Contoh", jenjang: "S1", kodePddikti: "11111", identitas: {} });
  proyekId = (await buatProyek(pj, { prodiId: prodi.id, nama: "LED Uji", tahunPengajuan: 2026 })).id;
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: [], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false });
  await tambahKunci(pj, { label: "Kunci", kunci: "AIzaSyKunciVerifikasi0000000000000000001" });
  aturModelUji((_k, kode) => new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => ({
      content: [{ type: "text", text: JSON.stringify(keluaran(teksPengguna(opsi.prompt))) }],
      finishReason: { unified: "stop", raw: "STOP" },
      usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 50, text: 50, reasoning: undefined } },
      warnings: [],
    }),
  }));
  const b = await unggahLkps(pj, proyekId, { nama: "lkps.xlsx", isi: readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")) });
  await prosesBerkasLkps(b.id);
  await simpanJawaban(pj, { proyekId, subBagianKode: "C.4-IKU-a.i", isi: "Kecukupan dosen ditinjau setiap tahun dalam rapat tinjauan manajemen." });
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

test("Verifikasi per kalimat otomatis setelah generate dan setelah disunting; Periksa dengan AI", async () => {
  const t = await mulaiGenerate(pj, proyekId, "C.4", "C.4-IKU-a.i");
  assert.equal(await prosesTugasGenerate(t.id), "selesai");
  assert.ok(ndtps > 0);
  let d = (await drafBagian(pj, proyekId, "C.4"))["C.4-IKU-a.i"].aktif!;
  const kalimat = d.pemeriksaan!.kalimat!;
  assert.deepEqual(kalimat.map((k) => k.label), ["sesuai", "sesuai", "tidak_didukung"], JSON.stringify(kalimat.map((k) => [k.teks, k.alasan])));
  assert.match(kalimat[2].alasan, /tidak ditemukan di sumber/);

  // PJ menyunting angka menjadi berbeda dengan LKPS: kalimat itu tidak didukung sumber
  const salah = Math.round(ndtps * 1.25);
  const isi = structuredClone(d.isi) as DokTiptap;
  const par = isi.content.find((n) => n.type === "paragraph" && JSON.stringify(n.content).includes("dosen tetap"))!;
  par.content = [{ type: "text", text: `Program studi memiliki ${salah} dosen tetap yang ditugaskan sebagai DTPS.` }];
  const s = await simpanSuntingan(pj, proyekId, "C.4-IKU-a.i", isi);
  assert.equal(s.pemeriksaan.kalimat![0].label, "tidak_didukung");
  assert.match(s.pemeriksaan.kalimat![0].alasan, new RegExp(`Angka ${salah} tidak ada di sumber M-NDTPS`));

  await assert.rejects(periksaDenganAi(admin, proyekId, "C.4-IKU-a.i"), GalatAkses);
  const r = await periksaDenganAi(pj, proyekId, "C.4-IKU-a.i");
  assert.deepEqual(r, { total: 3, sesuai: 2, sebagian: 1, tidak_didukung: 0 });
  assert.match(promptVerifikasi[0], /## SUMBER[\s\S]*\[M-NDTPS\][\s\S]*## KALIMAT\n1\. \(M-NDTPS\)/);
  d = (await drafBagian(pj, proyekId, "C.4"))["C.4-IKU-a.i"].aktif!;
  assert.equal(d.pemeriksaan?.kalimatAi?.hasil[1].label, "sebagian");
  assert.equal(d.pemeriksaan?.kalimatAi?.model, "gemini-3-flash-preview");
  const log = await prisma.logPemakaian.findFirst({ where: { subBagianKode: "verifikasi:C.4-IKU-a.i" } });
  assert.ok(log?.berhasil, "panggilan AI dicatat di log pemakaian");
});

test("Konsistensi angka: angka yang sengaja dibuat berbeda tertangkap, menahan ekspor final sampai diberi alasan", async () => {
  const salah = Math.round(ndtps * 1.25);
  const k = await konsistensiProyek(pj, proyekId);
  assert.equal(k.length, 1);
  assert.deepEqual([k[0].metrik, k[0].temuan.subKode, k[0].temuan.angka, k[0].nilaiLkps], ["M-NDTPS", "C.4-IKU-a.i", salah, ndtps]);
  let cek = await periksaEkspor(pj, proyekId, "final");
  assert.ok(cek.galat.some((g) => /tidak konsisten/.test(g)));
  assert.ok((await periksaEkspor(pj, proyekId, "draf")).galat.every((g) => !/tidak konsisten/.test(g)), "draf: hanya peringatan");
  await assert.rejects(simpanAlasanKonsistensi(admin, proyekId, { kunci: k[0].kunci, alasan: "x" }), GalatAkses);
  await simpanAlasanKonsistensi(pj, proyekId, { kunci: k[0].kunci, alasan: "Angka TS-1 sebelum ada DTPS pensiun" });
  cek = await periksaEkspor(pj, proyekId, "final");
  assert.ok(!cek.galat.some((g) => /tidak konsisten/.test(g)), "perbedaan beralasan tidak menahan ekspor");
  assert.equal(cek.konsistensi[0].alasan, "Angka TS-1 sebelum ada DTPS pensiun");
});

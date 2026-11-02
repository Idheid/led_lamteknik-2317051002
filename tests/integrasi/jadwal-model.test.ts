import "./siapan";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { buatAkunAsesor } from "@/modules/bersama/data/organisasi";
import { modelAiAktif, simpanPengaturan } from "@/modules/bersama/data/pengaturan";
import { buatProyek, simpanJawaban } from "@/modules/led/data/proyek";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { unggahLkps } from "@/modules/led/data/lkps";
import { kesiapanLed } from "@/modules/led/data/kesiapan";
import { mulaiGenerate } from "@/modules/led/data/generate";
import { periksaEkspor } from "@/modules/led/data/ekspor";
import { ajukanReview, tugaskanAsesor } from "@/modules/led/data/review";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesTugasGenerate } from "@/modules/led/proses/generate";
import { bersihkanDb, buatAdmin, imporSeed, penggunaDari, siapkanFakultas, siapkanProdi } from "./bantu";

/** Revisi 31 Okt 2026 tahap 7: jadwal kerja hanya pengingat; nama model AI dari PengaturanLLM. */

let admin: Pengguna;
let tim: Pengguna;
let proyekId: string;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim } = await siapkanProdi(admin, { nama: "Teknik Jadwal", jenjang: "S1", kodePddikti: "66601", identitas: {} }));
  proyekId = (await buatProyek(tim, { nama: "LED Jadwal", tahunPengajuan: 2026 })).id;
  // semua tonggak dan batas pengajuan sudah lewat
  const lalu = (hari: number) => new Date(Date.now() - hari * 86_400_000).toISOString().slice(0, 10);
  await prisma.proyekLED.update({
    where: { id: proyekId },
    data: { batasPengajuan: new Date(`${lalu(5)}T00:00:00Z`), jadwal: { lkps: lalu(90), kriteria: lalu(60), bab: lalu(40), review: lalu(20), ekspor: lalu(5) } },
  });
  process.env.LLM_NARASI = "uji";
  process.env.LLM_NARASI_UJI_JEDA_MS = "0";
});
after(async () => {
  process.env.LLM_NARASI = "";
  await prisma.$disconnect();
});

test("Revisi 31 Okt tahap 7: jadwal terlewat tidak menolak unggah, jawaban, generate, ekspor, dan ajukan review", async () => {
  const k = await kesiapanLed(proyekId);
  assert.ok(k.tonggak.some((t) => t.status === "terlewat"), "jadwal memang terlewat");

  const lkps = await unggahLkps(tim, proyekId, { nama: "lkps.xlsx", isi: readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")) });
  await prosesBerkasLkps(lkps.id);
  const isi = Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Renstra program studi ditinjau setiap tahun.")] }] })));
  const d = await unggahDokumen(tim, proyekId, { nama: "renstra.docx", isi });
  await prosesDokumen(d.id);
  assert.equal((await prisma.dokumen.findUniqueOrThrow({ where: { id: d.id } })).status, "siap");
  await simpanJawaban(tim, { proyekId, subBagianKode: "C.1-LB", isi: "Jawaban setelah jadwal lewat." });

  const t = await mulaiGenerate(tim, proyekId, "C.1", "C.1-LB");
  assert.equal(await prosesTugasGenerate(t.id), "selesai");

  const cek = await periksaEkspor(tim, proyekId, "draf");
  assert.ok(!cek.galat.some((g) => /jadwal|tonggak|batas pengajuan/i.test(g)), "ekspor tidak ditahan karena jadwal");

  const asesor = await penggunaDari((await buatAkunAsesor(admin, { nama: "Asesor Jadwal", email: "asesor.jadwal@uji.test", kataSandi: "SandiAsesor#1" })).id);
  await tugaskanAsesor(admin, proyekId, asesor.id);
  await ajukanReview(tim, proyekId);
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } })).statusReview, "direview");
});

test("Revisi 31 Okt tahap 7: nama model AI mengikuti PengaturanLLM", async () => {
  await simpanPengaturan(admin, { modelNarasi: "gemini-3-flash-preview", modelCadangan: ["gemini-3.1-flash-lite"], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false });
  process.env.LLM_NARASI = "";
  const m = await modelAiAktif();
  assert.deepEqual([m.narasi, m.cadangan, m.embedding], ["gemini-3-flash-preview", ["gemini-3.1-flash-lite"], "gemini-embedding-001"]);
  assert.equal(m.labelNarasi, "Google Gemini gemini-3-flash-preview");
  await simpanPengaturan(admin, { modelNarasi: "gemini-3.1-pro-preview", modelCadangan: [], modelEmbedding: "gemini-embedding-001", pakaiCadanganAdmin: false });
  assert.equal((await modelAiAktif()).labelNarasi, "Google Gemini gemini-3.1-pro-preview", "berubah tanpa mengubah kode");
  process.env.LLM_NARASI = "uji";
  assert.match((await modelAiAktif()).labelNarasi, /uji/);
});

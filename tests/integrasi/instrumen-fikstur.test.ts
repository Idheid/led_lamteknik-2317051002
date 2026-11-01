import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import {
  buatVersiJenjang, dataPemetaan, GalatBerkasDitolak, simpanPemetaan, unggahBerkasInstrumen, type JenisBerkasInstrumen,
} from "@/modules/led/data/unggah-instrumen";
import { langkahTemplate } from "@/modules/led/proses/instrumen";
import { bangunDocx } from "@/modules/led/proses/ekspor";
import { berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/**
 * Perbaikan 2 Nov 2026 (I5): uji dengan fikstur berkas asli di tests/fikstur/instrumen/ (template LPMPP 2022, Matriks
 * D3 2025, template berformat Heading 1/2/3). Metadata berkas tidak dipakai di uji mana pun.
 */

const FIKSTUR = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur/instrumen", n));
const BERKAS = {
  resmi: { nama: "Template LEDPS 2025.docx", isi: FIKSTUR("template-ledps-2025.docx") },
  lama: { nama: "Template Laporan Evaluasi Diri Program Studi APS Akademik dan Vokasi (LED Word).docx", isi: FIKSTUR("template-led-lama-2022.docx") },
  lain: { nama: "Template LED format lain.docx", isi: FIKSTUR("template-format-lain.docx") },
  matriksS1: { nama: "Matriks Sarjana 2025.pdf", isi: FIKSTUR("matriks-sarjana-2025.pdf") },
  matriksD3: { nama: "Matriks Diploma Tiga 2025.pdf", isi: FIKSTUR("matriks-d3-2025.pdf") },
};

let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
});

after(async () => {
  await prisma.$disconnect();
});

async function ditolak(versiId: string, jenis: JenisBerkasInstrumen, berkas: { nama: string; isi: Buffer }) {
  try {
    await unggahBerkasInstrumen(admin, versiId, jenis, berkas);
  } catch (e) {
    assert.ok(e instanceof GalatBerkasDitolak, String(e));
    return e.hasil;
  }
  throw new Error(`${berkas.nama} seharusnya ditolak`);
}

test("I5: template LPMPP 2022 ditolak lewat sidik jari usang; Matriks D3 ditolak di versi Sarjana", async () => {
  const v = await buatVersiJenjang(admin, { nama: "Instrumen Sarjana", kode: "LAMTEKNIK-2025-S1-F", jenjang: "S1", tahunInstrumen: 2025 });
  const lama = await ditolak(v.id, "template", BERKAS.lama);
  assert.equal(lama.judul, "Berkas ditolak: berkas usang");
  assert.equal(lama.alasan, "Berkas ini Template LED APS Akademik dan Vokasi (struktur LED lama, folder LPMPP).");
  assert.equal(lama.langkah, "Gunakan Template LEDPS LAM Teknik 2025 dari lamteknik.or.id.");
  assert.ok(lama.terbaca.some((t) => t.label === "Kriteria (9)" && t.nilai.startsWith("Visi, Misi, Tujuan, dan Strategi; Tata Pamong")));

  const d3 = await ditolak(v.id, "matriks", BERKAS.matriksD3);
  assert.equal(d3.judul, "Berkas ditolak: jenjang tidak sesuai");
  assert.equal(d3.alasan, "Matriks ini untuk Diploma Tiga, sedangkan instrumen ini untuk Sarjana.");
  assert.ok(d3.terbaca.some((t) => t.label === "Tahun di teks" && t.nilai === "2025"));

  // Matriks D3 diterima di versi Diploma Tiga, dan template resmi cocok dengannya
  const w = await buatVersiJenjang(admin, { nama: "Instrumen Diploma Tiga", kode: "LAMTEKNIK-2025-D3-F", jenjang: "D3", tahunInstrumen: 2025 });
  const m = await unggahBerkasInstrumen(admin, w.id, "matriks", BERKAS.matriksD3);
  assert.deepEqual(m.info, []);
  const t = await unggahBerkasInstrumen(admin, w.id, "template", BERKAS.resmi);
  assert.ok(t.info.includes("Kriteria Template LED cocok dengan Matriks (7 kriteria)."));
});

/** Teks paragraf document.xml berurutan (tanpa paragraf kosong). */
async function paragrafDocx(isi: Buffer): Promise<string[]> {
  const doc = await (await JSZip.loadAsync(isi)).file("word/document.xml")!.async("string");
  return doc.split(/<\/w:p>/).map((p) => [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("").trim()).filter(Boolean);
}

/** Versi dengan template tertentu (pemetaan opsional), diurai, dipakai satu LED dengan narasi bertanda di sub-bagian `kode`. */
async function ledDenganTemplate(kodeVersi: string, template: { nama: string; isi: Buffer }, petakan: boolean, prodi: string, kode: string[]) {
  const v = await buatVersiJenjang(admin, { nama: kodeVersi, kode: kodeVersi, jenjang: "S1", tahunInstrumen: 2025 });
  await unggahBerkasInstrumen(admin, v.id, "matriks", BERKAS.matriksS1);
  await unggahBerkasInstrumen(admin, v.id, "template", template);
  if (petakan) await simpanPemetaan(admin, v.id, (await dataPemetaan(admin, v.id)).usulan);
  await langkahTemplate(await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } }), "S1");
  const { tim } = await siapkanProdi(admin, { nama: prodi, jenjang: "S1", kodePddikti: String(10000 + kode.length + prodi.length), identitas: {} });
  const proyek = await buatProyek(tim, { tahunPengajuan: 2026 });
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { versiId: v.id } });
  for (const k of kode) {
    const sub = await prisma.subBagian.findFirstOrThrow({ where: { kode: k, bagian: { versiId: v.id } } });
    const d = await prisma.bagianDraf.create({ data: { proyekId: proyek.id, subBagianId: sub.id, status: "selesai" } });
    const isi = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `NARASI UJI ${k}` }] }] };
    const vd = await prisma.versiDraf.create({ data: { bagianDrafId: d.id, nomor: 1, asal: "sunting", isi, dokumenKurang: [] } });
    await prisma.bagianDraf.update({ where: { id: d.id }, data: { versiAktifId: vd.id } });
  }
  return { versiId: v.id, proyekId: proyek.id };
}

test("I5: template-format-lain.docx + pemetaan → struktur sama dengan resmi; ekspor Word menaruh narasi di judul yang benar", async () => {
  // fikstur sama dengan keluaran skrip (dibuat ulang dari template resmi)
  const { templateFormatLain } = await import("../fikstur/instrumen/format-lain");
  assert.ok((await templateFormatLain(BERKAS.resmi.isi)).equals(BERKAS.lain.isi), "fikstur sesuai skrip buat-fikstur-format-lain");

  const kodeUji = ["II.A-1", "C.1-LB", "C.3-KEB", "C.6-SWOT"];
  const resmi = await ledDenganTemplate("LAMTEKNIK-2025-S1-EKSPOR-R", BERKAS.resmi, false, "Teknik Resmi", kodeUji);
  const lain = await ledDenganTemplate("LAMTEKNIK-2025-S1-EKSPOR-L", BERKAS.lain, true, "Teknik Format Lain", kodeUji);
  const kodeSub = async (versiId: string) => (await prisma.subBagian.findMany({
    where: { bagian: { versiId } }, orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }],
  })).filter((s) => berlakuUntukJenjang(s, "S1")).map((s) => `${s.kode}|${s.judul}`);
  assert.deepEqual(await kodeSub(lain.versiId), await kodeSub(resmi.versiId), "sub-bagian Sarjana sama");

  const a = await bangunDocx(resmi.proyekId, { jenis: "draf" });
  const b = await bangunDocx(lain.proyekId, { jenis: "draf" });
  assert.deepEqual(b.laporan.tidakDitemukan, [], "semua sub-bagian ditemukan di template format lain");
  assert.deepEqual(b.laporan.placeholder, a.laporan.placeholder);
  assert.ok(b.laporan.placeholder.length > 90);
  const pa = await paragrafDocx(a.isi);
  const pb = await paragrafDocx(b.isi);
  for (const k of kodeUji) {
    const ia = pa.findIndex((t) => t === `NARASI UJI ${k}`);
    const ib = pb.findIndex((t) => t === `NARASI UJI ${k}`);
    assert.ok(ia > 0 && ib > 0, `narasi ${k} ada di kedua berkas`);
    assert.equal(pb[ib - 1], pa[ia - 1], `judul di atas narasi ${k} sama dengan template resmi`);
    const judul = (await prisma.subBagian.findFirstOrThrow({ where: { kode: k, bagian: { versiId: lain.versiId } } })).judul;
    assert.ok(pb.slice(Math.max(0, ib - 4), ib).some((t) => t.includes(judul.slice(0, 20))), `judul "${judul}" tepat di atas narasi ${k}`);
  }
});

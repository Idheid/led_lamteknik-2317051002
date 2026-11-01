import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import {
  bacaSidikJariVersi, buatVersiJenjang, dataPemetaan, mulaiEkstraksi, simpanPemetaan, unggahBerkasInstrumen,
} from "@/modules/led/data/unggah-instrumen";
import { langkahTemplate } from "@/modules/led/proses/instrumen";
import { berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { PEMETAAN_FORMAT_LAIN, templateFormatLain } from "../fikstur/instrumen/format-lain";
import { bersihkanDb, buatAdmin, imporSeed } from "./bantu";

/** Perbaikan 2 Nov 2026 (I3): pemetaan judul oleh Admin untuk template berformat lain, tanpa AI. */

const FIKSTUR = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur/instrumen", n));
const RESMI = { nama: "Template LEDPS 2025.docx", isi: FIKSTUR("template-ledps-2025.docx") };
const MATRIKS = { nama: "Matriks Sarjana 2025.pdf", isi: FIKSTUR("matriks-sarjana-2025.pdf") };

let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
});

after(async () => {
  await prisma.$disconnect();
});

async function kodeSub(versiId: string, jenjang: string) {
  const sub = await prisma.subBagian.findMany({ where: { bagian: { versiId } }, orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }] });
  return sub.filter((s) => berlakuUntukJenjang(s, jenjang)).map((s) => s.kode);
}

test("I3: template berformat lain → diagnosis, pemetaan judul, lalu struktur sama dengan template resmi", async () => {
  const lain = { nama: "Template LED format lain.docx", isi: await templateFormatLain(RESMI.isi) };
  const v = await buatVersiJenjang(admin, { nama: "Instrumen format lain", kode: "LAMTEKNIK-2025-S1-LAIN", jenjang: "S1", tahunInstrumen: 2025 });
  const t = await unggahBerkasInstrumen(admin, v.id, "template", lain);
  assert.ok(t.info.some((x) => x.startsWith("Format judul template ini berbeda")), "diterima dengan diagnosis, bukan jalan buntu");
  await unggahBerkasInstrumen(admin, v.id, "matriks", MATRIKS);
  await assert.rejects(mulaiEkstraksi(admin, v.id), /Format judul template ini berbeda dari template yang dikenal sistem\. Tentukan sendiri judulnya lewat Pemetaan judul/);

  const data = await dataPemetaan(admin, v.id);
  assert.equal(data.pemetaan, null);
  assert.equal(data.kriteriaMatriks, 7);
  assert.deepEqual(data.usulan.gaya, { ...PEMETAAN_FORMAT_LAIN.gaya }, "usulan awal tanpa AI");
  assert.ok(data.gaya.some((g) => g.gaya === "heading 3" && g.jumlah === 7));

  await assert.rejects(simpanPemetaan(admin, v.id, { gaya: { "heading 1": "bab" }, polaCatatan: "(tidak ditutup" }), /Pola catatan jenjang/);
  const hasil = await simpanPemetaan(admin, v.id, data.usulan);
  assert.deepEqual(hasil, { diagnosis: "cocok", masalah: null });
  const tersimpan = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } });
  assert.deepEqual((tersimpan.pemetaanTemplate as { gaya: unknown }).gaya, { ...PEMETAAN_FORMAT_LAIN.gaya });
  assert.equal(bacaSidikJariVersi(tersimpan.sidikJari).template?.diagnosis?.kode, "cocok");
  assert.equal(await prisma.logAktivitas.count({ where: { objekId: v.id, aksi: "simpan_pemetaan_template" } }), 1);

  // langkah template ekstraksi memakai pemetaan: sub-bagian sama dengan versi bertemplate resmi
  await mulaiEkstraksi(admin, v.id);
  await langkahTemplate(tersimpan, "S1");
  const r = await buatVersiJenjang(admin, { nama: "Instrumen resmi", kode: "LAMTEKNIK-2025-S1-RESMI", jenjang: "S1", tahunInstrumen: 2025 });
  await unggahBerkasInstrumen(admin, r.id, "template", RESMI);
  await langkahTemplate(await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: r.id } }), "S1");
  for (const j of ["S1", "D3", "S2", "PPI"]) assert.deepEqual(await kodeSub(v.id, j), await kodeSub(r.id, j), `sub-bagian ${j}`);
  assert.ok((await kodeSub(v.id, "S1")).length > 90);

  // template baru: pemetaan lama tidak berlaku lagi
  const w = await buatVersiJenjang(admin, { nama: "Instrumen ganti", kode: "LAMTEKNIK-2025-S1-GANTI", jenjang: "S1", tahunInstrumen: 2025 });
  await unggahBerkasInstrumen(admin, w.id, "template", lain);
  await simpanPemetaan(admin, w.id, data.usulan);
  await unggahBerkasInstrumen(admin, w.id, "template", RESMI);
  assert.equal((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: w.id } })).pemetaanTemplate, null);
});

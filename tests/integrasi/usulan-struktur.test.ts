import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import {
  bacaUsulanStruktur, buatVersiJenjang, dataPemetaan, mintaUsulanAi, perkiraanUsulanAi, simpanPemetaan, unggahBerkasInstrumen,
} from "@/modules/led/data/unggah-instrumen";
import { prosesUsulanStruktur } from "@/modules/led/proses/struktur-template";
import { PEMETAAN_FORMAT_LAIN, templateFormatLain } from "../fikstur/instrumen/format-lain";
import { bersihkanDb, buatAdmin, imporSeed } from "./bantu";

/** Perbaikan 2 Nov 2026 (I4): usulan struktur dari AI hanya bila Admin memintanya, hasilnya hanya usulan. */

const FIKSTUR = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur/instrumen", n));
const LLM_SEBELUM = process.env.LLM_NARASI;

let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
});

after(async () => {
  if (LLM_SEBELUM === undefined) delete process.env.LLM_NARASI;
  else process.env.LLM_NARASI = LLM_SEBELUM;
  await prisma.$disconnect();
});

const pemakaian = () => prisma.logPemakaian.count({ where: { subBagianKode: { startsWith: "struktur-template:" } } });

test("I4: usulan AI (LLM_NARASI=uji) tidak berjalan tanpa klik, hanya mengisi usulan, dan dicatat di LogPemakaian", async () => {
  process.env.LLM_NARASI = "uji";
  const v = await buatVersiJenjang(admin, { nama: "Instrumen usulan AI", kode: "LAMTEKNIK-2025-S1-AI", jenjang: "S1", tahunInstrumen: 2025 });
  await unggahBerkasInstrumen(admin, v.id, "template", { nama: "Template format lain.docx", isi: await templateFormatLain(FIKSTUR("template-ledps-2025.docx")) });
  await unggahBerkasInstrumen(admin, v.id, "matriks", { nama: "Matriks Sarjana 2025.pdf", isi: FIKSTUR("matriks-sarjana-2025.pdf") });

  // unggah, diagnosis, halaman Pemetaan, dan perkiraan tidak memanggil AI
  await dataPemetaan(admin, v.id);
  const perkiraan = await perkiraanUsulanAi(admin, v.id);
  assert.ok(perkiraan.jumlahJudul > 50 && perkiraan.jumlahJudul < 400, `judul ${perkiraan.jumlahJudul}`);
  assert.ok(perkiraan.perkiraanToken > 1000);
  assert.equal(perkiraan.model, "model uji pengembangan (tanpa Gemini)");
  assert.equal(await prosesUsulanStruktur(v.id), "dilewati", "tanpa permintaan Admin worker tidak berbuat apa-apa");
  assert.equal(await pemakaian(), 0);

  await mintaUsulanAi(admin, v.id);
  assert.equal(bacaUsulanStruktur((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } })).usulanStruktur)?.status, "antre");
  await assert.rejects(mintaUsulanAi(admin, v.id), /sedang dibuat/);
  assert.equal(await prosesUsulanStruktur(v.id), "selesai");
  const setelah = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } });
  const u = bacaUsulanStruktur(setelah.usulanStruktur)!;
  assert.equal(u.status, "selesai");
  assert.deepEqual(u.gaya, { ...PEMETAAN_FORMAT_LAIN.gaya });
  assert.equal(u.model, "uji-narasi");
  assert.equal(setelah.pemetaanTemplate, null, "usulan AI tidak menyimpan pemetaan sendiri");
  assert.equal(await pemakaian(), 1);
  assert.equal(await prisma.logAktivitas.count({ where: { objekId: v.id, aksi: "minta_usulan_ai_struktur" } }), 1);

  // Admin memeriksa lalu menyimpan sendiri; usulan AI dianggap sudah dipakai
  await simpanPemetaan(admin, v.id, { gaya: u.gaya! });
  const simpan = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } });
  assert.deepEqual((simpan.pemetaanTemplate as { gaya: unknown }).gaya, { ...PEMETAAN_FORMAT_LAIN.gaya });
  assert.equal(simpan.usulanStruktur, null);
});

test("I4: kunci habis atau belum ada → berhenti dengan pesan yang jelas, tanpa diulang otomatis", async () => {
  delete process.env.LLM_NARASI;
  const v = await buatVersiJenjang(admin, { nama: "Instrumen tanpa kunci", kode: "LAMTEKNIK-2025-S1-AI2", jenjang: "S1", tahunInstrumen: 2025 });
  await unggahBerkasInstrumen(admin, v.id, "template", { nama: "Template format lain.docx", isi: await templateFormatLain(FIKSTUR("template-ledps-2025.docx")) });
  await mintaUsulanAi(admin, v.id);
  assert.equal(await prosesUsulanStruktur(v.id), "gagal");
  const u = bacaUsulanStruktur((await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: v.id } })).usulanStruktur)!;
  assert.equal(u.status, "gagal");
  assert.match(u.pesan ?? "", /^Usulan AI berhenti: Belum ada kunci API Gemini\. Tambahkan kunci di menu Kunci API;/);
  assert.match(u.pesan ?? "", /Pemetaan judul tetap bisa diisi sendiri tanpa AI\.$/);
  assert.equal(await prosesUsulanStruktur(v.id), "dilewati", "tidak diulang otomatis");
});

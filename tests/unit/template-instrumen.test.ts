import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bacaParagrafTemplate } from "@/modules/led/instrumen/template";
import { bacaTemplate } from "@/modules/led/instrumen/baca-berkas";
import { diagnosisTemplate } from "@/modules/led/domain/diagnosis-template";
import { uraiTemplate, untukJenjang } from "@/modules/led/domain/template-led";
import { JENJANG } from "@/modules/bersama/domain/jenjang";
import { usulanPemetaan } from "@/modules/led/domain/pemetaan-template";
import { PEMETAAN_FORMAT_LAIN, templateFormatLain } from "../fikstur/instrumen/format-lain";

/** Perbaikan 2 Nov 2026 (I2): diagnosis Template LED dari berkas fikstur (tanpa basis data). */

const FIKSTUR = (n: string) => readFileSync(resolve(process.cwd(), "tests/fikstur/instrumen", n));

test("I2: Template LEDPS 2025 resmi terbaca untuk semua jenjang dengan diagnosis cocok", async () => {
  const paragraf = await bacaParagrafTemplate(FIKSTUR("template-ledps-2025.docx"));
  const hasil = uraiTemplate(paragraf);
  assert.equal(hasil.filter((b) => b.jenis === "kriteria").length, 7);
  for (const j of ["D3", "S1", "STr", "S2", "S3", "PPI"]) {
    assert.ok(untukJenjang(hasil, j).flatMap((b) => b.sub).length > 90, `sub-bagian ${j}`);
    assert.equal(diagnosisTemplate(paragraf, hasil, { jenjang: j, tahun: 2025 }).kode, "cocok", `diagnosis ${j}`);
  }
  const { diagnosis } = await bacaTemplate(FIKSTUR("template-ledps-2025.docx"), { jenjang: "S1", tahun: 2025 });
  assert.equal(diagnosis.kode, "cocok");
  assert.ok(diagnosis.ringkasan.jenjang.length >= 6 && diagnosis.ringkasan.jenjang.length <= JENJANG.length);
});

test("I2: berkas yang bukan .docx didiagnosis rusak", async () => {
  const { bacaan, diagnosis } = await bacaTemplate(FIKSTUR("matriks-sarjana-2025.pdf"), { jenjang: "S1", tahun: 2025 });
  assert.equal(bacaan.jenis, "rusak");
  assert.equal(diagnosis.kode, "rusak");
});

test("I3: template resmi yang judulnya diganti ke Heading 1/2/3 + pemetaan (usulan awal) → struktur sama dengan resmi", async () => {
  const resmi = await bacaParagrafTemplate(FIKSTUR("template-ledps-2025.docx"));
  const lain = await bacaParagrafTemplate(await templateFormatLain(FIKSTUR("template-ledps-2025.docx")));
  assert.equal(uraiTemplate(lain).filter((b) => b.jenis === "kriteria").length, 0, "aturan bawaan tidak mengenali formatnya");
  assert.equal(diagnosisTemplate(lain, uraiTemplate(lain), { jenjang: "S1", tahun: 2025 }).kode, "format-lain");
  const usulan = usulanPemetaan(lain, { jumlahKriteria: 7 });
  assert.deepEqual(usulan, { gaya: { ...PEMETAAN_FORMAT_LAIN.gaya } });
  assert.deepEqual(uraiTemplate(lain, usulan), uraiTemplate(resmi));
  // usulan awal untuk template resmi tidak mengubah hasil aturan bawaan
  assert.deepEqual(uraiTemplate(resmi, usulanPemetaan(resmi, { jumlahKriteria: 7 })), uraiTemplate(resmi));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bacaParagrafTemplate } from "@/modules/led/instrumen/template";
import { bacaPdf, bacaTemplate } from "@/modules/led/instrumen/baca-berkas";
import { periksaBerkasInstrumen, type SidikJariDikenal } from "@/modules/led/domain/periksa-berkas-instrumen";
import { diagnosisTemplate } from "@/modules/led/domain/diagnosis-template";
import { uraiTemplate, untukJenjang } from "@/modules/led/domain/template-led";
import { JENJANG } from "@/modules/bersama/domain/jenjang";
import { usulanPemetaan } from "@/modules/led/domain/pemetaan-template";
import { PEMETAAN_FORMAT_LAIN, templateFormatLain } from "../fikstur/instrumen/format-lain";

/** Perbaikan 2 Nov 2026 (I2, I3, I5): pembacaan dan pemeriksaan berkas instrumen dari fikstur asli (tanpa basis data). */

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

test("I5: template LPMPP 2022 → diagnosis struktur lama; tanpa sidik jarinya tetap ditolak lewat kriteria Matriks 2025", async () => {
  const lama = FIKSTUR("template-led-lama-2022.docx");
  const { bacaan, diagnosis } = await bacaTemplate(lama, { jenjang: "S1", tahun: 2025 });
  assert.equal(diagnosis.kode, "struktur-lama");
  assert.equal(diagnosis.pesan, "Template ini memakai struktur LED lama (9 kriteria). Instrumen tahun 2025 memakai kriteria pada Matriks.");
  const dikenal = JSON.parse(readFileSync(resolve(process.cwd(), "data/instrumen/sidik-jari.json"), "utf8")) as SidikJariDikenal;
  assert.equal(dikenal.berkas[bacaan.sha256]?.status, "usang", "sidik jari LPMPP dikenal usang");
  const tanpaSidik: SidikJariDikenal = { ...dikenal, berkas: Object.fromEntries(Object.entries(dikenal.berkas).filter(([k]) => k !== bacaan.sha256)) };
  const matriks = await bacaPdf(FIKSTUR("matriks-sarjana-2025.pdf"));
  const opsi = { jenis: "template" as const, namaBerkas: "lama.docx", tahunIsian: 2025, jenjangVersi: "S1", tahunAktif: null, bacaan, diagnosis };
  const h = periksaBerkasInstrumen({ ...opsi, pasangan: matriks, dikenal: tanpaSidik });
  assert.equal(h.diterima, false);
  assert.equal(h.judul, "Berkas ditolak: kriteria template tidak cocok dengan Matriks");
  assert.match(h.alasan, /^Kriteria di Template LED \(Visi, Misi, Tujuan, dan Strategi; Tata Pamong, Tata Kelola dan Kerja sama; .*\) tidak sama dengan kriteria di Matriks 2025 \(Diferensiasi Misi \(Visi, Misi, Tujuan, dan Strategi\); Akuntabilitas; /);
  assert.match(h.alasan, /Kriteria template sama dengan struktur LED lama \(sebelum 2025\)\./);
  // belum ada Matriks: ditolak lewat diagnosis struktur lama
  const tanpaMatriks = periksaBerkasInstrumen({ ...opsi, pasangan: null, dikenal: tanpaSidik });
  assert.equal(tanpaMatriks.judul, "Berkas ditolak: struktur LED lama");
  // dengan sidik jari: usang
  assert.equal(periksaBerkasInstrumen({ ...opsi, pasangan: matriks, dikenal }).judul, "Berkas ditolak: berkas usang");
});

test("I5: Matriks D3 2025 resmi terbaca tahun 2025, jenjang Diploma Tiga, 7 kriteria sama dengan template resmi", async () => {
  const m = await bacaPdf(FIKSTUR("matriks-d3-2025.pdf"));
  assert.equal(m.jenis, "matriks");
  assert.equal(m.tahun, 2025);
  assert.equal(m.jenjang, "D3");
  const { bacaan } = await bacaTemplate(FIKSTUR("template-ledps-2025.docx"), { jenjang: "D3", tahun: 2025 });
  assert.deepEqual(m.kriteria, bacaan.kriteria);
  const ped = await bacaPdf(FIKSTUR("pedoman-penilaian-2025.pdf"));
  assert.deepEqual([ped.jenis, ped.tahun], ["pedoman", 2025]);
});

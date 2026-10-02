/**
 * F-09: LKPS PDF (cadangan). Fikstur tests/fikstur/lkps-contoh-s1.pdf dibuat dari LKPS contoh Excel
 * (scripts/buat-fikstur-lkps-pdf.ts) dengan tata letak cetakan: judul, baris nomor kolom, sel terbungkus, pindah halaman.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { bacaLkpsPdf } from "@/lib/lkps/baca-pdf";
import { bacaLkpsXlsx } from "@/lib/lkps/baca-xlsx";
import { hitungSemua } from "@/lib/domain/metrik-lkps";

const PDF = resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.pdf");
const XLSX = resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx");
const k = { tsTahunMulai: 2025 };

test("PDF LKPS terbaca: semua tabel, ditandai perlu dicek, blok jenjang dipilih benar", async () => {
  const h = await bacaLkpsPdf(readFileSync(PDF), "S1");
  assert.equal(h.tabel.length, 43);
  assert.equal(h.masalah[0].tingkat, "peringatan");
  assert.match(h.masalah[0].pesan, /perlu dicek/);
  const t6d = h.tabel.find((t) => t.sheet === "6d");
  assert.ok(t6d?.blok?.includes("Sarjana"));
  assert.ok(!JSON.stringify(t6d?.baris).includes("999"), "blok Diploma Tiga tidak boleh terbaca untuk Sarjana");
  const t4a = h.tabel.find((t) => t.sheet === "4a");
  assert.equal(t4a?.baris.length, 15);
  assert.equal(t4a?.baris[0].sel.G, "S3 Teknik Contoh"); // kolom tanpa nomor dipatok dari judulnya
  assert.equal(h.tabel.find((t) => t.sheet === "2a1")?.baris[0].sel.H, "2023-01-10"); // tanggal dinormalkan
  assert.equal(h.tabel.find((t) => t.sheet === "2b")?.baris.length, 10); // rincian a–f bukan lanjutan baris
});

test("metrik dari PDF sama dengan metrik dari Excel untuk LKPS yang sama", async () => {
  const dariPdf = hitungSemua((await bacaLkpsPdf(readFileSync(PDF), "S1")).tabel, k);
  const dariXlsx = hitungSemua((await bacaLkpsXlsx(readFileSync(XLSX), "S1")).tabel, k);
  for (const x of dariXlsx) {
    const p = dariPdf.find((y) => y.butir === x.butir);
    assert.ok(p, `butir ${x.butir}`);
    for (const m of x.metrik) {
      const q = p.metrik.find((y) => y.kode === m.kode);
      assert.ok(q && (q.nilai === m.nilai || Math.abs((q.nilai ?? NaN) - (m.nilai ?? NaN)) < 1e-9), `${x.butir} ${m.kode}: ${q?.nilai} ≠ ${m.nilai}`);
    }
    assert.equal(p.skor, x.skor, `skor ${x.butir}`);
  }
});

test("PDF tanpa tabel LKPS dan berkas rusak menghasilkan galat", async () => {
  const doc = await PDFDocument.create();
  const hal = doc.addPage([400, 300]);
  hal.drawText("Surat biasa tanpa tabel", { x: 30, y: 250, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) });
  const kosong = await bacaLkpsPdf(await doc.save(), "S1");
  assert.equal(kosong.tabel.length, 0);
  assert.equal(kosong.masalah[0].tingkat, "galat");

  const rusak = await bacaLkpsPdf(Buffer.from("bukan pdf"), "S1");
  assert.equal(rusak.masalah[0].tingkat, "galat");
});

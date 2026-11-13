import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { unggahDokumen } from "@/modules/led/data/dokumen";
import { jalurVektor, jalurVektorKonteks } from "@/modules/led/data/pencarian";
import { mulaiIndeksUlang, statusIndeksUlang } from "@/modules/led/data/indeks-ulang";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { prosesIndeksUlang } from "@/modules/led/proses/indeks-ulang";
import { embeddingHash, MODEL_UJI } from "@/modules/bersama/llm/embedding";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** Rencana 10 Nov T4: kepala konteks potongan, embeddingKonteks, dan indeks ulang dengan ID tetap. */

let admin: Pengguna;
let pj: Pengguna;
let proyekId: string;
let skId: string;

async function docx(paragraf: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] })));
}

async function pdf(baris: string[]): Promise<Buffer> {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  const h = d.addPage([595, 842]);
  baris.forEach((t, i) => h.drawText(t, { x: 50, y: 780 - i * 20, size: 11, font }));
  return Buffer.from(await d.save());
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  proyekId = (await buatProyek(pj, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const sub = await prisma.subBagian.findFirstOrThrow({ where: { bagian: { versiId: proyek.versiId } } });
  const diharapkan = await prisma.dokumenDiharapkan.create({ data: { nama: "SK pengembangan dosen", subBagianId: sub.id } });
  const sk = await unggahDokumen(pj, proyekId, {
    nama: "sk-12.docx",
    judul: "Surat Keputusan Dekan Pengembangan Dosen",
    dokumenDiharapkanId: diharapkan.id,
    isi: await docx(["Ditetapkan di Bandar Lampung pada tanggal 3 Maret 2025 dan berlaku sejak tanggal ditetapkan."]),
  });
  await prosesDokumen(sk.id);
  skId = sk.id;
  const lain = await unggahDokumen(pj, proyekId, { nama: "notulen.docx", isi: await docx(["Rapat kurikulum membahas mata kuliah pilihan dan beban studi mahasiswa."]) });
  await prosesDokumen(lain.id);
});
after(() => prisma.$disconnect());

test("dokumen baru: kepala berisi dokumen, jenis, halaman, dan bagian; teks potongan tidak berubah", async () => {
  const diharapkan = await prisma.dokumenDiharapkan.findFirstOrThrow();
  const [p] = await prisma.potongan.findMany({ where: { dokumenId: skId } });
  assert.equal(p.kepala, `Dokumen: Surat Keputusan Dekan Pengembangan Dosen | Jenis: ${diharapkan.nama}`);
  assert.equal(p.teksIndeks, `${p.kepala}\n${p.teks}`);
  assert.match(p.teks, /^Ditetapkan di Bandar Lampung/);
  assert.equal(p.versiKepala, "kepala-v1");

  const d = await unggahDokumen(pj, proyekId, { nama: "kurikulum.pdf", isi: await pdf(["BAB II KURIKULUM", "Kurikulum disusun berbasis luaran pembelajaran dan ditinjau setiap empat tahun bersama pemangku kepentingan program studi."]) });
  await prosesDokumen(d.id);
  const [q] = await prisma.potongan.findMany({ where: { dokumenId: d.id } });
  assert.equal(q.kepala, "Dokumen: kurikulum | Hlm. 1 | Bagian: BAB II KURIKULUM");
});

test("kueri berisi jenis dokumen menemukan potongan yang isinya tidak menyebut jenis itu (jalur embeddingKonteks)", async () => {
  const [sk] = await prisma.potongan.findMany({ where: { dokumenId: skId } });
  assert.ok(!/keputusan|dosen/i.test(sk.teks), "isi potongan tidak menyebut jenis dokumen");
  const kueri = embeddingHash("surat keputusan dekan pengembangan dosen");
  const l = { proyekId, subBagianKode: null, model: MODEL_UJI };
  assert.equal((await jalurVektorKonteks(l, kueri, 5))[0], sk.id);
  // embedding teks saja (konfigurasi A) tidak melihat kepala
  const [r] = await prisma.$queryRaw<{ jarak: number }[]>`
    SELECT ("embedding" <=> ${`[${kueri.join(",")}]`}::vector) AS "jarak" FROM "Potongan" WHERE "id" = ${sk.id}`;
  assert.ok(r.jarak >= 0.99, `jarak kosinus teks saja ${r.jarak}`);
  assert.ok((await jalurVektor(l, kueri, 5)).length > 0);
});

test("indeks ulang potongan lama: perkiraan permintaan, ID/teks/embedding lama tetap, kepala terisi", async () => {
  await prisma.$executeRaw`UPDATE "Potongan" SET "kepala" = NULL, "teksIndeks" = NULL, "versiKepala" = NULL, "embeddingKonteks" = NULL`;
  const sebelum = await prisma.$queryRaw<{ id: string; teks: string; e: string }[]>`SELECT "id", "teks", "embedding"::text AS "e" FROM "Potongan" ORDER BY "id"`;
  await assert.rejects(mulaiIndeksUlang(pj), GalatAkses);
  const s = await statusIndeksUlang(admin);
  assert.equal(s.perlu.potongan, sebelum.length);
  assert.equal(s.perlu.permintaan, Math.ceil(sebelum.length / 100));
  const t = await mulaiIndeksUlang(admin);
  await assert.rejects(mulaiIndeksUlang(admin), /masih berjalan/);
  assert.match(await prosesIndeksUlang(t.id), /^selesai/);
  const sesudah = await prisma.$queryRaw<{ id: string; teks: string; e: string; kepala: string | null; k: string | null }[]>`
    SELECT "id", "teks", "embedding"::text AS "e", "kepala", "embeddingKonteks"::text AS "k" FROM "Potongan" ORDER BY "id"`;
  assert.deepEqual(sesudah.map((x) => [x.id, x.teks, x.e]), sebelum.map((x) => [x.id, x.teks, x.e]));
  assert.ok(sesudah.every((x) => x.kepala && x.k));
  const tugas = await prisma.tugasIndeksUlang.findUniqueOrThrow({ where: { id: t.id } });
  assert.deepEqual([tugas.status, tugas.selesai, tugas.permintaan], ["selesai", sebelum.length, Math.ceil(sebelum.length / 100)]);
  assert.equal((await statusIndeksUlang(admin)).perlu.potongan, 0);
});

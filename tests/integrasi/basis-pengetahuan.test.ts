import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { simpanProdi } from "@/modules/bersama/data/organisasi";
import { buatProyek } from "@/modules/led/data/proyek";
import { potonganDokumen, unggahDokumen } from "@/modules/led/data/dokumen";
import { cariPotongan, kueriSubBagian } from "@/modules/led/data/pencarian";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { bersihkanDb, buatSuperAdmin, imporSeed, siapkanPj } from "./bantu";

/** Revisi 22 Okt 2026 tahap 8: Basis Pengetahuan (lihat potongan, uji cari dengan kueri generate). */

let pj: Pengguna;
let admin: Pengguna;
let proyekId: string;
let dokumenId: string;

const TEKS = [
  "Visi keilmuan program studi Teknik Uji adalah unggul dalam rekayasa perangkat lunak berkelanjutan pada tahun 2030.",
  "Visi ditinjau setiap lima tahun bersama alumni, dosen, dan mitra industri melalui lokakarya kurikulum.",
].join("\n\n").repeat(12);

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  const prodi = await simpanProdi(pj, { nama: "Teknik Uji", jenjang: "S1", kodePddikti: "55555", identitas: {} });
  proyekId = (await buatProyek(pj, { prodiId: prodi.id, nama: "LED BP", tahunPengajuan: 2026 })).id;
  const d = await unggahDokumen(pj, proyekId, { nama: "renstra.docx", isi: await docx(TEKS) });
  dokumenId = d.id;
  await prosesDokumen(d.id);
});

after(async () => {
  await prisma.$disconnect();
});

async function docx(teks: string): Promise<Buffer> {
  const { Document, Packer, Paragraph } = await import("docx");
  const doc = new Document({ sections: [{ children: teks.split("\n\n").map((t) => new Paragraph(t)) }] });
  return Packer.toBuffer(doc);
}

test("Lihat potongan: teks setiap potongan berurutan dan status embedding; admin ditolak", async () => {
  const p = await potonganDokumen(pj, dokumenId);
  const d = await prisma.dokumen.findUniqueOrThrow({ where: { id: dokumenId } });
  assert.equal(d.status, "siap");
  assert.equal(p.potongan.length, d.jumlahPotongan);
  assert.ok(p.potongan.length > 1);
  assert.deepEqual(p.potongan.map((x) => x.urutan), p.potongan.map((_, i) => i));
  assert.ok(p.potongan.every((x) => x.terindeks && x.teks.length > 0));
  assert.match(p.potongan[0].teks, /Visi keilmuan/);
  await assert.rejects(potonganDokumen(admin, dokumenId), GalatAkses);
});

test("Uji cari: kueri generate sub-bagian memakai judul, instruksi, dan butir; hasil paling banyak 8 dengan skor menurun", async () => {
  const kueri = await kueriSubBagian(pj, proyekId, "C.1-IKU-a");
  const sub = await prisma.subBagian.findFirstOrThrow({ where: { kode: "C.1-IKU-a" }, include: { butir: { include: { butir: true } } } });
  assert.ok(kueri.startsWith(sub.judul));
  assert.ok(kueri.length <= 1500);
  const h = await cariPotongan(pj, proyekId, kueri, { subBagianKode: "C.1-IKU-a" });
  assert.ok(h.hasil.length > 0 && h.hasil.length <= 8);
  assert.ok(h.hasil.every((x, i) => i === 0 || x.skor <= h.hasil[i - 1].skor));
  await assert.rejects(kueriSubBagian(pj, proyekId, "TIDAK-ADA"), /tidak ada/);
});

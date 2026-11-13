import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { cariPotongan, jalurBm25, jalurTsRank, type LingkupCari } from "@/modules/led/data/pencarian";
import { embeddingHash, literalVektor, MODEL_UJI } from "@/modules/bersama/llm/embedding";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/**
 * Rencana 10 Nov T5: BM25 (pg_textsearch) menggantikan ts_rank untuk konfigurasi B. Fikstur 6 potongan dari uji Claude
 * 6 Nov 2026 dengan kueri "jumlah ndtps dan dosen yang".
 */

const KUERI = "jumlah ndtps dan dosen yang";
const NDTPS = "Jumlah NDTPS program studi pada TS adalah 14 orang dengan jabatan akademik lektor kepala.";
const FIKSTUR = [
  "Rapat dan kegiatan yang dihadiri dosen dan tenaga kependidikan yang terlibat dan mahasiswa yang hadir dan alumni yang diundang dan mitra.",
  NDTPS,
  "Kurikulum dan rencana pembelajaran yang disusun dan ditinjau dosen dan pemangku kepentingan yang relevan.",
  "Sarana dan prasarana yang tersedia dan dipakai mahasiswa dan dosen dalam kegiatan yang terjadwal.",
  "Penelitian dan pengabdian yang dilakukan dosen dan mahasiswa yang didanai hibah internal dan eksternal.",
  "Layanan kemahasiswaan dan beasiswa yang diberikan kepada mahasiswa yang berprestasi dan yang membutuhkan.",
];

let pj: Pengguna;
let proyekId: string;
let proyekLain: string;
let subKode: string;
const id: Record<string, string> = {};

async function dokumen(proyek: string | null, nama: string, teks: string[], opsi: { sub?: string | null; model?: string } = {}) {
  const d = await prisma.dokumen.create({
    data: { proyekId: proyek, namaBerkas: `${nama}.docx`, mime: "application/octet-stream", lokasi: "-", ukuran: 1, jenis: "docx", status: "siap", subBagianKode: opsi.sub ?? null },
  });
  for (const [i, t] of teks.entries()) {
    const pid = randomUUID();
    const indeks = `Dokumen: ${nama}\n${t}`;
    await prisma.$executeRaw`
      INSERT INTO "Potongan" ("id", "dokumenId", "urutan", "teks", "modelEmbedding", "embedding", "kepala", "teksIndeks", "versiKepala", "embeddingKonteks")
      VALUES (${pid}, ${d.id}, ${i}, ${t}, ${opsi.model ?? MODEL_UJI}, ${literalVektor(embeddingHash(t))}::vector,
              ${`Dokumen: ${nama}`}, ${indeks}, 'kepala-v1', ${literalVektor(embeddingHash(indeks))}::vector)`;
    id[`${nama}#${i}`] = pid;
  }
  return d.id;
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  const admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  const { tim: lain } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "2", identitas: {} });
  proyekId = (await buatProyek(pj, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  proyekLain = (await buatProyek(lain, { nama: "LED Sipil 2026", tahunPengajuan: 2026 })).id;
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  subKode = (await prisma.subBagian.findFirstOrThrow({ where: { bagian: { versiId: proyek.versiId } } })).kode;
  await dokumen(proyekId, "fikstur", FIKSTUR);
});
after(() => prisma.$disconnect());

const lingkup = (o: Partial<LingkupCari> = {}): LingkupCari => ({ proyekId, subBagianKode: null, model: MODEL_UJI, ...o });

test("fikstur 6 potongan: BM25 menempatkan potongan NDTPS di peringkat 1, ts_rank tidak", async () => {
  const bm25 = await jalurBm25(lingkup(), KUERI, 10);
  const ts = await jalurTsRank(lingkup(), KUERI, 10);
  assert.equal(bm25[0], id["fikstur#1"], "BM25: NDTPS teratas (kata langka berbobot IDF tinggi)");
  assert.notEqual(ts[0], id["fikstur#1"], "ts_rank: kata umum mengalahkan NDTPS");
  assert.equal(ts[0], id["fikstur#0"], "ts_rank: potongan 'Rapat dan kegiatan yang …' teratas");
  assert.equal(bm25.length, 6, "semua potongan memuat minimal satu kata kueri");
  // CETAK_PERINGKAT=1 mencetak tabel perbandingan untuk dokumentasi
  if (process.env.CETAK_PERINGKAT) {
    const nama = (pid: string) => FIKSTUR[Number(Object.keys(id).find((k) => id[k] === pid)!.split("#")[1])].slice(0, 48);
    console.log(["| Peringkat | ts_rank (A-lama) | BM25 (B-bm25) |", "|---|---|---|", ...bm25.map((x, i) => `| ${i + 1} | ${nama(ts[i])} | ${nama(x)} |`)].join(String.fromCharCode(10)));
  }
});

test("cariPotongan: konfigurasi A dan B berjalan berdampingan dengan jejak masing-masing", async () => {
  const a = await cariPotongan(pj, proyekId, KUERI, { konfigurasi: "A-lama" });
  const b = await cariPotongan(pj, proyekId, KUERI, { konfigurasi: "B-bm25" });
  assert.equal(a.jejak.konfigurasi, "A-lama");
  assert.equal(b.jejak.konfigurasi, "B-bm25");
  // dijalankan sebelum uji filter menambah potongan lain yang memuat NDTPS (IDF kata itu berubah)
  const kk = (j: typeof a.jejak, kunci: string) => j.kandidat.find((c) => c.potonganId === id[kunci])?.peringkatKataKunci ?? 99;
  assert.ok(kk(b.jejak, "fikstur#1") < kk(b.jejak, "fikstur#0"), "B: NDTPS di atas 'Rapat dan kegiatan …'");
  assert.ok(kk(a.jejak, "fikstur#1") > kk(a.jejak, "fikstur#0"), "A: sebaliknya");
  // bawaan generate: konfigurasi aktif terakhir (C-unsur setelah T6)
  const bawaan = await cariPotongan(pj, proyekId, KUERI);
  assert.equal(bawaan.jejak.konfigurasi, "C-unsur");
});

test("jalur BM25 menghormati filter proyek, sub-bagian, dokumen bersama, dan model embedding", async () => {
  await dokumen(proyekLain, "lain", ["Jumlah NDTPS prodi lain adalah 20 orang."]);
  await dokumen(null, "bersama", ["Rasio NDTPS fakultas dihitung dari data PDDikti."]);
  await dokumen(proyekId, "khusus", ["NDTPS untuk sub-bagian tertentu."], { sub: subKode });
  await dokumen(proyekId, "modellama", ["NDTPS dengan model embedding lama."], { model: "model-lama" });
  const semua = await jalurBm25(lingkup(), "ndtps", 20);
  assert.ok(!semua.includes(id["lain#0"]), "proyek lain tidak ikut");
  assert.ok(semua.includes(id["bersama#0"]), "dokumen bersama fakultas ikut");
  assert.ok(semua.includes(id["khusus#0"]));
  assert.ok(!semua.includes(id["modellama#0"]), "model embedding lain tidak ikut");
  const subLain = await jalurBm25(lingkup({ subBagianKode: "SUB-LAIN" }), "ndtps", 20);
  assert.ok(!subLain.includes(id["khusus#0"]), "dokumen sub-bagian lain tidak ikut");
  assert.ok(subLain.includes(id["fikstur#1"]) && subLain.includes(id["bersama#0"]), "dokumen umum tetap ikut");
  assert.deepEqual(await jalurBm25(lingkup(), "katayangtidakada", 10), [], "tanpa kata cocok: kosong (skor 0 dibuang)");
});

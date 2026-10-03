import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { buatAkunPenanggungJawab, simpanProdi, simpanUpps } from "@/lib/data/organisasi";
import { buatProyek } from "@/lib/data/proyek";
import { unggahDokumen, simpulGambar } from "@/lib/data/dokumen";
import { tambahKunci } from "@/lib/data/kunci-api";
import { drafBagian, mulaiGenerate, simpanSuntingan, tandaiBagianSelesai } from "@/lib/data/generate";
import { berkasEkspor, daftarEkspor, infoTemplateLed, mulaiEkspor, periksaEkspor, simpanTimPenyusun, unggahTemplateLed } from "@/lib/data/ekspor";
import { aturModelUji } from "@/lib/llm/narasi";
import { prosesDokumen } from "@/lib/proses/dokumen";
import { prosesTugasGenerate, urutanSubBagian } from "@/lib/proses/generate";
import { prosesEkspor } from "@/lib/proses/ekspor";
import { teksElemen, pecahBody } from "@/lib/ekspor/xml";
import { bersihkanDb, buatSuperAdmin, imporSeed, penggunaDari } from "./bantu";

const TEMPLATE = process.env.TEMPLATE_LEDPS_PATH ? resolve(process.cwd(), process.env.TEMPLATE_LEDPS_PATH) : "";
const lewati = !TEMPLATE || !existsSync(TEMPLATE) ? "TEMPLATE_LEDPS_PATH tidak tersedia" : false;

// PNG 2×1 piksel
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mNk+M9QzwAEjDAGACCCAgL+1tZqAAAAAElFTkSuQmCC", "base64");

let pj: Pengguna;
let pjLain: Pengguna;
let proyekId: string;
let gambarId: string;
let admin: Pengguna;

function modelTiruan(_k: string, kode: string) {
  return new MockLanguageModelV4({
    modelId: kode,
    doGenerate: async (opsi) => {
      const pengguna = opsi.prompt.filter((m) => m.role === "user").flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .map((c) => ("text" in c ? c.text : "")).join("\n");
      const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((m) =>
        m[2].split(/; (?=\(\d+\))/).map((u) => ({ butir: m[1], unsur: u.trim(), status: "terpenuhi" as const, sumber: ["J"] })));
      const keluaran = {
        paragraf: [
          { teks: "Program studi menjalankan kebijakan secara terencana dan terdokumentasi dengan melibatkan *stakeholder*.", sumber: ["J"] },
          { teks: "Hasil pemantauan ditindaklanjuti dalam rapat program studi secara berkala.", sumber: ["J"] },
        ],
        unsur,
        dokumenKurang: [],
      };
      return {
        content: [{ type: "text", text: JSON.stringify(keluaran) }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 50, text: 50, reasoning: undefined } },
        warnings: [],
      };
    },
  });
}

before(async () => {
  if (lewati) return;
  await bersihkanDb();
  await imporSeed();
  aturModelUji(modelTiruan);
  admin = await buatSuperAdmin();
  const upps = await simpanUpps(admin, { kode: "FT", nama: "Fakultas Teknik", perguruanTinggi: "Universitas Contoh", alamat: "Jl. Contoh No. 1" });
  const prodi = await simpanProdi(admin, {
    uppsId: upps.id, nama: "Teknik Contoh", jenjang: "S1", kodePddikti: "11111",
    identitas: { kota: "Bandar Lampung", peringkatAkreditasi: "Baik Sekali", nomorSkAkreditasi: "123/SK/2021", telepon: "0721-000000" },
  });
  const lain = await simpanProdi(admin, { uppsId: upps.id, nama: "Teknik Lain", jenjang: "S1", kodePddikti: "22222", identitas: {} });
  pj = await penggunaDari((await buatAkunPenanggungJawab(admin, { prodiId: prodi.id, nama: "PJ", email: "pj@uji.test", kataSandi: "SandiPJ#123" })).id);
  pjLain = await penggunaDari((await buatAkunPenanggungJawab(admin, { prodiId: lain.id, nama: "PJ Lain", email: "pj2@uji.test", kataSandi: "SandiPJ#123" })).id);
  const versi = await prisma.versiInstrumen.findFirstOrThrow();
  proyekId = (await buatProyek(pj, { nama: "LED 2026", versiId: versi.id, tsTahunMulai: 2025 })).id;
  await tambahKunci(pj, { label: "Kunci uji", kunci: "AIzaSyKunciEksporUji00000000000000000001" });
  // jawaban penyusun untuk semua sub-bagian supaya setiap paragraf bersumber [J]
  const kode = await prisma.subBagian.findMany({ where: { bagian: { versiId: versi.id } }, select: { kode: true } });
  await prisma.jawabanForm.createMany({ data: kode.map((k) => ({ proyekId, subBagianKode: k.kode, isi: "Fakta dari penyusun." })) });
  const g = await unggahDokumen(pj, proyekId, { nama: "struktur-organisasi.png", isi: PNG, subBagianKode: "C.2-IKU-a.i.I", judul: "Struktur organisasi UPPS" });
  await prosesDokumen(g.id);
  gambarId = g.id;
});

after(async () => {
  aturModelUji(null);
  await prisma.$disconnect();
});

async function semuaBagian(): Promise<string[]> {
  const p = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  const bagian = await prisma.bagian.findMany({ where: { versiId: p.versiId }, orderBy: { urutan: "asc" } });
  const hasil: string[] = [];
  for (const b of bagian) if ((await urutanSubBagian(p, b.kode)).length > 0) hasil.push(b.kode);
  return hasil;
}

test("F-22 pemeriksaan sebelum ekspor menolak bagian belum selesai, penanda belum ada bukti, dan tabel tanpa judul", { skip: lewati }, async () => {
  const bagian = await semuaBagian();
  // kriteria dulu, lalu bagian yang merangkum semua kriteria (kata pengantar, ringkasan, Bab III, Bab IV)
  const akhir = ["AWAL", "III", "IV"];
  for (const k of [...bagian.filter((x) => !akhir.includes(x)), ...bagian.filter((x) => akhir.includes(x))]) {
    const t = await mulaiGenerate(pj, proyekId, k);
    assert.equal(await prosesTugasGenerate(t.id), "selesai", `generate ${k}`);
  }
  let cek = await periksaEkspor(pj, proyekId);
  assert.ok(cek.galat.some((g) => /C\.1 .* belum ditandai selesai/.test(g)));
  assert.ok(cek.galat.some((g) => /Tim penyusun/.test(g)));
  await assert.rejects(mulaiEkspor(pj, proyekId), GalatPengguna);

  await simpanTimPenyusun(pj, proyekId, {
    dosen: [
      { nama: "Dr. Ani Lestari", nomorInduk: "0012345678", jabatan: "Ketua Tim", tugas: "Koordinator penyusunan" },
      { nama: "Budi Santoso, M.T.", nomorInduk: "0023456789", jabatan: "Anggota", tugas: "Kriteria C.1–C.3" },
    ],
    tendik: [{ nama: "Citra Dewi", nomorInduk: "198501012010122001", jabatan: "Tendik", tugas: "Administrasi data" }],
  });

  // C.2: tambah tabel tanpa judul + penanda belum ada bukti, lalu gambar unggahan
  const d = (await drafBagian(pj, proyekId, "C.2"))["C.2-IKU-a.i.I"].aktif!;
  const isi = structuredClone(d.isi);
  isi.content.push(
    { type: "paragraph", attrs: { sumber: "J" }, content: [{ type: "text", text: "Rencana audit. [BELUM ADA BUKTI: laporan audit]" }] },
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Unit" }] }] }] }] },
  );
  await simpanSuntingan(pj, proyekId, "C.2-IKU-a.i.I", isi);
  for (const k of bagian) await tandaiBagianSelesai(pj, proyekId, k);
  cek = await periksaEkspor(pj, proyekId);
  assert.ok(cek.galat.some((g) => /BELUM ADA BUKTI/.test(g)), JSON.stringify(cek.galat));
  assert.ok(cek.galat.some((g) => /tabel tanpa judul/i.test(g)));

  isi.content.splice(isi.content.length - 2, 2,
    { type: "paragraph", attrs: { sumber: "J" }, content: [{ type: "text", text: "Rencana audit internal tahunan." }] },
    { type: "paragraph", attrs: { peran: "judul-tabel" }, content: [{ type: "text", text: "Unit kerja UPPS" }] },
    { type: "table", content: [
      { type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Unit" }] }] }] },
      { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Gugus Kendali Mutu" }] }] }] },
    ] },
    simpulGambar({ id: gambarId, judul: "Struktur organisasi UPPS", namaBerkas: "struktur-organisasi.png", jenis: "gambar" }),
  );
  await simpanSuntingan(pj, proyekId, "C.2-IKU-a.i.I", isi);
  await tandaiBagianSelesai(pj, proyekId, "C.2");
  cek = await periksaEkspor(pj, proyekId);
  assert.deepEqual(cek.galat, []);
  assert.equal(cek.templateAda, true);
});

test("F-22/F-23/F-24 berkas Word: instruksi, catatan, dan kotak isian hilang; data proyek terisi; tabel dan gambar bernomor; field daftar", { skip: lewati }, async () => {
  const e = await mulaiEkspor(pj, proyekId);
  assert.equal(e.status, "antre");
  await assert.rejects(mulaiEkspor(pj, proyekId), GalatPengguna, "satu ekspor berjalan per proyek");
  assert.equal(await prosesEkspor(e.id), "siap");
  const [x] = await daftarEkspor(pj, proyekId);
  assert.equal(x.status, "siap");
  assert.ok(x.jumlahHalaman && x.jumlahHalaman > 10 && x.jumlahHalaman <= 150, `halaman ${x.jumlahHalaman}`);
  console.log(`[uji] ekspor ${x.jumlahHalaman} halaman (${x.halamanPerkiraan ? "perkiraan" : "dihitung LibreOffice"})`);

  const { isi } = await berkasEkspor(pj, e.id);
  await assert.rejects(berkasEkspor(pjLain, e.id), GalatAkses);
  // SIMPAN_EKSPOR=<jalur.docx> menyimpan hasil untuk diperiksa manual di Word
  if (process.env.SIMPAN_EKSPOR) writeFileSync(process.env.SIMPAN_EKSPOR, isi);
  const zip = await JSZip.loadAsync(isi);
  const doc = await zip.file("word/document.xml")!.async("string");
  const teks = pecahBody(doc).elemen.map((el) => teksElemen(el.xml)).join("\n");
  assert.ok(!doc.includes("{{"), "tidak ada placeholder tersisa");
  assert.ok(!/Bagian ini (menjelaskan|berisi|mendeskripsikan)/.test(teks), "instruksi template hilang");
  assert.ok(!/disampaikan oleh pengusul/i.test(doc), "catatan biru hilang");
  assert.ok(!/\.{10,}/.test(teks), "tidak ada isian titik-titik tersisa");
  assert.ok(!/DD – MM – YYYY/.test(doc));
  assert.ok(teks.includes("PROGRAM SARJANA TEKNIK CONTOH"));
  assert.ok(teks.includes("UNIVERSITAS CONTOH") && teks.includes("BANDAR LAMPUNG"));
  assert.ok(teks.includes("Perguruan Tinggi: Universitas Contoh"));
  assert.ok(teks.includes("Dr. Ani Lestari") && teks.includes("Citra Dewi"), "tim penyusun dan Tabel 2.1/2.2 terisi");
  assert.ok(teks.includes("Program studi menjalankan kebijakan secara terencana"));
  assert.ok(teks.includes("Tabel 2.3. Unit kerja UPPS"), "tabel bernomor per bab, setelah Tabel 2.1 dan 2.2 template");
  assert.ok(teks.includes("Gambar 2.1. Struktur organisasi UPPS"));
  assert.ok(Object.keys(zip.files).some((f) => f.startsWith("word/media/") && f.endsWith(".png") && !/image[1-4]0?\.png$/.test(f)), "gambar unggahan disisipkan utuh");
  assert.ok(/TC &quot;Tabel 2\.3|TC "Tabel 2\.3/.test(doc), "entri daftar tabel");
  assert.ok(/TOC \\h \\z \\f t/.test(doc) && /TOC \\h \\z \\f g/.test(doc), "field Daftar Tabel dan Daftar Gambar");
  assert.ok(teks.includes("DAFTAR TABEL") && teks.includes("DAFTAR GAMBAR"));
  assert.ok(/<w:jc w:val="both"\/>/.test(doc), "paragraf rata kiri-kanan");
  assert.ok(/w:ascii="Arial"/.test(doc));
  assert.ok((await zip.file("word/settings.xml")!.async("string")).includes('<w:updateFields w:val="true"/>'));
  assert.ok(doc.includes("<w:i/>") || doc.includes('<w:i w:val="true"/>'), "istilah asing miring");
  assert.ok(!/Sumber: /.test(teks), "penanda sumber tidak ikut diekspor");
  // sub-bagian khusus jenjang lain (PPI) tidak ada di LED Sarjana
  assert.ok(!/Program Profesi Insinyur \(DTPSPPI\)/.test(teks));
});

test("Template LEDPS per versi: super admin mengunggah .docx, laporan pemetaan per jenjang; berkas lain ditolak", { skip: lewati }, async () => {
  const versi = await prisma.versiInstrumen.findFirstOrThrow();
  await assert.rejects(unggahTemplateLed(admin, versi.id, { nama: "bukan.docx", isi: Buffer.from("bukan zip") }), GalatPengguna);
  await assert.rejects(unggahTemplateLed(admin, versi.id, { nama: "template.pdf", isi: readFileSync(TEMPLATE) }), GalatPengguna);
  await assert.rejects(unggahTemplateLed(pj, versi.id, { nama: "t.docx", isi: readFileSync(TEMPLATE) }), GalatAkses);
  const laporan = await unggahTemplateLed(admin, versi.id, { nama: "Template LEDPS.docx", isi: readFileSync(TEMPLATE) });
  for (const [jenjang, l] of Object.entries(laporan)) assert.deepEqual(l.tidakDitemukan, [], `semua sub-bagian ${jenjang} terpetakan`);
  assert.ok(laporan.S1.placeholder >= 100);
  const info = await infoTemplateLed(admin, versi.id);
  assert.equal(info.nama, "Template LEDPS.docx");
  // ekspor memakai template unggahan
  const e = await mulaiEkspor(pj, proyekId);
  assert.equal(await prosesEkspor(e.id), "siap");
});

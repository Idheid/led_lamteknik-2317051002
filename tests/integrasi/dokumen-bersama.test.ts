import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { simpanProdi } from "@/modules/bersama/data/organisasi";
import { aturArsipProyek, buatProyek, daftarProyek, hapusProyek, simpanJawaban, ubahNamaProyek } from "@/modules/led/data/proyek";
import {
  berkasDokumen, daftarDokumen, daftarDokumenBersama, hapusDokumen, ringkasanBahan, unggahDokumen, unggahDokumenBersama,
} from "@/modules/led/data/dokumen";
import { cariPotongan } from "@/modules/led/data/pencarian";
import { mulaiGenerate } from "@/modules/led/data/generate";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { susunKonteks } from "@/modules/led/proses/generate";
import { bersihkanDb, buatSuperAdmin, imporSeed, siapkanPj } from "./bantu";

let admin: Pengguna;
let pj: Pengguna;
let proyekA: string;
let proyekB: string;
let dokBersama: string;

async function docx(paragraf: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] })));
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  const ti = await simpanProdi(pj, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} });
  const sipil = await simpanProdi(pj, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "2", identitas: {} });
  proyekA = (await buatProyek(pj, { prodiId: ti.id, nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  proyekB = (await buatProyek(pj, { prodiId: sipil.id, nama: "LED Sipil 2026", tahunPengajuan: 2026 })).id;

  const d = await unggahDokumenBersama(pj, {
    nama: "renstra-fakultas.docx",
    isi: await docx([
      "Renstra Fakultas Teknik 2025 menetapkan visi fakultas sebagai pusat rekayasa unggul dan sasaran mutu laboratorium terakreditasi.",
      "Tinjauan visi misi fakultas dilakukan setiap tahun bersama pemangku kepentingan.",
    ]),
  });
  await prosesDokumen(d.id);
  dokBersama = d.id;
});
after(() => prisma.$disconnect());

test("U-10 dokumen bersama fakultas: diunggah PJ sekali, dipakai semua LED, kode sumber U", async () => {
  await assert.rejects(unggahDokumenBersama(admin, { nama: "x.docx", isi: await docx(["x"]) }), GalatAkses, "admin tidak mengurus dokumen");
  assert.equal((await daftarDokumenBersama(pj))[0].status, "siap");

  for (const proyekId of [proyekA, proyekB]) {
    const r = await cariPotongan(pj, proyekId, "renstra fakultas visi sasaran mutu laboratorium");
    assert.ok(r.hasil.some((h) => h.bersama && h.dokumenId === dokBersama), "setiap LED menemukan dokumen bersama");
  }

  // dokumen LED tetap D1, dokumen bersama U1
  const dp = await unggahDokumen(pj, proyekA, { nama: "notulen.docx", isi: await docx(["Notulen tinjauan visi keilmuan program studi Teknik Informatika."]), subBagianKode: "C.1-IKU-a" });
  await prosesDokumen(dp.id);
  const k = await susunKonteks(proyekA, "C.1-IKU-a");
  assert.ok(k.konteks.potongan.some((x) => x.id === "U1"));
  assert.ok(k.konteks.potongan.some((x) => x.id === "D1"));
  assert.match(k.legenda.U1, /^Bahan bersama/);
  assert.ok(k.rujukan.sumberSah.includes("U1"), "kode U sah di pemeriksaan sumber");
  // dokumen LED A tidak terlihat dari LED B
  assert.ok(!(await cariPotongan(pj, proyekB, "notulen tinjauan visi keilmuan")).hasil.some((h) => h.dokumenId === dp.id));

  const daftar = await daftarDokumen(pj, proyekB);
  assert.ok(daftar.find((x) => x.id === dokBersama)?.bersama);
  assert.equal((await ringkasanBahan(pj, proyekB)).bersama, 1);
  await berkasDokumen(pj, dokBersama);
  await assert.rejects(berkasDokumen(admin, dokBersama), GalatAkses);
  await assert.rejects(hapusDokumen(admin, dokBersama), GalatAkses);
});

test("LED: ubah nama, arsip (hanya baca), aktifkan kembali, hapus dengan konfirmasi nama; dokumen bersama tidak ikut terhapus", async () => {
  await ubahNamaProyek(pj, proyekA, "LED Teknik Informatika 2026");
  await assert.rejects(ubahNamaProyek(admin, proyekA, "Ambil alih"), GalatAkses);
  await aturArsipProyek(pj, proyekA, true);
  assert.ok((await daftarProyek(pj)).find((x) => x.id === proyekA)?.diarsipkanPada);
  await assert.rejects(simpanJawaban(pj, { proyekId: proyekA, subBagianKode: "C.1-LB", isi: "x" }), GalatPengguna);
  await assert.rejects(mulaiGenerate(pj, proyekA, "C.1"), GalatPengguna);
  await assert.rejects(unggahDokumen(pj, proyekA, { nama: "a.docx", isi: await docx(["a"]) }), GalatPengguna);
  await aturArsipProyek(pj, proyekA, false);
  await simpanJawaban(pj, { proyekId: proyekA, subBagianKode: "C.1-LB", isi: "Bisa diubah lagi." });

  await assert.rejects(hapusProyek(pj, proyekA, "LED TI 2026"), GalatPengguna, "nama lama tidak cocok");
  await assert.rejects(hapusProyek(admin, proyekA, "LED Teknik Informatika 2026"), GalatAkses);
  await hapusProyek(pj, proyekA, "LED Teknik Informatika 2026");
  assert.equal(await prisma.proyekLED.count({ where: { id: proyekA } }), 0);
  assert.equal(await prisma.dokumen.count({ where: { proyekId: proyekA } }), 0);
  assert.equal(await prisma.dokumen.count({ where: { id: dokBersama } }), 1, "dokumen bersama tidak ikut terhapus");
});

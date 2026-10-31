import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { aturArsipProyek, buatProyek, daftarProyek, hapusProyek, simpanJawaban, ubahNamaProyek } from "@/modules/led/data/proyek";
import {
  berkasDokumen, daftarDokumen, daftarDokumenBersama, hapusDokumen, ringkasanBahan, unggahDokumen, unggahDokumenBersama,
} from "@/modules/led/data/dokumen";
import { cariPotongan } from "@/modules/led/data/pencarian";
import { mulaiGenerate } from "@/modules/led/data/generate";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { susunKonteks } from "@/modules/led/proses/generate";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

let admin: Pengguna;
let pj: Pengguna;
let pjSipil: Pengguna;
let proyekA: string;
let proyekB: string;
let dokBersama: string;

async function docx(paragraf: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] })));
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  ({ tim: pj } = await siapkanProdi(admin, { nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} }));
  ({ tim: pjSipil } = await siapkanProdi(admin, { nama: "Teknik Sipil", jenjang: "S1", kodePddikti: "2", identitas: {} }));
  proyekA = (await buatProyek(pj, { nama: "LED TI 2026", tahunPengajuan: 2026 })).id;
  proyekB = (await buatProyek(pjSipil, { nama: "LED Sipil 2026", tahunPengajuan: 2026 })).id;

  // revisi 31 Okt 2026 (B6): Basis Pengetahuan fakultas diunggah Admin UPPS
  const d = await unggahDokumenBersama(admin, {
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

test("U-10 dokumen bersama fakultas: diunggah Admin UPPS sekali, dipakai semua LED, kode sumber U", async () => {
  await assert.rejects(unggahDokumenBersama(pj, { nama: "x.docx", isi: await docx(["x"]) }), GalatAkses, "Tim Prodi hanya melihat dokumen fakultas");
  assert.equal((await daftarDokumenBersama(pj))[0].status, "siap");
  assert.equal((await daftarDokumenBersama(admin))[0].status, "siap");

  for (const [tim, proyekId] of [[pj, proyekA], [pjSipil, proyekB]] as const) {
    const r = await cariPotongan(tim, proyekId, "renstra fakultas visi sasaran mutu laboratorium");
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
  assert.ok(!(await cariPotongan(pjSipil, proyekB, "notulen tinjauan visi keilmuan")).hasil.some((h) => h.dokumenId === dp.id));
  // Tim Prodi prodi lain tidak bisa membuka LED A
  await assert.rejects(cariPotongan(pjSipil, proyekA, "notulen"), GalatAkses);

  const daftar = await daftarDokumen(pjSipil, proyekB);
  assert.ok(daftar.find((x) => x.id === dokBersama)?.bersama);
  assert.equal((await ringkasanBahan(pjSipil, proyekB)).bersama, 1);
  await berkasDokumen(pj, dokBersama);
  await berkasDokumen(admin, dokBersama);
  await assert.rejects(hapusDokumen(pj, dokBersama), GalatAkses, "Tim Prodi tidak menghapus dokumen fakultas");
  await assert.rejects(hapusDokumen(pjSipil, dp.id), GalatAkses, "dokumen LED prodi lain");
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

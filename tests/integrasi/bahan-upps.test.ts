import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { buatAkunPenanggungJawab, simpanProdi, simpanUpps } from "@/lib/data/organisasi";
import { aturArsipProyek, buatProyek, daftarProyek, hapusProyek, simpanJawaban, ubahNamaProyek } from "@/lib/data/proyek";
import {
  berkasDokumen, daftarDokumen, daftarDokumenUpps, hapusDokumen, ringkasanBahan, unggahDokumen, unggahDokumenUpps,
} from "@/lib/data/dokumen";
import { cariPotongan } from "@/lib/data/pencarian";
import { mulaiGenerate } from "@/lib/data/generate";
import { prosesDokumen } from "@/lib/proses/dokumen";
import { susunKonteks } from "@/lib/proses/generate";
import { bersihkanDb, buatSuperAdmin, imporSeed, penggunaDari } from "./bantu";

let admin: Pengguna;
let pjA: Pengguna;
let pjB: Pengguna;
let proyekA: string;
let proyekB: string;
let dokUpps: string;

async function docx(paragraf: string[]): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: paragraf.map((t) => new Paragraph(t)) }] })));
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  const ft = await simpanUpps(admin, { kode: "FT", nama: "Fakultas Teknik", perguruanTinggi: "Universitas Contoh", alamat: "" });
  const fmipa = await simpanUpps(admin, { kode: "FMIPA", nama: "FMIPA", perguruanTinggi: "Universitas Contoh", alamat: "" });
  const ti = await simpanProdi(admin, { uppsId: ft.id, nama: "Teknik Informatika", jenjang: "S1", kodePddikti: "1", identitas: {} });
  const mat = await simpanProdi(admin, { uppsId: fmipa.id, nama: "Matematika", jenjang: "S1", kodePddikti: "2", identitas: {} });
  pjA = await penggunaDari((await buatAkunPenanggungJawab(admin, { prodiId: ti.id, nama: "PJ TI", email: "a@uji.test", kataSandi: "SandiPJ#123" })).id);
  pjB = await penggunaDari((await buatAkunPenanggungJawab(admin, { prodiId: mat.id, nama: "PJ Mat", email: "b@uji.test", kataSandi: "SandiPJ#123" })).id);
  const versi = await prisma.versiInstrumen.findFirstOrThrow();
  proyekA = (await buatProyek(pjA, { nama: "LED TI 2026", versiId: versi.id, tsTahunMulai: 2025 })).id;
  proyekB = (await buatProyek(pjB, { nama: "LED Mat 2026", versiId: versi.id, tsTahunMulai: 2025 })).id;

  const diharapkan = await prisma.dokumenDiharapkan.findFirstOrThrow({ where: { butir: { versiId: versi.id, jenjang: "S1", kode: "1" } } });
  const d = await unggahDokumenUpps(admin, ft.id, {
    nama: "renstra-fakultas.docx",
    isi: await docx([
      "Renstra Fakultas Teknik 2025 menetapkan visi fakultas sebagai pusat rekayasa unggul dan sasaran mutu laboratorium terakreditasi.",
      "Tinjauan visi misi fakultas dilakukan setiap tahun bersama pemangku kepentingan.",
    ]),
    dokumenDiharapkanId: diharapkan.id,
  });
  await prosesDokumen(d.id);
  dokUpps = d.id;
});
after(() => prisma.$disconnect());

test("U-10 bahan bersama UPPS: diunggah super admin sekali, dipakai prodi di UPPS itu, tidak terlihat UPPS lain", async () => {
  const ft = await prisma.upps.findFirstOrThrow({ where: { kode: "FT" } });
  await assert.rejects(unggahDokumenUpps(pjA, ft.id, { nama: "x.docx", isi: await docx(["x"]) }), GalatAkses);
  assert.equal((await daftarDokumenUpps(admin, ft.id))[0].status, "siap");

  const a = await cariPotongan(pjA, proyekA, "renstra fakultas visi sasaran mutu laboratorium");
  assert.ok(a.hasil.some((h) => h.bersama && h.dokumenId === dokUpps), "prodi di UPPS yang sama menemukan bahan bersama");
  const b = await cariPotongan(pjB, proyekB, "renstra fakultas visi sasaran mutu laboratorium");
  assert.ok(!b.hasil.some((h) => h.dokumenId === dokUpps), "prodi UPPS lain tidak");

  // dokumen proyek tetap D1, bahan bersama U1
  const dp = await unggahDokumen(pjA, proyekA, { nama: "notulen.docx", isi: await docx(["Notulen tinjauan visi keilmuan program studi Teknik Informatika."]), subBagianKode: "C.1-IKU-a" });
  await prosesDokumen(dp.id);
  const k = await susunKonteks(proyekA, "C.1-IKU-a");
  assert.ok(k.konteks.potongan.some((x) => x.id === "U1"));
  assert.ok(k.konteks.potongan.some((x) => x.id === "D1"));
  assert.match(k.legenda.U1, /^Bahan bersama UPPS/);
  assert.ok(k.rujukan.sumberSah.includes("U1"), "kode U sah di pemeriksaan sumber");

  // daftar dokumen: ikut tampil (hanya baca), memenuhi daftar cek
  const daftar = await daftarDokumen(pjA, proyekA);
  assert.ok(daftar.find((x) => x.id === dokUpps)?.bersama);
  assert.ok(!(await daftarDokumen(pjB, proyekB)).some((x) => x.id === dokUpps));
  assert.equal((await ringkasanBahan(pjA, proyekA)).terpenuhi, 1);
  assert.equal((await ringkasanBahan(pjA, proyekA)).bersama, 1);
  assert.equal((await ringkasanBahan(pjB, proyekB)).terpenuhi, 0);

  await berkasDokumen(pjA, dokUpps); // boleh membaca
  await assert.rejects(berkasDokumen(pjB, dokUpps), GalatAkses);
  await assert.rejects(hapusDokumen(pjA, dokUpps), GalatAkses, "penanggung jawab tidak bisa menghapus bahan bersama");
});

test("Proyek: ubah nama, arsip (hanya baca), aktifkan kembali, hapus dengan konfirmasi nama", async () => {
  await ubahNamaProyek(pjA, proyekA, "LED Teknik Informatika 2026");
  await assert.rejects(ubahNamaProyek(pjB, proyekA, "Ambil alih"), GalatAkses);
  await aturArsipProyek(pjA, proyekA, true);
  assert.ok((await daftarProyek(pjA))[0].diarsipkanPada);
  await assert.rejects(simpanJawaban(pjA, { proyekId: proyekA, subBagianKode: "C.1-LB", isi: "x" }), GalatPengguna);
  await assert.rejects(mulaiGenerate(pjA, proyekA, "C.1"), GalatPengguna);
  await assert.rejects(unggahDokumen(pjA, proyekA, { nama: "a.docx", isi: await docx(["a"]) }), GalatPengguna);
  await aturArsipProyek(pjA, proyekA, false);
  await simpanJawaban(pjA, { proyekId: proyekA, subBagianKode: "C.1-LB", isi: "Bisa diubah lagi." });

  await assert.rejects(hapusProyek(pjA, proyekA, "LED TI 2026"), GalatPengguna, "nama lama tidak cocok");
  await assert.rejects(hapusProyek(pjB, proyekA, "LED Teknik Informatika 2026"), GalatAkses);
  await hapusProyek(pjA, proyekA, "LED Teknik Informatika 2026");
  assert.equal(await prisma.proyekLED.count({ where: { id: proyekA } }), 0);
  assert.equal(await prisma.dokumen.count({ where: { proyekId: proyekA } }), 0);
  assert.equal(await prisma.dokumen.count({ where: { id: dokUpps } }), 1, "bahan bersama UPPS tidak ikut terhapus");
});

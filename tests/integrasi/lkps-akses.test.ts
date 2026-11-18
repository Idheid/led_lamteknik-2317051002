import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { bacaKerjasama, gantiKerjasama } from "@/modules/lkps/data/kerjasama";
import { bacaKeuangan, simpanLab } from "@/modules/lkps/data/keuangan";
import { berkasBukti, unggahBukti } from "@/modules/lkps/data/bukti";
import { prodiAktifLkps } from "@/modules/lkps/data/prodi-aktif";
import { bersihkanDb, buatAdmin, buatTimProdi, imporSeed, penggunaDari } from "./bantu";

/** Gabung LKPS G4 (RENCANA-GABUNG-LKPS G4 butir 7): hak akses lapisan data modul LKPS. */

let admin: Pengguna, timA: Pengguna, timB: Pengguna, asesor: Pengguna, tamu: Pengguna;
let prodiA: string, prodiB: string;

const kerjasama = (nama: string) => ({
  namaLembaga: nama, tingkat: "Nasional", judulKegiatan: "Magang", manfaat: "", tanggalMulai: "2026-01-01", tanggalAkhir: "2027-01-01", jenisKerjasama: "N1",
});

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  prodiA = (await prisma.prodi.create({ data: { nama: "Teknik A", jenjang: "S1" } })).id;
  prodiB = (await prisma.prodi.create({ data: { nama: "Teknik B", jenjang: "D3" } })).id;
  timA = await buatTimProdi(admin, prodiA, "tim.a@uji.test");
  timB = await buatTimProdi(admin, prodiB, "tim.b@uji.test");
  asesor = await penggunaDari((await prisma.user.create({ data: { id: "asesor-lkps", name: "Asesor", email: "asesor@uji.test", emailVerified: true, role: "ASESOR" } })).id);
  // keputusan ⏸ G4: Asesor hanya membaca LKPS prodi yang LED-nya ditugaskan (di sini LED prodi A)
  const versi = await prisma.versiInstrumen.findFirstOrThrow();
  await prisma.proyekLED.create({
    data: { prodiId: prodiA, versiId: versi.id, jenjang: "S1", nama: "LED A", tsTahunMulai: 2025, anggaran: {}, tahunPengajuan: 2026, asesorId: asesor.id },
  });
  tamu = await penggunaDari((await prisma.user.create({ data: { id: "tamu-lkps", name: "Tamu", email: "tamu@uji.test", emailVerified: true, role: "TAMU" } })).id);
});

after(() => prisma.$disconnect());

test("Tim Prodi A menyimpan dan membaca prodi A; ganti semua A tidak menyentuh B", async () => {
  await gantiKerjasama(timB, prodiB, { rows: [kerjasama("Mitra B")] });
  await gantiKerjasama(timA, prodiA, { rows: [kerjasama("Mitra A1"), kerjasama("Mitra A2")] });
  await gantiKerjasama(timA, prodiA, { rows: [kerjasama("Mitra A3")] });
  assert.deepEqual((await bacaKerjasama(timA, prodiA)).map((k) => k.namaLembaga), ["Mitra A3"]);
  assert.deepEqual((await bacaKerjasama(timB, prodiB)).map((k) => k.namaLembaga), ["Mitra B"]);
});

test("Tim Prodi A tidak bisa membaca/mengubah prodi B, termasuk lewat id baris B", async () => {
  await assert.rejects(bacaKerjasama(timA, prodiB), GalatAkses);
  await assert.rejects(gantiKerjasama(timA, prodiB, { rows: [] }), GalatAkses);
  const labB = await simpanLab(timB, prodiB, { namaLab: "Lab B", jenisPeralatan: "PC", kepemilikan: "Milik Sendiri", kondisi: "Baik" });
  await assert.rejects(simpanLab(timA, prodiA, { id: labB.id, namaLab: "Diambil", jenisPeralatan: "x", kepemilikan: "x", kondisi: "x" }), GalatAkses);
  assert.equal((await bacaKeuangan(timB, prodiB)).lab[0].namaLab, "Lab B");
  // prodi aktif Tim Prodi selalu prodinya sendiri walau memilih prodi lain
  assert.equal(await prodiAktifLkps(timA, prodiB), prodiA);
});

test("Admin membaca, menulis isian kriteria ditolak; tanpa pilihan prodi → null", async () => {
  assert.equal((await bacaKerjasama(admin, prodiB)).length, 1);
  await assert.rejects(gantiKerjasama(admin, prodiB, { rows: [] }), GalatAkses);
  assert.equal(await prodiAktifLkps(admin, null), null);
  assert.equal(await prodiAktifLkps(admin, "tidak-ada"), null);
  assert.equal(await prodiAktifLkps(admin, prodiB), prodiB);
});

test("Asesor hanya membaca prodi yang LED-nya ditugaskan dan tidak bisa menulis; Tamu ditolak", async () => {
  assert.equal((await bacaKerjasama(asesor, prodiA)).length, 1);
  await assert.rejects(bacaKerjasama(asesor, prodiB), GalatAkses);
  assert.equal(await prodiAktifLkps(asesor, prodiA), prodiA);
  assert.equal(await prodiAktifLkps(asesor, prodiB), null);
  await assert.rejects(gantiKerjasama(asesor, prodiA, { rows: [] }), GalatAkses);
  await assert.rejects(bacaKerjasama(tamu, prodiA), GalatAkses);
  await assert.rejects(prodiAktifLkps(tamu, prodiA), GalatAkses);
});

test("bukti: unggah per prodi, unduh hanya pembaca prodi itu; rujukan bukti prodi lain ditolak", async () => {
  const pdf = Buffer.from("%PDF-1.7 uji");
  const u = await unggahBukti(timA, prodiA, { nama: "MoU.pdf", isi: pdf });
  const kunci = new URL(u.url, "http://x").searchParams.get("kunci")!;
  assert.deepEqual((await berkasBukti(admin, kunci)).isi, pdf);
  await assert.rejects(berkasBukti(timB, kunci), GalatAkses);
  await assert.rejects(berkasBukti(tamu, kunci), GalatAkses);
  await assert.rejects(gantiKerjasama(timB, prodiB, { rows: [{ ...kerjasama("Curang"), fileMou: u.url }] }), GalatAkses);
  await gantiKerjasama(timA, prodiA, { rows: [{ ...kerjasama("Dengan MoU"), fileMou: u.url }] });
  assert.equal((await bacaKerjasama(timA, prodiA))[0].fileMou, u.url);
});

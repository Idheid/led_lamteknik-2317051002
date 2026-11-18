import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { bacaKerjasama, gantiKerjasama } from "@/modules/lkps/data/kerjasama";
import { bacaKeuangan, simpanLab } from "@/modules/lkps/data/keuangan";
import { berkasBukti, unggahBukti } from "@/modules/lkps/data/bukti";
import { pilihanProdiLkps, prodiAktifLkps } from "@/modules/lkps/data/prodi-aktif";
import { kriteriaTambahanAktif, progresLkps } from "@/modules/lkps/data/beranda";
import { GalatOneDataMati, sinkronOneData } from "@/modules/lkps/data/onedata/sinkron";
import { lupakanTokenOneData } from "@/modules/lkps/data/onedata/klien";
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

test("G5: pemilih prodi (Admin semua, Asesor hanya yang ditugaskan, Tim Prodi prodinya) dan progres beranda", async () => {
  const idAdmin = (await pilihanProdiLkps(admin)).map((x) => x.id);
  assert.ok(idAdmin.includes(prodiA) && idAdmin.includes(prodiB));
  assert.deepEqual((await pilihanProdiLkps(asesor)).map((x) => x.id), [prodiA]);
  assert.deepEqual((await pilihanProdiLkps(timB)).map((x) => x.id), [prodiB]);
  await assert.rejects(pilihanProdiLkps(tamu), GalatAkses);
  // prodi A punya kerja sama (uji sebelumnya), prodi B punya lab: progres per prodi, tidak tercampur
  assert.equal((await progresLkps(timA, prodiA))[1], 100);
  assert.equal((await progresLkps(timB, prodiB))[4], 50);
  assert.equal((await progresLkps(timB, prodiB))[1], 100);
  await assert.rejects(progresLkps(asesor, prodiB), GalatAkses);
  await assert.rejects(progresLkps(timA, prodiB), GalatAkses);
  assert.ok(Array.isArray(await kriteriaTambahanAktif(asesor)));
});

test("G6: sinkron One Data mati secara bawaan; menyala (fetch palsu) hanya menulis prodi aktif", async () => {
  const simpan = { ...process.env };
  const fetchAsli = globalThis.fetch;
  try {
    delete process.env.LKPS_ONEDATA_AKTIF;
    await assert.rejects(sinkronOneData(timA, prodiA, { domain: "kerjasama" }), GalatOneDataMati);
    await assert.rejects(sinkronOneData(admin, prodiA, {}), GalatAkses);
    await assert.rejects(sinkronOneData(asesor, prodiA, {}), GalatAkses);
    await assert.rejects(sinkronOneData(tamu, prodiA, {}), GalatAkses);

    Object.assign(process.env, {
      LKPS_ONEDATA_AKTIF: "true", MYUNILA_API_URL: "https://contoh.invalid", MYUNILA_APP_ID: "a", MYUNILA_USERNAME: "u", MYUNILA_PASSWORD: "p",
    });
    let login = 0;
    globalThis.fetch = (async (masukan: string | URL | Request) => {
      const url = String(masukan);
      if (url.endsWith("/v1/auth/login")) { login++; return Response.json({ data: { access_token: "t", expires_in: 3600 } }); }
      if (url.includes("/v1/kerjasama/sms_kerjasama")) {
        return Response.json({ data: [{ judul_mou: "Riset bersama", nm_sms: "Mitra One Data", create_date: "2026-02-01" }] });
      }
      return Response.json({ data: [] });
    }) as typeof fetch;
    // prodi uji bernama "Teknik A" tidak ada di pemetaan id_sms → galat pengguna
    await assert.rejects(sinkronOneData(timA, prodiA, { domain: "kerjasama" }), /belum dipetakan/);
    await prisma.prodi.update({ where: { id: prodiA }, data: { nama: "Teknik Informatika A" } });
    const sebelumB = (await bacaKerjasama(timB, prodiB)).map((k) => k.namaLembaga);
    const hasil = await sinkronOneData(timA, prodiA, { domain: "kerjasama" });
    assert.ok(hasil.stats.kerjasama >= 1);
    assert.ok((await bacaKerjasama(timA, prodiA)).every((k) => k.namaLembaga === "Mitra One Data" && k.jenisKerjasama === "N2"));
    assert.deepEqual((await bacaKerjasama(timB, prodiB)).map((k) => k.namaLembaga), sebelumB);
    await sinkronOneData(timA, prodiA, { domain: "kerjasama" });
    assert.equal(login, 1);
    // One Data kosong untuk mata kuliah → data lama tidak dihapus
    const hasilMk = await sinkronOneData(timA, prodiA, { domain: "pendidikan" });
    assert.equal(hasilMk.stats.pendidikan, 0);
  } finally {
    process.env = simpan;
    globalThis.fetch = fetchAsli;
    lupakanTokenOneData();
  }
});

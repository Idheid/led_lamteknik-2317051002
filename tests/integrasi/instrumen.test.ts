import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna } from "@/lib/akses";
import { imporInstrumen } from "@/lib/data/impor-instrumen";
import {
  ambilVersi, aturAktifVersi, daftarVersi, hapusButir, hapusVersi, salinVersi, simpanButir, simpanSubBagian,
} from "@/lib/data/instrumen";
import { buatAkunPenanggungJawab, simpanProdi, simpanUpps } from "@/lib/data/organisasi";
import { buatProyek, halamanBagian } from "@/lib/data/proyek";
import { bacaSeed, bersihkanDb, buatSuperAdmin, imporSeed, penggunaDari } from "./bantu";

before(bersihkanDb);
after(() => prisma.$disconnect());

test("F-06 seed: 1 versi, 14 bagian, 125 sub-bagian, 72 butir Sarjana, bobot 100,01; idempoten", async () => {
  const pertama = await imporSeed();
  assert.equal(pertama.dibuat, true);
  const kedua = await imporInstrumen(prisma, bacaSeed());
  assert.equal(kedua.dibuat, false);
  assert.equal(kedua.versiId, pertama.versiId);

  assert.equal(await prisma.versiInstrumen.count(), 1);
  assert.equal(await prisma.bagian.count({ where: { versiId: pertama.versiId } }), 14);
  assert.equal(await prisma.subBagian.count({ where: { bagian: { versiId: pertama.versiId } } }), 125);
  const butir = await prisma.butirPenilaian.aggregate({
    where: { versiId: pertama.versiId, jenjang: "S1" },
    _count: { _all: true },
    _sum: { bobot: true },
  });
  assert.equal(butir._count._all, 72);
  assert.equal(Number(butir._sum.bobot), 100.01);
  assert.equal(await prisma.butirSubBagian.count(), 72);
  const v = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id: pertama.versiId } });
  const halaman = (v.anggaranBawaan as { halamanPerBagian: Record<string, number> }).halamanPerBagian;
  assert.equal(Object.values(halaman).reduce((s, n) => s + n, 0), 150);
});

test("F-03/F-04/F-05 salin versi lalu tambah butir: proyek lama tetap memakai versi lamanya", async () => {
  const admin = await buatSuperAdmin();
  const versi = await prisma.versiInstrumen.findFirstOrThrow({ where: { kode: "LAMTEKNIK-2025-PASCA" } });
  const upps = await simpanUpps(admin, { kode: "FT", nama: "Fakultas Teknik", perguruanTinggi: "Universitas Uji", alamat: "" });
  const prodi = await simpanProdi(admin, { uppsId: upps.id, nama: "Teknik Uji", jenjang: "S1", kodePddikti: "99999", identitas: {} });
  const akun = await buatAkunPenanggungJawab(admin, { prodiId: prodi.id, nama: "PJ Uji", email: "pj@uji.test", kataSandi: "SandiPJ#123" });
  const pj = await penggunaDari(akun.id);
  const proyek = await buatProyek(pj, { nama: "LED 2026", versiId: versi.id, tsTahunMulai: 2025 });
  assert.equal(proyek.versiId, versi.id);

  // versi yang dipakai proyek terkunci: tidak bisa dihapus atau diubah
  await assert.rejects(hapusVersi(admin, versi.id), GalatPengguna);
  const subC3 = await prisma.subBagian.findFirstOrThrow({ where: { kode: "C.3-IKU-a.01", bagian: { versiId: versi.id } } });
  const masukanButir = {
    jenjang: "S1" as const, kode: "99", no: 99, sub: "", urutan: 99, bagianKode: "C.3", elemen: "Elemen uji",
    indikator: "Indikator uji", bobot: 1, jenis: "narasi" as const, tabelLkps: [], deskriptorSkor4: "(1) Unsur uji.",
    unsurSkor4: ["Unsur uji"], pertanyaanPemandu: "", dokumenPendukung: ["Dokumen uji"], subBagianIds: [subC3.id], catatan: "",
  };
  await assert.rejects(simpanButir(admin, versi.id, masukanButir), GalatPengguna);

  // salin: isi sama, nonaktif, kode unik
  const salinan = await salinVersi(admin, versi.id);
  assert.equal(salinan.aktif, false);
  assert.equal(salinan.kode, "LAMTEKNIK-2025-PASCA-SALINAN");
  assert.equal(salinan.disalinDariId, versi.id);
  assert.equal(await prisma.bagian.count({ where: { versiId: salinan.id } }), 14);
  assert.equal(await prisma.subBagian.count({ where: { bagian: { versiId: salinan.id } } }), 125);
  assert.equal(await prisma.butirPenilaian.count({ where: { versiId: salinan.id } }), 72);
  assert.equal(await prisma.butirSubBagian.count({ where: { butir: { versiId: salinan.id } } }), 72);
  assert.equal(
    await prisma.dokumenDiharapkan.count({ where: { butir: { versiId: salinan.id } } }),
    await prisma.dokumenDiharapkan.count({ where: { butir: { versiId: versi.id } } }),
  );
  assert.equal(await prisma.tabelLkpsAcuan.count({ where: { versiId: salinan.id } }), 35);
  // pemetaan salinan menunjuk sub-bagian salinan, bukan sub-bagian versi lama
  const silang = await prisma.butirSubBagian.count({
    where: { butir: { versiId: salinan.id }, subBagian: { bagian: { versiId: versi.id } } },
  });
  assert.equal(silang, 0);

  // tambah satu butir di salinan
  const subSalinan = await prisma.subBagian.findFirstOrThrow({ where: { kode: "C.3-IKU-a.01", bagian: { versiId: salinan.id } } });
  const baru = await simpanButir(admin, salinan.id, { ...masukanButir, subBagianIds: [subSalinan.id] });
  assert.equal(await prisma.butirPenilaian.count({ where: { versiId: salinan.id, jenjang: "S1" } }), 73);
  assert.equal(await prisma.butirPenilaian.count({ where: { versiId: versi.id, jenjang: "S1" } }), 72);

  // proyek lama: versi dan halaman C.3 tidak berubah
  const tetap = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyek.id } });
  assert.equal(tetap.versiId, versi.id);
  const h = await halamanBagian(pj, proyek.id, "C.3");
  assert.ok(h);
  assert.ok(!h.bagian.subBagian.some((s) => s.butir.some((b) => b.kode === "99")));

  // sub-bagian baru di salinan; hapus butir; aktifkan salinan
  const c1 = await prisma.bagian.findFirstOrThrow({ where: { versiId: salinan.id, kode: "C.1" } });
  await simpanSubBagian(admin, c1.id, {
    kode: "C.1-UJI", label: "9", judul: "Sub-bagian uji", grup: "", tipe: "narasi", urutan: 99,
    varian: [{ instruksi: "Instruksi uji", jenjang: ["S1"], catatanTemplate: "" }], berlakuUntuk: ["S1"], catatan: "",
  });
  await hapusButir(admin, baru.id);
  await aturAktifVersi(admin, salinan.id, true);
  assert.equal((await daftarVersi(admin)).length, 2);
  assert.equal((await ambilVersi(admin, versi.id))?.terkunci, true);

  // salinan yang belum dipakai proyek boleh dihapus
  const salinan2 = await salinVersi(admin, versi.id);
  assert.equal(salinan2.kode, "LAMTEKNIK-2025-PASCA-SALINAN-2");
  await hapusVersi(admin, salinan2.id);
});

test("F-03 pengelolaan instrumen hanya untuk super admin", async () => {
  const akun = await prisma.user.findFirstOrThrow({ where: { email: "pj@uji.test" } });
  const pj = await penggunaDari(akun.id);
  const versi = await prisma.versiInstrumen.findFirstOrThrow({ where: { kode: "LAMTEKNIK-2025-PASCA" } });
  await assert.rejects(daftarVersi(pj), GalatAkses);
  await assert.rejects(salinVersi(pj, versi.id), GalatAkses);
});

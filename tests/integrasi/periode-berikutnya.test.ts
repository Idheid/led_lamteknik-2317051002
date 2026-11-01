import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatProyek } from "@/modules/led/data/proyek";
import { bahanUntukSalin, infoPeriodeBerikutnya, mulaiLedPeriodeBerikutnya, narasiPeriodeLalu } from "@/modules/led/data/periode";
import { susunKonteks } from "@/modules/led/proses/generate";
import { bacaBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { bersihkanDb, buatAdmin, imporSeed, siapkanFakultas, siapkanProdi } from "./bantu";

/** L4 (2 Nov 2026): Mulai LED periode berikutnya. */

let admin: Pengguna;

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
});

after(async () => {
  await prisma.$disconnect();
});

test("L4: LED lama diarsipkan dan LED baru dibuat dalam satu transaksi; gagal di tengah tidak mengarsipkan", async () => {
  const { prodi, tim } = await siapkanProdi(admin, { nama: "Teknik Periode", jenjang: "S1", kodePddikti: "70001", akreditasiBerlakuSampai: "2032-01-01", identitas: {} }, "tim.70001@uji.test");
  const { tim: timLain } = await siapkanProdi(admin, { nama: "Teknik Tetangga", jenjang: "S1", kodePddikti: "70002", identitas: {} }, "tim.70002@uji.test");
  const lama = await buatProyek(tim, { tahunPengajuan: 2026 });
  const lainLama = await buatProyek(timLain, { tahunPengajuan: 2026 });

  let info = await infoPeriodeBerikutnya(tim, new Date("2026-11-25T00:00:00.000Z"));
  assert.equal(info?.lama.id, lama.id);
  assert.equal(info?.syarat.tampilDiMenu, false, "LED draf dan akreditasi masih jauh: hanya di Pengaturan LED");
  info = await infoPeriodeBerikutnya(tim, new Date("2030-08-01T00:00:00.000Z"));
  assert.equal(info?.syarat.tampilDiMenu, true, "≤ 18 bulan sebelum berakhir");
  await assert.rejects(infoPeriodeBerikutnya(admin), GalatAkses);
  await assert.rejects(mulaiLedPeriodeBerikutnya(admin, { tahunPengajuan: 2031 }), GalatAkses);

  // penyusunan masih berjalan: ditolak, LED lama tetap aktif, tidak ada LED baru
  const tugas = await prisma.tugasGenerate.create({ data: { proyekId: lama.id, judul: "Uji", subBagianKode: [], status: "berjalan" } });
  await assert.rejects(mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031 }), /penyusunan berjalan.*LED lama tidak diarsipkan/);
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lama.id } })).diarsipkanPada, null);
  assert.equal(await prisma.proyekLED.count({ where: { prodiId: prodi.id } }), 1);
  await prisma.tugasGenerate.delete({ where: { id: tugas.id } });

  // instrumen jenjang belum aktif: ditolak sebelum apa pun berubah
  const aktif = await prisma.versiInstrumen.findMany({ where: { aktif: true }, select: { id: true } });
  await prisma.versiInstrumen.updateMany({ where: { aktif: true }, data: { aktif: false } });
  await assert.rejects(mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031 }), /belum aktif/);
  await prisma.versiInstrumen.updateMany({ where: { id: { in: aktif.map((x) => x.id) } }, data: { aktif: true } });
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lama.id } })).diarsipkanPada, null);

  const { lama: diarsip, baru } = await mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031, tsTahunMulai: 2030 });
  assert.equal(diarsip.id, lama.id);
  assert.ok((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lama.id } })).diarsipkanPada);
  assert.equal(baru.prodiId, prodi.id);
  assert.equal(baru.tahunPengajuan, 2031);
  assert.equal(baru.tsTahunMulai, 2030);
  assert.equal(await prisma.proyekLED.count({ where: { prodiId: prodi.id, diarsipkanPada: null } }), 1, "tetap satu LED aktif");
  // prodi lain tidak tersentuh
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: lainLama.id } })).diarsipkanPada, null);
  assert.equal(await prisma.logAktivitas.count({ where: { aksi: "mulai_periode_berikutnya", objekId: baru.id } }), 1);
});

test("L5: salin tim, bahan, dan dokumen yang dipilih; narasi lama hanya sebagai panel dan sumber P bila diaktifkan", async () => {
  const { tim } = await siapkanProdi(admin, { nama: "Teknik Salin", jenjang: "S1", kodePddikti: "70003", identitas: {} }, "tim.70003@uji.test");
  const lama = await buatProyek(tim, { tahunPengajuan: 2026 });
  const subAf = await prisma.subBagian.findFirstOrThrow({ where: { bagian: { versiId: lama.versiId }, kode: { endsWith: "-AF" } } });
  const subLb = await prisma.subBagian.findFirstOrThrow({ where: { bagian: { versiId: lama.versiId }, kode: { endsWith: "-LB" } } });
  await prisma.proyekLED.update({ where: { id: lama.id }, data: { timPenyusun: { dosen: [{ nama: "Dosen Ketua", nomorInduk: "", jabatan: "Ketua", tugas: "" }], tendik: [] } } });
  await prisma.jawabanForm.createMany({ data: [
    { proyekId: lama.id, subBagianKode: subLb.kode, isi: "Prodi berdiri 2002." },
    { proyekId: lama.id, subBagianKode: "C.9-LAMA", isi: "Bahan kriteria yang sudah tidak ada." },
  ] });
  const berkas = async (nama: string, tahun: number) => {
    const s = await simpanBerkas(`proyek/${lama.id}/dokumen`, nama, Buffer.from(`isi ${nama}`));
    return prisma.dokumen.create({ data: { proyekId: lama.id, namaBerkas: nama, mime: "application/pdf", lokasi: s.lokasi, ukuran: 10, tahunTerbit: tahun, status: "siap" } });
  };
  const dokBaru = await berkas("renstra-2025.pdf", 2025);
  const dokTua = await berkas("sk-2019.pdf", 2019);
  const pilihan = await bahanUntukSalin(tim, 2030);
  assert.deepEqual([pilihan?.jumlahTim, pilihan?.jumlahBahan], [1, 2]);
  assert.deepEqual(pilihan?.dokumen.map((d) => [d.nama, d.dicentang]), [["renstra-2025.pdf", true], ["sk-2019.pdf", false]], "lebih tua dari 5 tahun tidak dicentang");
  // narasi final LED lama untuk sub-bagian AF
  const bd = await prisma.bagianDraf.create({ data: { proyekId: lama.id, subBagianId: subAf.id, status: "selesai" } });
  const isi = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Capaian periode lalu 80 persen." }] }] };
  const vd = await prisma.versiDraf.create({ data: { bagianDrafId: bd.id, nomor: 1, asal: "sunting", isi, dokumenKurang: [] } });
  await prisma.bagianDraf.update({ where: { id: bd.id }, data: { versiAktifId: vd.id } });

  const { baru } = await mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2031 }, {
    tim: true, bahan: true, dokumen: pilihan!.dokumen.filter((d) => d.dicentang).map((d) => d.id), narasiLalu: true,
  });
  const b = await prisma.proyekLED.findUniqueOrThrow({ where: { id: baru.id } });
  assert.equal(b.asalProyekId, lama.id);
  assert.equal(b.pakaiNarasiLalu, true);
  assert.deepEqual(b.timPenyusun, { dosen: [{ nama: "Dosen Ketua", nomorInduk: "", jabatan: "Ketua", tugas: "" }], tendik: [], periksaUlang: true });
  const jb = await prisma.jawabanForm.findMany({ where: { proyekId: baru.id } });
  assert.deepEqual(jb.map((x) => [x.subBagianKode, x.isi]), [[subLb.kode, "[dari LED 2026] Prodi berdiri 2002."]]);
  assert.deepEqual((b.bahanBelumDipindah as { kode: string }[]).map((x) => x.kode), ["C.9-LAMA"]);
  const dk = await prisma.dokumen.findMany({ where: { proyekId: baru.id } });
  assert.deepEqual(dk.map((d) => [d.namaBerkas, d.status, d.tahunTerbit]), [["renstra-2025.pdf", "diunggah", 2025]]);
  assert.notEqual(dk[0].lokasi, dokBaru.lokasi, "berkas disalin, bukan dipindah");
  assert.equal((await bacaBerkas(dk[0].lokasi)).toString(), "isi renstra-2025.pdf");
  assert.ok(await prisma.dokumen.findUnique({ where: { id: dokBaru.id } }), "dokumen LED lama tetap ada");
  assert.ok(await prisma.dokumen.findUnique({ where: { id: dokTua.id } }));
  assert.equal(await prisma.bagianDraf.count({ where: { proyekId: baru.id } }), 0, "narasi lama tidak disalin ke narasi baru");
  assert.equal(await prisma.berkasLKPS.count({ where: { proyekId: baru.id } }), 0, "data LKPS tidak disalin");

  // panel narasi periode lalu dan sumber P (hanya AF/SWOT, hanya bila diaktifkan)
  const panel = await narasiPeriodeLalu(b, { kode: subAf.kode, judul: subAf.judul });
  assert.equal(panel?.teks, "Capaian periode lalu 80 persen.");
  const k = await susunKonteks(baru.id, subAf.kode);
  assert.equal(k.konteks.narasiLalu, "Capaian periode lalu 80 persen.");
  assert.match(k.legenda.P, /^Narasi LED periode lalu/);
  assert.equal((await susunKonteks(baru.id, subLb.kode)).konteks.narasiLalu, null, "bukan AF/SWOT");
  await prisma.proyekLED.update({ where: { id: baru.id }, data: { pakaiNarasiLalu: false } });
  assert.equal((await susunKonteks(baru.id, subAf.kode)).konteks.narasiLalu, null, "bawaan mati");

  // gagal di tengah: salinan berkas dihapus, LED aktif tidak diarsipkan
  await prisma.tugasGenerate.create({ data: { proyekId: baru.id, judul: "Uji", subBagianKode: [], status: "antre" } });
  const jumlahDok = await prisma.dokumen.count();
  await assert.rejects(mulaiLedPeriodeBerikutnya(tim, { tahunPengajuan: 2036 }, { dokumen: dk.map((d) => d.id) }), /penyusunan berjalan/);
  assert.equal(await prisma.dokumen.count(), jumlahDok);
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: baru.id } })).diarsipkanPada, null);
});

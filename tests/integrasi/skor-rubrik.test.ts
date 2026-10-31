import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/modules/bersama/db";
import { GalatAkses, type Pengguna } from "@/modules/bersama/akses";
import { buatAkunAsesor } from "@/modules/bersama/data/organisasi";
import { tambahKunci } from "@/modules/bersama/data/kunci-api";
import { buatProyek } from "@/modules/led/data/proyek";
import { simpanSuntingan } from "@/modules/led/data/generate";
import { mulaiSkorRubrik, penilaianProyek, tugaskanAsesor } from "@/modules/led/data/review";
import { prosesSkorRubrik } from "@/modules/led/proses/skor-rubrik";
import { bersihkanDb, buatAdmin, buatTimProdi, imporSeed, penggunaDari, siapkanFakultas, siapkanProdi } from "./bantu";

/** Revisi 31 Okt 2026 tahap 5: usulan skor rubrik AI per butir narasi (LLM_NARASI=uji), berhenti rapi saat kunci habis. */

const SUB = "C.1-IKU-a";
const dok = (...par: string[]) => ({ type: "doc", content: par.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) });

let admin: Pengguna;
let tim: Pengguna;
let tim2: Pengguna;
let timLain: Pengguna;
let asesor: Pengguna;
let proyekId: string;
let butirKode: string;

const jumlahLog = () => prisma.logPemakaian.count({ where: { proyekId, subBagianKode: { startsWith: "skor:" } } });

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatAdmin();
  await siapkanFakultas(admin);
  const { prodi, tim: t } = await siapkanProdi(admin, { nama: "Teknik Skor", jenjang: "S1", kodePddikti: "77777", identitas: {} });
  tim = t;
  tim2 = await buatTimProdi(admin, prodi.id, "tim2.skor@uji.test");
  ({ tim: timLain } = await siapkanProdi(admin, { nama: "Teknik Lain", jenjang: "S1", kodePddikti: "77778", identitas: {} }));
  asesor = await penggunaDari((await buatAkunAsesor(admin, { nama: "Asesor Skor", email: "asesor.skor@uji.test", kataSandi: "SandiAsesor#1" })).id);
  const proyek = await buatProyek(tim, { nama: "LED Skor", tahunPengajuan: 2026 });
  proyekId = proyek.id;
  await tugaskanAsesor(admin, proyekId, asesor.id);
  const kait = await prisma.butirSubBagian.findFirstOrThrow({
    where: { subBagian: { kode: SUB, bagian: { versiId: proyek.versiId } }, butir: { jenis: { not: "angka" }, jenjang: "S1" } },
    include: { butir: true },
  });
  butirKode = kait.butir.kode;
  await simpanSuntingan(tim, proyekId, SUB, dok("Visi keilmuan program studi dirumuskan bersama pemangku kepentingan.", "Visi ditinjau setiap lima tahun dalam lokakarya kurikulum."));
  process.env.LLM_NARASI = "uji";
});
after(async () => {
  process.env.LLM_NARASI = "";
  await prisma.$disconnect();
});

test("Revisi 31 Okt tahap 5: Tim Prodi menghitung usulan skor; hanya butir narasi yang punya narasi; skor otomatis masuk rekap", async () => {
  await assert.rejects(mulaiSkorRubrik(timLain, proyekId), GalatAkses);
  await assert.rejects(mulaiSkorRubrik(asesor, proyekId), GalatAkses);
  await assert.rejects(mulaiSkorRubrik(admin, proyekId), GalatAkses);
  await mulaiSkorRubrik(tim, proyekId);
  await assert.rejects(mulaiSkorRubrik(tim, proyekId), /sedang dihitung/);
  assert.equal(await prosesSkorRubrik(proyekId), "selesai");
  assert.equal(await prosesSkorRubrik(proyekId), "dilewati", "tugas selesai tidak diproses ulang");

  const usulan = await prisma.usulanSkor.findMany({ where: { proyekId } });
  assert.ok(usulan.length >= 1);
  const u = usulan.find((x) => x.butirKode === butirKode)!;
  assert.ok(u, "butir narasi yang terkait sub-bagian berdraf mendapat usulan");
  assert.ok(u.skor >= 0 && u.skor <= 4);
  assert.equal(u.model, "uji-narasi");
  assert.match(u.alasan, /Mode uji/);
  const angka = await prisma.butirPenilaian.findMany({ where: { jenis: "angka" }, select: { kode: true } });
  assert.ok(!usulan.some((x) => angka.some((a) => a.kode === x.butirKode)), "butir angka tidak dinilai AI");
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } })).statusSkorRubrik, null);

  const n = await penilaianProyek(tim, proyekId);
  const b = n.butir.find((x) => x.kode === butirKode)!;
  assert.deepEqual([b.sumberOtomatis, b.skorOtomatis, b.usulan?.perluUlang], ["ai", u.skor, false]);
  assert.ok(n.narasi[SUB], "narasi sub-bagian terkait ikut dikirim apa adanya");
  assert.ok(n.rekap.total > 0 && n.rekap.dinilai >= 1);
  assert.equal(n.akhir.dinilai, 0, "nilai asesor terpisah dari perkiraan");
  // admin membaca halaman Penilaian
  assert.equal((await penilaianProyek(admin, proyekId)).rekap.total, n.rekap.total);
});

test("Revisi 31 Okt tahap 5: hanya butir yang narasinya berubah dinilai ulang", async () => {
  const awal = await jumlahLog();
  await mulaiSkorRubrik(tim, proyekId);
  assert.equal(await prosesSkorRubrik(proyekId), "selesai");
  assert.equal(await jumlahLog(), awal, "narasi tidak berubah: tidak ada panggilan baru");

  // akun Tim Prodi kedua menyunting: versi aktif baru, usulan lama ditandai perlu dinilai ulang
  await simpanSuntingan(tim2, proyekId, SUB, dok("Visi keilmuan dirumuskan bersama alumni dan industri; notulen lokakarya tersedia."));
  const b = (await penilaianProyek(tim, proyekId, { tanpaNarasi: true })).butir.find((x) => x.kode === butirKode)!;
  assert.equal(b.usulan?.perluUlang, true);
  await mulaiSkorRubrik(tim2, proyekId);
  assert.equal(await prosesSkorRubrik(proyekId), "selesai");
  assert.ok((await jumlahLog()) > awal);
  const sesudah = (await penilaianProyek(tim, proyekId, { tanpaNarasi: true })).butir.find((x) => x.kode === butirKode)!;
  assert.equal(sesudah.usulan?.perluUlang, false);
});

test("Revisi 31 Okt tahap 5: tanpa kunci API berhenti rapi (menunggu kunci), lalu lanjut setelah Admin UPPS menambah kunci", async () => {
  await simpanSuntingan(tim, proyekId, SUB, dok("Visi keilmuan ditinjau berkala; hasil tinjauan dipakai memperbarui kurikulum."));
  process.env.LLM_NARASI = "";
  await mulaiSkorRubrik(tim, proyekId);
  assert.equal(await prosesSkorRubrik(proyekId), "tertunda");
  const p = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
  assert.equal(p.statusSkorRubrik, "menunggu_kunci");
  assert.ok(p.pesanSkorRubrik);

  process.env.LLM_NARASI = "uji";
  const k = await tambahKunci(admin, { label: "Kunci skor", kunci: "AIzaSyKunciSkorRubrik00000000000000001" });
  assert.ok(k.tugasDilanjutkan >= 1, "usulan skor yang menunggu kunci dilanjutkan");
  assert.equal((await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } })).statusSkorRubrik, "antre");
  assert.equal(await prosesSkorRubrik(proyekId), "selesai");
  const b = (await penilaianProyek(tim, proyekId, { tanpaNarasi: true })).butir.find((x) => x.kode === butirKode)!;
  assert.equal(b.usulan?.perluUlang, false);
});

import "./siapan";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import { unggahLkps } from "@/lib/data/lkps";
import { prosesBerkasLkps } from "@/lib/proses/lkps";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { buatAkunAsesor, simpanProdi } from "@/lib/data/organisasi";
import { buatProyek } from "@/lib/data/proyek";
import { drafBagian, simpanSuntingan } from "@/lib/data/generate";
import { periksaEkspor } from "@/lib/data/ekspor";
import { kesiapanLed } from "@/lib/data/kesiapan";
import {
  ajukanReview, balasCatatan, bandingkanCatatan, buatCatatan, daftarCatatan, daftarPemberitahuan, daftarPenugasan, hapusCatatan,
  jumlahCatatanPerSub, ledAsesor, penilaianProyek, putuskanReview, simpanSkor, tandaiDibaca, tugaskanAsesor, ubahStatusCatatan,
} from "@/lib/data/review";
import { buatJangkar, teksPolos } from "@/lib/domain/review";
import type { DokTiptap } from "@/lib/domain/narasi";
import { bersihkanDb, buatSuperAdmin, imporSeed, penggunaDari, siapkanPj } from "./bantu";

/** Revisi 22 Okt 2026 tahap 7: peran asesor, catatan revisi berjangkar, alur Sudah diperbaiki/Terima, skor, keputusan. */

let admin: Pengguna;
let pj: Pengguna;
let asesor: Pengguna;
let asesorLain: Pengguna;
let proyekId: string;
let proyekLain: string;
const SUB = "C.1-IKU-a";

const dok = (...par: string[]): DokTiptap => ({ type: "doc", content: par.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) });
const AWAL = dok("Visi keilmuan dirumuskan bersama pemangku kepentingan. Visi ditinjau setiap lima tahun.", "Strategi pencapaian visi disusun dalam Renstra.");

function jangkarDari(doc: DokTiptap, kalimat: string) {
  const teks = teksPolos(doc);
  const i = teks.indexOf(kalimat);
  return buatJangkar(teks, i, i + kalimat.length)!;
}

before(async () => {
  await bersihkanDb();
  await imporSeed();
  admin = await buatSuperAdmin();
  pj = await siapkanPj(admin);
  asesor = await penggunaDari((await buatAkunAsesor(admin, { nama: "Asesor Satu", email: "asesor@uji.test", kataSandi: "SandiAsesor#1" })).id);
  asesorLain = await penggunaDari((await buatAkunAsesor(admin, { nama: "Asesor Dua", email: "asesor2@uji.test", kataSandi: "SandiAsesor#2" })).id);
  assert.equal(asesor.peran, "ASESOR");
  const prodi = await simpanProdi(pj, { nama: "Teknik Review", jenjang: "S1", kodePddikti: "33333", identitas: {} });
  const prodi2 = await simpanProdi(pj, { nama: "Teknik Lain", jenjang: "S1", kodePddikti: "44444", identitas: {} });
  proyekId = (await buatProyek(pj, { prodiId: prodi.id, nama: "LED Review", tahunPengajuan: 2026 })).id;
  proyekLain = (await buatProyek(pj, { prodiId: prodi2.id, nama: "LED Lain", tahunPengajuan: 2026 })).id;
  await simpanSuntingan(pj, proyekId, SUB, AWAL);
});

after(async () => {
  await prisma.$disconnect();
});

test("Admin menugaskan satu asesor per LED; asesor hanya membaca LED yang ditugaskan dan tidak bisa mengubah", async () => {
  await assert.rejects(ajukanReview(pj, proyekId), /belum menugaskan asesor/);
  await assert.rejects(tugaskanAsesor(pj, proyekId, asesor.id), GalatAkses);
  await assert.rejects(tugaskanAsesor(admin, proyekId, pj.id), /asesor tidak ditemukan/);
  await tugaskanAsesor(admin, proyekId, asesor.id);
  await tugaskanAsesor(admin, proyekLain, asesorLain.id);
  const t = await daftarPenugasan(admin);
  assert.equal(t.led.find((l) => l.id === proyekId)?.asesor?.name, "Asesor Satu");
  assert.deepEqual(t.asesor.map((a) => a.name), ["Asesor Dua", "Asesor Satu"]);
  assert.match((await daftarPemberitahuan(asesor)).daftar[0].pesan, /ditugaskan mereview LED Review/);

  assert.deepEqual((await ledAsesor(asesor)).map((l) => l.nama), ["LED Review"]);
  const d = await drafBagian(asesor, proyekId, "C.1");
  assert.ok(d[SUB].aktif, "asesor membaca draf LED yang ditugaskan");
  await assert.rejects(drafBagian(asesor, proyekLain, "C.1"), GalatAkses);
  await assert.rejects(simpanSuntingan(asesor, proyekId, SUB, AWAL), GalatAkses);
  await assert.rejects(daftarCatatan(asesorLain, proyekId), GalatAkses);
});

test("Catatan revisi: hanya saat Direview, berjangkar, muncul di PJ dengan pemberitahuan, Sudah diperbaiki lalu Terima atau Buka lagi", async () => {
  const j = jangkarDari(AWAL, "Visi ditinjau setiap lima tahun.");
  await assert.rejects(buatCatatan(asesor, proyekId, { subBagianKode: SUB, ...j, isi: "Sebutkan bukti peninjauan." }), /berstatus Direview/);
  await ajukanReview(pj, proyekId);
  await assert.rejects(ajukanReview(pj, proyekId), /sudah berstatus Direview/);
  assert.match((await daftarPemberitahuan(asesor)).daftar[0].pesan, /diajukan untuk review/);

  await assert.rejects(buatCatatan(pj, proyekId, { subBagianKode: SUB, ...j, isi: "x" }), GalatAkses);
  await assert.rejects(buatCatatan(asesor, proyekId, { subBagianKode: SUB, teks: "Kalimat yang tidak ada.", sebelum: "", sesudah: "", isi: "x" }), /tidak ditemukan di versi terbaru/);
  const c = await buatCatatan(asesor, proyekId, { subBagianKode: SUB, ...j, isi: "Sebutkan bukti peninjauan (SK, notulen)." });
  const salah = await buatCatatan(asesor, proyekId, { subBagianKode: SUB, ...jangkarDari(AWAL, "Renstra"), isi: "salah blok" });
  await hapusCatatan(asesor, salah.id);

  // PJ melihat catatan (polling) dan pemberitahuan di lonceng
  let lihat = await daftarCatatan(pj, proyekId, SUB);
  assert.equal(lihat.catatan.length, 1);
  assert.deepEqual([lihat.catatan[0].status, lihat.catatan[0].ditemukan, lihat.catatan[0].asesor], ["terbuka", true, "Asesor Satu"]);
  const lonceng = await daftarPemberitahuan(pj);
  assert.equal(lonceng.belumDibaca, 2, "catatan baru + catatan salah blok");
  assert.match(lonceng.daftar[1].tautan!, new RegExp(`/proyek/${proyekId}/bagian/C\\.1/${SUB}#catatan-${c.id}`));
  await tandaiDibaca(pj, null);
  assert.equal((await daftarPemberitahuan(pj)).belumDibaca, 0);
  assert.deepEqual(await jumlahCatatanPerSub(pj, proyekId), { [SUB]: { terbuka: 1, diperbaiki: 0 } });
  assert.equal((await kesiapanLed(proyekId)).catatanTerbuka, 1);

  // PJ mengubah kalimat lain: sorotan tetap menempel
  await simpanSuntingan(pj, proyekId, SUB, dok("Visi keilmuan dirumuskan bersama alumni dan industri. Visi ditinjau setiap lima tahun.", "Strategi pencapaian visi disusun dalam Renstra."));
  assert.equal((await daftarCatatan(pj, proyekId, SUB)).catatan[0].ditemukan, true);

  // asesor belum bisa menerima sebelum diperbaiki; PJ memperbaiki kalimatnya lalu menandai Sudah diperbaiki
  await assert.rejects(ubahStatusCatatan(asesor, c.id, "diterima"), /tidak bisa diubah/);
  await simpanSuntingan(pj, proyekId, SUB, dok("Visi keilmuan dirumuskan bersama alumni dan industri. Visi ditinjau setiap lima tahun melalui rapat tinjauan (SK Dekan No. 12/2024).", "Strategi pencapaian visi disusun dalam Renstra."));
  lihat = await daftarCatatan(pj, proyekId, SUB);
  assert.equal(lihat.catatan[0].ditemukan, false, "teks asli sudah berubah");
  await assert.rejects(ubahStatusCatatan(pj, c.id, "diterima"), /tidak bisa diubah/);
  await ubahStatusCatatan(pj, c.id, "diperbaiki", "Sudah ditambah SK peninjauan.");
  assert.match((await daftarPemberitahuan(asesor)).daftar[0].pesan, /sudah diperbaiki/);

  // asesor membandingkan versi sebelum dan sesudah, membuka lagi dengan balasan, lalu menerima
  const banding = await bandingkanCatatan(asesor, c.id);
  assert.ok(banding.potongan.some((x) => x.jenis === "tambah" && /SK Dekan/.test(x.teks)), JSON.stringify(banding.potongan));
  await assert.rejects(ubahStatusCatatan(asesor, c.id, "dibuka"), /Tulis balasan/);
  await ubahStatusCatatan(asesor, c.id, "dibuka", "Lampirkan juga notulennya.");
  await balasCatatan(pj, c.id, "Notulen ada di lampiran 3.");
  await ubahStatusCatatan(pj, c.id, "diperbaiki");
  await ubahStatusCatatan(asesor, c.id, "diterima");
  lihat = await daftarCatatan(asesor, proyekId, SUB);
  assert.equal(lihat.catatan[0].status, "diterima");
  assert.deepEqual(lihat.catatan[0].balasan.map((b) => b.jenis), ["diperbaiki", "dibuka", "balasan", "diperbaiki", "diterima"]);
  assert.equal(lihat.catatan[0].balasan[1].peranPenulis, "ASESOR");
  assert.deepEqual(await jumlahCatatanPerSub(pj, proyekId), {});
});

test("Penilaian akhir: skor 0-4 per butir, nilai akhir dan perkiraan status, Layak diajukan membuka ekspor final", async () => {
  let n = await penilaianProyek(asesor, proyekId);
  assert.ok(n.butir.length > 10);
  assert.ok(Math.abs(n.akhir.maksimum - 400) < 0.5, "bobot satu jenjang ± 100 (pembulatan instrumen)");
  assert.ok(n.butir.every((b) => b.deskriptor.length === 5));
  await assert.rejects(simpanSkor(asesor, proyekId, { butirKode: n.butir[0].kode, skor: 4.5 }), /antara 0 dan 4/);
  await assert.rejects(simpanSkor(pj, proyekId, { butirKode: n.butir[0].kode, skor: 4 }), GalatAkses);

  // butir angka: tanpa LKPS skor sistem kosong sehingga tidak perlu alasan (dengan LKPS: lihat uji berikutnya)
  const angka = n.butir.find((b) => b.jenis === "angka")!;
  assert.equal(angka.skorSistem, null);
  await simpanSkor(asesor, proyekId, { butirKode: angka.kode, skor: 2 });

  await assert.rejects(putuskanReview(asesor, proyekId, { keputusan: "layak" }), /butir yang diberi skor/);
  for (const b of n.butir) await simpanSkor(asesor, proyekId, { butirKode: b.kode, skor: 3 });
  n = await penilaianProyek(asesor, proyekId);
  assert.equal(n.akhir.total, Math.round(n.akhir.maksimum * 75) / 100);
  assert.equal(n.perkiraan?.status, "Terakreditasi");

  // perlu revisi kembali ke PJ; ekspor final masih tertahan
  await assert.rejects(putuskanReview(asesor, proyekId, { keputusan: "perlu_revisi" }), /Tuliskan apa yang perlu direvisi/);
  await putuskanReview(asesor, proyekId, { keputusan: "perlu_revisi", catatan: "Lengkapi bukti C.2." });
  assert.ok((await periksaEkspor(pj, proyekId, "final")).galat.some((g) => /Layak diajukan/.test(g)));
  await assert.rejects(simpanSkor(asesor, proyekId, { butirKode: n.butir[0].kode, skor: 4 }), /berstatus Direview/);
  await ajukanReview(pj, proyekId);
  assert.match((await daftarPemberitahuan(asesor)).daftar[0].pesan, /review ulang/);

  const k = await putuskanReview(asesor, proyekId, { keputusan: "layak" });
  assert.deepEqual([k.keputusan, k.total, k.perkiraan], ["layak", n.akhir.total, "Terakreditasi"]);
  assert.match((await daftarPemberitahuan(pj)).daftar[0].pesan, /Layak diajukan/);
  assert.ok(!(await periksaEkspor(pj, proyekId, "final")).galat.some((g) => /Layak diajukan/.test(g)));
  assert.equal((await penilaianProyek(pj, proyekId)).keputusan?.keputusan, "layak", "PJ melihat hasil penilaian");
  assert.equal((await kesiapanLed(proyekId)).review, "layak");
  await assert.rejects(putuskanReview(asesor, proyekId, { keputusan: "perlu_revisi", catatan: "x" }), GalatPengguna);
});

test("Butir angka dengan LKPS: skor sistem jadi acuan; skor berbeda wajib beralasan", async () => {
  const b = await unggahLkps(pj, proyekLain, { nama: "lkps.xlsx", isi: readFileSync(resolve(process.cwd(), "tests/fikstur/lkps-contoh-s1.xlsx")) });
  await prosesBerkasLkps(b.id);
  await ajukanReview(pj, proyekLain);
  const n = await penilaianProyek(asesorLain, proyekLain);
  const angka = n.butir.find((x) => x.jenis === "angka" && x.skorSistem !== null)!;
  assert.ok(angka, "ada butir angka yang skornya dihitung dari LKPS");
  const lain = angka.skorSistem! >= 2 ? 1 : 3;
  await simpanSkor(asesorLain, proyekLain, { butirKode: angka.kode, skor: angka.skorSistem! });
  await assert.rejects(simpanSkor(asesorLain, proyekLain, { butirKode: angka.kode, skor: lain }), /berbeda dari hitungan sistem/);
  const s = await simpanSkor(asesorLain, proyekLain, { butirKode: angka.kode, skor: lain, alasan: "Data TS-2 belum diverifikasi." });
  assert.deepEqual([s?.skor, s?.skorSistem, s?.alasan], [lain, angka.skorSistem, "Data TS-2 belum diverifikasi."]);
});

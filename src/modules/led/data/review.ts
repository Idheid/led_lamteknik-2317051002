import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, pastikanAdmin, pastikanAsesor, pastikanPeran, pastikanTimProdi, type Pengguna } from "@/modules/bersama/akses";
import { ambilProyek, ambilProyekUbah } from "@/modules/led/data/proyek";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { AKTIF } from "@/modules/bersama/data/organisasi";
import { beritahu } from "@/modules/bersama/data/pemberitahuan";
import { nilaiButirUntukProyek } from "@/modules/led/data/nilai-butir";
import { bandingkanVersi } from "@/modules/led/data/generate";
import { bacaDokumen } from "@/modules/led/domain/narasi";
import { bacaStatusReview, LABEL_REVIEW, type StatusReview } from "@/modules/led/domain/kesiapan";
import {
  bacaAturanStatus, bacaStatusCatatan, bolehAjukanReview, cariJangkar, CATATAN_BELUM_SELESAI, hitungNilaiAkhir,
  perkiraanStatus, perluAlasan, skorSah, statusSetelah, teksPolos, type AksiCatatan, type StatusCatatan,
} from "@/modules/led/domain/review";

/**
 * Review asesor (revisi 22 Okt 2026). Admin UPPS menugaskan satu asesor per LED. Tim Prodi mengajukan review; asesor
 * memblok teks dan memberi catatan, Tim Prodi menandai Sudah diperbaiki, asesor menerima atau membuka lagi; terakhir asesor memberi
 * skor 0-4 per butir dan menyatakan Layak diajukan atau Perlu revisi. Setiap langkah mengirim pemberitahuan.
 */

// ---------------------------------------------------------------- penerima pemberitahuan

/** Semua akun Tim Prodi aktif prodi pemilik LED (revisi 31 Okt 2026: bukan lagi semua PJ fakultas). */
async function idTimProdiAktif(prodiId: string): Promise<string[]> {
  return (await prisma.user.findMany({ where: { role: "TIM_PRODI", prodiId, ...AKTIF }, select: { id: true } })).map((u) => u.id);
}

// ---------------------------------------------------------------- tautan

function tautanSub(peran: "PJ" | "ASESOR", proyekId: string, bagianKode: string, subKode: string) {
  const sub = `bagian/${encodeURIComponent(bagianKode)}/${encodeURIComponent(subKode)}`;
  return peran === "PJ" ? `/led/${proyekId}/${sub}` : `/led/asesor/${proyekId}/${sub}`;
}

// ---------------------------------------------------------------- penugasan (admin)

export async function daftarPenugasan(p: Pengguna) {
  pastikanAdmin(p);
  const [led, asesor] = await Promise.all([
    prisma.proyekLED.findMany({
      orderBy: [{ diarsipkanPada: { sort: "asc", nulls: "first" } }, { batasPengajuan: { sort: "asc", nulls: "last" } }],
      select: {
        id: true, nama: true, jenjang: true, statusReview: true, diarsipkanPada: true, batasPengajuan: true,
        prodi: { select: { nama: true } }, asesor: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({ where: { role: "ASESOR", ...AKTIF }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);
  return { led, asesor };
}

/** Tugaskan (atau lepas, asesorId null) asesor ke satu LED. Satu LED satu asesor; satu asesor boleh beberapa LED. */
export async function tugaskanAsesor(p: Pengguna, proyekId: string, asesorId: string | null) {
  pastikanAdmin(p);
  const proyek = await prisma.proyekLED.findUnique({ where: { id: proyekId }, include: { prodi: true } });
  if (!proyek) throw new GalatPengguna("LED tidak ditemukan.");
  if (asesorId) {
    const a = await prisma.user.findFirst({ where: { id: asesorId, role: "ASESOR", ...AKTIF } });
    if (!a) throw new GalatPengguna("Akun asesor tidak ditemukan atau nonaktif.");
  }
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { asesorId } });
  if (asesorId && asesorId !== proyek.asesorId) {
    await beritahu([asesorId], { proyekId, pesan: `Anda ditugaskan mereview ${proyek.nama} (${proyek.prodi.nama}).`, tautan: `/led/asesor/${proyekId}` });
  }
  await catatAktivitas(p, "tugaskan_asesor", "proyek", proyek.id, { asesorId });
}

// ---------------------------------------------------------------- daftar LED asesor

export async function ledAsesor(p: Pengguna) {
  pastikanAsesor(p);
  const led = await prisma.proyekLED.findMany({
    where: { asesorId: p.id },
    orderBy: [{ diarsipkanPada: { sort: "asc", nulls: "first" } }, { batasPengajuan: { sort: "asc", nulls: "last" } }],
    select: {
      id: true, nama: true, jenjang: true, statusReview: true, diarsipkanPada: true, batasPengajuan: true,
      prodi: { select: { nama: true } },
    },
  });
  const jumlah = await prisma.catatanRevisi.groupBy({ by: ["proyekId", "status"], where: { proyekId: { in: led.map((l) => l.id) } }, _count: { _all: true } });
  return led.map((l) => {
    const n = (s: StatusCatatan) => jumlah.find((j) => j.proyekId === l.id && j.status === s)?._count._all ?? 0;
    return { ...l, review: bacaStatusReview(l.statusReview), catatan: { terbuka: n("terbuka"), diperbaiki: n("diperbaiki"), diterima: n("diterima") } };
  });
}

// ---------------------------------------------------------------- catatan

/** Membaca catatan dan penilaian: Tim Prodi pemilik LED, asesor yang ditugaskan, dan Admin UPPS (hanya baca). */
async function aksesReview(p: Pengguna, proyekId: string) {
  pastikanPeran(p, "TIM_PRODI", "ASESOR", "ADMIN");
  return ambilProyek(p, proyekId, { baca: true });
}

/** Teks polos versi aktif per sub-bagian (untuk menandai catatan yang teks aslinya sudah berubah). */
async function teksAktif(proyekId: string, subKode: string[]): Promise<Map<string, { teks: string; versiId: string }>> {
  if (!subKode.length) return new Map();
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId, versiAktifId: { not: null }, subBagian: { kode: { in: subKode } } },
    select: { versiAktifId: true, subBagian: { select: { kode: true } } },
  });
  const versi = await prisma.versiDraf.findMany({ where: { id: { in: draf.map((d) => d.versiAktifId!) } }, select: { id: true, isi: true } });
  return new Map(draf.map((d) => {
    const v = versi.find((x) => x.id === d.versiAktifId)!;
    return [d.subBagian.kode, { teks: teksPolos(bacaDokumen(v.isi)), versiId: v.id }];
  }));
}

export interface CatatanTampil {
  id: string;
  bagianKode: string;
  subBagianKode: string;
  teks: string;
  sebelum: string;
  sesudah: string;
  isi: string;
  status: StatusCatatan;
  asesor: string | null;
  /** false bila teks yang diblok sudah tidak ada di versi aktif */
  ditemukan: boolean;
  versiAwalId: string | null;
  versiPerbaikanId: string | null;
  dibuat: string;
  diperbarui: string;
  balasan: { id: string; jenis: string; isi: string; penulis: string | null; peranPenulis: string | null; waktu: string }[];
}

/** Catatan satu LED (atau satu sub-bagian), terbaru di bawah. Untuk PJ dan asesor yang ditugaskan. */
export async function daftarCatatan(p: Pengguna, proyekId: string, subBagianKode?: string): Promise<{
  catatan: CatatanTampil[];
  review: StatusReview;
  /** versi aktif sub-bagian (bila `subBagianKode` diisi): layar asesor tahu kapan PJ menyimpan versi baru */
  versiAktifId: string | null;
}> {
  const proyek = await aksesReview(p, proyekId);
  const catatan = await prisma.catatanRevisi.findMany({
    where: { proyekId: proyek.id, ...(subBagianKode ? { subBagianKode } : {}) },
    orderBy: { createdAt: "asc" },
    include: {
      asesor: { select: { name: true } },
      balasan: { orderBy: { createdAt: "asc" }, include: { penulis: { select: { name: true, role: true } } } },
    },
  });
  const teks = await teksAktif(proyek.id, [...new Set([...catatan.map((c) => c.subBagianKode), ...(subBagianKode ? [subBagianKode] : [])])]);
  return {
    review: bacaStatusReview(proyek.statusReview),
    versiAktifId: subBagianKode ? teks.get(subBagianKode)?.versiId ?? null : null,
    catatan: catatan.map((c) => ({
      id: c.id, bagianKode: c.bagianKode, subBagianKode: c.subBagianKode, teks: c.teks, sebelum: c.sebelum, sesudah: c.sesudah,
      isi: c.isi, status: bacaStatusCatatan(c.status), asesor: c.asesor?.name ?? null,
      ditemukan: Boolean(teks.get(c.subBagianKode) && cariJangkar(teks.get(c.subBagianKode)!.teks, c)),
      versiAwalId: c.versiAwalId, versiPerbaikanId: c.versiPerbaikanId,
      dibuat: c.createdAt.toISOString(), diperbarui: c.updatedAt.toISOString(),
      balasan: c.balasan.map((b) => ({
        id: b.id, jenis: b.jenis, isi: b.isi, penulis: b.penulis?.name ?? null, peranPenulis: b.penulis?.role ?? null, waktu: b.createdAt.toISOString(),
      })),
    })),
  };
}

/** Jumlah catatan belum selesai (terbuka + diperbaiki) per sub-bagian, untuk ringkasan kriteria. */
export async function jumlahCatatanPerSub(p: Pengguna, proyekId: string): Promise<Record<string, { terbuka: number; diperbaiki: number }>> {
  const proyek = await aksesReview(p, proyekId);
  const g = await prisma.catatanRevisi.groupBy({
    by: ["subBagianKode", "status"], where: { proyekId: proyek.id, status: { in: CATATAN_BELUM_SELESAI } }, _count: { _all: true },
  });
  const hasil: Record<string, { terbuka: number; diperbaiki: number }> = {};
  for (const x of g) {
    hasil[x.subBagianKode] ??= { terbuka: 0, diperbaiki: 0 };
    hasil[x.subBagianKode][x.status as "terbuka" | "diperbaiki"] = x._count._all;
  }
  return hasil;
}

const skemaCatatan = z.object({
  subBagianKode: z.string().trim().min(1).max(60),
  teks: z.string().min(1, "Blok teks yang dikomentari dulu.").max(3000, "Blok teks terlalu panjang (maks. 3.000 karakter)."),
  sebelum: z.string().max(200).default(""),
  sesudah: z.string().max(200).default(""),
  isi: z.string().trim().min(1, "Tulis catatan revisinya.").max(4000, "Catatan terlalu panjang (maks. 4.000 karakter)."),
});

/** Asesor memblok teks di versi aktif lalu menulis catatan revisi. Hanya saat LED berstatus Direview. */
export async function buatCatatan(p: Pengguna, proyekId: string, masukan: z.input<typeof skemaCatatan>) {
  pastikanAsesor(p);
  const data = skemaCatatan.parse(masukan);
  const proyek = await ambilProyek(p, proyekId, { baca: true });
  if (bacaStatusReview(proyek.statusReview) !== "direview") throw new GalatPengguna("Catatan hanya bisa diberikan saat LED berstatus Direview.");
  const sub = await prisma.subBagian.findFirst({ where: { kode: data.subBagianKode, bagian: { versiId: proyek.versiId } }, include: { bagian: true } });
  if (!sub) throw new GalatPengguna("Sub-bagian tidak ada di LED ini.");
  const aktif = (await teksAktif(proyek.id, [sub.kode])).get(sub.kode);
  if (!aktif) throw new GalatPengguna("Sub-bagian ini belum punya draf.");
  if (!cariJangkar(aktif.teks, data)) throw new GalatPengguna("Teks yang diblok tidak ditemukan di versi terbaru. Muat ulang halaman lalu blok lagi.");
  const c = await prisma.catatanRevisi.create({
    data: {
      proyekId: proyek.id, bagianKode: sub.bagian.kode, subBagianKode: sub.kode, asesorId: p.id,
      teks: data.teks, sebelum: data.sebelum, sesudah: data.sesudah, isi: data.isi, versiAwalId: aktif.versiId,
    },
  });
  await beritahu(await idTimProdiAktif(proyek.prodiId), {
    proyekId: proyek.id, pesan: `Catatan revisi baru di ${sub.label || sub.kode} ${sub.judul}`.trim(), tautan: `${tautanSub("PJ", proyek.id, sub.bagian.kode, sub.kode)}#catatan-${c.id}`,
  });
  await catatAktivitas(p, "buat_catatan", "proyek", proyek.id, { catatanId: c.id, sub: sub.kode });
  return c;
}

async function catatanMilik(p: Pengguna, catatanId: string) {
  const c = await prisma.catatanRevisi.findUnique({ where: { id: catatanId } });
  if (!c) throw new GalatPengguna("Catatan tidak ditemukan.");
  const proyek = await aksesReview(p, c.proyekId);
  return { c, proyek };
}

const PESAN_AKSI: Record<AksiCatatan, string> = {
  diperbaiki: "Tim Prodi menandai catatan sudah diperbaiki",
  diterima: "Asesor menerima perbaikan",
  dibuka: "Asesor membuka lagi catatan",
};

/**
 * Ubah status catatan. PJ: Sudah diperbaiki (versi aktif saat itu disimpan untuk dibandingkan asesor). Asesor:
 * Terima, atau Buka lagi dengan balasan wajib.
 */
export async function ubahStatusCatatan(p: Pengguna, catatanId: string, aksi: AksiCatatan, isi = "") {
  const { c, proyek } = await catatanMilik(p, catatanId);
  const peran = p.peran === "ASESOR" ? "ASESOR" : "PJ";
  if (peran === "PJ") {
    pastikanTimProdi(p);
    if (proyek.diarsipkanPada) throw new GalatPengguna("LED ini diarsipkan (hanya baca).");
  }
  const ke = statusSetelah(peran, bacaStatusCatatan(c.status), aksi);
  if (!ke) throw new GalatPengguna("Status catatan tidak bisa diubah dengan cara ini.");
  const teks = isi.trim().slice(0, 4000);
  if (aksi === "dibuka" && !teks) throw new GalatPengguna("Tulis balasan: apa yang masih perlu diperbaiki.");
  const versiPerbaikanId = aksi === "diperbaiki" ? (await teksAktif(proyek.id, [c.subBagianKode])).get(c.subBagianKode)?.versiId ?? null : c.versiPerbaikanId;
  await prisma.$transaction([
    prisma.catatanRevisi.update({ where: { id: c.id }, data: { status: ke, versiPerbaikanId } }),
    prisma.balasanCatatan.create({ data: { catatanId: c.id, penulisId: p.id, jenis: aksi, isi: teks } }),
  ]);
  const sub = await prisma.subBagian.findFirst({ where: { kode: c.subBagianKode, bagian: { versiId: proyek.versiId } }, select: { label: true, kode: true } });
  const pesan = `${PESAN_AKSI[aksi]} di ${sub?.label || c.subBagianKode}: "${c.teks.slice(0, 60)}${c.teks.length > 60 ? "…" : ""}"`;
  if (peran === "PJ") await beritahu([proyek.asesorId], { proyekId: proyek.id, pesan, tautan: `${tautanSub("ASESOR", proyek.id, c.bagianKode, c.subBagianKode)}#catatan-${c.id}` });
  else await beritahu(await idTimProdiAktif(proyek.prodiId), { proyekId: proyek.id, pesan, tautan: `${tautanSub("PJ", proyek.id, c.bagianKode, c.subBagianKode)}#catatan-${c.id}` });
  await catatAktivitas(p, `catatan_${aksi}`, "proyek", proyek.id, { catatanId: c.id });
  return { status: ke };
}

export async function balasCatatan(p: Pengguna, catatanId: string, isi: string) {
  pastikanPeran(p, "TIM_PRODI", "ASESOR");
  const { c, proyek } = await catatanMilik(p, catatanId);
  const teks = z.string().trim().min(1, "Balasan kosong.").max(4000, "Balasan terlalu panjang (maks. 4.000 karakter).").parse(isi);
  await prisma.balasanCatatan.create({ data: { catatanId: c.id, penulisId: p.id, jenis: "balasan", isi: teks } });
  await prisma.catatanRevisi.update({ where: { id: c.id }, data: { updatedAt: new Date() } });
  const pesan = `Balasan ${p.peran === "ASESOR" ? "asesor" : "Tim Prodi"}: "${teks.slice(0, 80)}${teks.length > 80 ? "…" : ""}"`;
  if (p.peran === "ASESOR") await beritahu(await idTimProdiAktif(proyek.prodiId), { proyekId: proyek.id, pesan, tautan: `${tautanSub("PJ", proyek.id, c.bagianKode, c.subBagianKode)}#catatan-${c.id}` });
  else await beritahu([proyek.asesorId], { proyekId: proyek.id, pesan, tautan: `${tautanSub("ASESOR", proyek.id, c.bagianKode, c.subBagianKode)}#catatan-${c.id}` });
}

/** Asesor menghapus catatannya sendiri yang masih terbuka (mis. salah blok). */
export async function hapusCatatan(p: Pengguna, catatanId: string) {
  pastikanAsesor(p);
  const { c } = await catatanMilik(p, catatanId);
  if (c.status !== "terbuka") throw new GalatPengguna("Hanya catatan berstatus Terbuka yang bisa dihapus.");
  await prisma.catatanRevisi.delete({ where: { id: c.id } });
  await catatAktivitas(p, "hapus_catatan", "proyek", c.proyekId, { catatanId: c.id });
}

/** Bandingkan versi saat catatan dibuat dengan versi saat ditandai diperbaiki (atau versi aktif sekarang). */
export async function bandingkanCatatan(p: Pengguna, catatanId: string) {
  const { c, proyek } = await catatanMilik(p, catatanId);
  const sesudah = c.versiPerbaikanId ?? (await teksAktif(proyek.id, [c.subBagianKode])).get(c.subBagianKode)?.versiId;
  if (!c.versiAwalId || !sesudah) throw new GalatPengguna("Versi untuk dibandingkan tidak tersedia.");
  if (c.versiAwalId === sesudah) return { lama: null, baru: null, potongan: [] };
  return bandingkanVersi(p, c.versiAwalId, sesudah);
}

// ---------------------------------------------------------------- pengajuan review (PJ)

export async function ajukanReview(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyekUbah(p, proyekId);
  if (!proyek.asesorId) throw new GalatPengguna("Admin belum menugaskan asesor untuk LED ini.");
  const s = bacaStatusReview(proyek.statusReview);
  if (!bolehAjukanReview(s)) throw new GalatPengguna(`LED sudah berstatus ${LABEL_REVIEW[s]}.`);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { statusReview: "direview" } });
  await beritahu([proyek.asesorId], {
    proyekId: proyek.id, pesan: `${proyek.nama} (${proyek.prodi.nama}) diajukan untuk review${s === "perlu_revisi" ? " ulang" : ""}.`, tautan: `/led/asesor/${proyek.id}`,
  });
  await catatAktivitas(p, "ajukan_review", "proyek", proyek.id);
}

// ---------------------------------------------------------------- penilaian akhir (asesor)

export async function penilaianProyek(p: Pengguna, proyekId: string) {
  const proyek = await aksesReview(p, proyekId);
  const [butir, skor, versi, nilai, belumSelesai] = await Promise.all([
    prisma.butirPenilaian.findMany({
      where: { versiId: proyek.versiId, jenjang: proyek.jenjang },
      orderBy: { urutan: "asc" },
      select: {
        kode: true, bagianKode: true, elemen: true, indikator: true, bobot: true, jenis: true,
        deskriptorSkor4: true, deskriptorSkor3: true, deskriptorSkor2: true, deskriptorSkor1: true, deskriptorSkor0: true,
      },
    }),
    prisma.skorAsesor.findMany({ where: { proyekId: proyek.id } }),
    prisma.versiInstrumen.findUnique({ where: { id: proyek.versiId }, select: { statusAkreditasi: true } }),
    nilaiButirUntukProyek(proyek),
    prisma.catatanRevisi.count({ where: { proyekId: proyek.id, status: { in: CATATAN_BELUM_SELESAI } } }),
  ]);
  const sistem = new Map(nilai.daftar.map((n) => [n.butir, n.hasil?.skor ?? null]));
  const peta = new Map(skor.map((s) => [s.butirKode, s]));
  const akhir = hitungNilaiAkhir(butir.map((b) => ({ kode: b.kode, bobot: Number(b.bobot) })), new Map(skor.map((s) => [s.butirKode, s.skor])));
  const aturan = bacaAturanStatus(versi?.statusAkreditasi);
  return {
    review: bacaStatusReview(proyek.statusReview),
    keputusan: proyek.keputusanReview as KeputusanReview | null,
    catatanBelumSelesai: belumSelesai,
    akhir,
    perkiraan: akhir.dinilai ? perkiraanStatus(akhir.total, aturan) : null,
    butir: butir.map((b) => ({
      kode: b.kode, bagianKode: b.bagianKode, elemen: b.elemen, indikator: b.indikator, bobot: Number(b.bobot), jenis: b.jenis,
      deskriptor: [b.deskriptorSkor0, b.deskriptorSkor1, b.deskriptorSkor2, b.deskriptorSkor3, b.deskriptorSkor4],
      skorSistem: b.jenis === "angka" ? sistem.get(b.kode) ?? null : null,
      skor: peta.get(b.kode)?.skor ?? null,
      alasan: peta.get(b.kode)?.alasan ?? null,
    })),
  };
}

export interface KeputusanReview {
  keputusan: "layak" | "perlu_revisi";
  catatan: string;
  total: number;
  perkiraan: string | null;
  waktu: string;
  olehId: string;
}

const skemaSkor = z.object({
  butirKode: z.string().trim().min(1).max(20),
  skor: z.number().nullable(),
  alasan: z.string().trim().max(2000).nullish(),
});

/** Simpan (atau hapus bila null) skor satu butir. Untuk butir angka, skor yang berbeda dari hitungan sistem wajib beralasan. */
export async function simpanSkor(p: Pengguna, proyekId: string, masukan: z.input<typeof skemaSkor>) {
  pastikanAsesor(p);
  const data = skemaSkor.parse(masukan);
  const proyek = await ambilProyek(p, proyekId, { baca: true });
  if (bacaStatusReview(proyek.statusReview) !== "direview") throw new GalatPengguna("Skor hanya bisa diisi saat LED berstatus Direview.");
  const butir = await prisma.butirPenilaian.findFirst({ where: { versiId: proyek.versiId, jenjang: proyek.jenjang, kode: data.butirKode } });
  if (!butir) throw new GalatPengguna("Butir tidak ada di instrumen LED ini.");
  if (data.skor === null) {
    await prisma.skorAsesor.deleteMany({ where: { proyekId: proyek.id, butirKode: butir.kode } });
    return null;
  }
  if (!skorSah(data.skor)) throw new GalatPengguna("Skor harus antara 0 dan 4.");
  const skorSistem = butir.jenis === "angka"
    ? (await nilaiButirUntukProyek(proyek)).daftar.find((n) => n.butir === butir.kode)?.hasil?.skor ?? null
    : null;
  if (perluAlasan(data.skor, skorSistem) && !data.alasan) {
    throw new GalatPengguna(`Skor berbeda dari hitungan sistem (${skorSistem!.toLocaleString("id-ID")}); tuliskan alasannya.`);
  }
  return prisma.skorAsesor.upsert({
    where: { proyekId_butirKode: { proyekId: proyek.id, butirKode: butir.kode } },
    create: { proyekId: proyek.id, butirKode: butir.kode, skor: data.skor, skorSistem, alasan: data.alasan || null, asesorId: p.id },
    update: { skor: data.skor, skorSistem, alasan: data.alasan || null, asesorId: p.id },
  });
}

const skemaKeputusan = z.object({
  keputusan: z.enum(["layak", "perlu_revisi"]),
  catatan: z.string().trim().max(4000).default(""),
});

/**
 * Keputusan akhir asesor. Layak diajukan: semua catatan sudah diterima dan semua butir sudah diberi skor; ekspor
 * final lalu terbuka. Perlu revisi: kembali ke PJ (wajib ada catatan umum atau catatan revisi yang belum selesai).
 */
export async function putuskanReview(p: Pengguna, proyekId: string, masukan: z.input<typeof skemaKeputusan>) {
  pastikanAsesor(p);
  const data = skemaKeputusan.parse(masukan);
  const nilai = await penilaianProyek(p, proyekId);
  if (nilai.review !== "direview") throw new GalatPengguna("Keputusan hanya bisa diberikan saat LED berstatus Direview.");
  if (data.keputusan === "layak") {
    if (nilai.catatanBelumSelesai) throw new GalatPengguna(`Masih ada ${nilai.catatanBelumSelesai} catatan revisi yang belum diterima.`);
    if (!nilai.akhir.lengkap) throw new GalatPengguna(`Baru ${nilai.akhir.dinilai} dari ${nilai.akhir.jumlahButir} butir yang diberi skor.`);
  } else if (!data.catatan && !nilai.catatanBelumSelesai) {
    throw new GalatPengguna("Tuliskan apa yang perlu direvisi, atau beri catatan pada teksnya.");
  }
  const keputusan: KeputusanReview = {
    keputusan: data.keputusan, catatan: data.catatan, total: nilai.akhir.total, perkiraan: nilai.perkiraan?.status ?? null,
    waktu: new Date().toISOString(), olehId: p.id,
  };
  const proyek = await prisma.proyekLED.update({
    where: { id: proyekId }, data: { statusReview: data.keputusan, keputusanReview: keputusan as unknown as Prisma.InputJsonValue }, include: { prodi: true },
  });
  await beritahu(await idTimProdiAktif(proyek.prodiId), {
    proyekId, pesan: `Asesor menyatakan ${proyek.nama}: ${LABEL_REVIEW[data.keputusan]}.`, tautan: `/led/${proyekId}`,
  });
  await catatAktivitas(p, "keputusan_review", "proyek", proyekId, { keputusan: data.keputusan, total: keputusan.total });
  return keputusan;
}

export interface BagianPerluReview {
  bagianKode: string;
  subBagianKode: string;
  label: string;
  judul: string;
  terbuka: number;
  diperbaiki: number;
  /** tautan ke halaman sub-bagian, langsung ke catatan pertama yang perlu diperbaiki */
  href: string;
}

/**
 * Sub-bagian yang masih punya catatan asesor belum selesai, urut seperti di LED (revisi 26 Okt 2026): kartu Review
 * asesor di Beranda menautkan langsung ke catatan pertama yang perlu diperbaiki.
 */
async function bagianPerluReview(proyek: { id: string; versiId: string }): Promise<BagianPerluReview[]> {
  const catatan = await prisma.catatanRevisi.findMany({
    where: { proyekId: proyek.id, status: { in: CATATAN_BELUM_SELESAI } },
    orderBy: { createdAt: "asc" },
    select: { id: true, bagianKode: true, subBagianKode: true, status: true },
  });
  if (!catatan.length) return [];
  const sub = await prisma.subBagian.findMany({
    where: { kode: { in: [...new Set(catatan.map((c) => c.subBagianKode))] }, bagian: { versiId: proyek.versiId } },
    select: { kode: true, label: true, judul: true, urutan: true, bagian: { select: { kode: true, urutan: true } } },
  });
  return sub
    .sort((a, b) => a.bagian.urutan - b.bagian.urutan || a.urutan - b.urutan)
    .map((s) => {
      const c = catatan.filter((x) => x.subBagianKode === s.kode);
      const pertama = c.find((x) => x.status === "terbuka") ?? c[0];
      return {
        bagianKode: s.bagian.kode,
        subBagianKode: s.kode,
        label: s.label,
        judul: s.judul,
        terbuka: c.filter((x) => x.status === "terbuka").length,
        diperbaiki: c.filter((x) => x.status === "diperbaiki").length,
        href: `${tautanSub("PJ", proyek.id, s.bagian.kode, s.kode)}#catatan-${pertama.id}`,
      };
    });
}

/** Ringkasan review untuk Beranda LED (PJ): asesor, status, jumlah catatan, dan nilai/keputusan terakhir. */
export async function ringkasReview(p: Pengguna, proyekId: string) {
  const proyek = await aksesReview(p, proyekId);
  const [asesor, n, jumlah] = await Promise.all([
    proyek.asesorId ? prisma.user.findUnique({ where: { id: proyek.asesorId }, select: { name: true } }) : null,
    penilaianProyek(p, proyekId),
    prisma.catatanRevisi.groupBy({ by: ["status"], where: { proyekId: proyek.id }, _count: { _all: true } }),
  ]);
  const hitung = (s: StatusCatatan) => jumlah.find((j) => j.status === s)?._count._all ?? 0;
  return {
    bagianPerlu: await bagianPerluReview(proyek),
    asesor: asesor?.name ?? null,
    review: n.review,
    keputusan: n.keputusan,
    catatan: { terbuka: hitung("terbuka"), diperbaiki: hitung("diperbaiki"), diterima: hitung("diterima") },
    akhir: n.akhir,
    perkiraan: n.perkiraan?.status ?? null,
  };
}

export interface PerbaikanMenunggu {
  id: string;
  bagianKode: string;
  subBagianKode: string;
  label: string;
  judul: string;
  /** teks yang diblok asesor */
  teks: string;
  /** catatan revisi asesor */
  isi: string;
  /** pesan PJ saat menandai Sudah diperbaiki (boleh kosong) */
  pesanPj: string;
  waktu: string;
  /** halaman asesor sub-bagian itu, langsung ke catatannya */
  href: string;
}

/**
 * Perbaikan PJ yang menunggu diperiksa asesor (revisi 26 Okt 2026): catatan berstatus diperbaiki beserta sub-bagian,
 * pesan PJ, dan waktunya, paling lama di atas. Ringkasan review asesor menautkan langsung ke catatannya.
 */
export async function perbaikanMenunggu(p: Pengguna, proyekId: string): Promise<PerbaikanMenunggu[]> {
  pastikanAsesor(p);
  const proyek = await ambilProyek(p, proyekId, { baca: true });
  const catatan = await prisma.catatanRevisi.findMany({
    where: { proyekId: proyek.id, status: "diperbaiki" },
    include: { balasan: { where: { jenis: "diperbaiki" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!catatan.length) return [];
  const sub = await prisma.subBagian.findMany({
    where: { kode: { in: [...new Set(catatan.map((c) => c.subBagianKode))] }, bagian: { versiId: proyek.versiId } },
    select: { kode: true, label: true, judul: true },
  });
  return catatan
    .map((c) => {
      const s = sub.find((x) => x.kode === c.subBagianKode);
      const tanda = c.balasan[0];
      return {
        id: c.id, bagianKode: c.bagianKode, subBagianKode: c.subBagianKode, label: s?.label ?? "", judul: s?.judul ?? c.subBagianKode,
        teks: c.teks, isi: c.isi, pesanPj: tanda?.isi ?? "", waktu: (tanda?.createdAt ?? c.updatedAt).toISOString(),
        href: `${tautanSub("ASESOR", proyek.id, c.bagianKode, c.subBagianKode)}#catatan-${c.id}`,
      };
    })
    .sort((a, b) => a.waktu.localeCompare(b.waktu));
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/modules/bersama/db";
import { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { periksaKodeRumus, tahunAktifJenjang } from "@/modules/led/data/instrumen";
import { unggahTemplateLed } from "@/modules/led/data/ekspor";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/modules/bersama/penyimpanan";
import { bacaRentangHalaman, deteksiTabelBobot } from "@/modules/led/domain/bobot";
import { periksaInstrumen, type HasilCekInstrumen } from "@/modules/led/domain/ekstraksi-instrumen";
import { berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { pecahUnsurSkor4 } from "@/modules/led/domain/navigasi";
import { teksPerHalaman } from "@/modules/led/instrumen/pdf";
import { skemaButir, skemaVersiJenjang, type MasukanButir, type MasukanVersiJenjang } from "@/modules/led/validasi";
import { bacaBerkasInstrumen, bacaTemplate, sha256 } from "@/modules/led/instrumen/baca-berkas";
import type { DiagnosisTemplate } from "@/modules/led/domain/diagnosis-template";
import { bacaPemetaan, type PemetaanTemplate } from "@/modules/led/domain/template-led";
import { daftarGaya, usulanPemetaan } from "@/modules/led/domain/pemetaan-template";
import { bacaParagrafTemplate } from "@/modules/led/instrumen/template";
import { skemaPemetaan, type MasukanPemetaan } from "@/modules/led/validasi";
import {
  konfirmasiTertunda, LABEL_JENIS, periksaBerkasInstrumen, periksaTahunAktif, SKEMA_VERSI, tambahRiwayat,
  type BacaanBerkas, type BerkasDikenal, type HasilPeriksa, type Konfirmasi, type SidikJariDikenal,
} from "@/modules/led/domain/periksa-berkas-instrumen";

/**
 * Instrumen per jenjang diunggah PJ setiap 5 tahun (revisi 19 Okt 2026): Template LED (.docx), Matriks Penilaian
 * (.pdf), Pedoman Penilaian (.pdf, PJ menyebut halaman tabel bobot). Ekstraksi berjalan di worker; hasilnya dicek
 * PJ di halaman cek, lalu diaktifkan. Versi lama tetap tersimpan dan LED lama tetap memakai versinya.
 */

export type JenisBerkasInstrumen = "template" | "matriks" | "pedoman";

const JENIS_BERKAS: JenisBerkasInstrumen[] = ["template", "matriks", "pedoman"];

// ---------------------------------------------------------------- pemeriksaan berkas (perbaikan 2 Nov 2026, I1)

/** Ringkasan bacaan satu berkas yang diterima, disimpan di VersiInstrumen.sidikJari. */
export type RingkasanBerkas = HasilPeriksa["bacaan"] & {
  namaBerkas: string;
  waktu: string;
  info: string[];
  konfirmasi: HasilPeriksa["konfirmasi"];
  /** Template LED: diagnosis pembacaan (I2) */
  diagnosis?: DiagnosisTemplate;
};

export interface SidikJariVersi {
  template?: RingkasanBerkas;
  matriks?: RingkasanBerkas;
  pedoman?: RingkasanBerkas;
  /** centang yang sudah diberikan Admin: berlaku untuk tahun dan berkas (sha256) saat dicentang */
  diberikan?: Partial<Record<Konfirmasi, { tahun: number; sha256: string[]; olehId: string; pada: string }>>;
}

export function bacaSidikJariVersi(v: unknown): SidikJariVersi {
  return v && typeof v === "object" ? (v as SidikJariVersi) : {};
}

export function bacaRiwayatPeriksa(v: unknown): HasilPeriksa[] {
  return Array.isArray(v) ? (v as HasilPeriksa[]) : [];
}

/** Konfirmasi yang masih wajib dicentang sebelum ekstraksi (dari ringkasan berkas yang terunggah). */
export function konfirmasiVersi(v: { tahunInstrumen: number; sidikJari: unknown }) {
  const sj = bacaSidikJariVersi(v.sidikJari);
  const perlu = JENIS_BERKAS.flatMap((j) => (sj[j]?.konfirmasi ?? []).map((k) => ({ ...k, berkas: j })));
  const sha = Object.fromEntries(JENIS_BERKAS.filter((j) => sj[j]).map((j) => [j, sj[j]!.sha256]));
  return konfirmasiTertunda(perlu, sj.diberikan ?? {}, v.tahunInstrumen, sha);
}

/** Berkas ditolak saat diunggah atau sebelum ekstraksi; `hasil` ditampilkan sebagai kotak di halaman versi. */
export class GalatBerkasDitolak extends GalatPengguna {
  constructor(readonly hasil: HasilPeriksa) {
    super(`${hasil.judul}. ${hasil.alasan}`);
  }
}

let dikenalJson: SidikJariDikenal | null = null;

/** Sidik jari bawaan (data/instrumen/sidik-jari.json) digabung dengan yang dipelajari (tabel SidikJariInstrumen). */
export async function sidikJariDikenal(): Promise<SidikJariDikenal> {
  dikenalJson ??= JSON.parse(await readFile(join(process.cwd(), "data/instrumen/sidik-jari.json"), "utf8")) as SidikJariDikenal;
  const db = await prisma.sidikJariInstrumen.findMany({ orderBy: { createdAt: "asc" } });
  const berkas: Record<string, BerkasDikenal> = { ...dikenalJson.berkas };
  for (const x of db) {
    berkas[x.sha256] = {
      nama: x.nama, tahun: x.tahun, skema: x.skema, sumber: "dipelajari dari instrumen yang diaktifkan",
      status: x.status === "usang" ? "usang" : "resmi",
    };
  }
  const struktur = [...dikenalJson.struktur];
  for (const x of db) {
    const kriteria = Array.isArray(x.kriteria) ? (x.kriteria as string[]) : [];
    if (x.jenis === "template" && x.status === "resmi" && kriteria.length) struktur.push({ tahun: x.tahun, skema: x.skema, kriteria });
  }
  return { berkas, struktur };
}

async function simpanPenolakan(p: Pengguna, versiId: string, riwayat: unknown, hasil: HasilPeriksa) {
  await prisma.versiInstrumen.update({
    where: { id: versiId },
    data: { riwayatPeriksa: tambahRiwayat(bacaRiwayatPeriksa(riwayat), hasil) as unknown as Prisma.InputJsonValue },
  });
  await catatAktivitas(p, "tolak_berkas_instrumen", "versi_instrumen", versiId, { jenis: hasil.jenisBerkas, nama: hasil.namaBerkas, judul: hasil.judul });
}

function ringkasan(hasil: HasilPeriksa): RingkasanBerkas {
  return {
    ...hasil.bacaan, namaBerkas: hasil.namaBerkas, waktu: hasil.waktu, info: hasil.info, konfirmasi: hasil.konfirmasi,
    ...(hasil.diagnosis ? { diagnosis: hasil.diagnosis } : {}),
  };
}

type VersiPeriksa = {
  id: string; kode: string; tahunInstrumen: number; jenjangUtama: string | null; riwayatPeriksa: unknown; sidikJari: unknown;
  pemetaanTemplate: unknown;
  templateLedLokasi: string | null; templateLedNama: string | null; matriksLokasi: string | null; matriksNama: string | null;
  pedomanLokasi: string | null; pedomanNama: string | null;
};

function lokasiBerkas(v: VersiPeriksa, j: JenisBerkasInstrumen) {
  return j === "template" ? v.templateLedLokasi : j === "matriks" ? v.matriksLokasi : v.pedomanLokasi;
}

function namaBerkasVersi(v: VersiPeriksa, j: JenisBerkasInstrumen) {
  return (j === "template" ? v.templateLedNama : j === "matriks" ? v.matriksNama : v.pedomanNama) ?? j;
}

/** Bacaan berkas yang sudah terunggah di versi ini (dibaca ulang dari penyimpanan). */
async function bacaanTersimpan(v: VersiPeriksa, j: JenisBerkasInstrumen): Promise<BacaanBerkas | null> {
  const lokasi = lokasiBerkas(v, j);
  return lokasi ? bacaBerkasInstrumen(j, await bacaBerkas(lokasi)) : null;
}

/** Bacaan berkas (template beserta diagnosisnya) dari isi berkas; `pemetaan` hanya untuk template yang tersimpan. */
async function bacaUntukPeriksa(
  v: VersiPeriksa, j: JenisBerkasInstrumen, isi: Buffer, pemetaan: PemetaanTemplate | null = null,
): Promise<{ bacaan: BacaanBerkas; diagnosis?: DiagnosisTemplate }> {
  if (j === "template") return bacaTemplate(isi, { jenjang: v.jenjangUtama, tahun: v.tahunInstrumen }, pemetaan);
  return { bacaan: await bacaBerkasInstrumen(j, isi) };
}

/** Jalankan tiga lapis pemeriksaan untuk satu berkas; berkas yang ditolak dicatat di riwayat lalu dilempar. */
async function periksaAtauTolak(
  p: Pengguna, v: VersiPeriksa, jenis: JenisBerkasInstrumen, namaBerkas: string,
  baca: { bacaan: BacaanBerkas; diagnosis?: DiagnosisTemplate }, pasangan: BacaanBerkas | null, dikenal: SidikJariDikenal,
): Promise<HasilPeriksa> {
  const hasil = periksaBerkasInstrumen({
    jenis, namaBerkas, tahunIsian: v.tahunInstrumen, jenjangVersi: v.jenjangUtama,
    tahunAktif: v.jenjangUtama ? await tahunAktifJenjang(v.jenjangUtama, v.id) : null,
    bacaan: baca.bacaan, diagnosis: baca.diagnosis, pasangan, dikenal,
  });
  if (!hasil.diterima) {
    await simpanPenolakan(p, v.id, v.riwayatPeriksa, hasil);
    throw new GalatBerkasDitolak(hasil);
  }
  return hasil;
}

export type StatusEkstraksi = "antre" | "berjalan" | "tertunda" | "selesai" | "gagal";

export interface InfoEkstraksi {
  status: StatusEkstraksi;
  langkah?: string;
  pesan?: string | null;
  kelompokSelesai?: number;
  jumlahKelompok?: number;
  jumlahBaris?: number;
  jumlahButir?: number;
  subBaru?: string[];
  mulai?: string;
  selesai?: string;
  usulanHalamanBobot?: string | null;
  /** nomor butir → halaman Matriks Penilaian */
  halamanButir?: Record<string, number[]>;
}

const UKURAN_MAKS = 40 * 1024 * 1024;

export function bacaInfoEkstraksi(v: unknown): InfoEkstraksi | null {
  return v && typeof v === "object" && "status" in v ? (v as InfoEkstraksi) : null;
}

async function versiMilik(p: Pengguna, versiId: string) {
  pastikanAdmin(p);
  const v = await prisma.versiInstrumen.findUnique({ where: { id: versiId }, include: { _count: { select: { proyek: true } } } });
  if (!v) throw new GalatPengguna("Versi instrumen tidak ditemukan.");
  return v;
}

function pastikanBelumAktif(v: { status: string; _count: { proyek: number } }) {
  if (v._count.proyek > 0) throw new GalatPengguna("Versi ini sudah dipakai LED sehingga tidak bisa diubah. Buat instrumen baru.");
  if (v.status === "aktif") throw new GalatPengguna("Versi ini sudah aktif. Nonaktifkan dulu bila ingin mengunggah ulang berkas.");
}

/** Versi rujukan untuk menyalin anggaran, tabel LKPS, bagian awal, dan kode sub-bagian: versi lain terbaru. */
export async function versiRujukan(kecualiId: string, jenjang: string) {
  const daftar = await prisma.versiInstrumen.findMany({
    where: { NOT: { id: kecualiId }, bagian: { some: {} } },
    orderBy: [{ aktif: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { butir: { where: { jenjang } } } } },
  });
  return daftar.find((v) => v.jenjangUtama === jenjang) ?? daftar.find((v) => v._count.butir > 0) ?? daftar[0] ?? null;
}

/** Kerangka bawaan (data instrumen LAM Teknik 2025) bila belum ada versi lain sama sekali. */
export async function kerangkaBawaan(): Promise<{
  tabelLkps: { kode: string; sheet: string; judul: string }[];
  anggaranBawaan: unknown;
  statusAkreditasi?: unknown;
}> {
  return JSON.parse(await readFile(join(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json"), "utf8"));
}

export async function buatVersiJenjang(p: Pengguna, masukan: MasukanVersiJenjang) {
  pastikanAdmin(p);
  const data = skemaVersiJenjang.parse(masukan);
  if (await prisma.versiInstrumen.findUnique({ where: { kode: data.kode } })) throw new GalatPengguna(`Kode versi ${data.kode} sudah dipakai.`);
  const lebihLama = periksaTahunAktif(data.tahunInstrumen, await tahunAktifJenjang(data.jenjang), data.jenjang);
  if (lebihLama) throw new GalatPengguna(lebihLama);
  const rujukan = await versiRujukan("", data.jenjang);
  const bawaan = rujukan ? null : await kerangkaBawaan();
  const tabelRujukan = rujukan ? await prisma.tabelLkpsAcuan.findMany({ where: { versiId: rujukan.id } }) : bawaan!.tabelLkps;
  const v = await prisma.versiInstrumen.create({
    data: {
      kode: data.kode,
      nama: data.nama,
      lembaga: "LAM Teknik",
      peraturan: data.peraturan as Prisma.InputJsonValue,
      catatan: data.catatan,
      tahunInstrumen: data.tahunInstrumen,
      aktif: false,
      status: "draf",
      jenjangUtama: data.jenjang,
      jenjang: [{ kode: data.jenjang, nama: namaJenjang(data.jenjang) }] as Prisma.InputJsonValue,
      statusAkreditasi: ((rujukan ? rujukan.statusAkreditasi : bawaan!.statusAkreditasi) ?? undefined) as Prisma.InputJsonValue | undefined,
      anggaranBawaan: ((rujukan ? rujukan.anggaranBawaan : bawaan!.anggaranBawaan) ?? {}) as Prisma.InputJsonValue,
      disalinDariId: null,
      tabelLkps: { create: tabelRujukan.map((t) => ({ kode: t.kode, sheet: t.sheet, judul: t.judul })) },
    },
  });
  await catatAktivitas(p, "buat", "versi_instrumen", v.id, { kode: v.kode, jenjang: data.jenjang, tahun: data.tahunInstrumen });
  return v;
}

/**
 * Unggah salah satu dari tiga berkas sumber. Isinya diperiksa sinkron lebih dulu (jenis, tahun, jenjang, kriteria,
 * sidik jari); berkas yang ditolak tidak disimpan. Pedoman: letak tabel bobot jenjang ini dideteksi sebagai usulan.
 */
export async function unggahBerkasInstrumen(p: Pengguna, versiId: string, jenis: JenisBerkasInstrumen, berkas: { nama: string; isi: Buffer }) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  if (berkas.isi.length > UKURAN_MAKS) throw new GalatPengguna("Berkas terlalu besar (maks. 40 MB).");
  const baca = await bacaUntukPeriksa(v, jenis, berkas.isi);
  const pasangan = jenis === "template" ? await bacaanTersimpan(v, "matriks") : jenis === "matriks" ? await bacaanTersimpan(v, "template") : null;
  const hasil = await periksaAtauTolak(p, v, jenis, berkas.nama, baca, pasangan, await sidikJariDikenal());
  const sj = bacaSidikJariVersi(v.sidikJari);
  const simpanSidik = () => prisma.versiInstrumen.update({
    where: { id: v.id },
    data: {
      sidikJari: { ...sj, [jenis]: ringkasan(hasil) } as unknown as Prisma.InputJsonValue,
      // template baru: pemetaan judul template lama tidak berlaku lagi
      ...(jenis === "template" ? { pemetaanTemplate: Prisma.DbNull } : {}),
    },
  });
  if (jenis === "template") {
    await unggahTemplateLed(p, versiId, berkas);
    await simpanSidik();
    return { usulanHalamanBobot: null, info: hasil.info };
  }
  let usulan: string | null = null;
  if (jenis === "pedoman" && v.jenjangUtama) {
    const letak = deteksiTabelBobot(await teksPerHalaman(berkas.isi)).find((x) => x.jenjang === v.jenjangUtama);
    usulan = letak ? `${letak.halamanMulai}-${letak.halamanAkhir}` : null;
  }
  const simpan = await simpanBerkas(`instrumen/${v.id}`, berkas.nama, berkas.isi);
  const lama = jenis === "matriks" ? v.matriksLokasi : v.pedomanLokasi;
  if (lama) await hapusBerkas(lama).catch(() => undefined);
  const info = bacaInfoEkstraksi(v.ekstraksi);
  await prisma.versiInstrumen.update({
    where: { id: v.id },
    data: jenis === "matriks"
      ? { matriksLokasi: simpan.lokasi, matriksNama: berkas.nama }
      : {
        pedomanLokasi: simpan.lokasi,
        pedomanNama: berkas.nama,
        // usulan letak tabel bobot diisi otomatis bila PJ belum mengisinya
        ...(usulan && !v.halamanBobot ? { halamanBobot: usulan } : {}),
        ...(info ? { ekstraksi: { ...info, usulanHalamanBobot: usulan } as unknown as Prisma.InputJsonValue } : {}),
      },
  });
  await simpanSidik();
  await catatAktivitas(p, "unggah_berkas_instrumen", "versi_instrumen", v.id, { jenis, nama: berkas.nama });
  return { usulanHalamanBobot: usulan, info: hasil.info };
}

export async function aturHalamanBobot(p: Pengguna, versiId: string, teks: string) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  try {
    bacaRentangHalaman(teks);
  } catch (e) {
    throw new GalatPengguna(e instanceof Error ? e.message : "Rentang halaman tidak sah.");
  }
  await prisma.versiInstrumen.update({ where: { id: v.id }, data: { halamanBobot: teks.trim() } });
}

/** Berkas sumber untuk ditampilkan di halaman cek (PDF di samping tabel). */
export async function berkasInstrumen(p: Pengguna, versiId: string, jenis: JenisBerkasInstrumen) {
  const v = await versiMilik(p, versiId);
  const lokasi = jenis === "matriks" ? v.matriksLokasi : jenis === "pedoman" ? v.pedomanLokasi : v.templateLedLokasi;
  const nama = jenis === "matriks" ? v.matriksNama : jenis === "pedoman" ? v.pedomanNama : v.templateLedNama;
  if (!lokasi) throw new GalatPengguna("Berkas belum diunggah.");
  return { nama: nama ?? `${jenis}.pdf`, isi: await bacaBerkas(lokasi) };
}

/**
 * Mulai (atau lanjutkan) ekstraksi di worker. `ulang` menghapus hasil ekstraksi sebelumnya (sub-bagian dan butir)
 * lalu mulai dari awal; tanpa `ulang`, ekstraksi yang tertunda/gagal dilanjutkan dari kelompok terakhir.
 */
export async function mulaiEkstraksi(p: Pengguna, versiId: string, opsi: { ulang?: boolean } = {}) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  if (!v.jenjangUtama) throw new GalatPengguna("Versi lama lintas jenjang tidak diekstrak ulang. Buat instrumen baru per jenjang.");
  if (!v.templateLedLokasi) throw new GalatPengguna("Unggah Template LED (.docx) lebih dulu.");
  if (!v.matriksLokasi) throw new GalatPengguna("Unggah Matriks Penilaian (.pdf) lebih dulu.");
  if (v.pedomanLokasi && !v.halamanBobot) throw new GalatPengguna("Isi halaman tabel bobot di Pedoman Penilaian (contoh 223-227).");
  const info = bacaInfoEkstraksi(v.ekstraksi);
  if (info && (info.status === "antre" || info.status === "berjalan")) throw new GalatPengguna("Ekstraksi sedang berjalan.");
  await periksaSebelumEkstraksi(p, v);
  if (opsi.ulang) {
    await prisma.$transaction([
      prisma.butirPenilaian.deleteMany({ where: { versiId: v.id } }),
      prisma.bagian.deleteMany({ where: { versiId: v.id } }),
    ]);
  }
  const lanjut = !opsi.ulang && info && info.status !== "selesai" ? info : null;
  await prisma.versiInstrumen.update({
    where: { id: v.id },
    data: {
      status: "draf",
      ekstraksi: {
        ...(lanjut ?? {}),
        status: "antre",
        pesan: null,
        mulai: new Date().toISOString(),
        usulanHalamanBobot: info?.usulanHalamanBobot ?? null,
        ...(lanjut ? {} : { kelompokSelesai: 0, langkah: "template" }),
      } as unknown as Prisma.InputJsonValue,
    },
  });
  await kirimTugas(ANTREAN.instrumen, { versiId: v.id });
  await catatAktivitas(p, "ekstrak_instrumen", "versi_instrumen", v.id, { ulang: Boolean(opsi.ulang) });
}

/**
 * Pemeriksaan sekali lagi sebelum ekstraksi (tahun instrumen bisa saja diubah setelah berkas diunggah): lapis 1 dan
 * 2 untuk berkas yang terunggah, lalu centang konfirmasi yang wajib. Ekstraksi tidak bisa dimulai sebelum lulus.
 */
async function periksaSebelumEkstraksi(p: Pengguna, v: VersiPeriksa) {
  const dikenal = await sidikJariDikenal();
  const baca: Partial<Record<JenisBerkasInstrumen, { bacaan: BacaanBerkas; diagnosis?: DiagnosisTemplate }>> = {};
  for (const j of JENIS_BERKAS) {
    const lokasi = lokasiBerkas(v, j);
    if (lokasi) baca[j] = await bacaUntukPeriksa(v, j, await bacaBerkas(lokasi), bacaPemetaan(v.pemetaanTemplate));
  }
  const sj = bacaSidikJariVersi(v.sidikJari);
  for (const j of JENIS_BERKAS) {
    const b = baca[j];
    if (!b) continue;
    const pasangan = j === "template" ? baca.matriks?.bacaan ?? null : j === "matriks" ? baca.template?.bacaan ?? null : null;
    sj[j] = ringkasan(await periksaAtauTolak(p, v, j, namaBerkasVersi(v, j), b, pasangan, dikenal));
  }
  await prisma.versiInstrumen.update({ where: { id: v.id }, data: { sidikJari: sj as unknown as Prisma.InputJsonValue } });
  const diag = sj.template?.diagnosis;
  if (diag?.bisaDipetakan) throw new GalatPengguna(`${diag.pesan} ${diag.langkah}`);
  const tertunda = konfirmasiVersi({ tahunInstrumen: v.tahunInstrumen, sidikJari: sj });
  if (tertunda.length) {
    throw new GalatPengguna(`Centang konfirmasi di bagian Berkas sumber sebelum ekstraksi: ${tertunda.map((k) => k.teks).join(" ")}`);
  }
}

// ---------------------------------------------------------------- pemetaan judul (I3)

/** Data halaman Pemetaan judul: paragraf template, tabel gaya, usulan awal tanpa AI, dan pemetaan tersimpan. */
export async function dataPemetaan(p: Pengguna, versiId: string) {
  const v = await versiMilik(p, versiId);
  if (!v.templateLedLokasi) throw new GalatPengguna("Unggah Template LED (.docx) lebih dulu.");
  const paragraf = await bacaParagrafTemplate(await bacaBerkas(v.templateLedLokasi));
  const kriteriaMatriks = bacaSidikJariVersi(v.sidikJari).matriks?.kriteria?.length || undefined;
  return {
    versi: v,
    paragraf: paragraf.map((x) => ({ ...x, teks: x.teks.slice(0, 2000) })),
    gaya: daftarGaya(paragraf),
    usulan: usulanPemetaan(paragraf, { jumlahKriteria: kriteriaMatriks }),
    pemetaan: bacaPemetaan(v.pemetaanTemplate),
    kriteriaMatriks: kriteriaMatriks ?? null,
  };
}

/**
 * Simpan pemetaan judul: template dibaca ulang dengan pemetaan itu (diagnosis, kriteria, kecocokan dengan Matriks).
 * Pemetaan tetap disimpan walau belum cocok supaya Admin bisa melanjutkannya; ekstraksi menunggu sampai cocok.
 */
export async function simpanPemetaan(p: Pengguna, versiId: string, masukan: MasukanPemetaan) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  if (!v.templateLedLokasi) throw new GalatPengguna("Unggah Template LED (.docx) lebih dulu.");
  const data = skemaPemetaan.parse(masukan);
  const pemetaan: PemetaanTemplate = { gaya: data.gaya, polaCatatan: data.polaCatatan || null, kotak: data.kotak };
  const baca = await bacaUntukPeriksa(v, "template", await bacaBerkas(v.templateLedLokasi), pemetaan);
  const sj = bacaSidikJariVersi(v.sidikJari);
  const pasangan = await bacaanTersimpan(v, "matriks");
  const hasil = periksaBerkasInstrumen({
    jenis: "template", namaBerkas: namaBerkasVersi(v, "template"), tahunIsian: v.tahunInstrumen, jenjangVersi: v.jenjangUtama,
    tahunAktif: v.jenjangUtama ? await tahunAktifJenjang(v.jenjangUtama, v.id) : null,
    bacaan: baca.bacaan, diagnosis: baca.diagnosis, pasangan, dikenal: await sidikJariDikenal(),
  });
  await prisma.versiInstrumen.update({
    where: { id: v.id },
    data: {
      pemetaanTemplate: pemetaan as unknown as Prisma.InputJsonValue,
      ...(hasil.diterima ? { sidikJari: { ...sj, template: ringkasan(hasil) } as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  await catatAktivitas(p, "simpan_pemetaan_template", "versi_instrumen", v.id, { gaya: data.gaya, diagnosis: baca.diagnosis?.kode });
  return { diagnosis: baca.diagnosis?.kode ?? null, masalah: hasil.diterima ? null : `${hasil.judul}. ${hasil.alasan}` };
}

/** Admin mencentang konfirmasi (tahun tidak tertulis di teks, atau skema berbeda); dicatat di LogAktivitas. */
export async function konfirmasiBerkasInstrumen(p: Pengguna, versiId: string, jenis: Konfirmasi) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  const perlu = konfirmasiVersi(v).filter((k) => k.jenis === jenis);
  if (!perlu.length) throw new GalatPengguna("Tidak ada yang perlu dikonfirmasi.");
  const sj = bacaSidikJariVersi(v.sidikJari);
  const sha = JENIS_BERKAS.filter((j) => sj[j]?.konfirmasi.some((k) => k.jenis === jenis)).map((j) => sj[j]!.sha256);
  sj.diberikan = { ...sj.diberikan, [jenis]: { tahun: v.tahunInstrumen, sha256: sha, olehId: p.id, pada: new Date().toISOString() } };
  await prisma.versiInstrumen.update({ where: { id: v.id }, data: { sidikJari: sj as unknown as Prisma.InputJsonValue } });
  await catatAktivitas(p, `konfirmasi_${jenis}_instrumen`, "versi_instrumen", v.id, { tahun: v.tahunInstrumen, teks: perlu.map((k) => k.teks) });
}

/**
 * "Belajar versi baru": saat versi diaktifkan, SHA-256 berkasnya (dan kriteria template) disimpan supaya berkas yang
 * sama dikenali pada unggahan berikutnya. Berkas yang sudah ada di sidik-jari.json tidak ditimpa.
 */
async function pelajariSidikJari(v: VersiPeriksa) {
  dikenalJson ??= JSON.parse(await readFile(join(process.cwd(), "data/instrumen/sidik-jari.json"), "utf8")) as SidikJariDikenal;
  const sj = bacaSidikJariVersi(v.sidikJari);
  for (const j of JENIS_BERKAS) {
    const lokasi = lokasiBerkas(v, j);
    if (!lokasi) continue;
    const sha = sj[j]?.sha256 ?? sha256(await bacaBerkas(lokasi));
    if (dikenalJson.berkas[sha]) continue;
    await prisma.sidikJariInstrumen.upsert({
      where: { sha256: sha },
      create: {
        sha256: sha, jenis: j, nama: `${LABEL_JENIS[j]} instrumen ${v.tahunInstrumen} (${v.kode})`, tahun: v.tahunInstrumen,
        skema: SKEMA_VERSI, status: "resmi",
        kriteria: (j === "template" && sj.template?.kriteria ? sj.template.kriteria : undefined) as Prisma.InputJsonValue | undefined,
        jenjang: j === "matriks" ? v.jenjangUtama : null, versiId: v.id,
      },
      update: {},
    });
  }
}

/** Tahun versi aktif yang lebih baru bila berkas versi (nonaktif) ini boleh ditandai usang; null bila tidak. */
export async function bisaTandaiUsang(v: { id: string; aktif: boolean; jenjangUtama: string | null; tahunInstrumen: number }) {
  if (v.aktif || !v.jenjangUtama) return null;
  const aktif = await tahunAktifJenjang(v.jenjangUtama, v.id);
  return aktif !== null && aktif > v.tahunInstrumen ? aktif : null;
}

/**
 * Tandai berkas versi lama sebagai usang (satu tombol di halaman versi lama). Berkas yang juga dipakai versi aktif
 * (mis. template yang sama dipakai lagi di instrumen tahun baru) tidak ditandai.
 */
export async function tandaiBerkasUsang(p: Pengguna, versiId: string) {
  const v = await versiMilik(p, versiId);
  const baru = await bisaTandaiUsang(v);
  if (baru === null) throw new GalatPengguna("Berkas hanya bisa ditandai usang setelah instrumen tahun yang lebih baru untuk jenjang ini diaktifkan.");
  const dipakai = new Set(
    (await prisma.versiInstrumen.findMany({ where: { aktif: true }, select: { sidikJari: true } }))
      .flatMap((x) => JENIS_BERKAS.map((j) => bacaSidikJariVersi(x.sidikJari)[j]?.sha256).filter((h): h is string => Boolean(h))),
  );
  const sj = bacaSidikJariVersi(v.sidikJari);
  const ditandai: string[] = [];
  const dilewati: string[] = [];
  for (const j of JENIS_BERKAS) {
    const lokasi = lokasiBerkas(v, j);
    if (!lokasi) continue;
    const sha = sj[j]?.sha256 ?? sha256(await bacaBerkas(lokasi));
    if (dipakai.has(sha)) {
      dilewati.push(LABEL_JENIS[j]);
      continue;
    }
    await prisma.sidikJariInstrumen.upsert({
      where: { sha256: sha },
      create: {
        sha256: sha, jenis: j, nama: `${LABEL_JENIS[j]} instrumen ${v.tahunInstrumen} (${v.kode})`, tahun: v.tahunInstrumen,
        skema: SKEMA_VERSI, status: "usang", jenjang: v.jenjangUtama, versiId: v.id,
      },
      update: { status: "usang" },
    });
    ditandai.push(LABEL_JENIS[j]);
  }
  await catatAktivitas(p, "tandai_usang", "versi_instrumen", v.id, { ditandai, dilewati, tahunBaru: baru });
  return { ditandai, dilewati };
}

/** Lanjutkan ekstraksi yang tertunda karena kunci API (dipanggil setelah kunci baru ditambahkan). */
export async function antreUlangEkstraksiTertunda(): Promise<number> {
  const daftar = await prisma.versiInstrumen.findMany({ where: { status: "draf" }, select: { id: true, ekstraksi: true } });
  let n = 0;
  for (const v of daftar) {
    const info = bacaInfoEkstraksi(v.ekstraksi);
    if (info?.status !== "tertunda") continue;
    await prisma.versiInstrumen.update({ where: { id: v.id }, data: { ekstraksi: { ...info, status: "antre", pesan: null } as unknown as Prisma.InputJsonValue } });
    await kirimTugas(ANTREAN.instrumen, { versiId: v.id });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- halaman cek

/** Data halaman cek: butir (dengan sub-bagian terkait), sub-bagian, dan hasil pemeriksaan otomatis. */
export async function dataCekInstrumen(p: Pengguna, versiId: string) {
  const v = await versiMilik(p, versiId);
  const [butir, bagian] = await Promise.all([
    prisma.butirPenilaian.findMany({
      where: { versiId: v.id, ...(v.jenjangUtama ? { jenjang: v.jenjangUtama } : {}) },
      orderBy: { urutan: "asc" },
      include: { subBagian: { include: { subBagian: { select: { id: true, kode: true } } } } },
    }),
    prisma.bagian.findMany({
      where: { versiId: v.id },
      orderBy: { urutan: "asc" },
      include: { subBagian: { orderBy: { urutan: "asc" } } },
    }),
  ]);
  // versi menyimpan struktur template semua jenjang; yang dicek hanya sub-bagian jenjang versi ini
  const sub = bagian.flatMap((b) => b.subBagian.map((s) => ({ ...s, bagianKode: b.kode })))
    .filter((s) => !v.jenjangUtama || berlakuUntukJenjang(s, v.jenjangUtama));
  const cek = periksaInstrumenVersi(butir, sub);
  return { versi: v, butir, bagian, sub, cek, info: bacaInfoEkstraksi(v.ekstraksi) };
}

function periksaInstrumenVersi(
  butir: { kode: string; no: number; bobot: Prisma.Decimal | number; deskriptorSkor4: string; dikonfirmasi: boolean; subBagian: unknown[] }[],
  sub: { kode: string; tipe: string; varian: unknown }[],
): HasilCekInstrumen {
  return periksaInstrumen(
    butir.map((b) => ({ kode: b.kode, no: b.no, bobot: Number(b.bobot), deskriptorSkor4: b.deskriptorSkor4, jumlahSub: b.subBagian.length, dikonfirmasi: b.dikonfirmasi })),
    sub.map((s) => ({ kode: s.kode, tipe: s.tipe, instruksi: ((s.varian ?? []) as { instruksi?: string }[]).map((x) => x.instruksi ?? "") })),
  );
}

/** Simpan suntingan satu butir di halaman cek sekaligus menandainya sudah dicek (usulan AI dikonfirmasi). */
export async function simpanButirCek(p: Pengguna, versiId: string, butirId: string, masukan: MasukanButir) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  const data = skemaButir.parse(masukan);
  const lama = await prisma.butirPenilaian.findFirst({ where: { id: butirId, versiId: v.id } });
  if (!lama) throw new GalatPengguna("Butir tidak ditemukan di versi ini.");
  if (await prisma.butirPenilaian.findFirst({ where: { versiId: v.id, jenjang: data.jenjang, kode: data.kode, NOT: { id: butirId } } })) {
    throw new GalatPengguna(`Kode butir ${data.kode} sudah dipakai.`);
  }
  const subSah = await prisma.subBagian.count({ where: { id: { in: data.subBagianIds }, bagian: { versiId: v.id } } });
  if (subSah !== data.subBagianIds.length) throw new GalatPengguna("Sub-bagian yang dipilih tidak ada di versi ini.");
  const { subBagianIds, dokumenPendukung: _d, pertanyaanPemandu: _p, unsurSkor4, ...kolom } = { ...data, kodeRumus: periksaKodeRumus(data.kodeRumus) };
  await prisma.$transaction(async (tx) => {
    await tx.butirPenilaian.update({
      where: { id: butirId },
      data: {
        ...kolom,
        // daftar cek skor 4 dari deskriptor resmi bila PJ tidak mengubahnya sendiri
        unsurSkor4: unsurSkor4.length ? unsurSkor4 : pecahUnsurSkor4(kolom.deskriptorSkor4),
        dikonfirmasi: true,
        usulanAi: [],
      },
    });
    await tx.butirSubBagian.deleteMany({ where: { butirId } });
    await tx.butirSubBagian.createMany({ data: subBagianIds.map((subBagianId) => ({ butirId, subBagianId })) });
  });
  await catatAktivitas(p, "cek_butir", "butir", butirId, { kode: data.kode });
}

/** Tandai butir sudah dicek tanpa mengubah isinya. */
export async function konfirmasiButir(p: Pengguna, versiId: string, butirId: string) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  const r = await prisma.butirPenilaian.updateMany({ where: { id: butirId, versiId: v.id }, data: { dikonfirmasi: true, usulanAi: [] } });
  if (r.count === 0) throw new GalatPengguna("Butir tidak ditemukan di versi ini.");
}

/** "Sudah dicek, aktifkan": hanya bila pemeriksaan otomatis lolos dan semua butir sudah dikonfirmasi. */
export async function aktifkanVersiCek(p: Pengguna, versiId: string) {
  const { versi, cek } = await dataCekInstrumen(p, versiId);
  if (versi.status === "aktif") throw new GalatPengguna("Versi ini sudah aktif.");
  const info = bacaInfoEkstraksi(versi.ekstraksi);
  if (info && info.status !== "selesai") throw new GalatPengguna("Ekstraksi belum selesai.");
  if (cek.galat.length) throw new GalatPengguna(`Belum bisa diaktifkan: ${cek.galat.join(" ")}`);
  await prisma.$transaction(async (tx) => {
    // satu versi aktif per jenjang; versi lama tetap tersimpan dan LED lama tetap memakainya
    if (versi.jenjangUtama) {
      await tx.versiInstrumen.updateMany({
        where: { jenjangUtama: versi.jenjangUtama, aktif: true, NOT: { id: versi.id } },
        data: { aktif: false, status: "nonaktif" },
      });
    }
    await tx.versiInstrumen.update({
      where: { id: versi.id },
      data: { aktif: true, status: "aktif", dicekPada: new Date(), dicekOlehId: p.id },
    });
  });
  await pelajariSidikJari(versi);
  await catatAktivitas(p, "aktifkan", "versi_instrumen", versi.id, { kode: versi.kode, jenjang: versi.jenjangUtama });
}

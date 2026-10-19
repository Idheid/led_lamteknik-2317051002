import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, pastikanPenanggungJawab, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import { periksaKodeRumus } from "@/lib/data/instrumen";
import { unggahTemplateLed } from "@/lib/data/ekspor";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/lib/penyimpanan";
import { bacaRentangHalaman, deteksiTabelBobot } from "@/lib/domain/bobot";
import { periksaInstrumen, type HasilCekInstrumen } from "@/lib/domain/ekstraksi-instrumen";
import { namaJenjang } from "@/lib/domain/instrumen";
import { pecahUnsurSkor4 } from "@/lib/domain/navigasi";
import { teksPerHalaman } from "@/lib/instrumen/pdf";
import { skemaButir, skemaVersiJenjang, type MasukanButir, type MasukanVersiJenjang } from "@/lib/validasi";

/**
 * Instrumen per jenjang diunggah PJ setiap 5 tahun (revisi 19 Okt 2026): Template LED (.docx), Matriks Penilaian
 * (.pdf), Pedoman Penilaian (.pdf, PJ menyebut halaman tabel bobot). Ekstraksi berjalan di worker; hasilnya dicek
 * PJ di halaman cek, lalu diaktifkan. Versi lama tetap tersimpan dan LED lama tetap memakai versinya.
 */

export type JenisBerkasInstrumen = "template" | "matriks" | "pedoman";

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
  pastikanPenanggungJawab(p);
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

export async function buatVersiJenjang(p: Pengguna, masukan: MasukanVersiJenjang) {
  pastikanPenanggungJawab(p);
  const data = skemaVersiJenjang.parse(masukan);
  if (await prisma.versiInstrumen.findUnique({ where: { kode: data.kode } })) throw new GalatPengguna(`Kode versi ${data.kode} sudah dipakai.`);
  const rujukan = await versiRujukan("", data.jenjang);
  const v = await prisma.versiInstrumen.create({
    data: {
      kode: data.kode,
      nama: data.nama,
      lembaga: "LAM Teknik",
      peraturan: data.peraturan as Prisma.InputJsonValue,
      catatan: data.catatan,
      aktif: false,
      status: "draf",
      jenjangUtama: data.jenjang,
      jenjang: [{ kode: data.jenjang, nama: namaJenjang(data.jenjang) }] as Prisma.InputJsonValue,
      statusAkreditasi: (rujukan?.statusAkreditasi ?? undefined) as Prisma.InputJsonValue | undefined,
      anggaranBawaan: (rujukan?.anggaranBawaan ?? {}) as Prisma.InputJsonValue,
      disalinDariId: null,
      tabelLkps: rujukan
        ? { create: (await prisma.tabelLkpsAcuan.findMany({ where: { versiId: rujukan.id } })).map((t) => ({ kode: t.kode, sheet: t.sheet, judul: t.judul })) }
        : undefined,
    },
  });
  await catatAktivitas(p, "buat", "versi_instrumen", v.id, { kode: v.kode, jenjang: data.jenjang });
  return v;
}

/** Unggah salah satu dari tiga berkas sumber. Pedoman: letak tabel bobot jenjang ini dideteksi sebagai usulan. */
export async function unggahBerkasInstrumen(p: Pengguna, versiId: string, jenis: JenisBerkasInstrumen, berkas: { nama: string; isi: Buffer }) {
  const v = await versiMilik(p, versiId);
  pastikanBelumAktif(v);
  if (berkas.isi.length > UKURAN_MAKS) throw new GalatPengguna("Berkas terlalu besar (maks. 40 MB).");
  if (jenis === "template") {
    await unggahTemplateLed(p, versiId, berkas);
    return { usulanHalamanBobot: null };
  }
  if (!/\.pdf$/i.test(berkas.nama) || berkas.isi.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new GalatPengguna(`${jenis === "matriks" ? "Matriks Penilaian" : "Pedoman Penilaian"} harus berupa berkas PDF.`);
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
  await catatAktivitas(p, "unggah_berkas_instrumen", "versi_instrumen", v.id, { jenis, nama: berkas.nama });
  return { usulanHalamanBobot: usulan };
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
  const sub = bagian.flatMap((b) => b.subBagian.map((s) => ({ ...s, bagianKode: b.kode })));
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
  await catatAktivitas(p, "aktifkan", "versi_instrumen", versi.id, { kode: versi.kode, jenjang: versi.jenjangUtama });
}

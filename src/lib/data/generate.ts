import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { catatAktivitas } from "@/lib/data/log";
import { ringkasanKunciProdi } from "@/lib/data/kunci-api";
import { ambilProyek, ambilProyekUbah, pastikanBisaDiubah } from "@/lib/data/proyek";
import {
  bacaDokumen, bandingkanTeks, periksaDokumen, teksDokumen, type DokTiptap, type HasilPemeriksaan, type RujukanPeriksa,
} from "@/lib/domain/narasi";
import type { KeluaranSubBagian } from "@/lib/domain/prompt";
import { perbaruiStatusBagian, subBagianProyek, urutanSubBagian } from "@/lib/proses/generate";
import { pakaiNarasiUji } from "@/lib/llm/narasi-uji";

/**
 * Lapisan data mesin penyusun untuk penanggung jawab: memulai/membatalkan/melanjutkan generate (F-13, F-19),
 * draf per sub-bagian, suntingan dengan simpan otomatis (F-16), riwayat versi, perbandingan, pemulihan (F-17),
 * dan status selesai (F-21). Semua fungsi memeriksa bahwa proyek milik prodi pengguna.
 */

export const STATUS_TUGAS_AKTIF = ["antre", "berjalan", "tertunda"];

/** Mulai generate satu bagian (semua sub-bagian, urut IKU → LB/KEB → AF → SWOT) atau satu sub-bagian saja. */
export async function mulaiGenerate(p: Pengguna, proyekId: string, bagianKode: string, subBagianKode?: string | null) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const aktif = await prisma.tugasGenerate.findFirst({ where: { proyekId: proyek.id, status: { in: STATUS_TUGAS_AKTIF } } });
  if (aktif) {
    throw new GalatPengguna(`Masih ada penyusunan "${aktif.judul}" di antrean proyek ini. Tunggu selesai atau batalkan dulu.`);
  }
  const bagian = await prisma.bagian.findUnique({ where: { versiId_kode: { versiId: proyek.versiId, kode: bagianKode } } });
  if (!bagian) throw new GalatPengguna("Bagian tidak ditemukan di versi instrumen proyek.");
  let daftar = await urutanSubBagian(proyek, bagianKode);
  let judul = `${bagian.kode} ${bagian.nama}`;
  if (subBagianKode) {
    if (!daftar.includes(subBagianKode)) throw new GalatPengguna("Sub-bagian ini tidak di-generate (diisi dari data atau otomatis).");
    const s = (await subBagianProyek(proyek, bagianKode)).find((x) => x.kode === subBagianKode)!;
    daftar = [subBagianKode];
    judul = `${bagian.kode} ${s.label ? `${s.label} ` : ""}${s.judul}`;
  }
  if (daftar.length === 0) throw new GalatPengguna("Bagian ini tidak punya sub-bagian yang di-generate.");

  const kunci = await ringkasanKunciProdi(proyek.prodiId);
  const tanpaKunci = !kunci.adaYangBisaDipakai && !pakaiNarasiUji();
  const tugas = await prisma.tugasGenerate.create({
    data: {
      proyekId: proyek.id,
      bagianKode,
      judul: judul.slice(0, 200),
      subBagianKode: daftar,
      dibuatOlehId: p.id,
      status: tanpaKunci ? "tertunda" : "antre",
      pesan: tanpaKunci
        ? (kunci.milikProdi === 0
          ? "Belum ada kunci API Gemini. Tambahkan kunci di menu Kunci API; penyusunan dimulai otomatis."
          : "Kuota semua kunci API habis. Tambahkan kunci dari project Google lain; penyusunan dimulai otomatis.")
        : null,
    },
  });
  if (!tanpaKunci) await kirimTugas(ANTREAN.generate, { tugasId: tugas.id });
  await catatAktivitas(p, "generate", "proyek", proyek.id, { bagianKode, subBagianKode: subBagianKode ?? null, jumlah: daftar.length });
  return tugas;
}

async function tugasMilik(p: Pengguna, tugasId: string) {
  const t = await prisma.tugasGenerate.findUnique({ where: { id: tugasId } });
  if (!t) throw new GalatAkses("Tugas tidak ditemukan.");
  await ambilProyek(p, t.proyekId);
  return t;
}

export async function batalkanTugas(p: Pengguna, tugasId: string) {
  const t = await tugasMilik(p, tugasId);
  const r = await prisma.tugasGenerate.updateMany({
    where: { id: t.id, status: { in: [...STATUS_TUGAS_AKTIF, "gagal"] } },
    data: { status: "dibatalkan", pesan: "Dibatalkan penanggung jawab." },
  });
  if (r.count === 0) throw new GalatPengguna("Tugas ini sudah selesai.");
  await catatAktivitas(p, "batal_generate", "proyek", t.proyekId, { tugasId });
}

/** Lanjutkan tugas yang gagal atau tertunda dari sub-bagian terakhir. */
export async function lanjutkanTugas(p: Pengguna, tugasId: string) {
  const t = await tugasMilik(p, tugasId);
  if (t.status !== "gagal" && t.status !== "tertunda") throw new GalatPengguna("Hanya tugas yang gagal atau tertunda yang bisa dilanjutkan.");
  const proyek = await ambilProyek(p, t.proyekId);
  if (!pakaiNarasiUji() && !(await ringkasanKunciProdi(proyek.prodiId)).adaYangBisaDipakai) {
    throw new GalatPengguna("Belum ada kunci API yang bisa dipakai. Tambahkan kunci di menu Kunci API.");
  }
  await prisma.tugasGenerate.update({ where: { id: t.id }, data: { status: "antre", pesan: null, dilanjutkanPada: null } });
  await kirimTugas(ANTREAN.generate, { tugasId: t.id });
}

export interface RingkasTugas {
  id: string;
  judul: string;
  bagianKode: string | null;
  status: string;
  pesan: string | null;
  indeks: number;
  total: number;
  sedang: string | null;
  dilanjutkanPada: string | null;
  diperbarui: string;
}

/** Tugas yang sedang berjalan/tertunda/gagal, ditambah yang baru selesai (10 menit terakhir), untuk banner antrean. */
export async function tugasProyek(p: Pengguna, proyekId: string): Promise<RingkasTugas[]> {
  const proyek = await ambilProyek(p, proyekId);
  const batas = new Date(Date.now() - 10 * 60_000);
  const daftar = await prisma.tugasGenerate.findMany({
    where: {
      proyekId: proyek.id,
      OR: [{ status: { in: [...STATUS_TUGAS_AKTIF, "gagal"] } }, { status: "selesai", updatedAt: { gte: batas } }],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const kode = [...new Set(daftar.flatMap((t) => t.subBagianKode))];
  const sub = await prisma.subBagian.findMany({
    where: { kode: { in: kode }, bagian: { versiId: proyek.versiId } },
    select: { kode: true, label: true, judul: true },
  });
  const nama = new Map(sub.map((s) => [s.kode, `${s.label ? `${s.label} ` : ""}${s.judul}`]));
  return daftar.map((t) => ({
    id: t.id,
    judul: t.judul,
    bagianKode: t.bagianKode,
    status: t.status,
    pesan: t.pesan,
    indeks: t.indeks,
    total: t.subBagianKode.length,
    sedang: t.indeks < t.subBagianKode.length ? nama.get(t.subBagianKode[t.indeks]) ?? t.subBagianKode[t.indeks] : null,
    dilanjutkanPada: t.dilanjutkanPada?.toISOString() ?? null,
    diperbarui: t.updatedAt.toISOString(),
  }));
}

// ------------------------------------------------------------------ draf dan versi

type PemeriksaanTersimpan = HasilPemeriksaan & { rujukan?: RujukanPeriksa; catatanSistem?: string[] };

function pemeriksaanTampil(json: unknown): (HasilPemeriksaan & { catatanSistem?: string[] }) | null {
  if (!json || typeof json !== "object") return null;
  const { rujukan: _r, ...sisa } = json as PemeriksaanTersimpan;
  return sisa;
}

function pemakaian(json: unknown): { tokenMasuk: number; tokenKeluar: number; durasiMs: number } | null {
  const p = (json as { pemakaian?: { tokenMasuk: number; tokenKeluar: number; durasiMs: number } } | null)?.pemakaian;
  return p ?? null;
}

/** Draf semua sub-bagian di satu bagian: versi aktif lengkap dan daftar versi. */
export async function drafBagian(p: Pengguna, proyekId: string, bagianKode: string) {
  const proyek = await ambilProyek(p, proyekId);
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId: proyek.id, subBagian: { bagian: { versiId: proyek.versiId, kode: bagianKode } } },
    include: {
      subBagian: { select: { kode: true } },
      versi: {
        orderBy: { nomor: "desc" },
        select: { id: true, nomor: true, asal: true, createdAt: true, model: true, jumlahKata: true, dibuatOleh: { select: { name: true } } },
      },
    },
  });
  const idAktif = draf.map((d) => d.versiAktifId).filter((x): x is string => Boolean(x));
  const aktif = await prisma.versiDraf.findMany({ where: { id: { in: idAktif } } });
  return Object.fromEntries(draf.map((d) => {
    const v = aktif.find((x) => x.id === d.versiAktifId);
    return [d.subBagian.kode, {
      id: d.id,
      status: d.status,
      aktif: v ? {
        id: v.id,
        nomor: v.nomor,
        asal: v.asal,
        isi: bacaDokumen(v.isi),
        legenda: (v.sumber ?? {}) as Record<string, string>,
        unsur: (v.unsur ?? []) as KeluaranSubBagian["unsur"],
        dokumenKurang: v.dokumenKurang,
        pemeriksaan: pemeriksaanTampil(v.pemeriksaan),
        catatanPenyusun: ((v.keluaranMentah as { keluaran?: KeluaranSubBagian } | null)?.keluaran?.catatanUntukPenyusun) ?? null,
        model: v.model,
        pemakaian: pemakaian(v.keluaranMentah),
        jumlahKata: v.jumlahKata,
        dibuat: v.createdAt.toISOString(),
      } : null,
      versi: d.versi.map((x) => ({
        id: x.id, nomor: x.nomor, asal: x.asal, dibuat: x.createdAt.toISOString(), model: x.model, jumlahKata: x.jumlahKata,
        oleh: x.dibuatOleh?.name ?? null, aktif: x.id === d.versiAktifId,
      })),
    }];
  }));
}

export type DrafSubBagian = Awaited<ReturnType<typeof drafBagian>>[string];

const skemaDok = z.object({ type: z.literal("doc"), content: z.array(z.record(z.string(), z.unknown())) });

async function drafSubBagian(p: Pengguna, proyekId: string, subBagianKode: string) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const sub = await prisma.subBagian.findFirst({ where: { kode: subBagianKode, bagian: { versiId: proyek.versiId } }, include: { bagian: true } });
  if (!sub) throw new GalatPengguna("Sub-bagian tidak ada di versi instrumen proyek ini.");
  return { proyek, sub };
}

const JENDELA_SUNTING_MS = 30 * 60_000;

/**
 * Simpan suntingan (simpan otomatis dari editor). Suntingan beruntun oleh pengguna yang sama dalam 30 menit
 * memperbarui versi suntingan terakhir; selain itu dibuat versi baru. Pemeriksaan otomatis dijalankan ulang.
 */
export async function simpanSuntingan(p: Pengguna, proyekId: string, subBagianKode: string, isiMasukan: unknown) {
  const { proyek, sub } = await drafSubBagian(p, proyekId, subBagianKode);
  if (JSON.stringify(isiMasukan ?? null).length > 2_000_000) throw new GalatPengguna("Isi terlalu besar untuk disimpan.");
  const isi = skemaDok.parse(isiMasukan) as unknown as DokTiptap;
  const bd = await prisma.bagianDraf.upsert({
    where: { proyekId_subBagianId: { proyekId: proyek.id, subBagianId: sub.id } },
    create: { proyekId: proyek.id, subBagianId: sub.id },
    update: {},
  });
  const dasar = bd.versiAktifId ? await prisma.versiDraf.findUnique({ where: { id: bd.versiAktifId } }) : null;
  const terakhir = await prisma.versiDraf.findFirst({ where: { bagianDrafId: bd.id }, orderBy: { nomor: "desc" } });
  const lamaPeriksa = (dasar?.pemeriksaan ?? null) as PemeriksaanTersimpan | null;
  const rujukan: RujukanPeriksa = lamaPeriksa?.rujukan ?? { angkaSah: [], tahunSah: [], target: null, sumberSah: [] };
  const pemeriksaan = periksaDokumen(isi, rujukan, (lamaPeriksa?.masalahSumber ?? []).filter((m) => m.jenis === "unsur_hilang"));
  const simpanPeriksa = { ...pemeriksaan, rujukan } as unknown as Prisma.InputJsonValue;

  const lanjutkan = terakhir && dasar && terakhir.id === dasar.id && terakhir.asal === "sunting"
    && terakhir.dibuatOlehId === p.id && Date.now() - terakhir.createdAt.getTime() < JENDELA_SUNTING_MS;
  const v = lanjutkan
    ? await prisma.versiDraf.update({
      where: { id: terakhir.id },
      data: { isi: isi as unknown as Prisma.InputJsonValue, pemeriksaan: simpanPeriksa, jumlahKata: pemeriksaan.jumlahKata },
    })
    : await prisma.versiDraf.create({
      data: {
        bagianDrafId: bd.id,
        nomor: (terakhir?.nomor ?? 0) + 1,
        asal: "sunting",
        isi: isi as unknown as Prisma.InputJsonValue,
        sumber: (dasar?.sumber ?? {}) as Prisma.InputJsonValue,
        unsur: (dasar?.unsur ?? []) as Prisma.InputJsonValue,
        dokumenKurang: dasar?.dokumenKurang ?? [],
        pemeriksaan: simpanPeriksa,
        jumlahKata: pemeriksaan.jumlahKata,
        dibuatOlehId: p.id,
      },
    });
  await prisma.bagianDraf.update({ where: { id: bd.id }, data: { status: "disunting", versiAktifId: v.id } });
  await perbaruiStatusBagian(proyek.id, sub.bagian.kode);
  return { versiId: v.id, nomor: v.nomor, baru: !lanjutkan, pemeriksaan, disimpan: new Date().toISOString() };
}

async function versiMilik(p: Pengguna, versiId: string, opsi: { ubah?: boolean } = {}) {
  const v = await prisma.versiDraf.findUnique({
    where: { id: versiId },
    include: { bagianDraf: { include: { subBagian: { include: { bagian: true } } } } },
  });
  if (!v) throw new GalatAkses("Versi tidak ditemukan.");
  const proyek = await ambilProyek(p, v.bagianDraf.proyekId);
  if (opsi.ubah) pastikanBisaDiubah(proyek);
  return v;
}

/** Pulihkan versi lama: salinannya menjadi versi baru (riwayat tidak pernah ditimpa). */
export async function pulihkanVersi(p: Pengguna, versiId: string) {
  const v = await versiMilik(p, versiId, { ubah: true });
  const terakhir = await prisma.versiDraf.findFirst({ where: { bagianDrafId: v.bagianDrafId }, orderBy: { nomor: "desc" } });
  const baru = await prisma.versiDraf.create({
    data: {
      bagianDrafId: v.bagianDrafId,
      nomor: (terakhir?.nomor ?? 0) + 1,
      asal: "pulihkan",
      isi: v.isi as Prisma.InputJsonValue,
      sumber: (v.sumber ?? {}) as Prisma.InputJsonValue,
      unsur: (v.unsur ?? []) as Prisma.InputJsonValue,
      dokumenKurang: v.dokumenKurang,
      pemeriksaan: (v.pemeriksaan ?? {}) as Prisma.InputJsonValue,
      model: v.model,
      jumlahKata: v.jumlahKata,
      dibuatOlehId: p.id,
    },
  });
  await prisma.bagianDraf.update({ where: { id: v.bagianDrafId }, data: { status: "disunting", versiAktifId: baru.id } });
  await perbaruiStatusBagian(v.bagianDraf.proyekId, v.bagianDraf.subBagian.bagian.kode);
  await catatAktivitas(p, "pulihkan_versi", "versi_draf", baru.id, { dari: v.nomor, subBagian: v.bagianDraf.subBagian.kode });
  return { versiId: baru.id, nomor: baru.nomor, dariNomor: v.nomor };
}

/** Bandingkan dua versi sub-bagian yang sama (diff kata). */
export async function bandingkanVersi(p: Pengguna, versiLamaId: string, versiBaruId: string) {
  const [lama, baru] = await Promise.all([versiMilik(p, versiLamaId), versiMilik(p, versiBaruId)]);
  if (lama.bagianDrafId !== baru.bagianDrafId) throw new GalatPengguna("Hanya versi dari sub-bagian yang sama yang bisa dibandingkan.");
  return {
    lama: { nomor: lama.nomor, jumlahKata: lama.jumlahKata },
    baru: { nomor: baru.nomor, jumlahKata: baru.jumlahKata },
    potongan: bandingkanTeks(teksDokumen(bacaDokumen(lama.isi)), teksDokumen(bacaDokumen(baru.isi))),
  };
}

/** Tandai sub-bagian selesai (atau batalkan tanda selesai). */
export async function tandaiSubBagianSelesai(p: Pengguna, proyekId: string, subBagianKode: string, selesai: boolean) {
  const { proyek, sub } = await drafSubBagian(p, proyekId, subBagianKode);
  const bd = await prisma.bagianDraf.findUnique({ where: { proyekId_subBagianId: { proyekId: proyek.id, subBagianId: sub.id } } });
  if (!bd?.versiAktifId) throw new GalatPengguna("Sub-bagian ini belum punya draf.");
  const adaSuntingan = await prisma.versiDraf.count({ where: { bagianDrafId: bd.id, asal: { in: ["sunting", "pulihkan"] } } });
  await prisma.bagianDraf.update({ where: { id: bd.id }, data: { status: selesai ? "selesai" : adaSuntingan ? "disunting" : "draf" } });
  return perbaruiStatusBagian(proyek.id, sub.bagian.kode);
}

/** Tandai seluruh kriteria/bagian selesai: semua sub-bagian yang di-generate harus sudah punya draf. */
export async function tandaiBagianSelesai(p: Pengguna, proyekId: string, bagianKode: string) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const sub = (await subBagianProyek(proyek, bagianKode)).filter((s) => s.tipe !== "data" && s.tipe !== "otomatis");
  const draf = await prisma.bagianDraf.findMany({ where: { proyekId: proyek.id, subBagianId: { in: sub.map((s) => s.id) }, versiAktifId: { not: null } } });
  const kosong = sub.filter((s) => !draf.some((d) => d.subBagianId === s.id));
  if (kosong.length > 0) {
    throw new GalatPengguna(`Masih ada ${kosong.length} sub-bagian tanpa draf: ${kosong.slice(0, 3).map((s) => `${s.label} ${s.judul}`.trim()).join("; ")}${kosong.length > 3 ? "; ..." : ""}.`);
  }
  await prisma.bagianDraf.updateMany({ where: { id: { in: draf.map((d) => d.id) } }, data: { status: "selesai" } });
  await catatAktivitas(p, "tandai_selesai", "proyek", proyek.id, { bagianKode });
  return perbaruiStatusBagian(proyek.id, bagianKode);
}

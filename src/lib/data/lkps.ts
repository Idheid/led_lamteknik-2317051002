import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, type Pengguna } from "@/lib/akses";
import { ambilProyek, ambilProyekUbah } from "@/lib/data/proyek";
import { catatAktivitas } from "@/lib/data/log";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { hapusBerkas, simpanBerkas } from "@/lib/penyimpanan";
import type { HasilButirAngka } from "@/lib/domain/metrik-lkps";
import { nilaiButirUntukProyek } from "@/lib/data/nilai-butir";
import type { BarisLkps, KolomLkps, MasalahLkps } from "@/lib/lkps/jenis";
import { periksaIsi } from "@/lib/lkps/periksa";

/** F-08/F-09: unggah LKPS (Excel utama, PDF cadangan), tabel hasil baca, koreksi manual, dan metrik butir angka. */

export const UKURAN_MAKS_LKPS = 25 * 1024 * 1024;

export function jenisLkps(nama: string, isi: Buffer): "xlsx" | "pdf" {
  const n = nama.toLowerCase();
  if (n.endsWith(".xlsx") && isi.subarray(0, 2).toString("latin1") === "PK") return "xlsx";
  if (n.endsWith(".pdf") && isi.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (n.endsWith(".xls")) throw new GalatPengguna("Format .xls lama tidak didukung. Simpan ulang sebagai .xlsx dari Excel.");
  throw new GalatPengguna("LKPS harus berkas Excel (.xlsx, template LKPS LAM Teknik 2025) atau PDF.");
}

export async function unggahLkps(p: Pengguna, proyekId: string, berkas: { nama: string; isi: Buffer }) {
  const proyek = await ambilProyekUbah(p, proyekId);
  if (berkas.isi.length === 0) throw new GalatPengguna("Berkas kosong.");
  if (berkas.isi.length > UKURAN_MAKS_LKPS) throw new GalatPengguna("Berkas LKPS lebih dari 25 MB.");
  const jenis = jenisLkps(berkas.nama, berkas.isi);
  const simpan = await simpanBerkas(`proyek/${proyek.id}/lkps`, berkas.nama, berkas.isi);
  const b = await prisma.berkasLKPS.create({
    data: {
      proyekId: proyek.id, namaBerkas: berkas.nama.slice(0, 255), jenis, lokasi: simpan.lokasi, ukuran: simpan.ukuran,
      diunggahOlehId: p.id,
    },
  });
  await catatAktivitas(p, "unggah", "lkps", b.id, { nama: b.namaBerkas, jenis });
  await kirimTugas(ANTREAN.lkps, { berkasId: b.id });
  return b;
}

export async function daftarBerkasLkps(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  return prisma.berkasLKPS.findMany({
    where: { proyekId: proyek.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tabel: true } } },
  });
}

/** Proses ulang berkas (misalnya setelah worker mati atau TS proyek diubah). */
export async function bacaUlangLkps(p: Pengguna, berkasId: string) {
  const b = await berkasMilik(p, berkasId);
  await prisma.berkasLKPS.update({ where: { id: b.id }, data: { status: "diunggah", pesan: null } });
  await kirimTugas(ANTREAN.lkps, { berkasId: b.id });
}

async function berkasMilik(p: Pengguna, berkasId: string) {
  const b = await prisma.berkasLKPS.findUnique({ where: { id: berkasId } });
  if (!b) throw new GalatPengguna("Berkas LKPS tidak ditemukan.");
  await ambilProyek(p, b.proyekId);
  return b;
}

export async function jadikanAktif(p: Pengguna, berkasId: string) {
  const b = await berkasMilik(p, berkasId);
  if (b.status !== "dibaca") throw new GalatPengguna("Hanya berkas yang sudah terbaca yang bisa dijadikan sumber data.");
  await prisma.$transaction([
    prisma.berkasLKPS.updateMany({ where: { proyekId: b.proyekId }, data: { aktif: false } }),
    prisma.berkasLKPS.update({ where: { id: b.id }, data: { aktif: true } }),
  ]);
}

export async function hapusBerkasLkps(p: Pengguna, berkasId: string) {
  const b = await berkasMilik(p, berkasId);
  await prisma.berkasLKPS.delete({ where: { id: b.id } });
  await hapusBerkas(b.lokasi);
  await catatAktivitas(p, "hapus", "lkps", b.id, { nama: b.namaBerkas });
}

export interface TabelTersimpan {
  id: string;
  kode: string;
  sheet: string;
  judul: string;
  blok: string | null;
  kolom: KolomLkps[];
  kolomRumus: string[];
  baris: BarisLkps[];
  perluDicek: boolean;
  dikoreksi: boolean;
}

function keTabel(t: {
  id: string; kode: string; sheet: string; judul: string; blok: string | null; kolom: unknown; kolomRumus: string[];
  baris: unknown; perluDicek: boolean; dikoreksi: boolean;
}): TabelTersimpan {
  return { ...t, kolom: t.kolom as KolomLkps[], baris: t.baris as BarisLkps[] };
}

/** Berkas aktif proyek beserta tabelnya (null bila belum ada LKPS terbaca). */
export async function lkpsAktif(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const berkas = await prisma.berkasLKPS.findFirst({
    where: { proyekId: proyek.id, aktif: true },
    include: { tabel: { orderBy: { urutan: "asc" } } },
  });
  if (!berkas) return null;
  return { proyek, berkas: { ...berkas, masalah: (berkas.masalah ?? []) as unknown as MasalahLkps[] }, tabel: berkas.tabel.map(keTabel) };
}

/** Metrik butir angka dari LKPS aktif (dihitung ulang setiap kali; data kecil). */
export async function metrikProyek(p: Pengguna, proyekId: string): Promise<{ hasil: HasilButirAngka[]; perluDicek: boolean } | null> {
  const aktif = await lkpsAktif(p, proyekId);
  if (!aktif) return null;
  // revisi 19 Okt 2026: rumus dipetakan lewat kodeRumus butir instrumen LED
  const n = await nilaiButirUntukProyek(aktif.proyek);
  return { hasil: n.daftar.flatMap((d) => (d.hasil ? [d.hasil] : [])), perluDicek: n.perluDicek };
}

const skemaBaris = z.array(z.object({
  nomorBaris: z.number().int(),
  sel: z.record(z.string().regex(/^[A-Z]{1,2}$/), z.union([z.string().max(2000), z.number(), z.null()])),
})).max(2000);

/** Koreksi manual satu tabel (terutama hasil PDF). Menandai tabel sudah dikoreksi dan dicek. */
export async function simpanKoreksiTabel(p: Pengguna, tabelId: string, barisMasukan: unknown, sudahDicek: boolean) {
  const t = await prisma.tabelLKPS.findUnique({ where: { id: tabelId }, include: { berkas: true } });
  if (!t) throw new GalatPengguna("Tabel tidak ditemukan.");
  await ambilProyek(p, t.berkas.proyekId);
  const kolom = (t.kolom as unknown as KolomLkps[]).map((k) => k.kunci);
  const baris = skemaBaris.parse(barisMasukan).map((b) => ({
    nomorBaris: b.nomorBaris,
    sel: Object.fromEntries(kolom.map((k) => {
      const v = b.sel[k];
      return [k, typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : (v ?? null)];
    })),
  }));
  await prisma.tabelLKPS.update({
    where: { id: tabelId },
    data: { baris: baris as unknown as Prisma.InputJsonValue, dikoreksi: true, perluDicek: !sudahDicek },
  });
  // perbarui daftar masalah berkas untuk tabel ini
  const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: t.berkas.proyekId } });
  const masalahLama = ((t.berkas.masalah ?? []) as unknown as MasalahLkps[]).filter((m) => m.sheet !== t.sheet);
  const baru = periksaIsi([{ kode: t.kode, sheet: t.sheet, judul: t.judul, blok: t.blok, kolom: t.kolom as unknown as KolomLkps[], baris, kolomRumus: t.kolomRumus }], proyek.jenjang);
  await prisma.berkasLKPS.update({ where: { id: t.berkasId }, data: { masalah: [...masalahLama, ...baru] as unknown as Prisma.InputJsonValue } });
  await catatAktivitas(p, "koreksi", "tabel_lkps", tabelId, { sheet: t.sheet, sudahDicek });
}

export async function ambilTabel(p: Pengguna, tabelId: string) {
  const t = await prisma.tabelLKPS.findUnique({ where: { id: tabelId }, include: { berkas: true } });
  if (!t) return null;
  const proyek = await ambilProyek(p, t.berkas.proyekId);
  const masalah = ((t.berkas.masalah ?? []) as unknown as MasalahLkps[]).filter((m) => m.sheet === t.sheet);
  return { proyek, berkas: t.berkas, tabel: keTabel(t), masalah };
}

import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * F-06: impor instrumen dari berkas seed JSON (format: data/instrumen/README.md).
 * Idempoten berdasarkan `versi.kode`: bila versi sudah ada, tidak ada yang diubah.
 */

const skemaVarian = z.object({
  instruksi: z.string(),
  jenjang: z.array(z.string()),
  catatanTemplate: z.string().nullish(),
});

const skemaSubBagian = z.object({
  kode: z.string().min(1),
  label: z.string(),
  judul: z.string(),
  tipe: z.enum(["data", "narasi", "bersama", "iku", "otomatis"]),
  grup: z.string().nullish(),
  sumberInstruksi: z.string().default("template"),
  varian: z.array(skemaVarian),
  berlakuUntuk: z.array(z.string()),
  jenjangOverride: z.array(z.string()).nullish(),
  catatan: z.string().nullish(),
});

const skemaBagian = z.object({
  kode: z.string().min(1),
  nama: z.string(),
  jenis: z.enum(["awal", "bab", "butir", "kriteria", "lampiran"]),
  urutan: z.number().int(),
  batasHalamanResmi: z.number().int().nullish(),
  pengantar: z.string().nullish(),
  subBagian: z.array(skemaSubBagian),
});

const skemaButir = z.object({
  jenjang: z.string(),
  kode: z.string().min(1),
  no: z.number().int(),
  sub: z.string().nullish(),
  urutan: z.number().int(),
  bagian: z.string(),
  subBagian: z.string(),
  elemen: z.string(),
  indikator: z.string(),
  bobot: z.number(),
  jenis: z.enum(["narasi", "angka"]),
  tabelLkps: z.array(z.string()),
  deskriptorSkor4: z.string(),
  unsurSkor4: z.array(z.string()),
  pertanyaanPemandu: z.string().nullish(),
  dokumenPendukung: z.array(z.string()).default([]),
  catatan: z.string().nullish(),
});

export const skemaSeedInstrumen = z.object({
  versi: z.object({
    kode: z.string().min(1),
    nama: z.string(),
    lembaga: z.string().default("LAM Teknik"),
    peraturan: z.array(z.string()),
    catatan: z.string().nullish(),
  }),
  jenjang: z.array(z.object({ kode: z.string(), nama: z.string() })),
  bagian: z.array(skemaBagian),
  butir: z.array(skemaButir),
  tabelLkps: z.array(z.object({ kode: z.string(), sheet: z.string(), judul: z.string() })),
  anggaranBawaan: z.record(z.string(), z.unknown()),
  statusAkreditasi: z.record(z.string(), z.unknown()).optional(),
});

export type SeedInstrumen = z.infer<typeof skemaSeedInstrumen>;

export interface HasilImpor {
  versiId: string;
  kode: string;
  dibuat: boolean;
}

export async function imporInstrumen(
  prisma: PrismaClient,
  data: unknown,
  opsi: { aktif?: boolean } = {},
): Promise<HasilImpor> {
  const seed = skemaSeedInstrumen.parse(data);
  const ada = await prisma.versiInstrumen.findUnique({ where: { kode: seed.versi.kode } });
  if (ada) return { versiId: ada.id, kode: ada.kode, dibuat: false };

  const kodeSub = new Set(seed.bagian.flatMap((b) => b.subBagian.map((s) => s.kode)));
  const tanpaSub = seed.butir.filter((b) => !kodeSub.has(b.subBagian)).map((b) => b.kode);
  if (tanpaSub.length) throw new Error(`Butir menunjuk sub-bagian yang tidak ada: ${tanpaSub.join(", ")}`);

  return prisma.$transaction(
    async (tx) => {
      const versi = await tx.versiInstrumen.create({
        data: {
          kode: seed.versi.kode,
          nama: seed.versi.nama,
          lembaga: seed.versi.lembaga,
          peraturan: seed.versi.peraturan,
          catatan: seed.versi.catatan ?? null,
          aktif: opsi.aktif ?? true,
          jenjang: seed.jenjang,
          statusAkreditasi: (seed.statusAkreditasi ?? undefined) as Prisma.InputJsonValue | undefined,
          anggaranBawaan: seed.anggaranBawaan as Prisma.InputJsonValue,
        },
      });

      const idSub = new Map<string, string>();
      for (const b of seed.bagian) {
        const bagian = await tx.bagian.create({
          data: {
            versiId: versi.id,
            kode: b.kode,
            nama: b.nama,
            jenis: b.jenis,
            urutan: b.urutan,
            batasHalamanResmi: b.batasHalamanResmi ?? null,
            pengantar: b.pengantar || null,
          },
        });
        const sub = await tx.subBagian.createManyAndReturn({
          data: b.subBagian.map((s, i) => ({
            bagianId: bagian.id,
            kode: s.kode,
            label: s.label,
            judul: s.judul,
            grup: s.grup ?? null,
            tipe: s.tipe,
            varian: s.varian,
            berlakuUntuk: s.berlakuUntuk,
            jenjangOverride: s.jenjangOverride ?? [],
            sumberInstruksi: s.sumberInstruksi,
            catatan: s.catatan ?? null,
            urutan: i + 1,
          })),
          select: { id: true, kode: true },
        });
        for (const s of sub) idSub.set(s.kode, s.id);
      }

      const butir = await tx.butirPenilaian.createManyAndReturn({
        data: seed.butir.map((b) => ({
          versiId: versi.id,
          jenjang: b.jenjang,
          kode: b.kode,
          no: b.no,
          sub: b.sub ?? null,
          urutan: b.urutan,
          bagianKode: b.bagian,
          elemen: b.elemen,
          indikator: b.indikator,
          bobot: b.bobot,
          jenis: b.jenis,
          tabelLkps: b.tabelLkps,
          deskriptorSkor4: b.deskriptorSkor4,
          unsurSkor4: b.unsurSkor4,
          pertanyaanPemandu: b.pertanyaanPemandu ?? null,
          catatan: b.catatan ?? null,
        })),
        select: { id: true, kode: true, jenjang: true },
      });
      const idButir = new Map(butir.map((b) => [`${b.jenjang}|${b.kode}`, b.id]));

      await tx.butirSubBagian.createMany({
        data: seed.butir.map((b) => ({
          butirId: idButir.get(`${b.jenjang}|${b.kode}`) as string,
          subBagianId: idSub.get(b.subBagian) as string,
        })),
      });

      await tx.dokumenDiharapkan.createMany({
        data: seed.butir.flatMap((b) =>
          b.dokumenPendukung.map((nama, i) => ({ nama, butirId: idButir.get(`${b.jenjang}|${b.kode}`), urutan: i + 1 })),
        ),
      });

      await tx.tabelLkpsAcuan.createMany({
        data: seed.tabelLkps.map((t) => ({ versiId: versi.id, kode: t.kode, sheet: t.sheet, judul: t.judul })),
      });

      return { versiId: versi.id, kode: versi.kode, dibuat: true };
    },
    { timeout: 60_000 },
  );
}

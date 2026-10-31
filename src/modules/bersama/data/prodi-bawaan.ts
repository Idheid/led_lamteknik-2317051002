import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import { KODE_JENJANG } from "@/modules/bersama/domain/jenjang";

/**
 * Program studi bawaan FT Unila (revisi 31 Okt 2026, Pak Tris: daftar prodi sudah terisi semua dan tetap bisa
 * ditambah). Dipanggil dari prisma/seed.ts dan pemasangan pertama. Idempoten menurut nama + jenjang: prodi yang sudah
 * ada tidak ditimpa, tidak ada yang dihapus. Identitas fakultas bawaan hanya mengisi kolom yang masih kosong.
 */

const skemaBerkas = z.object({
  fakultas: z.object({ nama: z.string(), perguruanTinggi: z.string(), kota: z.string() }),
  prodi: z.array(z.object({
    jenjang: z.enum(KODE_JENJANG),
    nama: z.string().min(1),
    akreditasiBerlakuSampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    peringkatAkreditasi: z.string(),
  })),
});

export const BERKAS_PRODI_BAWAAN = "data/prodi/ft-unila.json";

export function bacaProdiBawaan(berkas = BERKAS_PRODI_BAWAAN) {
  return skemaBerkas.parse(JSON.parse(readFileSync(resolve(process.cwd(), berkas), "utf8")));
}

export async function isiProdiBawaan(berkas = BERKAS_PRODI_BAWAAN): Promise<{ dibuat: number; dilewati: number }> {
  const data = bacaProdiBawaan(berkas);

  const f = await prisma.fakultas.findUnique({ where: { id: "utama" } });
  if (!f) {
    await prisma.fakultas.create({ data: { id: "utama", ...data.fakultas } });
  } else {
    const kosong = {
      ...(f.nama.trim() ? {} : { nama: data.fakultas.nama }),
      ...(f.perguruanTinggi.trim() ? {} : { perguruanTinggi: data.fakultas.perguruanTinggi }),
      ...(f.kota?.trim() ? {} : { kota: data.fakultas.kota }),
    };
    if (Object.keys(kosong).length) await prisma.fakultas.update({ where: { id: "utama" }, data: kosong });
  }

  let dibuat = 0;
  for (const x of data.prodi) {
    const ada = await prisma.prodi.findFirst({ where: { nama: { equals: x.nama, mode: "insensitive" }, jenjang: x.jenjang } });
    if (ada) continue;
    await prisma.prodi.create({
      data: {
        nama: x.nama,
        jenjang: x.jenjang,
        kodePddikti: null,
        akreditasiBerlakuSampai: new Date(`${x.akreditasiBerlakuSampai}T00:00:00.000Z`),
        identitas: { peringkatAkreditasi: x.peringkatAkreditasi },
      },
    });
    dibuat++;
  }
  return { dibuat, dilewati: data.prodi.length - dibuat };
}

import { z } from "zod";
import { prisma } from "@/lib/db";
import { pastikanSuperAdmin, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import { pengaturanLlm } from "@/lib/data/kunci-api";
import { ANTREAN, kirimTugas } from "@/lib/antrean";

/** Pengaturan model LLM oleh super admin (versi iterasi 2: model embedding dan model narasi). */

const skema = z.object({
  modelNarasi: z.string().trim().min(3).max(80).regex(/^[a-z0-9.\-]+$/, "Nama model hanya huruf kecil, angka, titik, tanda hubung."),
  modelEmbedding: z.string().trim().min(3).max(80).regex(/^[a-z0-9.\-]+$/, "Nama model hanya huruf kecil, angka, titik, tanda hubung."),
});

export async function ambilPengaturan(p: Pengguna) {
  pastikanSuperAdmin(p);
  const [atur, perModel] = await Promise.all([
    pengaturanLlm(),
    prisma.potongan.groupBy({ by: ["modelEmbedding"], _count: { _all: true } }),
  ]);
  return { atur, perModel: perModel.map((x) => ({ model: x.modelEmbedding, jumlah: x._count._all })) };
}

/**
 * Simpan pengaturan. Bila model embedding berganti, semua dokumen teks diproses ulang (embedding lama tidak
 * sebanding dengan embedding model baru, F-11). Mengembalikan jumlah dokumen yang diantre.
 */
export async function simpanPengaturan(p: Pengguna, masukan: unknown): Promise<number> {
  pastikanSuperAdmin(p);
  const data = skema.parse(masukan);
  const lama = await pengaturanLlm();
  await prisma.pengaturanLLM.update({ where: { id: "utama" }, data });
  await catatAktivitas(p, "ubah", "pengaturan_llm", "utama", { ...data, modelEmbeddingLama: lama.modelEmbedding });
  if (lama.modelEmbedding === data.modelEmbedding) return 0;
  return prosesUlangSemua(data.modelEmbedding);
}

/** Antre ulang dokumen teks yang potongannya belum memakai model embedding `model`. */
export async function prosesUlangSemua(model: string): Promise<number> {
  const daftar = await prisma.dokumen.findMany({
    where: { jenis: { not: "gambar" }, OR: [{ potongan: { some: { modelEmbedding: { not: model } } } }, { status: { in: ["gagal", "menunggu_kunci"] } }] },
    select: { id: true },
  });
  for (const d of daftar) {
    await prisma.dokumen.update({ where: { id: d.id }, data: { status: "diunggah", pesan: null } });
    await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
  }
  return daftar.length;
}

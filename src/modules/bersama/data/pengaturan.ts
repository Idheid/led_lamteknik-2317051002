import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { catatGalatKunci, kunciUntukAdministrasi, pengaturanLlm } from "@/modules/bersama/data/kunci-api";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import {
  bacaDaftarModel, modelEmbedding, modelNarasi, modelUsang, pilihCadanganBawaan, pilihEmbeddingBawaan,
  pilihModelNarasiBawaan, type ModelGoogle,
} from "@/modules/bersama/domain/model-llm";
import { ambilDaftarModelGoogle, ujiModelNarasi } from "@/modules/bersama/llm/narasi";
import { penyediaGemini } from "@/modules/bersama/llm/embedding";

/**
 * Pengaturan model LLM oleh super admin: model narasi (generateContent), urutan model cadangan, model embedding
 * (embedContent), dan izin memakai kunci cadangan super admin. Pilihan diambil dari daftar model Google (models.list).
 */

const kodeModel = z.string().trim().min(3).max(100).regex(/^[a-z0-9.\-]+$/, "Kode model tidak valid.");

const skema = z.object({
  modelNarasi: kodeModel,
  modelCadangan: z.array(kodeModel).max(5, "Paling banyak 5 model cadangan."),
  modelEmbedding: kodeModel,
  pakaiCadanganAdmin: z.boolean(),
});
export type MasukanPengaturan = z.input<typeof skema>;

export function daftarModelTersimpan(json: unknown): ModelGoogle[] {
  return Array.isArray(json) ? (json as ModelGoogle[]) : [];
}

export async function ambilPengaturan(p: Pengguna) {
  pastikanAdmin(p);
  const [atur, perModel] = await Promise.all([
    pengaturanLlm(),
    prisma.potongan.groupBy({ by: ["modelEmbedding"], _count: { _all: true } }),
  ]);
  const daftar = daftarModelTersimpan(atur.daftarModel);
  return {
    atur,
    narasi: modelNarasi(daftar),
    embedding: modelEmbedding(daftar),
    perModel: perModel.map((x) => ({ model: x.modelEmbedding, jumlah: x._count._all })),
  };
}

/**
 * Muat ulang daftar model dari Google memakai kunci yang tersedia. Bila model narasi masih generasi lama (2.5)
 * atau tidak ada di daftar, otomatis diganti model 3.x flash yang tersedia (Google membatasi 2.5 untuk pengguna baru).
 */
export async function muatDaftarModel(p: Pengguna): Promise<{ jumlah: number; diganti: string | null }> {
  pastikanAdmin(p);
  const k = await kunciUntukAdministrasi();
  if (!k) {
    throw new GalatPengguna("Belum ada kunci API aktif. Tambahkan kunci di menu Kunci API.");
  }
  let json: unknown;
  try {
    json = await ambilDaftarModelGoogle(k.kunci);
  } catch (e) {
    await catatGalatKunci(k.id, e);
    throw new GalatPengguna(`Daftar model tidak bisa dimuat: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
  }
  const daftar = bacaDaftarModel(json);
  if (daftar.length === 0) throw new GalatPengguna("Google tidak mengembalikan model apa pun untuk kunci ini.");
  const atur = await pengaturanLlm();
  const kodeNarasi = new Set(modelNarasi(daftar).map((m) => m.kode));
  let diganti: string | null = null;
  const data: Prisma.PengaturanLLMUpdateInput = { daftarModel: daftar as unknown as Prisma.InputJsonValue, daftarModelDiperbarui: new Date() };
  if (modelUsang(atur.modelNarasi) || !kodeNarasi.has(atur.modelNarasi)) {
    const bawaan = pilihModelNarasiBawaan(daftar);
    if (bawaan) {
      diganti = bawaan;
      data.modelNarasi = bawaan;
      data.modelCadangan = pilihCadanganBawaan(daftar, bawaan);
    }
  }
  if (!modelEmbedding(daftar).some((m) => m.kode === atur.modelEmbedding)) {
    const e = pilihEmbeddingBawaan(daftar);
    if (e) data.modelEmbedding = e;
  }
  await prisma.pengaturanLLM.update({ where: { id: "utama" }, data });
  await catatAktivitas(p, "muat_daftar_model", "pengaturan_llm", "utama", { jumlah: daftar.length, diganti });
  return { jumlah: daftar.length, diganti };
}

/** Uji satu model dengan panggilan kecil. */
export async function ujiModel(p: Pengguna, jenis: "narasi" | "embedding", kode: string): Promise<{ ok: boolean; pesan: string }> {
  pastikanAdmin(p);
  const m = kodeModel.parse(kode);
  const k = await kunciUntukAdministrasi();
  if (!k) return { ok: false, pesan: "Belum ada kunci API aktif untuk menguji model." };
  const mulai = Date.now();
  const detik = () => ((Date.now() - mulai) / 1000).toFixed(1).replace(".", ",");
  try {
    if (jenis === "narasi") {
      const balas = await ujiModelNarasi(k.kunci, m);
      return { ok: true, pesan: `Model ${m} menjawab "${balas}" dalam ${detik()} detik.` };
    }
    const v = await penyediaGemini(k.kunci, m).embedKueri("uji model embedding");
    return { ok: true, pesan: `Model ${m} menghasilkan vektor ${v.length} dimensi dalam ${detik()} detik.` };
  } catch (e) {
    const jenisGalat = await catatGalatKunci(k.id, e);
    const pesan = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      pesan: jenisGalat === "kuota_harian" || jenisGalat === "batas_per_menit"
        ? `Kuota model ${m} untuk kunci ini habis atau terbatas (429). Coba model lain atau tunggu reset kuota.`
        : /not found|404/i.test(pesan)
          ? `Model ${m} tidak tersedia untuk kunci ini.`
          : `Uji model gagal: ${pesan.slice(0, 200)}`,
    };
  }
}

/**
 * Simpan pengaturan. Bila model embedding berganti, semua dokumen teks diproses ulang (embedding lama tidak
 * sebanding dengan embedding model baru, F-11). Mengembalikan jumlah dokumen yang diantre.
 */
export async function simpanPengaturan(p: Pengguna, masukan: MasukanPengaturan): Promise<number> {
  pastikanAdmin(p);
  const data = skema.parse(masukan);
  const lama = await pengaturanLlm();
  const daftar = daftarModelTersimpan(lama.daftarModel);
  if (daftar.length > 0) {
    const narasi = new Set(modelNarasi(daftar).map((m) => m.kode));
    const emb = new Set(modelEmbedding(daftar).map((m) => m.kode));
    for (const k of [data.modelNarasi, ...data.modelCadangan]) {
      if (!narasi.has(k)) throw new GalatPengguna(`Model ${k} tidak ada di daftar model narasi (generateContent).`);
    }
    if (!emb.has(data.modelEmbedding)) throw new GalatPengguna(`Model ${data.modelEmbedding} tidak ada di daftar model embedding (embedContent).`);
  }
  const cadangan = [...new Set(data.modelCadangan.filter((k) => k !== data.modelNarasi))];
  await prisma.pengaturanLLM.update({ where: { id: "utama" }, data: { ...data, modelCadangan: cadangan } });
  await catatAktivitas(p, "ubah", "pengaturan_llm", "utama", { ...data, modelEmbeddingLama: lama.modelEmbedding });
  if (lama.modelEmbedding === data.modelEmbedding) return 0;
  return prosesUlangSemua(data.modelEmbedding);
}

/** Antre ulang dokumen teks yang potongannya belum memakai model embedding `model`. */
export async function prosesUlangSemua(model: string): Promise<number> {
  const daftar = await prisma.dokumen.findMany({
    where: {
      jenis: { not: "gambar" },
      OR: [{ potongan: { some: { modelEmbedding: { not: model } } } }, { status: { in: ["gagal", "menunggu_kunci"] } }],
    },
    select: { id: true },
  });
  for (const d of daftar) {
    await prisma.dokumen.update({ where: { id: d.id }, data: { status: "diunggah", pesan: null } });
    await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
  }
  return daftar.length;
}

import { generateText, Output } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { catatGalatKunci, GalatTanpaKunci, isiKunci, kunciFakultas } from "@/lib/data/kunci-api";
import { klasifikasiGalat, pesanKunciHabis, pilihKunci } from "@/lib/domain/kunci-api";
import { versiModel } from "@/lib/domain/model-llm";
import type { KeluaranSubBagian } from "@/lib/domain/prompt";
import { galatPenyedia } from "@/lib/llm/embedding";
import { buatModelNarasi } from "@/lib/llm/narasi";
import { MODEL_NARASI_UJI, modelNarasiUji, pakaiNarasiUji } from "@/lib/llm/narasi-uji";

/**
 * Satu panggilan LLM untuk satu sub-bagian (F-13, F-19, F-20):
 * - kunci dipilih lewat `pilihKunci` (kunci fakultas dulu, lalu cadangan admin bila diizinkan);
 * - model dicoba berurutan: model narasi lalu model cadangan; 429 harian pada satu model → model berikutnya;
 *   bila semua model kena kuota harian, kunci ditandai kuota_habis dan kunci berikutnya dipakai;
 * - batas per menit dan galat sementara ditunggu lalu diulang;
 * - tidak ada kunci yang bisa dipakai → GalatTanpaKunci (tugas berhenti rapi dan menunggu kunci baru);
 * - setiap percobaan dicatat di LogPemakaian (token masuk/keluar, durasi, galat).
 * Isi kunci tidak pernah dicatat.
 */

export const skemaKeluaran = z.object({
  paragraf: z.array(z.object({ teks: z.string(), sumber: z.array(z.string()) })).min(1),
  unsur: z.array(z.object({
    butir: z.string(),
    unsur: z.string(),
    status: z.enum(["terpenuhi", "sebagian", "belum_ada_bukti"]),
    sumber: z.array(z.string()).optional(),
  })),
  dokumenKurang: z.array(z.string()),
  catatanUntukPenyusun: z.string().optional(),
});

/** Semua model kena batas per menit atau galat sementara: tugas dilanjutkan otomatis sebentar lagi. */
export class GalatSementara extends Error {
  constructor(pesan: string, public tungguMs: number) {
    super(pesan);
    this.name = "GalatSementara";
  }
}

export interface PanggilanNarasi {
  prodiId: string;
  proyekId: string;
  tugasId?: string | null;
  subBagianKode: string;
  sistem: string;
  pengguna: string;
}

export interface HasilPanggilan {
  keluaran: KeluaranSubBagian;
  model: string;
  kunciId: string | null;
  tokenMasuk: number;
  tokenKeluar: number;
  durasiMs: number;
}

function tidur(ms: number): Promise<void> {
  const maks = Number(process.env.GENERATE_JEDA_MAKS_MS);
  const t = Number.isFinite(maks) && maks >= 0 ? Math.min(ms, maks) : ms;
  return new Promise((r) => setTimeout(r, t));
}

/** Jeda yang diminta Google ("retryDelay": "37s"), atau 20 detik × percobaan. */
function jedaDariGalat(e: unknown, coba: number): number {
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(String(galatPenyedia(e).detail ?? ""));
  return m ? Math.ceil(Number(m[1]) * 1000) + 1000 : 20_000 * (coba + 1);
}

function pesanGalat(e: unknown): string {
  const g = galatPenyedia(e);
  return `${g.status ? `${g.status} ` : ""}${g.message ?? ""}`.slice(0, 500);
}

export async function panggilNarasi(a: PanggilanNarasi): Promise<HasilPanggilan> {
  const dikecualikan = new Set<string>();
  const catat = (data: { kunciId: string | null; model: string; berhasil: boolean; galat?: string; tokenMasuk?: number; tokenKeluar?: number; durasiMs: number }) =>
    prisma.logPemakaian.create({
      data: { ...data, proyekId: a.proyekId, prodiId: a.prodiId, tugasId: a.tugasId ?? null, subBagianKode: a.subBagianKode },
    });

  if (pakaiNarasiUji()) {
    // mode uji pengembangan: tanpa kunci dan tanpa memanggil Gemini
    const mulai = Date.now();
    const r = await generateText({
      model: modelNarasiUji(), system: a.sistem, prompt: a.pengguna, output: Output.object({ schema: skemaKeluaran }), maxRetries: 0,
    });
    const hasil = {
      keluaran: r.output as KeluaranSubBagian, model: MODEL_NARASI_UJI, kunciId: null,
      tokenMasuk: r.usage.inputTokens ?? 0, tokenKeluar: r.usage.outputTokens ?? 0, durasiMs: Date.now() - mulai,
    };
    await catat({ kunciId: null, model: hasil.model, berhasil: true, tokenMasuk: hasil.tokenMasuk, tokenKeluar: hasil.tokenKeluar, durasiMs: hasil.durasiMs });
    return hasil;
  }

  for (let putaran = 0; putaran < 25; putaran++) {
    const { atur, domain } = await kunciFakultas();
    const sekarang = new Date();
    const k = pilihKunci(domain.filter((x) => !dikecualikan.has(x.id)), sekarang, { pakaiCadanganAdmin: atur.pakaiCadanganAdmin });
    if (!k) {
      throw new GalatTanpaKunci(
        domain.length === 0
          ? "Belum ada kunci API Gemini. Tambahkan kunci di menu Kunci API; penyusunan dilanjutkan otomatis."
          : `${pesanKunciHabis(domain, sekarang)} Penyusunan dilanjutkan otomatis setelah kunci baru diisi.`,
      );
    }
    const apiKey = await isiKunci(k.id);
    const daftarModel = [...new Set([atur.modelNarasi, ...atur.modelCadangan])];
    let galatHarian: unknown = null;
    let kunciDitolak = false;
    let adaSementara = false;
    let tunggu = 60_000;

    for (const kodeModel of daftarModel) {
      let lanjutModel = false;
      for (let coba = 0; coba < 3 && !lanjutModel; coba++) {
        const mulai = Date.now();
        try {
          const r = await generateText({
            model: buatModelNarasi(apiKey, kodeModel),
            system: a.sistem,
            prompt: a.pengguna,
            output: Output.object({ schema: skemaKeluaran }),
            maxOutputTokens: Math.max(atur.maksTokenKeluaran, 8192),
            // Gemini 3 disarankan memakai suhu bawaan (1,0); suhu rendah hanya untuk model lama
            ...(versiModel(kodeModel) > 0 && versiModel(kodeModel) < 3 ? { temperature: atur.suhu } : {}),
            maxRetries: 0,
          });
          const durasiMs = Date.now() - mulai;
          const tokenMasuk = r.usage.inputTokens ?? 0;
          const tokenKeluar = r.usage.outputTokens ?? 0;
          await catat({ kunciId: k.id, model: kodeModel, berhasil: true, tokenMasuk, tokenKeluar, durasiMs });
          return { keluaran: r.output as KeluaranSubBagian, model: kodeModel, kunciId: k.id, tokenMasuk, tokenKeluar, durasiMs };
        } catch (e) {
          const jenis = klasifikasiGalat(galatPenyedia(e));
          await catat({ kunciId: k.id, model: kodeModel, berhasil: false, galat: `${jenis}: ${pesanGalat(e)}`, durasiMs: Date.now() - mulai });
          const status = galatPenyedia(e).status;
          if (jenis === "batas_per_menit" || jenis === "sementara") {
            tunggu = jenis === "batas_per_menit" ? jedaDariGalat(e, coba) : 5_000 * (coba + 1);
            if (coba < 2) await tidur(tunggu);
            else {
              lanjutModel = true;
              adaSementara = true;
            }
            continue;
          }
          if (jenis === "kuota_harian") {
            galatHarian = e;
            lanjutModel = true;
          } else if (jenis === "tidak_valid") {
            await catatGalatKunci(k.id, e);
            kunciDitolak = true;
            break;
          } else if (status === 404 || (status === 400 && /model/i.test(pesanGalat(e)))) {
            lanjutModel = true; // model tidak tersedia untuk kunci ini
          } else if (coba >= 1) {
            throw e; // keluaran rusak dua kali, atau galat lain
          }
        }
      }
      if (kunciDitolak) break;
    }

    if (!kunciDitolak) {
      // model yang hanya kena batas per menit masih bisa dipakai nanti: jangan tandai kunci habis
      if (adaSementara) {
        throw new GalatSementara("Layanan Gemini sedang membatasi permintaan. Penyusunan dilanjutkan otomatis sebentar lagi.", tunggu);
      }
      if (!galatHarian) throw new Error("Tidak ada model narasi yang bisa dipakai. Periksa pengaturan Model LLM.");
      await catatGalatKunci(k.id, galatHarian);
    }
    dikecualikan.add(k.id);
  }
  throw new Error("Terlalu banyak percobaan kunci API.");
}

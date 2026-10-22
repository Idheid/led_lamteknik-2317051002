import { generateText, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { catatGalatKunci, GalatTanpaKunci, isiKunci, kunciFakultas } from "@/lib/data/kunci-api";
import { klasifikasiGalat, pesanKunciHabis, pilihKunci } from "@/lib/domain/kunci-api";
import { versiModel } from "@/lib/domain/model-llm";
import { perbaikiJson } from "@/lib/domain/json";
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

/**
 * Jawaban model tidak bisa dibaca sebagai JSON sesuai skema (kosong, terpotong, atau rusak) walau sudah diperbaiki
 * ringan. Revisi 23 Okt 2026: diulang sekali, lalu pindah ke model cadangan; bukan langsung menggagalkan tugas.
 */
export class GalatKeluaranRusak extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "GalatKeluaranRusak";
  }
}

/** Semua model kena batas per menit atau galat sementara: tugas dilanjutkan otomatis sebentar lagi. */
export class GalatSementara extends Error {
  constructor(pesan: string, public tungguMs: number) {
    super(pesan);
    this.name = "GalatSementara";
  }
}

export interface PanggilanNarasi {
  prodiId: string | null;
  proyekId: string | null;
  tugasId?: string | null;
  subBagianKode: string;
  sistem: string;
  pengguna: string;
}

export interface HasilPanggilan<T = KeluaranSubBagian> {
  keluaran: T;
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

/**
 * Panggilan untuk satu sub-bagian narasi (skema keluaran narasi). Revisi 22 Okt 2026: thinking Gemini 3 rendah
 * untuk narasi, dan `onSebagian` menerima keluaran sebagian selama ditulis (teks tampil bertahap).
 */
export async function panggilNarasi(a: PanggilanNarasi & { onSebagian?: (sebagian: unknown) => void }): Promise<HasilPanggilan> {
  return panggilTerstruktur<KeluaranSubBagian>({
    ...a, skema: skemaKeluaran as unknown as z.ZodType<KeluaranSubBagian>, ujiNarasi: true, pikir: "rendah",
  });
}

export interface PanggilanTerstruktur<T> extends PanggilanNarasi {
  skema: z.ZodType<T>;
  /** mode uji LLM_NARASI=uji hanya untuk narasi; panggilan lain tetap memakai Gemini */
  ujiNarasi?: boolean;
  maksTokenKeluaran?: number;
  /** "rendah": thinking Gemini 3 level low (narasi); bawaan: thinking normal (ekstraksi instrumen) */
  pikir?: "rendah" | "normal";
  /** bila diisi, keluaran dialirkan (streaming) dan setiap keluaran sebagian dikirim ke sini */
  onSebagian?: (sebagian: unknown) => void;
}

/** Batas waktu satu panggilan; lewat batas → diulang sekali, lalu pindah ke model atau kunci berikutnya. */
export function batasPanggilanMs(): number {
  const n = Number(process.env.GENERATE_BATAS_MS);
  return Number.isFinite(n) && n > 0 ? n : 90_000;
}

function habisWaktu(e: unknown): boolean {
  const x = e as { name?: string; cause?: { name?: string } } | null;
  return x?.name === "TimeoutError" || x?.name === "AbortError" || x?.cause?.name === "TimeoutError" || x?.cause?.name === "AbortError";
}

/** Opsi penyedia: thinking rendah untuk Gemini 3 bila diminta. */
function opsiPenyedia(kodeModel: string, pikir: PanggilanTerstruktur<unknown>["pikir"]) {
  if (pikir !== "rendah" || versiModel(kodeModel) < 3) return undefined;
  return { google: { thinkingConfig: { thinkingLevel: "low" as const } } };
}

/** Satu panggilan ke model: biasa atau dialirkan (streaming) bila `onSebagian` diisi. */
async function panggilModel<T>(
  a: PanggilanTerstruktur<T>,
  model: Parameters<typeof generateText>[0]["model"],
  opsi: { maxOutputTokens: number; temperature?: number; providerOptions?: ReturnType<typeof opsiPenyedia> },
): Promise<{ output: T; tokenMasuk: number; tokenKeluar: number }> {
  const abortSignal = AbortSignal.timeout(batasPanggilanMs());
  const dasar = {
    model, system: a.sistem, prompt: a.pengguna, output: Output.object({ schema: a.skema }), maxRetries: 0, abortSignal,
    maxOutputTokens: opsi.maxOutputTokens,
    ...(opsi.temperature !== undefined ? { temperature: opsi.temperature } : {}),
    ...(opsi.providerOptions ? { providerOptions: opsi.providerOptions } : {}),
  };
  if (!a.onSebagian) {
    try {
      const r = await generateText(dasar);
      return { output: r.output as T, tokenMasuk: r.usage.inputTokens ?? 0, tokenKeluar: r.usage.outputTokens ?? 0 };
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) return pulihkanKeluaran(a, e);
      throw e;
    }
  }
  let galat: unknown = null;
  const r = streamText({ ...dasar, onError: ({ error }) => { galat ??= error; } });
  try {
    for await (const sebagian of r.partialOutputStream) a.onSebagian(sebagian);
    const output = await r.output;
    const usage = await r.usage;
    return { output: output as T, tokenMasuk: usage.inputTokens ?? 0, tokenKeluar: usage.outputTokens ?? 0 };
  } catch (e) {
    // galat asli penyedia (429, 403, batas waktu) dipakai untuk klasifikasi kunci/model
    if (galat) throw galat;
    if (NoObjectGeneratedError.isInstance(e)) return pulihkanKeluaran(a, e);
    throw e;
  }
}

/** Coba baca jawaban yang gagal di-parse (pagar kode, teks tambahan, koma berlebih); gagal → GalatKeluaranRusak. */
function pulihkanKeluaran<T>(a: PanggilanTerstruktur<T>, e: NoObjectGeneratedError): { output: T; tokenMasuk: number; tokenKeluar: number } {
  const hasil = a.skema.safeParse(perbaikiJson(e.text));
  const tokenMasuk = e.usage?.inputTokens ?? 0;
  const tokenKeluar = e.usage?.outputTokens ?? 0;
  if (hasil.success) return { output: hasil.data, tokenMasuk, tokenKeluar };
  throw new GalatKeluaranRusak(
    `jawaban tidak terbaca (finishReason ${e.finishReason ?? "?"}, ${e.text?.length ?? 0} karakter, ${tokenKeluar} token)`,
  );
}

/**
 * Satu panggilan LLM dengan keluaran JSON terstruktur (narasi, ekstraksi instrumen) memakai aturan kunci, model
 * cadangan, dan pencatatan pemakaian yang sama.
 */
export async function panggilTerstruktur<T>(a: PanggilanTerstruktur<T>): Promise<HasilPanggilan<T>> {
  const dikecualikan = new Set<string>();
  const catat = (data: { kunciId: string | null; model: string; berhasil: boolean; galat?: string; tokenMasuk?: number; tokenKeluar?: number; durasiMs: number }) =>
    prisma.logPemakaian.create({
      data: { ...data, proyekId: a.proyekId, prodiId: a.prodiId, tugasId: a.tugasId ?? null, subBagianKode: a.subBagianKode },
    });

  if (a.ujiNarasi && pakaiNarasiUji()) {
    // mode uji pengembangan: tanpa kunci dan tanpa memanggil Gemini
    const mulai = Date.now();
    const r = await generateText({
      model: modelNarasiUji(), system: a.sistem, prompt: a.pengguna, output: Output.object({ schema: skemaKeluaran }), maxRetries: 0,
    });
    const hasil = {
      keluaran: r.output as T, model: MODEL_NARASI_UJI, kunciId: null,
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
    let adaRusak = false;
    let tunggu = 60_000;

    for (const kodeModel of daftarModel) {
      let lanjutModel = false;
      let pernahHabisWaktu = false;
      for (let coba = 0; coba < 3 && !lanjutModel; coba++) {
        const mulai = Date.now();
        try {
          const r = await panggilModel(a, buatModelNarasi(apiKey, kodeModel), {
            maxOutputTokens: Math.max(atur.maksTokenKeluaran, a.maksTokenKeluaran ?? 8192),
            // Gemini 3 disarankan memakai suhu bawaan (1,0); suhu rendah hanya untuk model lama
            temperature: versiModel(kodeModel) > 0 && versiModel(kodeModel) < 3 ? atur.suhu : undefined,
            providerOptions: opsiPenyedia(kodeModel, a.pikir),
          });
          const durasiMs = Date.now() - mulai;
          await catat({ kunciId: k.id, model: kodeModel, berhasil: true, tokenMasuk: r.tokenMasuk, tokenKeluar: r.tokenKeluar, durasiMs });
          return { keluaran: r.output, model: kodeModel, kunciId: k.id, tokenMasuk: r.tokenMasuk, tokenKeluar: r.tokenKeluar, durasiMs };
        } catch (e) {
          if (habisWaktu(e)) {
            // revisi 22 Okt 2026: panggilan yang menggantung dihentikan setelah batas waktu, diulang sekali,
            // lalu pindah ke model berikutnya (dan akhirnya kunci berikutnya) supaya tugas tidak macet 5 menit
            await catat({ kunciId: k.id, model: kodeModel, berhasil: false, galat: `batas_waktu: lebih dari ${Math.round(batasPanggilanMs() / 1000)} detik`, durasiMs: Date.now() - mulai });
            if (pernahHabisWaktu) {
              lanjutModel = true;
              adaSementara = true;
              tunggu = 10_000;
            }
            pernahHabisWaktu = true;
            continue;
          }
          if (e instanceof GalatKeluaranRusak) {
            await catat({ kunciId: k.id, model: kodeModel, berhasil: false, galat: `keluaran_rusak: ${e.message}`, durasiMs: Date.now() - mulai });
            adaRusak = true;
            if (coba >= 1) lanjutModel = true; // dua kali rusak di model ini: coba model cadangan
            continue;
          }
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
      if (!galatHarian && adaRusak) {
        throw new Error(
          "Gemini dua kali mengirim jawaban yang tidak terbaca. Klik Generate lagi; bila berulang, admin dapat menambah model cadangan di Kunci API → Model Gemini.",
        );
      }
      if (!galatHarian) throw new Error("Tidak ada model narasi yang bisa dipakai. Periksa pengaturan Model LLM.");
      await catatGalatKunci(k.id, galatHarian);
    }
    dikecualikan.add(k.id);
  }
  throw new Error("Terlalu banyak percobaan kunci API.");
}

import { createHash } from "node:crypto";
import { embedMany } from "ai";
import { createGoogle } from "@ai-sdk/google";
import type { GalatPenyedia } from "@/modules/bersama/domain/kunci-api";

/**
 * Penyedia embedding (F-11). Dimensi tetap 768 sesuai kolom Potongan.embedding vector(768).
 * - Gemini (`gemini-embedding-001`, outputDimensionality 768) lewat AI SDK, memakai kunci API proyek.
 * - "uji-hash-768": embedding deterministik berbasis hashing kata (feature hashing) untuk uji otomatis dan demo tanpa
 *   kunci. Hanya aktif bila EMBEDDING_PENYEDIA=uji dan bukan produksi. Bukan embedding semantik.
 */

export const DIMENSI_EMBEDDING = 768;
export const MODEL_UJI = "uji-hash-768";

export interface PenyediaEmbedding {
  model: string;
  embedDokumen(teks: string[]): Promise<number[][]>;
  embedKueri(teks: string): Promise<number[]>;
}

export function normalkan(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return n === 0 ? v : v.map((x) => x / n);
}

/** Embedding hashing kata: setiap kata (huruf kecil) menambah bobot pada satu dimensi hasil hash. */
export function embeddingHash(teks: string): number[] {
  const v = new Array<number>(DIMENSI_EMBEDDING).fill(0);
  for (const kata of teks.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (kata.length < 2) continue;
    const h = createHash("md5").update(kata).digest();
    const i = h.readUInt32BE(0) % DIMENSI_EMBEDDING;
    v[i] += h[4] & 1 ? 1 : -1;
  }
  return normalkan(v);
}

export function penyediaUji(): PenyediaEmbedding {
  if (process.env.NODE_ENV === "production") throw new Error("Embedding uji tidak boleh dipakai di produksi.");
  return {
    model: MODEL_UJI,
    embedDokumen: async (teks) => teks.map(embeddingHash),
    embedKueri: async (teks) => embeddingHash(teks),
  };
}

export function penyediaGemini(apiKey: string, model: string): PenyediaEmbedding {
  const google = createGoogle({ apiKey });
  const m = google.embedding(model);
  const panggil = async (nilai: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") => {
    const { embeddings } = await embedMany({
      model: m,
      values: nilai,
      maxRetries: 1,
      maxParallelCalls: 2,
      providerOptions: { google: { outputDimensionality: DIMENSI_EMBEDDING, taskType } },
    });
    // dimensi < 3072 perlu dinormalkan ulang (dokumentasi Gemini embeddings)
    return embeddings.map((e) => normalkan(e));
  };
  return {
    model,
    embedDokumen: (teks) => panggil(teks, "RETRIEVAL_DOCUMENT"),
    embedKueri: async (teks) => (await panggil([teks], "RETRIEVAL_QUERY"))[0],
  };
}

/** Penyedia uji dipakai bila EMBEDDING_PENYEDIA=uji (uji otomatis/demo lokal). */
export function pakaiPenyediaUji(): boolean {
  return process.env.EMBEDDING_PENYEDIA === "uji" && process.env.NODE_ENV !== "production";
}

/** Ubah galat AI SDK/fetch menjadi bentuk yang dipahami klasifikasiGalat (kunci-api.ts). */
export function galatPenyedia(e: unknown): GalatPenyedia {
  let g = e as { statusCode?: number; responseBody?: string; message?: string; lastError?: unknown; cause?: unknown };
  if (g && g.lastError) g = g.lastError as typeof g; // RetryError
  return {
    status: typeof g?.statusCode === "number" ? g.statusCode : undefined,
    message: g?.message ?? String(e),
    detail: g?.responseBody,
  };
}

/** Literal pgvector "[0.1,0.2,...]" untuk $executeRaw. */
export function literalVektor(v: number[]): string {
  if (v.length !== DIMENSI_EMBEDDING) throw new Error(`Dimensi embedding ${v.length}, seharusnya ${DIMENSI_EMBEDDING}`);
  return `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(7) : "0")).join(",")}]`;
}

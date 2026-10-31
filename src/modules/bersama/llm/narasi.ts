import { generateText, type LanguageModel } from "ai";
import { createGoogle } from "@ai-sdk/google";

/**
 * Model bahasa untuk menyusun narasi (F-13) dan akses daftar model Google (models.list).
 * Uji otomatis bisa memasang pembuat model tiruan lewat `aturModelUji` (tidak berlaku di produksi).
 */

type PembuatModel = (apiKey: string, kodeModel: string) => LanguageModel;

const globalUji = globalThis as unknown as { pembuatModelUji?: PembuatModel | null };

export function aturModelUji(fn: PembuatModel | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("Model uji tidak boleh dipakai di produksi.");
  globalUji.pembuatModelUji = fn;
}

export function buatModelNarasi(apiKey: string, kodeModel: string): LanguageModel {
  if (globalUji.pembuatModelUji) return globalUji.pembuatModelUji(apiKey, kodeModel);
  return createGoogle({ apiKey })(kodeModel);
}

const DASAR = "https://generativelanguage.googleapis.com/v1beta";

/** Galat HTTP dari endpoint Google (dipakai klasifikasiGalat). */
export class GalatGoogle extends Error {
  constructor(public statusCode: number, public responseBody: string) {
    super(`Google API ${statusCode}: ${responseBody.slice(0, 300)}`);
    this.name = "GalatGoogle";
  }
}

/** Semua model yang bisa dipakai kunci ini (models.list, semua halaman). */
export async function ambilDaftarModelGoogle(apiKey: string): Promise<unknown> {
  const models: unknown[] = [];
  let token = "";
  for (let i = 0; i < 10; i++) {
    const url = `${DASAR}/models?pageSize=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`;
    const r = await fetch(url, { headers: { "x-goog-api-key": apiKey } });
    const teks = await r.text();
    if (!r.ok) throw new GalatGoogle(r.status, teks);
    const j = JSON.parse(teks) as { models?: unknown[]; nextPageToken?: string };
    models.push(...(j.models ?? []));
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return { models };
}

/** Uji model narasi dengan permintaan sangat kecil. */
export async function ujiModelNarasi(apiKey: string, kodeModel: string): Promise<string> {
  const { text } = await generateText({
    model: buatModelNarasi(apiKey, kodeModel),
    prompt: "Jawab hanya dengan satu kata: siap",
    maxOutputTokens: 200,
    maxRetries: 0,
  });
  return text.trim().slice(0, 50);
}

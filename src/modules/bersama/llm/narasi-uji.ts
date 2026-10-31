import type { LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

/**
 * Model narasi uji (LLM_NARASI=uji, hanya di luar produksi): keluaran JSON deterministik dari isi prompt, tanpa
 * memanggil Gemini dan tanpa kunci API. Dipakai untuk mencoba alur generate, antrean, editor, dan riwayat versi
 * tanpa menghabiskan kuota. Teksnya diberi tanda "[Mode uji]" supaya tidak tertukar dengan narasi asli.
 */

export const MODEL_NARASI_UJI = "uji-narasi";

export function pakaiNarasiUji(): boolean {
  return process.env.LLM_NARASI === "uji" && process.env.NODE_ENV !== "production";
}

function keluaran(pengguna: string) {
  const sumber = [...new Set([...pengguna.matchAll(/\[((?:D\d+)|(?:T-[\w.-]+)|(?:M-[\w-]+)|J)\]/g)].map((m) => m[1]))];
  const judul = /## SUB-BAGIAN YANG DITULIS\n([^\n]+)/.exec(pengguna)?.[1] ?? "sub-bagian ini";
  const metrik = [...pengguna.matchAll(/- \[(M-[\w-]+)\] ([^=\n]+) = ([^\n(]+)/g)].slice(0, 2);
  const unsur = [...pengguna.matchAll(/- Butir (\S+) \([a-z]+\)[^\n]*\n[^\n]*\n\s+Unsur yang dicek: ([^\n]+)/g)].flatMap((m) =>
    m[2].split(/; (?=\(\d+\))/).map((u, i) => ({
      butir: m[1],
      unsur: u.trim(),
      status: (sumber.length === 0 ? "belum_ada_bukti" : i % 3 === 2 ? "sebagian" : "terpenuhi") as "terpenuhi" | "sebagian" | "belum_ada_bukti",
      sumber: sumber.slice(0, 1),
    })));
  const kutip = sumber.length ? sumber.slice(0, 2) : [];
  const paragraf = [
    {
      teks: `[Mode uji] Bagian ${judul} disusun dari konteks yang tersedia. Program studi menjalankan kegiatan secara terencana dan terdokumentasi sesuai kebijakan yang berlaku.${metrik.length ? ` ${metrik.map((m) => `${m[2].trim()} tercatat ${m[3].trim()}`).join(", ")}.` : ""}`,
      sumber: metrik.length ? [...new Set([...metrik.map((m) => m[1]), ...kutip])] : kutip,
    },
    {
      teks: sumber.length
        ? "[Mode uji] Pelaksanaan dipantau melalui *monitoring* dan evaluasi berkala, lalu hasilnya ditindaklanjuti dalam rapat program studi."
        : "[Mode uji] [BELUM ADA BUKTI: dokumen pendukung atau jawaban penyusun untuk bagian ini]",
      sumber: kutip,
    },
  ];
  return { paragraf, unsur, dokumenKurang: sumber.length ? [] : ["Dokumen pendukung bagian ini"], catatanUntukPenyusun: "Keluaran mode uji, bukan narasi asli." };
}

export function modelNarasiUji(): LanguageModel {
  return new MockLanguageModelV4({
    provider: "uji",
    modelId: MODEL_NARASI_UJI,
    doGenerate: async (opsi) => {
      const pengguna = opsi.prompt.filter((m) => m.role === "user")
        .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .map((c) => ("text" in c ? c.text : "")).join("\n");
      // meniru jeda layanan supaya progres antrean terlihat; uji otomatis memakai LLM_NARASI_UJI_JEDA_MS=0
      const jeda = Number(process.env.LLM_NARASI_UJI_JEDA_MS ?? 1500);
      await new Promise((r) => setTimeout(r, Number.isFinite(jeda) && jeda >= 0 ? jeda : 1500));
      const teks = JSON.stringify(keluaran(pengguna));
      return {
        content: [{ type: "text", text: teks }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage: {
          inputTokens: { total: Math.round(pengguna.length / 4), noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: Math.round(teks.length / 4), text: undefined, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
}

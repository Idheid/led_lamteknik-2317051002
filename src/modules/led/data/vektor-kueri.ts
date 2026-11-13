import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/modules/bersama/db";
import { penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { DIMENSI_EMBEDDING, literalVektor, type PenyediaEmbedding } from "@/modules/bersama/llm/embedding";

/**
 * Rencana 10 Nov T6 (dipakai juga T9): vektor kueri disimpan di EmbeddingKueri dan dipakai ulang. Teks kueri (judul,
 * instruksi, indikator, unsur skor 4) sama setiap kali, jadi generate dan "Uji cari" cukup membaca dari basis data;
 * hanya kueri yang belum ada yang di-embedding, sekaligus dalam satu permintaan per 100 kueri.
 * Ganti model embedding → hash berbeda → vektor dibuat ulang.
 */

export const TASK_KUERI = "RETRIEVAL_QUERY";
const UKURAN_BATCH = 100;

/** Teks kueri yang dirapikan (spasi tunggal, tanpa spasi tepi) supaya perbedaan spasi tidak membuat vektor baru. */
export function rapikanKueri(teks: string): string {
  return teks.replace(/\s+/g, " ").trim();
}

export function hashKueri(teks: string, model: string, taskType = TASK_KUERI): string {
  return createHash("sha256").update(`${rapikanKueri(teks)}\u0000${model}\u0000${taskType}`).digest("hex");
}

export interface HasilVektorKueri {
  vektor: Map<string, number[]>;
  /** jumlah kueri yang baru di-embedding (0 bila semua sudah tersimpan) */
  baru: number;
  /** jumlah permintaan embedding yang dikirim */
  permintaan: number;
}

function bacaVektor(teks: string): number[] {
  return teks.replace(/^\[|\]$/g, "").split(",").map(Number);
}

/**
 * Vektor untuk setiap teks kueri (kunci = teks asli). Penyedia hanya dibuat bila ada kueri yang belum tersimpan.
 */
export async function vektorKueri(teks: string[], opsi: { model: string; penyedia?: PenyediaEmbedding } ): Promise<HasilVektorKueri> {
  const unik = [...new Set(teks.map(rapikanKueri).filter(Boolean))];
  const hash = new Map(unik.map((t) => [t, hashKueri(t, opsi.model)]));
  const ada = unik.length === 0 ? [] : await prisma.$queryRaw<{ hash: string; v: string }[]>`
    SELECT "hash", "vektor"::text AS "v" FROM "EmbeddingKueri" WHERE "hash" = ANY(${[...hash.values()]})`;
  const tersimpan = new Map(ada.map((x) => [x.hash, bacaVektor(x.v)]));
  const kurang = unik.filter((t) => !tersimpan.has(hash.get(t)!));
  let permintaan = 0;
  if (kurang.length > 0) {
    const penyedia = opsi.penyedia ?? (await penyediaEmbedding()).penyedia;
    if (penyedia.model !== opsi.model) throw new Error(`Model penyedia ${penyedia.model} berbeda dengan model pencarian ${opsi.model}.`);
    for (let i = 0; i < kurang.length; i += UKURAN_BATCH) {
      const kelompok = kurang.slice(i, i + UKURAN_BATCH);
      const v = await penyedia.embedKueriBanyak(kelompok);
      permintaan++;
      for (const [j, t] of kelompok.entries()) {
        const h = hash.get(t)!;
        tersimpan.set(h, v[j]);
        await prisma.$executeRaw`
          INSERT INTO "EmbeddingKueri" ("id", "hash", "model", "taskType", "dimensi", "teks", "vektor")
          VALUES (${randomUUID()}, ${h}, ${opsi.model}, ${TASK_KUERI}, ${DIMENSI_EMBEDDING}, ${t}, ${literalVektor(v[j])}::vector)
          ON CONFLICT ("hash") DO NOTHING`;
      }
    }
  }
  const vektor = new Map<string, number[]>();
  for (const t of teks) {
    const v = tersimpan.get(hash.get(rapikanKueri(t)) ?? "");
    if (v) vektor.set(t, v);
  }
  return { vektor, baru: kurang.length, permintaan };
}

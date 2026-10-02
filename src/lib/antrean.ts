import { PgBoss } from "pg-boss";

/**
 * Antrean tugas latar (pg-boss, di PostgreSQL yang sama, skema "pgboss").
 * Aplikasi web hanya mengirim tugas; `npm run worker` yang mengerjakannya (src/worker/index.ts).
 * ANTREAN_NONAKTIF=1 mematikan pengiriman (uji otomatis memanggil fungsi proses secara langsung).
 */

export const ANTREAN = {
  lkps: "baca-lkps",
  dokumen: "proses-dokumen",
} as const;

export type NamaAntrean = (typeof ANTREAN)[keyof typeof ANTREAN];

const globalBos = globalThis as unknown as { bosAntrean?: Promise<PgBoss> };

export function buatBos(): PgBoss {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi di .env");
  const bos = new PgBoss({ connectionString: url, schema: "pgboss" });
  bos.on("error", (e) => console.error("pg-boss:", e instanceof Error ? e.message : e));
  return bos;
}

export async function siapkanAntrean(bos: PgBoss): Promise<void> {
  for (const nama of Object.values(ANTREAN)) {
    await bos.createQueue(nama, { retryLimit: 2, retryDelay: 30, retryBackoff: true });
  }
}

async function bos(): Promise<PgBoss> {
  globalBos.bosAntrean ??= (async () => {
    const b = buatBos();
    await b.start();
    await siapkanAntrean(b);
    return b;
  })();
  return globalBos.bosAntrean;
}

export async function kirimTugas(nama: NamaAntrean, data: Record<string, string>): Promise<string | null> {
  if (process.env.ANTREAN_NONAKTIF === "1") return null;
  try {
    return await (await bos()).send(nama, data);
  } catch (e) {
    globalBos.bosAntrean = undefined;
    throw e;
  }
}

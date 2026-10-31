import { PgBoss } from "pg-boss";

/**
 * Antrean tugas latar (pg-boss, di PostgreSQL yang sama, skema "pgboss").
 * Aplikasi web hanya mengirim tugas; `npm run worker` yang mengerjakannya (src/worker/index.ts, satu proses untuk
 * semua modul; pengerjanya per modul di src/worker/{bersama,led,lkps}.ts).
 * ANTREAN_NONAKTIF=1 mematikan pengiriman (uji otomatis memanggil fungsi proses secara langsung).
 */

export const ANTREAN = {
  // modul LED (src/worker/led.ts). Nama antrean tidak diubah supaya tugas yang sudah antre tetap dikerjakan;
  // "baca-lkps" = membaca berkas LKPS yang diunggah ke LED.
  lkps: "baca-lkps",
  dokumen: "proses-dokumen",
  generate: "generate",
  ekspor: "ekspor-word",
  instrumen: "ekstrak-instrumen",
  // bersama (src/worker/bersama.ts)
  cadangan: "cadangan-harian",
  // modul LKPS (src/worker/lkps.ts): tambahkan di sini dengan awalan "lkps-", misalnya impor: "lkps-impor-excel"
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
    // generate dan ekstraksi instrumen mengatur ulang sendiri (kunci habis, batas per menit); tidak diulang otomatis.
    // Cadangan mencatat sendiri kegagalannya; diulang sekali saja (jadwal berikutnya besok).
    const opsi = nama === ANTREAN.generate || nama === ANTREAN.instrumen ? { retryLimit: 0 }
      : nama === ANTREAN.cadangan ? { retryLimit: 1, retryDelay: 600 }
      : { retryLimit: 2, retryDelay: 30, retryBackoff: true };
    await bos.createQueue(nama, opsi);
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

export interface OpsiKirim {
  /** Tunda sampai waktu ini (untuk melanjutkan generate setelah reset kuota atau jeda batas per menit). */
  mulaiSetelah?: Date;
}

export async function kirimTugas(nama: NamaAntrean, data: Record<string, string>, opsi: OpsiKirim = {}): Promise<string | null> {
  if (process.env.ANTREAN_NONAKTIF === "1") return null;
  try {
    return await (await bos()).send(nama, data, opsi.mulaiSetelah ? { startAfter: opsi.mulaiSetelah } : {});
  } catch (e) {
    globalBos.bosAntrean = undefined;
    throw e;
  }
}

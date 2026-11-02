/**
 * Worker antrean (pg-boss) untuk seluruh website: satu proses mengerjakan antrean semua modul.
 * - bersama: cadangan harian (src/worker/bersama.ts)
 * - LED: baca LKPS yang diunggah, proses dokumen, generate narasi, ekspor Word, ekstraksi instrumen (src/worker/led.ts)
 * - LKPS: belum ada (src/worker/lkps.ts)
 * Jalankan terpisah dari aplikasi web:  npm run worker
 */
import "dotenv/config";
import { ANTREAN, buatBos, siapkanAntrean } from "@/modules/bersama/antrean";
import { prisma } from "@/modules/bersama/db";
import { daftarkanPengerjaBersama, keteranganCadangan } from "./bersama";
import { daftarkanPengerjaLed, pulihkanPekerjaanLed } from "./led";
import { daftarkanPengerjaLkps, pulihkanPekerjaanLkps } from "./lkps";

async function main() {
  const bos = buatBos();
  await bos.start();
  await siapkanAntrean(bos);

  await daftarkanPengerjaBersama(bos);
  await daftarkanPengerjaLed(bos);
  await daftarkanPengerjaLkps(bos);

  await pulihkanPekerjaanLed();
  await pulihkanPekerjaanLkps();
  console.log("Worker berjalan. Antrean:", Object.values(ANTREAN).join(", "));
  console.log(keteranganCadangan());

  const berhenti = async () => {
    console.log("Worker berhenti...");
    await bos.stop({ graceful: true, timeout: 20_000 });
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", berhenti);
  process.on("SIGTERM", berhenti);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

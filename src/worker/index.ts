/**
 * Worker antrean (pg-boss): membaca LKPS, memproses dokumen (ekstraksi, pemotongan, embedding), dan menyusun
 * narasi (tugas generate).
 * Jalankan terpisah dari aplikasi web:  npm run worker
 */
import "dotenv/config";
import { ANTREAN, buatBos, siapkanAntrean } from "@/lib/antrean";
import { prosesBerkasLkps } from "@/lib/proses/lkps";
import { prosesDokumen } from "@/lib/proses/dokumen";
import { prosesTugasGenerate, pulihkanTugasTerputus } from "@/lib/proses/generate";
import { prisma } from "@/lib/db";

async function main() {
  const bos = buatBos();
  await bos.start();
  await siapkanAntrean(bos);

  await bos.work<{ berkasId: string }>(ANTREAN.lkps, { localConcurrency: 1 }, async ([tugas]) => {
    console.log(`[lkps] ${tugas.data.berkasId}`);
    await prosesBerkasLkps(tugas.data.berkasId);
  });
  await bos.work<{ dokumenId: string }>(ANTREAN.dokumen, { localConcurrency: 2 }, async ([tugas]) => {
    console.log(`[dokumen] ${tugas.data.dokumenId}`);
    await prosesDokumen(tugas.data.dokumenId);
  });
  await bos.work<{ tugasId: string }>(ANTREAN.generate, { localConcurrency: 2 }, async ([tugas]) => {
    console.log(`[generate] ${tugas.data.tugasId}`);
    const hasil = await prosesTugasGenerate(tugas.data.tugasId);
    console.log(`[generate] ${tugas.data.tugasId} ${hasil}`);
  });
  const dipulihkan = await pulihkanTugasTerputus();
  if (dipulihkan) console.log(`${dipulihkan} tugas generate dikirim ulang.`);
  console.log("Worker berjalan. Antrean:", Object.values(ANTREAN).join(", "));

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

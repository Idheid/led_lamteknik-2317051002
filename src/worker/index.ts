/**
 * Worker antrean (pg-boss): membaca LKPS, memproses dokumen (ekstraksi, pemotongan, embedding), dan menyusun
 * narasi (tugas generate), membuat berkas Word (ekspor), mengekstrak instrumen yang diunggah PJ, dan membuat
 * cadangan harian.
 * Jalankan terpisah dari aplikasi web:  npm run worker
 */
import "dotenv/config";
import { ANTREAN, buatBos, kirimTugas, siapkanAntrean } from "@/lib/antrean";
import { prosesBerkasLkps } from "@/lib/proses/lkps";
import { prosesDokumen } from "@/lib/proses/dokumen";
import { prosesTugasGenerate, pulihkanTugasTerputus } from "@/lib/proses/generate";
import { prosesEkspor } from "@/lib/proses/ekspor";
import { prosesEkstraksiInstrumen, pulihkanEkstraksiTerputus } from "@/lib/proses/instrumen";
import { prisma } from "@/lib/db";
import { buatCadangan, jadwalCadangan } from "@/lib/proses/cadangan";

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
  await bos.work<{ eksporId: string }>(ANTREAN.ekspor, { localConcurrency: 1 }, async ([tugas]) => {
    console.log(`[ekspor] ${tugas.data.eksporId}`);
    console.log(`[ekspor] ${tugas.data.eksporId} ${await prosesEkspor(tugas.data.eksporId)}`);
  });
  await bos.work<{ versiId: string }>(ANTREAN.instrumen, { localConcurrency: 1 }, async ([tugas]) => {
    console.log(`[instrumen] ${tugas.data.versiId}`);
    console.log(`[instrumen] ${tugas.data.versiId} ${await prosesEkstraksiInstrumen(tugas.data.versiId)}`);
  });
  // cadangan harian (revisi 22 Okt 2026); "missed: once" = laptop/server yang mati saat jadwal tetap mencadangkan
  // sekali ketika worker menyala lagi
  await bos.work(ANTREAN.cadangan, { localConcurrency: 1 }, async () => {
    const h = await buatCadangan();
    console.log(`[cadangan] ${h.berhasil ? `berhasil ${h.folder}` : `gagal: ${h.pesan}`}`);
    if (!h.berhasil) throw new Error(h.pesan);
  });
  if (process.env.CADANGAN_NONAKTIF === "1") await bos.unschedule(ANTREAN.cadangan);
  else await bos.schedule(ANTREAN.cadangan, jadwalCadangan(), null, { tz: "Asia/Jakarta", missed: "once" });
  // ekspor yang terputus saat worker mati dikirim ulang
  await prisma.ekspor.updateMany({ where: { status: "diproses" }, data: { status: "antre" } });
  for (const e of await prisma.ekspor.findMany({ where: { status: "antre" }, select: { id: true } })) {
    await kirimTugas(ANTREAN.ekspor, { eksporId: e.id });
  }
  const dipulihkan = await pulihkanTugasTerputus();
  if (dipulihkan) console.log(`${dipulihkan} tugas generate dikirim ulang.`);
  const ekstraksi = await pulihkanEkstraksiTerputus();
  if (ekstraksi) console.log(`${ekstraksi} ekstraksi instrumen dikirim ulang.`);
  console.log("Worker berjalan. Antrean:", Object.values(ANTREAN).join(", "));
  console.log(process.env.CADANGAN_NONAKTIF === "1" ? "Cadangan harian dimatikan (CADANGAN_NONAKTIF=1)." : `Cadangan harian: ${jadwalCadangan()} WIB.`);

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

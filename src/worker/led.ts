import type { PgBoss } from "pg-boss";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { prisma } from "@/modules/bersama/db";
import { prosesBerkasLkps } from "@/modules/led/proses/lkps";
import { prosesDokumen } from "@/modules/led/proses/dokumen";
import { prosesTugasGenerate, pulihkanTugasTerputus } from "@/modules/led/proses/generate";
import { prosesEkspor } from "@/modules/led/proses/ekspor";
import { prosesEkstraksiInstrumen, pulihkanEkstraksiTerputus } from "@/modules/led/proses/instrumen";
import { prosesSkorRubrik } from "@/modules/led/proses/skor-rubrik";

/**
 * Pengerja antrean modul LED: membaca LKPS yang diunggah ke LED, memproses dokumen Basis Pengetahuan (ekstraksi,
 * pemotongan, embedding), menyusun narasi (tugas generate), membuat berkas Word (ekspor), mengekstrak instrumen, dan
 * menghitung usulan skor rubrik (revisi 31 Okt 2026).
 */
export async function daftarkanPengerjaLed(bos: PgBoss): Promise<void> {
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
  await bos.work<{ proyekId: string }>(ANTREAN.skorRubrik, { localConcurrency: 1 }, async ([tugas]) => {
    console.log(`[skor-rubrik] ${tugas.data.proyekId}`);
    console.log(`[skor-rubrik] ${tugas.data.proyekId} ${await prosesSkorRubrik(tugas.data.proyekId)}`);
  });
}

/** Pekerjaan LED yang terputus saat worker mati dikirim ulang. */
export async function pulihkanPekerjaanLed(): Promise<void> {
  await prisma.ekspor.updateMany({ where: { status: "diproses" }, data: { status: "antre" } });
  for (const e of await prisma.ekspor.findMany({ where: { status: "antre" }, select: { id: true } })) {
    await kirimTugas(ANTREAN.ekspor, { eksporId: e.id });
  }
  const dipulihkan = await pulihkanTugasTerputus();
  if (dipulihkan) console.log(`${dipulihkan} tugas generate dikirim ulang.`);
  // usulan skor yang terputus saat worker mati dikirim ulang
  await prisma.proyekLED.updateMany({ where: { statusSkorRubrik: "berjalan" }, data: { statusSkorRubrik: "antre" } });
  for (const p of await prisma.proyekLED.findMany({ where: { statusSkorRubrik: "antre" }, select: { id: true } })) {
    await kirimTugas(ANTREAN.skorRubrik, { proyekId: p.id });
  }
  const ekstraksi = await pulihkanEkstraksiTerputus();
  if (ekstraksi) console.log(`${ekstraksi} ekstraksi instrumen dikirim ulang.`);
}

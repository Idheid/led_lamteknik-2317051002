import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { bacaBerkas } from "@/modules/bersama/penyimpanan";
import { GalatTanpaKunci } from "@/modules/bersama/data/kunci-api";
import { bacaParagrafTemplate } from "@/modules/led/instrumen/template";
import { daftarGaya, usulanPemetaan } from "@/modules/led/domain/pemetaan-template";
import { PERAN_GAYA } from "@/modules/led/domain/template-led";
import { gabungUsulanAi, promptStruktur, type KeluaranStruktur } from "@/modules/led/domain/usulan-struktur";
import { bacaSidikJariVersi, bacaUsulanStruktur, type UsulanStruktur } from "@/modules/led/data/unggah-instrumen";
import { panggilTerstruktur } from "@/modules/led/proses/llm-narasi";

/**
 * Worker "struktur-template" (perbaikan 2 Nov 2026, I4): usulan peran gaya paragraf dari AI, hanya setelah Admin
 * mengklik "Minta usulan AI" dan mengonfirmasi perkiraan token. Hasilnya hanya mengisi usulan di halaman Pemetaan.
 * Bila kunci habis, berhenti dengan pesan yang jelas (tidak diulang otomatis: Admin yang memutuskan memintanya lagi).
 */

const skemaStruktur = z.object({
  peran: z.array(z.object({
    gaya: z.string(),
    peran: z.enum([...PERAN_GAYA, "biasa"]),
    alasan: z.string(),
  })),
  polaCatatan: z.string().nullable().optional(),
});

async function simpan(versiId: string, u: UsulanStruktur) {
  await prisma.versiInstrumen.update({ where: { id: versiId }, data: { usulanStruktur: u as unknown as Prisma.InputJsonValue } });
}

export async function prosesUsulanStruktur(versiId: string): Promise<string> {
  const v = await prisma.versiInstrumen.findUnique({ where: { id: versiId } });
  const awal = bacaUsulanStruktur(v?.usulanStruktur);
  if (!v || !awal || awal.status !== "antre") return "dilewati";
  if (!v.templateLedLokasi) {
    await simpan(versiId, { ...awal, status: "gagal", pesan: "Template LED tidak ditemukan." });
    return "gagal";
  }
  await simpan(versiId, { ...awal, status: "berjalan" });
  try {
    const paragraf = await bacaParagrafTemplate(await bacaBerkas(v.templateLedLokasi));
    const kriteria = bacaSidikJariVersi(v.sidikJari).matriks?.kriteria ?? [];
    const { sistem, pengguna } = promptStruktur(paragraf, kriteria);
    const gayaTemplate = daftarGaya(paragraf).map((g) => g.gaya);
    const r = await panggilTerstruktur({
      prodiId: null, proyekId: null, tugasId: null, subBagianKode: `struktur-template:${v.kode}`,
      sistem, pengguna, skema: skemaStruktur, maksTokenKeluaran: 4096,
      // mode uji (LLM_NARASI=uji): keluaran tetap tanpa memanggil Gemini
      keluaranUji: () => ({
        peran: Object.entries(usulanPemetaan(paragraf, { jumlahKriteria: kriteria.length || undefined }).gaya)
          .map(([gaya, peran]) => ({ gaya: gaya || "(tanpa gaya)", peran, alasan: "model uji pengembangan" })),
      }),
    });
    const usulan = gabungUsulanAi(r.keluaran as KeluaranStruktur, gayaTemplate);
    await simpan(versiId, {
      ...awal, status: "selesai", gaya: usulan.gaya, alasan: usulan.alasan, model: r.model,
      tokenMasuk: r.tokenMasuk, tokenKeluar: r.tokenKeluar, selesai: new Date().toISOString(),
    });
    return "selesai";
  } catch (e) {
    const pesan = e instanceof GalatTanpaKunci
      ? `Usulan AI berhenti: ${e.message.replace(/ ?Penyusunan dilanjutkan otomatis[^.]*\./, "")} Pemetaan judul tetap bisa diisi sendiri tanpa AI.`
      : `Usulan AI gagal: ${e instanceof Error ? e.message.slice(0, 300) : String(e)}`;
    await simpan(versiId, { ...awal, status: "gagal", pesan });
    return "gagal";
  }
}

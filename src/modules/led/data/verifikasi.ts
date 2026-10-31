import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { ambilProyekUbah } from "@/modules/led/data/proyek";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { bacaDokumen, type RujukanPeriksa } from "@/modules/led/domain/narasi";
import { periksaKalimat, ringkasVerifikasi, type KalimatTerperiksa, type LabelKalimat, type RingkasVerifikasi } from "@/modules/led/domain/verifikasi";
import { panggilTerstruktur } from "@/modules/led/proses/llm-narasi";

/**
 * Tombol "Periksa dengan AI" per sub-bagian (revisi 22 Okt 2026): satu panggilan Gemini menerima kalimat beserta
 * teks sumber yang dirujuk, lalu memberi label dan alasan per kalimat. Hasil disimpan bersama versi draf aktif.
 */

const skema = z.object({
  kalimat: z.array(z.object({
    nomor: z.number().int(),
    label: z.enum(["sesuai", "sebagian", "tidak_didukung"]),
    alasan: z.string(),
  })),
});

export interface HasilVerifikasiAi {
  model: string;
  waktu: string;
  hasil: KalimatTerperiksa[];
}

const SISTEM = [
  "Anda pemeriksa fakta untuk draf Laporan Evaluasi Diri. Untuk setiap kalimat bernomor, nilai apakah isinya didukung SUMBER yang dirujuk kalimat itu (kode di dalam kurung).",
  "Label:",
  '- "sesuai": isi dan angkanya ada di sumber yang dirujuk;',
  '- "sebagian": merujuk sumber, tetapi ada simpulan, penilaian, atau tambahan kata yang tidak ada di sumber;',
  '- "tidak_didukung": angka atau isinya tidak ditemukan di sumber yang dirujuk, atau kalimat tidak merujuk sumber.',
  "Kalimat yang berisi penanda [BELUM ADA BUKTI: ...] diberi label \"sebagian\".",
  "Alasan ditulis singkat (paling banyak 25 kata) dalam bahasa Indonesia. Keluarkan satu objek untuk setiap nomor kalimat, hanya JSON sesuai skema.",
].join("\n");

export async function periksaDenganAi(p: Pengguna, proyekId: string, subBagianKode: string): Promise<RingkasVerifikasi> {
  const proyek = await ambilProyekUbah(p, proyekId);
  const bd = await prisma.bagianDraf.findFirst({
    where: { proyekId: proyek.id, subBagian: { kode: subBagianKode, bagian: { versiId: proyek.versiId } } },
  });
  if (!bd?.versiAktifId) throw new GalatPengguna("Sub-bagian ini belum punya draf.");
  const v = await prisma.versiDraf.findUniqueOrThrow({ where: { id: bd.versiAktifId } });
  const periksa = (v.pemeriksaan ?? {}) as { rujukan?: RujukanPeriksa };
  const teksSumber = periksa.rujukan?.teksSumber ?? {};
  const kalimat = periksaKalimat(bacaDokumen(v.isi), teksSumber, { tahunSah: periksa.rujukan?.tahunSah ?? [] });
  if (kalimat.length === 0) throw new GalatPengguna("Tidak ada kalimat narasi untuk diperiksa.");

  const dipakai = [...new Set(kalimat.flatMap((k) => k.sumber))].filter((s) => teksSumber[s]);
  const pengguna = [
    "## SUMBER",
    dipakai.length ? dipakai.map((s) => `[${s}]\n${teksSumber[s].slice(0, 2500)}`).join("\n\n") : "(tidak ada teks sumber tersimpan)",
    "",
    "## KALIMAT",
    kalimat.map((k, i) => `${i + 1}. (${k.sumber.join(", ") || "tanpa sumber"}) ${k.teks}`).join("\n"),
  ].join("\n");
  const r = await panggilTerstruktur({
    prodiId: proyek.prodiId, proyekId: proyek.id, tugasId: null, subBagianKode: `verifikasi:${subBagianKode}`,
    sistem: SISTEM, pengguna, skema, pikir: "rendah",
  });
  const hasil: KalimatTerperiksa[] = kalimat.map((k, i) => {
    const a = r.keluaran.kalimat.find((x) => x.nomor === i + 1);
    return a ? { ...k, label: a.label as LabelKalimat, alasan: a.alasan } : { ...k, alasan: `AI tidak menilai kalimat ini; label cek otomatis: ${k.alasan}` };
  });
  const simpan: HasilVerifikasiAi = { model: r.model, waktu: new Date().toISOString(), hasil };
  await prisma.versiDraf.update({
    where: { id: v.id },
    data: { pemeriksaan: { ...(v.pemeriksaan as object ?? {}), kalimatAi: simpan } as unknown as Prisma.InputJsonValue },
  });
  await catatAktivitas(p, "verifikasi_ai", "proyek", proyek.id, { subBagianKode });
  return ringkasVerifikasi(hasil);
}

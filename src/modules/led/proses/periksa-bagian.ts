import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { bacaDokumen, paragrafBersumber, periksaDokumen, type DokTiptap, type RujukanPeriksa } from "@/modules/led/domain/narasi";
import type { KalimatTerperiksa } from "@/modules/led/domain/verifikasi";
import type { RingkasanKutipan } from "@/modules/led/domain/kutipan";
import {
  SISTEM_PERBAIKAN, SISTEM_PERIKSA, buktiParagraf, cekPerbaikan, gantiParagraf, kunciTahan, kutipanSetelahPerbaikan, labelAturan,
  paragrafPerluPerbaikan, susunPenggunaPerbaikan, susunPenggunaPeriksa, terapkanLabelAi,
  type HasilPerbaikanParagraf, type HasilVerifikasiAi, type ItemPeriksa, type ParagrafPerbaikan, type PemeriksaanT8,
} from "@/modules/led/domain/periksa-bagian";
import { kunciKalimat } from "@/modules/led/domain/verifikasi";
import { GalatSementara, panggilTerstruktur } from "@/modules/led/proses/llm-narasi";
import { GalatTanpaKunci } from "@/modules/bersama/data/kunci-api";

/**
 * Rencana 10 Nov T8: pemeriksaan AI otomatis per bagian (satu panggilan untuk semua kalimat versi baru satu bagian)
 * dan perbaikan terarah maksimal sekali (satu panggilan untuk semua paragraf bermasalah, lalu satu panggilan memeriksa
 * kalimat yang berubah). Dijalankan worker (antrean "periksa-bagian"): segera setelah Susun/generate satu bagian, atau
 * 60 detik setelah generate sub-bagian terakhir di bagian itu (debounce).
 */

export const JEDA_PERIKSA_MS = 60_000;
export const MODEL_TANPA_AI = "tanpa AI";

function jeda(): number {
  const n = Number(process.env.PERIKSA_JEDA_MS);
  return Number.isFinite(n) && n >= 0 ? n : JEDA_PERIKSA_MS;
}

/** PERIKSA_AI_OTOMATIS=0 mematikan pemeriksaan AI otomatis (tombol "Periksa dengan AI" tetap ada). */
export function periksaOtomatisAktif(): boolean {
  return process.env.PERIKSA_AI_OTOMATIS !== "0";
}

export async function jadwalkanPeriksaBagian(proyekId: string, bagianKode: string, segera: boolean): Promise<void> {
  if (!periksaOtomatisAktif()) return;
  await kirimTugas(ANTREAN.periksaBagian, { proyekId, bagianKode, segera: segera ? "1" : "0" },
    segera ? {} : { mulaiSetelah: new Date(Date.now() + jeda()) });
}

const skemaPeriksa = z.object({
  kalimat: z.array(z.object({
    nomor: z.number().int(),
    label: z.enum(["sesuai", "sebagian", "tidak_didukung"]),
    alasan: z.string(),
  })),
});

const skemaPerbaikan = z.object({
  paragraf: z.array(z.object({
    nomor: z.number().int(),
    teks: z.string(),
    bukti: z.array(z.string()).default([]),
  })),
});

type Pemeriksaan = PemeriksaanT8 & { rujukan?: RujukanPeriksa } & Record<string, unknown>;

interface VersiPeriksa {
  id: string;
  nomor: number;
  bagianDrafId: string;
  kode: string;
  doc: DokTiptap;
  periksa: Pemeriksaan;
  paragraf: { teks: string; sumber: string[] }[];
  item: ItemPeriksa;
}

function siapkanVersi(v: { id: string; nomor: number; bagianDrafId: string; isi: unknown; pemeriksaan: unknown }, kode: string): VersiPeriksa {
  const doc = bacaDokumen(v.isi);
  const periksa = (v.pemeriksaan ?? {}) as Pemeriksaan;
  const teksSumber = periksa.rujukan?.teksSumber ?? {};
  const paragraf = paragrafBersumber(doc);
  return {
    id: v.id, nomor: v.nomor, bagianDrafId: v.bagianDrafId, kode, doc, periksa, paragraf,
    item: {
      kode,
      kalimat: periksa.kalimat ?? [],
      bukti: (i) => buktiParagraf(i, paragraf[i]?.sumber ?? [], periksa.kutipan, teksSumber),
    },
  };
}

interface Konteks {
  prodiId: string;
  proyekId: string;
  bagianKode: string;
}

/** Langkah 2: satu panggilan AI untuk kalimat beberapa versi (`hanya` membatasi kalimat yang dikirim). */
async function periksaAi(k: Konteks, item: ItemPeriksa[], label: string, hanya?: (iItem: number, x: KalimatTerperiksa) => boolean) {
  const { teks, peta } = susunPenggunaPeriksa(item, hanya);
  if (peta.length === 0) return { kalimat: item.map((it) => it.kalimat), model: null as string | null };
  const r = await panggilTerstruktur({
    prodiId: k.prodiId, proyekId: k.proyekId, tugasId: null, subBagianKode: `${label}:${k.bagianKode}`,
    sistem: SISTEM_PERIKSA, pengguna: teks, skema: skemaPeriksa, pikir: "rendah",
  });
  return { kalimat: terapkanLabelAi(item, peta, r.keluaran.kalimat), model: r.model };
}

/** Versi aktif bagian ini yang belum diperiksa AI (generate oleh AI; bukan suntingan atau draf tanpa AI). */
async function versiBelumDiperiksa(proyekId: string, versiId: string, bagianKode: string): Promise<VersiPeriksa[]> {
  const draf = await prisma.bagianDraf.findMany({
    where: { proyekId, versiAktifId: { not: null }, subBagian: { bagian: { versiId, kode: bagianKode } } },
    select: { versiAktifId: true, subBagian: { select: { kode: true } } },
  });
  const kode = new Map(draf.map((d) => [d.versiAktifId!, d.subBagian.kode]));
  const versi = await prisma.versiDraf.findMany({
    where: { id: { in: [...kode.keys()] }, asal: "generate", model: { not: MODEL_TANPA_AI } },
    orderBy: { createdAt: "asc" },
  });
  return versi
    .map((v) => siapkanVersi(v, kode.get(v.id)!))
    .filter((v) => !v.periksa.kalimatAi && v.item.kalimat.length > 0);
}

async function simpanPemeriksaan(id: string, periksa: Pemeriksaan) {
  await prisma.versiDraf.update({ where: { id }, data: { pemeriksaan: periksa as unknown as Prisma.InputJsonValue } });
}

function hasilAi(model: string, kalimat: KalimatTerperiksa[]): HasilVerifikasiAi {
  return { model, waktu: new Date().toISOString(), hasil: kalimat };
}

export interface RingkasanPeriksaBagian {
  status: "selesai" | "ditunda" | "menunggu-generate" | "tidak-ada" | "gagal";
  versi: number;
  panggilanAi: number;
  diperbaiki: number;
  label?: { sesuai: number; sebagian: number; tidak_didukung: number };
  pesan?: string;
}

function hitungLabel(kalimat: KalimatTerperiksa[][]) {
  const semua = kalimat.flat();
  return {
    sesuai: semua.filter((k) => k.label === "sesuai").length,
    sebagian: semua.filter((k) => k.label === "sebagian").length,
    tidak_didukung: semua.filter((k) => k.label === "tidak_didukung").length,
  };
}

/**
 * Kerjakan pemeriksaan satu bagian. `segera` = dari Susun/generate bagian atau tombol; tanpa itu, ditunda bila ada
 * generate di bagian ini kurang dari 60 detik lalu (debounce).
 */
export async function prosesPeriksaBagian(proyekId: string, bagianKode: string, opsi: { segera?: boolean } = {}): Promise<RingkasanPeriksaBagian> {
  const kosong = { versi: 0, panggilanAi: 0, diperbaiki: 0 };
  const proyek = await prisma.proyekLED.findUnique({ where: { id: proyekId } });
  if (!proyek) return { status: "tidak-ada", ...kosong };
  // generate yang masih berjalan di bagian ini menjadwalkan pemeriksaan sendiri saat selesai
  const generate = await prisma.tugasGenerate.count({ where: { proyekId, bagianKode, status: { in: ["antre", "berjalan"] } } });
  if (generate) return { status: "menunggu-generate", ...kosong };
  if (!opsi.segera) {
    const terbaru = await prisma.versiDraf.findFirst({
      where: { asal: "generate", bagianDraf: { proyekId, subBagian: { bagian: { versiId: proyek.versiId, kode: bagianKode } } } },
      orderBy: { createdAt: "desc" }, select: { createdAt: true },
    });
    const sisa = terbaru ? terbaru.createdAt.getTime() + jeda() - Date.now() : 0;
    if (sisa > 1000) {
      await kirimTugas(ANTREAN.periksaBagian, { proyekId, bagianKode, segera: "0" }, { mulaiSetelah: new Date(Date.now() + sisa) });
      return { status: "ditunda", ...kosong };
    }
  }

  const versi = await versiBelumDiperiksa(proyekId, proyek.versiId, bagianKode);
  if (versi.length === 0) return { status: "tidak-ada", ...kosong };
  const k: Konteks = { prodiId: proyek.prodiId, proyekId, bagianKode };
  let panggilan = 0;
  try {
    // ---------------- Langkah 2: satu panggilan untuk semua kalimat semua versi baru
    const ai = await periksaAi(k, versi.map((v) => v.item), "periksa");
    panggilan += ai.model ? 1 : 0;
    for (const [i, v] of versi.entries()) {
      v.periksa = {
        ...v.periksa,
        kalimatAi: hasilAi(ai.model ?? "aturan", ai.kalimat[i]),
        tahan: kunciTahan(ai.kalimat[i], [], true),
        statusAi: "selesai",
        pesanAi: undefined,
      };
      v.item = { ...v.item, kalimat: ai.kalimat[i] };
      await simpanPemeriksaan(v.id, v.periksa);
    }

    // ---------------- Langkah 3: perbaikan terarah, maksimal sekali, satu panggilan untuk semua paragraf bermasalah
    const calon = versi.filter((v) => !v.periksa.diperbaiki && !v.periksa.perbaikan);
    const daftar: ParagrafPerbaikan[] = calon.flatMap((v) =>
      paragrafPerluPerbaikan(v.item.kalimat, v.paragraf, v.item.bukti, versi.indexOf(v)));
    let diperbaiki = 0;
    let kalimatAkhir = ai.kalimat;
    if (daftar.length > 0) {
      const r = await panggilTerstruktur({
        prodiId: k.prodiId, proyekId, tugasId: null, subBagianKode: `perbaikan:${bagianKode}`,
        sistem: SISTEM_PERBAIKAN, pengguna: susunPenggunaPerbaikan(daftar, (i) => versi[i].kode), skema: skemaPerbaikan, pikir: "rendah",
      });
      panggilan += 1;
      const tahun = (iItem: number) => versi[iItem].periksa.rujukan?.tahunSah ?? [];
      const perVersi = new Map<number, Map<number, HasilPerbaikanParagraf>>();
      for (const o of r.keluaran.paragraf) {
        const p = daftar[o.nomor - 1];
        if (!p) continue;
        const h = cekPerbaikan(p, o, tahun(p.item));
        if (!perVersi.has(p.item)) perVersi.set(p.item, new Map());
        perVersi.get(p.item)!.set(p.paragraf, h);
      }
      const baru: { iItem: number; v: VersiPeriksa; lamaKunci: Map<string, KalimatTerperiksa> }[] = [];
      for (const [iItem, hasil] of perVersi) {
        const asal = versi[iItem];
        const ganti = new Map([...hasil].map(([i, h]) => [i, h.teks]));
        const doc = gantiParagraf(asal.doc, ganti);
        const rujukan = asal.periksa.rujukan ?? { angkaSah: [], tahunSah: [], target: null, sumberSah: [] };
        const kutipan = kutipanSetelahPerbaikan(asal.periksa.kutipan as RingkasanKutipan | null | undefined, hasil);
        const dasar = periksaDokumen(doc, rujukan, ((asal.periksa.masalahSumber ?? []) as { jenis: string }[]).filter((m) => m.jenis === "unsur_hilang") as never);
        const aturan = labelAturan(dasar.kalimat ?? [], kutipan);
        const periksa: Pemeriksaan = {
          ...dasar, rujukan, catatanSistem: asal.periksa.catatanSistem, kutipan,
          kalimat: aturan.kalimat, statusAi: "antre",
          perbaikan: {
            dariVersiId: asal.id, dariNomor: asal.nomor,
            ditulisUlang: [...hasil].filter(([, h]) => h.teks !== null).map(([i]) => i + 1),
            dihapus: [...hasil].filter(([, h]) => h.teks === null).map(([i]) => i + 1),
          },
        };
        const sebelum = await prisma.versiDraf.findUniqueOrThrow({ where: { id: asal.id } });
        const v = await prisma.$transaction(async (tx) => {
          const akhir = await tx.versiDraf.findFirst({ where: { bagianDrafId: asal.bagianDrafId }, orderBy: { nomor: "desc" }, select: { nomor: true } });
          const dibuat = await tx.versiDraf.create({
            data: {
              bagianDrafId: asal.bagianDrafId,
              nomor: (akhir?.nomor ?? 0) + 1,
              asal: "perbaikan",
              isi: doc as unknown as Prisma.InputJsonValue,
              sumber: (sebelum.sumber ?? {}) as Prisma.InputJsonValue,
              unsur: (sebelum.unsur ?? []) as Prisma.InputJsonValue,
              dokumenKurang: sebelum.dokumenKurang,
              pemeriksaan: periksa as unknown as Prisma.InputJsonValue,
              model: sebelum.model,
              pencarian: (sebelum.pencarian ?? undefined) as Prisma.InputJsonValue | undefined,
              jumlahKata: dasar.jumlahKata,
            },
          });
          // versi aktif hanya diganti bila Tim Prodi belum menyunting sejak generate
          await tx.bagianDraf.updateMany({ where: { id: asal.bagianDrafId, versiAktifId: asal.id }, data: { versiAktifId: dibuat.id } });
          return dibuat;
        });
        asal.periksa = { ...asal.periksa, diperbaiki: true };
        await simpanPemeriksaan(asal.id, asal.periksa);
        const sv = siapkanVersi(v, asal.kode);
        baru.push({ iItem, v: sv, lamaKunci: new Map(ai.kalimat[iItem].map((x) => [kunciKalimat(x.teks), x])) });
        diperbaiki += 1;
      }
      // Langkah 1 sudah dijalankan untuk versi perbaikan (periksaDokumen + labelAturan); Langkah 2 hanya untuk kalimat yang berubah
      if (baru.length) {
        const item = baru.map((b) => b.v.item);
        const ulang = await periksaAi(k, item, "periksa-ulang", (iItem, x) => !baru[iItem].lamaKunci.has(kunciKalimat(x.teks)));
        panggilan += ulang.model ? 1 : 0;
        for (const [i, b] of baru.entries()) {
          // kalimat yang tidak berubah memakai label AI sebelumnya
          const kalimat = ulang.kalimat[i].map((x) => b.lamaKunci.get(kunciKalimat(x.teks)) ? { ...b.lamaKunci.get(kunciKalimat(x.teks))!, paragraf: x.paragraf } : x);
          b.v.periksa = {
            ...b.v.periksa,
            kalimatAi: hasilAi(ulang.model ?? ai.model ?? "aturan", kalimat),
            tahan: kunciTahan(kalimat, [], true),
            statusAi: "selesai",
          };
          await simpanPemeriksaan(b.v.id, b.v.periksa);
          kalimatAkhir = kalimatAkhir.map((x, j) => (j === b.iItem ? kalimat : x));
        }
      }
    }
    return { status: "selesai", versi: versi.length, panggilanAi: panggilan, diperbaiki, label: hitungLabel(kalimatAkhir) };
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    for (const v of versi) {
      if (v.periksa.kalimatAi) continue;
      await simpanPemeriksaan(v.id, { ...v.periksa, statusAi: "gagal", pesanAi: pesan.slice(0, 300) });
    }
    if (e instanceof GalatSementara) {
      await kirimTugas(ANTREAN.periksaBagian, { proyekId, bagianKode, segera: "1" }, { mulaiSetelah: new Date(Date.now() + Math.max(e.tungguMs, 30_000)) });
    } else if (!(e instanceof GalatTanpaKunci)) {
      console.error(`[periksa-bagian] ${proyekId} ${bagianKode}:`, pesan);
    }
    return { status: "gagal", versi: versi.length, panggilanAi: panggilan, diperbaiki: 0, pesan };
  }
}

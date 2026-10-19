import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { bacaBerkas } from "@/lib/penyimpanan";
import { GalatTanpaKunci } from "@/lib/data/kunci-api";
import { perbaruiLaporanTemplate } from "@/lib/data/ekspor";
import { bacaInfoEkstraksi, versiRujukan, type InfoEkstraksi } from "@/lib/data/unggah-instrumen";
import { bacaRentangHalaman, bacaTabelBobot, type ButirBobot } from "@/lib/domain/bobot";
import {
  butirTanpaAi, gabungButir, promptEkstraksi, type ButirAi, type ButirDraf, type RumusPilihan, type SubPilihan,
} from "@/lib/domain/ekstraksi-instrumen";
import { kelompokBaris, susunMatriks } from "@/lib/domain/matriks";
import { katalogRumus } from "@/lib/domain/metrik-lkps";
import { petakanSubBagian, untukJenjang, uraiTemplate, type SubRujukan } from "@/lib/domain/template-led";
import { bacaHalamanPdf } from "@/lib/instrumen/pdf";
import { bacaParagrafTemplate } from "@/lib/instrumen/template";
import { pakaiNarasiUji } from "@/lib/llm/narasi-uji";
import { GalatSementara, panggilTerstruktur } from "@/lib/proses/llm-narasi";

/**
 * Worker "ekstrak-instrumen" (revisi 19 Okt 2026). Langkah:
 * 1. template: Template LED (.docx) diurai tanpa AI menjadi bagian/sub-bagian/instruksi; kode sub-bagian diambil
 *    dari versi rujukan bila instruksinya cocok. Bagian awal (halaman muka, identitas, dsb.) disalin dari rujukan.
 * 2. bobot: tabel bobot jenjang dibaca tanpa AI dari halaman Pedoman Penilaian yang disebut PJ.
 * 3. matriks: tabel Matriks Penilaian disusun ulang per baris tanpa AI, lalu dikirim ke Gemini per kelompok kecil.
 *    Kemajuan disimpan per kelompok: bila kuota habis, ekstraksi berhenti rapi (tertunda) dan dilanjutkan dari
 *    kelompok yang sama setelah kunci baru diisi atau kuota direset.
 * Hasil: butir draf (dikonfirmasi = false, usulan AI ditandai) untuk dicek PJ.
 */

const skemaEkstraksi = z.object({
  butir: z.array(z.object({
    no: z.string(),
    sub: z.string().nullable(),
    elemen: z.string(),
    indikator: z.string(),
    skor4: z.string(),
    skor3: z.string(),
    skor2: z.string(),
    skor1: z.string(),
    skor0: z.string(),
    tabelLkps: z.array(z.string()),
    jenis: z.enum(["narasi", "angka"]),
    kodeRumus: z.string().nullable(),
    subBagian: z.array(z.string()),
  })),
});

type Info = InfoEkstraksi & { bobot?: ButirBobot[] };

async function simpanInfo(versiId: string, info: Info) {
  await prisma.versiInstrumen.update({ where: { id: versiId }, data: { ekstraksi: info as unknown as Prisma.InputJsonValue } });
}

// ------------------------------------------------------------------ langkah 1: template

async function rujukanSub(versiId: string, jenjang: string) {
  const r = await versiRujukan(versiId, jenjang);
  if (r) {
    const bagian = await prisma.bagian.findMany({ where: { versiId: r.id }, orderBy: { urutan: "asc" }, include: { subBagian: { orderBy: { urutan: "asc" } } } });
    return { bagian: bagian.map((b) => ({ ...b, subBagian: b.subBagian.map((s) => ({ ...s, varian: s.varian as unknown })) })) };
  }
  // belum ada versi lain sama sekali: kerangka dari data instrumen bawaan
  const data = JSON.parse(await readFile(join(process.cwd(), "data/instrumen/lamteknik-2025-pasca.json"), "utf8")) as {
    bagian: { kode: string; nama: string; jenis: string; subBagian: { kode: string; label?: string; judul: string; grup?: string | null; tipe: string; varian: unknown; berlakuUntuk: string[]; jenjangOverride?: string[] }[] }[];
  };
  return {
    bagian: data.bagian.map((b, i) => ({
      kode: b.kode, nama: b.nama, jenis: b.jenis, urutan: i, batasHalamanResmi: null as number | null, pengantar: null as string | null,
      subBagian: b.subBagian.map((s, k) => ({
        kode: s.kode, label: s.label ?? "", judul: s.judul, grup: s.grup ?? null, tipe: s.tipe, varian: s.varian,
        berlakuUntuk: s.berlakuUntuk, jenjangOverride: s.jenjangOverride ?? [], sumberInstruksi: "template", catatan: null as string | null, urutan: k,
      })),
    })),
  };
}

async function langkahTemplate(versi: { id: string; templateLedLokasi: string | null }, jenjang: string): Promise<string[]> {
  if (await prisma.bagian.count({ where: { versiId: versi.id } })) return [];
  if (!versi.templateLedLokasi) throw new Error("Template LED belum diunggah.");
  const semua = uraiTemplate(await bacaParagrafTemplate(await bacaBerkas(versi.templateLedLokasi)));
  if (!semua.some((b) => b.jenis === "kriteria")) throw new Error("Tidak ada kriteria (C.1, C.2, ...) yang dikenali di Template LED. Pastikan berkas adalah Template LEDPS resmi.");
  const ruj = await rujukanSub(versi.id, jenjang);
  const daftarRujukan: SubRujukan[] = ruj.bagian.flatMap((b) => b.subBagian.map((s) => ({
    bagianKode: b.kode, kode: s.kode, label: s.label, judul: s.judul, grup: s.grup, tipe: s.tipe,
    instruksi: ((s.varian ?? []) as { instruksi: string; jenjang?: string[] }[])
      .filter((v) => !v.jenjang || v.jenjang.includes(jenjang) || (s.jenjangOverride ?? []).includes(jenjang))
      .map((v) => v.instruksi),
    jenjangOverride: s.jenjangOverride ?? [],
  })));
  const peta = petakanSubBagian(untukJenjang(semua, jenjang), daftarRujukan, { jenjang, semuaVarian: semua });
  const baru: string[] = [];
  await prisma.$transaction(async (tx) => {
    let urutan = 0;
    // bagian awal diatur sistem (halaman muka, identitas, kata pengantar, ringkasan, daftar isi)
    for (const b of ruj.bagian.filter((x) => x.kode === "AWAL")) {
      await tx.bagian.create({
        data: {
          versiId: versi.id, kode: b.kode, nama: b.nama, jenis: b.jenis as "awal", urutan: urutan++, batasHalamanResmi: b.batasHalamanResmi, pengantar: b.pengantar,
          subBagian: {
            create: b.subBagian.map((s, i) => ({
              kode: s.kode, label: s.label, judul: s.judul, grup: s.grup, tipe: s.tipe as "data", varian: s.varian as Prisma.InputJsonValue,
              berlakuUntuk: [jenjang], jenjangOverride: [], sumberInstruksi: s.sumberInstruksi, catatan: s.catatan, urutan: i,
            })),
          },
        },
      });
    }
    for (const { bagian: b, sub } of peta) {
      const r = ruj.bagian.find((x) => x.kode === b.kode);
      await tx.bagian.create({
        data: {
          versiId: versi.id,
          kode: b.kode,
          nama: r?.nama ?? b.nama,
          jenis: (r?.jenis ?? (b.kode === "LAMPIRAN" ? "lampiran" : b.jenis)) as "bab",
          urutan: urutan++,
          batasHalamanResmi: r?.batasHalamanResmi ?? null,
          pengantar: b.pengantar ?? r?.pengantar ?? null,
          subBagian: {
            create: sub.map((s, i) => {
              if (!s.dariRujukan) baru.push(s.kode);
              return {
                kode: s.kode, label: s.label, judul: s.judul, grup: s.grup, tipe: s.tipe as "iku",
                varian: s.varian.map((v) => ({ instruksi: v.instruksi, jenjang: [jenjang], catatanTemplate: v.catatanTemplate })) as Prisma.InputJsonValue,
                berlakuUntuk: [jenjang], jenjangOverride: [], sumberInstruksi: "template",
                catatan: s.dariRujukan ? null : "Sub-bagian baru dari template (tidak ada padanan di versi sebelumnya); periksa judul dan kodenya.",
                urutan: i,
              };
            }),
          },
        },
      });
    }
  });
  return baru;
}

// ------------------------------------------------------------------ langkah 2 dan 3

async function langkahBobot(versi: { pedomanLokasi: string | null; halamanBobot: string | null }): Promise<ButirBobot[]> {
  if (!versi.pedomanLokasi || !versi.halamanBobot) return [];
  const { halaman } = await bacaHalamanPdf(await bacaBerkas(versi.pedomanLokasi), bacaRentangHalaman(versi.halamanBobot));
  const { butir } = bacaTabelBobot(halaman);
  if (butir.length === 0) throw new Error(`Tabel bobot tidak ditemukan di halaman ${versi.halamanBobot} Pedoman Penilaian. Periksa nomor halaman PDF.`);
  return butir;
}

async function simpanButir(versiId: string, jenjang: string, draf: ButirDraf[]) {
  const sub = await prisma.subBagian.findMany({ where: { bagian: { versiId } }, select: { id: true, kode: true } });
  const idSub = new Map(sub.map((s) => [s.kode, s.id]));
  await prisma.$transaction(async (tx) => {
    // idempoten: kelompok yang diulang menimpa butir bernomor sama
    await tx.butirPenilaian.deleteMany({ where: { versiId, jenjang, no: { in: [...new Set(draf.map((d) => d.no))] } } });
    for (const d of draf) {
      const b = await tx.butirPenilaian.create({
        data: {
          versiId, jenjang, kode: d.kode, no: d.no, sub: d.sub, urutan: d.urutan, bagianKode: d.bagianKode,
          elemen: d.elemen.slice(0, 500), indikator: d.indikator.slice(0, 2000), bobot: d.bobot, jenis: d.jenis,
          tabelLkps: d.tabelLkps, deskriptorSkor4: d.deskriptorSkor4, deskriptorSkor3: d.deskriptorSkor3, deskriptorSkor2: d.deskriptorSkor2,
          deskriptorSkor1: d.deskriptorSkor1, deskriptorSkor0: d.deskriptorSkor0, unsurSkor4: d.unsurSkor4, kodeRumus: d.kodeRumus,
          dikonfirmasi: false, usulanAi: d.usulanAi, catatan: d.catatan,
        },
      });
      const tautan = d.subBagian.map((k) => idSub.get(k)).filter((x): x is string => Boolean(x));
      if (tautan.length) await tx.butirSubBagian.createMany({ data: tautan.map((subBagianId) => ({ butirId: b.id, subBagianId })) });
    }
  });
}

async function jadwalkanSetelahReset(versiId: string): Promise<void> {
  const k = await prisma.kunciAPI.findFirst({ where: { status: "kuota_habis", habisSampai: { not: null } }, orderBy: { habisSampai: "asc" } });
  if (k?.habisSampai) await kirimTugas(ANTREAN.instrumen, { versiId }, { mulaiSetelah: new Date(k.habisSampai.getTime() + 60_000) });
}

/** Kerjakan ekstraksi satu versi. Mengembalikan status akhir (selesai, tertunda, gagal, dilewati). */
export async function prosesEkstraksiInstrumen(versiId: string): Promise<string> {
  const versi = await prisma.versiInstrumen.findUnique({ where: { id: versiId } });
  const awal = bacaInfoEkstraksi(versi?.ekstraksi) as Info | null;
  if (!versi || !awal || !["antre", "tertunda"].includes(awal.status)) return "dilewati";
  const jenjang = versi.jenjangUtama;
  if (!jenjang) return "dilewati";
  let info: Info = { ...awal, status: "berjalan", pesan: null };
  await simpanInfo(versiId, info);
  try {
    if (!info.langkah || info.langkah === "template") {
      const subBaru = await langkahTemplate(versi, jenjang);
      info = { ...info, langkah: "bobot", subBaru: [...(info.subBaru ?? []), ...subBaru] };
      await simpanInfo(versiId, info);
    }
    if (info.langkah === "bobot") {
      info = { ...info, langkah: "matriks", bobot: await langkahBobot(versi), kelompokSelesai: 0 };
      await simpanInfo(versiId, info);
    }
    if (!versi.matriksLokasi) throw new Error("Matriks Penilaian belum diunggah.");
    const { baris } = susunMatriks((await bacaHalamanPdf(await bacaBerkas(versi.matriksLokasi))).halaman);
    if (baris.length === 0) throw new Error("Tidak ada baris butir yang dikenali di Matriks Penilaian. Pastikan tabelnya berkolom No, Kriteria, Indikator, 4, 3, 2, 1, 0.");
    const kelompok = kelompokBaris(baris);
    const sub: SubPilihan[] = (await prisma.subBagian.findMany({
      where: { bagian: { versiId }, tipe: { in: ["iku", "narasi", "bersama"] } },
      orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }],
      include: { bagian: { select: { kode: true } } },
    })).filter((s) => s.bagian.kode !== "AWAL").map((s) => ({ kode: s.kode, bagianKode: s.bagian.kode, judul: s.judul, grup: s.grup }));
    const rumus: RumusPilihan[] = katalogRumus().map((r) => ({ kode: r.kode, judul: r.judul, rumus: r.rumus }));
    const bobot = info.bobot ?? [];
    // halaman PDF tiap nomor butir untuk halaman cek (PDF di samping tabel)
    const halamanButir = Object.fromEntries(baris.map((b) => [b.no, b.halaman]));
    info = { ...info, jumlahKelompok: kelompok.length, jumlahBaris: baris.length, halamanButir };
    for (let i = info.kelompokSelesai ?? 0; i < kelompok.length; i++) {
      let ai: ButirAi[];
      if (pakaiNarasiUji()) {
        ai = butirTanpaAi(kelompok[i]);
      } else {
        const { sistem, pengguna } = promptEkstraksi({ jenjang, baris: kelompok[i], bobot, sub, rumus });
        const r = await panggilTerstruktur({
          prodiId: null, proyekId: null, tugasId: null, subBagianKode: `instrumen:${versi.kode}:${i + 1}`,
          sistem, pengguna, skema: skemaEkstraksi, maksTokenKeluaran: 16384,
        });
        ai = r.keluaran.butir;
      }
      const urutanAwal = await prisma.butirPenilaian.count({ where: { versiId, jenjang, no: { lt: Number(kelompok[i][0].no) } } });
      await simpanButir(versiId, jenjang, gabungButir({ baris: kelompok[i], ai, bobot, sub, rumus, urutanAwal }));
      info = { ...info, kelompokSelesai: i + 1 };
      await simpanInfo(versiId, info);
    }
    const jumlahButir = await prisma.butirPenilaian.count({ where: { versiId, jenjang } });
    info = { ...info, status: "selesai", langkah: "selesai", jumlahButir, selesai: new Date().toISOString(), pesan: null };
    await prisma.versiInstrumen.update({ where: { id: versiId }, data: { status: "diekstrak", ekstraksi: info as unknown as Prisma.InputJsonValue } });
    await perbaruiLaporanTemplate(versiId).catch((e) => console.error(`[instrumen] laporan template ${versiId}:`, e instanceof Error ? e.message : e));
    return "selesai";
  } catch (e) {
    if (e instanceof GalatTanpaKunci) {
      await simpanInfo(versiId, { ...info, status: "tertunda", pesan: e.message.replace("Penyusunan", "Ekstraksi").replace("penyusunan", "ekstraksi") });
      await jadwalkanSetelahReset(versiId);
      return "tertunda";
    }
    if (e instanceof GalatSementara) {
      await simpanInfo(versiId, { ...info, status: "tertunda", pesan: "Layanan Gemini sedang membatasi permintaan. Ekstraksi dilanjutkan otomatis sebentar lagi." });
      await kirimTugas(ANTREAN.instrumen, { versiId }, { mulaiSetelah: new Date(Date.now() + Math.max(e.tungguMs, 30_000)) });
      return "tertunda";
    }
    const pesan = e instanceof Error ? e.message : String(e);
    console.error(`[instrumen] ${versiId}:`, pesan);
    await simpanInfo(versiId, { ...info, status: "gagal", pesan: pesan.slice(0, 500) });
    return "gagal";
  }
}

/** Saat worker mulai: ekstraksi yang terputus dikirim ulang. */
export async function pulihkanEkstraksiTerputus(): Promise<number> {
  const daftar = await prisma.versiInstrumen.findMany({ where: { status: "draf" }, select: { id: true, ekstraksi: true } });
  let n = 0;
  for (const v of daftar) {
    const info = bacaInfoEkstraksi(v.ekstraksi);
    if (info?.status !== "berjalan" && info?.status !== "antre") continue;
    await simpanInfo(v.id, { ...info, status: "antre" });
    await kirimTugas(ANTREAN.instrumen, { versiId: v.id });
    n++;
  }
  return n;
}

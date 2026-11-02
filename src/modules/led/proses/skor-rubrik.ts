import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/modules/bersama/db";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { GalatTanpaKunci } from "@/modules/bersama/data/kunci-api";
import { bacaDokumen, samarkanTeks } from "@/modules/led/domain/narasi";
import { perluNilaiUlang, teksPolos } from "@/modules/led/domain/review";
import { gantiLabelTS } from "@/modules/bersama/domain/tahun-akademik";
import { GalatSementara, panggilTerstruktur } from "@/modules/led/proses/llm-narasi";

/**
 * Usulan skor otomatis (revisi 31 Okt 2026, Pak Tris: "skor otomatis dari rubrik"). Untuk setiap butir narasi, narasi
 * aktif sub-bagian terkait (ButirSubBagian) disamarkan lalu dicocokkan LLM dengan indikator, deskriptor skor 0-4, dan
 * unsur skor 4. Butir angka tidak dinilai AI (skornya skor sistem dari LKPS). Butir yang usulannya masih sesuai versi
 * narasi aktif dilewati, jadi tugas yang berhenti karena kunci habis lanjut dari butir berikutnya.
 */

export const skemaUsulanSkor = z.object({
  skor: z.number().min(0).max(4),
  alasan: z.string(),
  unsurTerpenuhi: z.array(z.string()),
  unsurKurang: z.array(z.string()),
});
type KeluaranSkor = z.infer<typeof skemaUsulanSkor>;

const SISTEM = [
  "Anda asesor internal akreditasi LAM Teknik. Nilai SATU butir penilaian Laporan Evaluasi Diri berdasarkan narasi yang diberikan.",
  "Cocokkan isi narasi dengan deskriptor skor 0-4 dan unsur skor 4. Pilih skor (boleh desimal satu angka, 0 sampai 4) yang deskriptornya paling sesuai dengan bukti di narasi.",
  "Jangan menganggap ada bukti yang tidak tertulis di narasi. Klaim tanpa data, dokumen, atau contoh pelaksanaan dinilai lemah.",
  "Alasan ditulis dalam bahasa Indonesia baku, 2-4 kalimat, menyebut deskriptor yang dipilih.",
  "unsurTerpenuhi dan unsurKurang berisi unsur skor 4 (salin teks unsurnya) yang sudah dan belum didukung narasi.",
  "Jawab hanya JSON sesuai skema.",
].join("\n");

interface ButirRubrik {
  kode: string;
  elemen: string;
  indikator: string;
  deskriptor: (string | null)[];
  unsurSkor4: string[];
}

export function promptSkorRubrik(b: ButirRubrik, narasi: string, ts: number): string {
  const desk = b.deskriptor.map((d, i) => `- Skor ${i}: ${d ? gantiLabelTS(d, ts) : "(tidak tersedia di instrumen)"}`).join("\n");
  return [
    `## BUTIR ${b.kode}`,
    `Elemen: ${b.elemen}`,
    `Indikator: ${gantiLabelTS(b.indikator, ts)}`,
    "",
    "## DESKRIPTOR SKOR",
    desk,
    "",
    "## UNSUR SKOR 4",
    b.unsurSkor4.map((u) => `- ${u}`).join("\n") || "- (tidak ada)",
    "",
    "## NARASI LED",
    narasi || "(narasi kosong)",
  ].join("\n");
}

/** Keluaran mode uji (LLM_NARASI=uji): unsur dianggap terpenuhi bila kata kuncinya muncul di narasi. */
export function skorUji(b: ButirRubrik, narasi: string): KeluaranSkor {
  const teks = narasi.toLowerCase();
  const kata = (u: string) => u.toLowerCase().replace(/^\(\d+\)\s*/, "").split(/[^a-z0-9]+/).filter((k) => k.length >= 5);
  const terpenuhi = b.unsurSkor4.filter((u) => kata(u).some((k) => teks.includes(k)));
  const kurang = b.unsurSkor4.filter((u) => !terpenuhi.includes(u));
  const skor = !narasi.trim() ? 0 : b.unsurSkor4.length ? Math.round((1 + (3 * terpenuhi.length) / b.unsurSkor4.length) * 10) / 10 : 2;
  return { skor, alasan: `[Mode uji] ${terpenuhi.length} dari ${b.unsurSkor4.length} unsur skor 4 disebut di narasi.`, unsurTerpenuhi: terpenuhi, unsurKurang: kurang };
}

async function aturStatus(proyekId: string, status: string | null, pesan: string | null) {
  await prisma.proyekLED.update({ where: { id: proyekId }, data: { statusSkorRubrik: status, pesanSkorRubrik: pesan } });
}

/** Kerjakan usulan skor satu LED. Mengembalikan selesai, tertunda (kunci habis/batas per menit), gagal, atau dilewati. */
export async function prosesSkorRubrik(proyekId: string): Promise<string> {
  const klaim = await prisma.proyekLED.updateMany({
    where: { id: proyekId, statusSkorRubrik: { in: ["antre", "menunggu_kunci"] } },
    data: { statusSkorRubrik: "berjalan", pesanSkorRubrik: null },
  });
  if (!klaim.count) return "dilewati";
  try {
    const proyek = await prisma.proyekLED.findUniqueOrThrow({ where: { id: proyekId } });
    const [butir, draf, usulan] = await Promise.all([
      prisma.butirPenilaian.findMany({
        where: { versiId: proyek.versiId, jenjang: proyek.jenjang, jenis: { not: "angka" } },
        orderBy: { urutan: "asc" },
        include: { subBagian: { include: { subBagian: { select: { id: true, kode: true, label: true, judul: true } } } } },
      }),
      prisma.bagianDraf.findMany({ where: { proyekId, versiAktifId: { not: null } }, select: { subBagianId: true, versiAktifId: true } }),
      prisma.usulanSkor.findMany({ where: { proyekId } }),
    ]);
    const aktif = new Map(draf.map((d) => [d.subBagianId, d.versiAktifId!]));
    const lama = new Map(usulan.map((u) => [u.butirKode, u]));
    let dinilai = 0;
    for (const b of butir) {
      const sub = b.subBagian.map((x) => x.subBagian).filter((s) => aktif.has(s.id));
      if (!sub.length) continue; // belum ada narasi: tidak diberi usulan
      const versiIds = sub.map((s) => aktif.get(s.id)!);
      const u = lama.get(b.kode);
      if (u && !perluNilaiUlang(u.versiDrafIds as string[], versiIds)) continue;
      const versi = await prisma.versiDraf.findMany({ where: { id: { in: versiIds } }, select: { id: true, isi: true } });
      const isi = new Map(versi.map((v) => [v.id, teksPolos(bacaDokumen(v.isi))]));
      const narasi = samarkanTeks(sub.map((s) => `### ${`${s.label ?? ""} ${s.judul}`.trim()}\n${isi.get(aktif.get(s.id)!) ?? ""}`).join("\n\n"));
      const rubrik: ButirRubrik = {
        kode: b.kode, elemen: b.elemen, indikator: b.indikator, unsurSkor4: b.unsurSkor4,
        deskriptor: [b.deskriptorSkor0, b.deskriptorSkor1, b.deskriptorSkor2, b.deskriptorSkor3, b.deskriptorSkor4],
      };
      const r = await panggilTerstruktur<KeluaranSkor>({
        prodiId: proyek.prodiId, proyekId, tugasId: null, subBagianKode: `skor:${b.kode}`,
        sistem: SISTEM, pengguna: promptSkorRubrik(rubrik, narasi, proyek.tsTahunMulai), skema: skemaUsulanSkor,
        keluaranUji: () => skorUji(rubrik, narasi),
      });
      const skor = Math.min(4, Math.max(0, Math.round(r.keluaran.skor * 100) / 100));
      const data = {
        skor, alasan: r.keluaran.alasan.slice(0, 2000), model: r.model,
        unsurTerpenuhi: r.keluaran.unsurTerpenuhi as Prisma.InputJsonValue, unsurKurang: r.keluaran.unsurKurang as Prisma.InputJsonValue,
        versiDrafIds: versiIds as Prisma.InputJsonValue, dibuatPada: new Date(),
      };
      await prisma.usulanSkor.upsert({ where: { proyekId_butirKode: { proyekId, butirKode: b.kode } }, create: { proyekId, butirKode: b.kode, ...data }, update: data });
      dinilai++;
      await prisma.proyekLED.update({ where: { id: proyekId }, data: { pesanSkorRubrik: `${dinilai} butir dinilai` } });
    }
    await aturStatus(proyekId, null, null);
    return "selesai";
  } catch (e) {
    if (e instanceof GalatTanpaKunci) {
      // dilanjutkan otomatis setelah Admin UPPS menambah kunci (antreUlangTugasTertunda)
      await aturStatus(proyekId, "menunggu_kunci", e.message.replace("Penyusunan", "Penghitungan usulan skor").replace("penyusunan", "penghitungan usulan skor"));
      return "tertunda";
    }
    if (e instanceof GalatSementara) {
      await aturStatus(proyekId, "antre", "Layanan Gemini sedang membatasi permintaan. Dilanjutkan otomatis sebentar lagi.");
      await kirimTugas(ANTREAN.skorRubrik, { proyekId }, { mulaiSetelah: new Date(Date.now() + Math.max(e.tungguMs, 30_000)) });
      return "tertunda";
    }
    const pesan = e instanceof Error ? e.message : String(e);
    console.error(`[skor-rubrik] ${proyekId}:`, pesan);
    await aturStatus(proyekId, "gagal", pesan.slice(0, 500));
    return "gagal";
  }
}

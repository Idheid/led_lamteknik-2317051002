import { prisma } from "@/modules/bersama/db";
import { bacaBerkas } from "@/modules/bersama/penyimpanan";
import { modelEmbeddingAktif, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { VERSI_KEPALA } from "@/modules/led/domain/kepala-potongan";
import type { HalamanTeks } from "@/modules/led/domain/ocr";
import { embedLiteral, ekstrakTeks, kepalaPotongan } from "@/modules/led/proses/dokumen";

/**
 * Rencana 10 Nov T4: "Indeks ulang potongan". Potongan lama (tanpa kepala, versi kepala lama, atau tanpa
 * embeddingKonteks) diberi kepala konteks dan embedding berkepala. Baris diperbarui di tempat: ID potongan, teks, dan
 * embedding lama tidak berubah (label data uji T2 berbasis ID; konfigurasi A-lama tetap bisa dijalankan).
 * Teks halaman untuk mendeteksi judul bagian dibaca ulang dari berkas (tanpa AI); halaman OCR memakai Dokumen.halamanTeks.
 */

export const UKURAN_BATCH_INDEKS = 100;

/** Potongan model embedding aktif yang perlu diindeks ulang. */
export async function hitungPerluIndeksUlang(): Promise<{ potongan: number; dokumen: number; permintaan: number }> {
  const model = await modelEmbeddingAktif();
  const [r] = await prisma.$queryRaw<{ potongan: bigint; dokumen: bigint }[]>`
    SELECT count(*) AS "potongan", count(DISTINCT "dokumenId") AS "dokumen" FROM "Potongan"
    WHERE "modelEmbedding" = ${model} AND ("versiKepala" IS DISTINCT FROM ${VERSI_KEPALA} OR "embeddingKonteks" IS NULL)`;
  const potongan = Number(r?.potongan ?? 0);
  return { potongan, dokumen: Number(r?.dokumen ?? 0), permintaan: Math.ceil(potongan / UKURAN_BATCH_INDEKS) };
}

async function halamanDokumen(d: { jenis: string; lokasi: string; halamanTeks: unknown }): Promise<string[]> {
  const ocr = d.halamanTeks as HalamanTeks[] | null;
  if (ocr?.length) return ocr.map((h) => h.teks);
  try {
    return (await ekstrakTeks(d.jenis, await bacaBerkas(d.lokasi))).halaman;
  } catch {
    return []; // berkas hilang/rusak: kepala tanpa judul bagian
  }
}

export async function prosesIndeksUlang(tugasId: string): Promise<string> {
  const tugas = await prisma.tugasIndeksUlang.findUnique({ where: { id: tugasId } });
  if (!tugas || tugas.status === "selesai") return "dilewati";
  const model = await modelEmbeddingAktif();
  const perlu = await hitungPerluIndeksUlang();
  await prisma.tugasIndeksUlang.update({ where: { id: tugasId }, data: { status: "berjalan", total: perlu.potongan, selesai: 0, pesan: null } });
  try {
    const { penyedia } = await penyediaEmbedding();
    const dokumenIds = (await prisma.$queryRaw<{ dokumenId: string }[]>`
      SELECT DISTINCT "dokumenId" FROM "Potongan"
      WHERE "modelEmbedding" = ${model} AND ("versiKepala" IS DISTINCT FROM ${VERSI_KEPALA} OR "embeddingKonteks" IS NULL)`).map((x) => x.dokumenId);
    let selesai = 0;
    let permintaan = 0;
    // kumpulkan sampai ±100 teks lalu kirim satu permintaan embedding
    let antre: { id: string; kepala: string; teksIndeks: string }[] = [];
    const kirim = async () => {
      if (antre.length === 0) return;
      const { peta, permintaan: n } = await embedLiteral(penyedia, antre.map((x) => x.teksIndeks));
      permintaan += n;
      await prisma.$transaction(antre.map((x) => prisma.$executeRaw`
        UPDATE "Potongan" SET "kepala" = ${x.kepala}, "teksIndeks" = ${x.teksIndeks}, "versiKepala" = ${VERSI_KEPALA},
          "embeddingKonteks" = ${peta.get(x.teksIndeks)!}::vector
        WHERE "id" = ${x.id}`));
      selesai += antre.length;
      antre = [];
      await prisma.tugasIndeksUlang.update({ where: { id: tugasId }, data: { selesai, permintaan } });
    };
    for (const dokumenId of dokumenIds) {
      const d = await prisma.dokumen.findUnique({ where: { id: dokumenId }, include: { dokumenDiharapkan: { select: { nama: true } } } });
      if (!d) continue;
      const potongan = await prisma.potongan.findMany({
        where: { dokumenId, modelEmbedding: model },
        select: { id: true, teks: true, halaman: true },
        orderBy: { urutan: "asc" },
      });
      const halaman = await halamanDokumen(d);
      const kepala = kepalaPotongan({ judul: d.judul, namaBerkas: d.namaBerkas, jenisDiharapkan: d.dokumenDiharapkan?.nama ?? null }, halaman, potongan);
      const perlu = new Set((await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Potongan" WHERE "dokumenId" = ${dokumenId} AND "modelEmbedding" = ${model}
          AND ("versiKepala" IS DISTINCT FROM ${VERSI_KEPALA} OR "embeddingKonteks" IS NULL)`).map((x) => x.id));
      for (const [i, p] of potongan.entries()) {
        if (!perlu.has(p.id)) continue;
        antre.push({ id: p.id, ...kepala[i] });
        if (antre.length >= UKURAN_BATCH_INDEKS) await kirim();
      }
    }
    await kirim();
    await prisma.tugasIndeksUlang.update({ where: { id: tugasId }, data: { status: "selesai", selesai, permintaan, selesaiPada: new Date() } });
    return `selesai ${selesai} potongan, ${permintaan} permintaan embedding`;
  } catch (e) {
    await prisma.tugasIndeksUlang.update({
      where: { id: tugasId },
      data: { status: "gagal", pesan: e instanceof Error ? e.message.slice(0, 500) : String(e), selesaiPada: new Date() },
    });
    return "gagal";
  }
}

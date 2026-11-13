import { randomUUID } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { prisma } from "@/modules/bersama/db";
import { bacaBerkas } from "@/modules/bersama/penyimpanan";
import { potongTeks } from "@/modules/led/domain/potong-teks";
import { literalVektor } from "@/modules/bersama/llm/embedding";
import { catatGalatKunci, GalatTanpaKunci, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import type { Prisma } from "@/generated/prisma/client";
import { halamanPindaian, ocrHalamanPdf, VERSI_OCR } from "@/modules/led/ekstraksi/ocr";
import { gabungHalaman, keyakinanPotongan, type HalamanTeks } from "@/modules/led/domain/ocr";

/**
 * F-11: proses satu dokumen pendukung: ekstraksi teks (unpdf untuk PDF, mammoth untuk DOCX), pemotongan
 * 800–1.200 karakter dengan tumpang tindih 15%, embedding 768 dimensi, simpan ke Potongan (vector + tsvector).
 * Gambar tidak diindeks teks (disimpan utuh untuk disisipkan ke narasi, F-12).
 * Status: diunggah → diproses → siap | gagal | menunggu_kunci.
 * Rencana 10 Nov T3: halaman PDF tanpa teks (< 50 huruf/angka) dibaca dengan OCR lokal (ekstraksi/ocr.ts); teks per
 * halaman disimpan di Dokumen.halamanTeks supaya bisa dikoreksi tanpa OCR ulang, dan potongan diberi sumberTeks/keyakinan.
 * Potongan yang teksnya sama dengan potongan lama dokumen ini memakai ulang ID dan vektornya (label data uji T2
 * berbasis ID potongan; vektor yang sama tidak di-embedding ulang).
 */

const UKURAN_BATCH = 50;

export async function ekstrakTeks(jenis: string, isi: Buffer): Promise<{ halaman: string[]; adaHalaman: boolean }> {
  if (jenis === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(isi));
    const { text } = await extractText(pdf, { mergePages: false });
    return { halaman: Array.isArray(text) ? text : [text], adaHalaman: true };
  }
  if (jenis === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: isi });
    return { halaman: [value], adaHalaman: false };
  }
  return { halaman: [], adaHalaman: false };
}

export async function prosesDokumen(dokumenId: string): Promise<void> {
  const dok = await prisma.dokumen.findUnique({ where: { id: dokumenId }, });
  if (!dok) return;
  if (dok.jenis === "gambar") {
    await prisma.dokumen.update({
      where: { id: dokumenId },
      data: { status: "siap", pesan: null, jumlahPotongan: 0, diprosesPada: new Date() },
    });
    return;
  }
  await prisma.dokumen.update({ where: { id: dokumenId }, data: { status: "diproses", pesan: null } });

  let kunciId: string | null = null;
  try {
    const isi = await bacaBerkas(dok.lokasi);
    const ekstrak = await ekstrakTeks(dok.jenis, isi);
    const { adaHalaman } = ekstrak;
    let halaman = ekstrak.halaman;
    let halamanTeks: HalamanTeks[] | null = null;
    const lama = (dok.halamanTeks ?? null) as HalamanTeks[] | null;
    if (dok.jenis === "pdf") {
      const dikoreksi = new Set((lama ?? []).filter((h) => h.dikoreksi).map((h) => h.halaman));
      const pindaian = halamanPindaian(halaman).filter((n) => !dikoreksi.has(n));
      const ocr = pindaian.length === 0 ? [] : await ocrHalamanPdf(isi, pindaian, (selesai, total) => prisma.dokumen.update({
        where: { id: dokumenId },
        data: { pesan: `Membaca teks pindaian (OCR): halaman ${selesai} dari ${total}` },
      }).then(() => undefined));
      if (pindaian.length > 0 || dikoreksi.size > 0) {
        halamanTeks = gabungHalaman(halaman, ocr, lama ?? []);
        halaman = halamanTeks.map((h) => h.teks);
      }
    }
    const potongan = potongTeks(halaman, undefined, adaHalaman);
    if (potongan.length === 0) {
      await prisma.dokumen.update({
        where: { id: dokumenId },
        data: {
          status: "gagal",
          pesan: halamanTeks
            ? "Tidak ada teks yang bisa dibaca, termasuk dengan OCR. Periksa kualitas pindaian (minimal 200 dpi, tidak miring) lalu unggah ulang."
            : "Tidak ada teks yang bisa dibaca.",
          halamanTeks: (halamanTeks ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
          versiOcr: halamanTeks ? VERSI_OCR : null,
          diprosesPada: new Date(),
        },
      });
      return;
    }
    const terpilih = await penyediaEmbedding();
    kunciId = terpilih.kunciId;
    const model = terpilih.penyedia.model;
    // potongan lama dengan teks dan model sama: ID dan vektor dipakai ulang
    const lamaPotongan = await prisma.$queryRaw<{ id: string; teks: string; vektor: string | null }[]>`
      SELECT "id", "teks", "embedding"::text AS "vektor" FROM "Potongan"
      WHERE "dokumenId" = ${dokumenId} AND "modelEmbedding" = ${model}`;
    const pakaiUlang = new Map<string, { id: string; vektor: string }>();
    for (const x of lamaPotongan) if (x.vektor && !pakaiUlang.has(x.teks)) pakaiUlang.set(x.teks, { id: x.id, vektor: x.vektor });
    const baru = potongan.filter((p) => !pakaiUlang.has(p.teks));
    const vektorBaru = new Map<string, string>();
    for (let i = 0; i < baru.length; i += UKURAN_BATCH) {
      const kelompok = baru.slice(i, i + UKURAN_BATCH);
      const v = await terpilih.penyedia.embedDokumen(kelompok.map((p) => p.teks));
      kelompok.forEach((p, j) => vektorBaru.set(p.teks, literalVektor(v[j])));
    }
    const dipakai = new Set<string>();
    await prisma.$transaction(async (tx) => {
      await tx.potongan.deleteMany({ where: { dokumenId } });
      for (const [i, p] of potongan.entries()) {
        const ulang = pakaiUlang.get(p.teks);
        const id = ulang && !dipakai.has(ulang.id) ? ulang.id : randomUUID();
        dipakai.add(id);
        const vektor = ulang?.vektor ?? vektorBaru.get(p.teks)!;
        const asal = halamanTeks ? keyakinanPotongan(p.halaman, potongan[i + 1]?.halaman ?? p.halaman, halamanTeks) : { sumber: "teks" as const, keyakinan: null };
        await tx.$executeRaw`
          INSERT INTO "Potongan" ("id", "dokumenId", "urutan", "teks", "halaman", "sumberTeks", "keyakinanOcr", "modelEmbedding", "embedding")
          VALUES (${id}, ${dokumenId}, ${p.urutan}, ${p.teks}, ${p.halaman}, ${asal.sumber}, ${asal.keyakinan}, ${model},
                  ${vektor}::vector)`;
      }
      await tx.dokumen.update({
        where: { id: dokumenId },
        data: {
          status: "siap", pesan: null, jumlahPotongan: potongan.length, diprosesPada: new Date(),
          halamanTeks: (halamanTeks ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
          versiOcr: halamanTeks ? VERSI_OCR : null,
        },
      });
    }, { timeout: 120_000 });
  } catch (e) {
    if (e instanceof GalatTanpaKunci) {
      await prisma.dokumen.update({ where: { id: dokumenId }, data: { status: "menunggu_kunci", pesan: e.message } });
      return;
    }
    if (kunciId) {
      const jenis = await catatGalatKunci(kunciId, e);
      if (jenis === "kuota_harian" || jenis === "tidak_valid") {
        await prisma.dokumen.update({
          where: { id: dokumenId },
          data: {
            status: "menunggu_kunci",
            pesan: jenis === "kuota_harian"
              ? "Kuota kunci API habis. Dokumen akan diproses lagi setelah kunci baru ditambahkan atau kuota direset."
              : "Kunci API ditolak Google. Ganti kunci di menu Kunci API.",
          },
        });
        return;
      }
      if (jenis === "batas_per_menit" || jenis === "sementara") throw e; // diulang otomatis oleh antrean
    }
    await prisma.dokumen.update({
      where: { id: dokumenId },
      data: { status: "gagal", pesan: `Gagal memproses dokumen: ${e instanceof Error ? e.message : String(e)}`, diprosesPada: new Date() },
    });
  }
}

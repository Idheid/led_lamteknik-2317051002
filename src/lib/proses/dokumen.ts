import { randomUUID } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { prisma } from "@/lib/db";
import { bacaBerkas } from "@/lib/penyimpanan";
import { potongTeks } from "@/lib/domain/potong-teks";
import { literalVektor } from "@/lib/llm/embedding";
import { catatGalatKunci, GalatTanpaKunci, penyediaEmbedding } from "@/lib/data/kunci-api";

/**
 * F-11: proses satu dokumen pendukung: ekstraksi teks (unpdf untuk PDF, mammoth untuk DOCX), pemotongan
 * 800–1.200 karakter dengan tumpang tindih 15%, embedding 768 dimensi, simpan ke Potongan (vector + tsvector).
 * Gambar tidak diindeks teks (disimpan utuh untuk disisipkan ke narasi, F-12).
 * Status: diunggah → diproses → siap | gagal | menunggu_kunci.
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
    const { halaman, adaHalaman } = await ekstrakTeks(dok.jenis, await bacaBerkas(dok.lokasi));
    const potongan = potongTeks(halaman, undefined, adaHalaman);
    if (potongan.length === 0) {
      await prisma.dokumen.update({
        where: { id: dokumenId },
        data: {
          status: "gagal",
          pesan: "Tidak ada teks yang bisa dibaca. Bila PDF hasil pindai, unggah versi PDF yang berisi teks.",
          diprosesPada: new Date(),
        },
      });
      return;
    }
    const terpilih = await penyediaEmbedding();
    kunciId = terpilih.kunciId;
    const vektor: number[][] = [];
    for (let i = 0; i < potongan.length; i += UKURAN_BATCH) {
      vektor.push(...(await terpilih.penyedia.embedDokumen(potongan.slice(i, i + UKURAN_BATCH).map((p) => p.teks))));
    }
    await prisma.$transaction(async (tx) => {
      await tx.potongan.deleteMany({ where: { dokumenId } });
      for (const [i, p] of potongan.entries()) {
        await tx.$executeRaw`
          INSERT INTO "Potongan" ("id", "dokumenId", "urutan", "teks", "halaman", "modelEmbedding", "embedding")
          VALUES (${randomUUID()}, ${dokumenId}, ${p.urutan}, ${p.teks}, ${p.halaman}, ${terpilih.penyedia.model},
                  ${literalVektor(vektor[i])}::vector)`;
      }
      await tx.dokumen.update({
        where: { id: dokumenId },
        data: { status: "siap", pesan: null, jumlahPotongan: potongan.length, diprosesPada: new Date() },
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

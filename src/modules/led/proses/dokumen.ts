import { randomUUID } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { prisma } from "@/modules/bersama/db";
import { bacaBerkas } from "@/modules/bersama/penyimpanan";
import { potongTeks } from "@/modules/led/domain/potong-teks";
import { literalVektor } from "@/modules/bersama/llm/embedding";
import { catatGalatKunci, GalatTanpaKunci, modelEmbeddingAktif, penyediaEmbedding } from "@/modules/bersama/data/kunci-api";
import { versiPemrosesan } from "@/modules/led/domain/versi-pemrosesan";
import type { Prisma } from "@/generated/prisma/client";
import { halamanPindaian, ocrHalamanPdf, VERSI_OCR } from "@/modules/led/ekstraksi/ocr";
import { gabungHalaman, keyakinanPotongan, type HalamanTeks } from "@/modules/led/domain/ocr";
import { bagianTerdekat, namaDokumenKepala, susunKepala, teksIndeks, VERSI_KEPALA } from "@/modules/led/domain/kepala-potongan";

/**
 * F-11: proses satu dokumen pendukung: ekstraksi teks (unpdf untuk PDF, mammoth untuk DOCX), pemotongan
 * 800–1.200 karakter dengan tumpang tindih 15%, embedding 768 dimensi, simpan ke Potongan (vector + tsvector).
 * Gambar tidak diindeks teks (disimpan utuh untuk disisipkan ke narasi, F-12).
 * Status: diunggah → diproses → siap | gagal | menunggu_kunci.
 * Rencana 10 Nov T3: halaman PDF tanpa teks (< 50 huruf/angka) dibaca dengan OCR lokal (ekstraksi/ocr.ts); teks per
 * halaman disimpan di Dokumen.halamanTeks supaya bisa dikoreksi tanpa OCR ulang, dan potongan diberi sumberTeks/keyakinan.
 * Potongan yang teksnya sama dengan potongan lama dokumen ini memakai ulang ID dan vektornya (label data uji T2
 * berbasis ID potongan; vektor yang sama tidak di-embedding ulang).
 * Rencana 10 Nov T4: setiap potongan diberi kepala konteks (domain/kepala-potongan.ts); `embedding` dari teks saja
 * (konfigurasi A-lama) dan `embeddingKonteks` dari kepala + teks. Keduanya dikirim dalam batch 100 yang sama.
 * Rencana 10 Nov T9: berkas yang sama (hash) yang sudah diproses dengan versi pemrosesan yang sama dipakai ulang:
 * potongan dan vektornya disalin (ID baru), tanpa ekstraksi ulang, OCR ulang, maupun embedding ulang. Kepala disusun
 * dari judul dokumen baru; hanya bila berbeda, `embeddingKonteks` dibuat ulang. Penyalinan hanya di server.
 */

export const PESAN_PAKAI_ULANG = "Memakai hasil pemrosesan berkas yang sama";

interface PotonganSumber {
  urutan: number;
  teks: string;
  halaman: number | null;
  sumberTeks: string;
  keyakinanOcr: number | null;
  teksIndeks: string | null;
  vektor: string | null;
  vektorKonteks: string | null;
}

/**
 * Salin hasil pemrosesan dokumen sumber (hash dan versi pemrosesan sama). Mengembalikan false bila sumber tidak bisa
 * dipakai (potongan tanpa vektor), sehingga dokumen diproses penuh.
 */
async function pakaiUlangPemrosesan(
  dok: { id: string; jenis: string; lokasi: string; judul: string | null; namaBerkas: string; dokumenDiharapkan: { nama: string } | null },
  sumber: { id: string; halamanTeks: unknown; versiOcr: string | null },
  versi: string,
  model: string,
  catatKunci: (id: string | null) => void,
): Promise<boolean> {
  const potongan = await prisma.$queryRaw<PotonganSumber[]>`
    SELECT "urutan", "teks", "halaman", "sumberTeks", "keyakinanOcr", "teksIndeks",
           "embedding"::text AS "vektor", "embeddingKonteks"::text AS "vektorKonteks"
    FROM "Potongan" WHERE "dokumenId" = ${sumber.id} AND "modelEmbedding" = ${model} ORDER BY "urutan"`;
  if (potongan.length === 0 || potongan.some((p) => !p.vektor || !p.vektorKonteks)) return false;
  // teks halaman untuk kepala: hasil OCR sumber bila ada, selain itu ekstraksi lapisan teks (tanpa AI, tanpa OCR)
  const halamanSumber = Array.isArray(sumber.halamanTeks) ? (sumber.halamanTeks as HalamanTeks[]).map((h) => h.teks) : null;
  const halaman = halamanSumber ?? (await ekstrakTeks(dok.jenis, await bacaBerkas(dok.lokasi))).halaman;
  const kepala = kepalaPotongan({ judul: dok.judul, namaBerkas: dok.namaBerkas, jenisDiharapkan: dok.dokumenDiharapkan?.nama ?? null }, halaman, potongan);
  const berbeda = kepala.filter((k, i) => k.teksIndeks !== potongan[i].teksIndeks).map((k) => k.teksIndeks);
  let vektorBaru = new Map<string, string>();
  if (berbeda.length > 0) {
    const terpilih = await penyediaEmbedding();
    catatKunci(terpilih.kunciId);
    if (terpilih.penyedia.model !== model) return false;
    vektorBaru = (await embedLiteral(terpilih.penyedia, berbeda)).peta;
  }
  await prisma.$transaction(async (tx) => {
    await tx.potongan.deleteMany({ where: { dokumenId: dok.id } });
    for (const [i, p] of potongan.entries()) {
      const k = kepala[i];
      const vektorKonteks = k.teksIndeks === p.teksIndeks ? p.vektorKonteks! : vektorBaru.get(k.teksIndeks)!;
      await tx.$executeRaw`
        INSERT INTO "Potongan" ("id", "dokumenId", "urutan", "teks", "halaman", "sumberTeks", "keyakinanOcr", "modelEmbedding", "embedding",
                                "kepala", "teksIndeks", "versiKepala", "embeddingKonteks")
        VALUES (${randomUUID()}, ${dok.id}, ${p.urutan}, ${p.teks}, ${p.halaman}, ${p.sumberTeks}, ${p.keyakinanOcr}, ${model},
                ${p.vektor}::vector, ${k.kepala}, ${k.teksIndeks}, ${VERSI_KEPALA}, ${vektorKonteks}::vector)`;
    }
    await tx.dokumen.update({
      where: { id: dok.id },
      data: {
        status: "siap", pesan: PESAN_PAKAI_ULANG, jumlahPotongan: potongan.length, diprosesPada: new Date(),
        halamanTeks: (sumber.halamanTeks ?? undefined) as Prisma.InputJsonValue | undefined,
        versiOcr: sumber.versiOcr, versiPemrosesan: versi, dokumenSumberPakaiUlangId: sumber.id,
      },
    });
  }, { timeout: 120_000 });
  return true;
}

/** Kepala dan teks berkepala setiap potongan dokumen. */
export function kepalaPotongan(
  dok: { judul: string | null; namaBerkas: string; jenisDiharapkan: string | null },
  halaman: string[],
  potongan: { teks: string; halaman: number | null }[],
): { kepala: string; teksIndeks: string }[] {
  const nama = namaDokumenKepala(dok.judul, dok.namaBerkas);
  return potongan.map((p) => {
    const teksHalaman = p.halaman ? halaman[p.halaman - 1] : halaman.length === 1 ? halaman[0] : null;
    const kepala = susunKepala({ dokumen: nama, jenis: dok.jenisDiharapkan, halaman: p.halaman, bagian: bagianTerdekat(teksHalaman, p.teks) });
    return { kepala, teksIndeks: teksIndeks(kepala, p.teks) };
  });
}

/** Embedding banyak teks dalam batch 100; mengembalikan literal vektor per teks (teks sama dikirim sekali). */
export async function embedLiteral(
  penyedia: { embedDokumen(t: string[]): Promise<number[][]> },
  teks: string[],
): Promise<{ peta: Map<string, string>; permintaan: number }> {
  const unik = [...new Set(teks)];
  const peta = new Map<string, string>();
  let permintaan = 0;
  for (let i = 0; i < unik.length; i += UKURAN_BATCH) {
    const kelompok = unik.slice(i, i + UKURAN_BATCH);
    const v = await penyedia.embedDokumen(kelompok);
    permintaan++;
    kelompok.forEach((t, j) => peta.set(t, literalVektor(v[j])));
  }
  return { peta, permintaan };
}

// Rencana 10 Nov T4: batch 100 teks per permintaan embedding (batas embedMany Gemini)
const UKURAN_BATCH = 100;

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
  const dok = await prisma.dokumen.findUnique({ where: { id: dokumenId }, include: { dokumenDiharapkan: { select: { nama: true } } } });
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
    // Rencana 10 Nov T9: berkas yang sama sudah pernah diproses dengan versi yang sama → salin hasilnya
    const modelAktif = await modelEmbeddingAktif();
    const versi = versiPemrosesan(modelAktif, VERSI_OCR);
    const adaKoreksi = Array.isArray(dok.halamanTeks) && (dok.halamanTeks as unknown as HalamanTeks[]).some((h) => h.dikoreksi);
    if (dok.hash && !adaKoreksi) {
      const sumber = await prisma.dokumen.findFirst({
        where: { hash: dok.hash, status: "siap", versiPemrosesan: versi, jumlahPotongan: { gt: 0 }, NOT: { id: dok.id } },
        orderBy: { diprosesPada: "desc" },
        select: { id: true, halamanTeks: true, versiOcr: true },
      });
      if (sumber && await pakaiUlangPemrosesan(dok, sumber, versi, modelAktif, (id) => { kunciId = id; })) return;
    }
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
    const kepala = kepalaPotongan(
      { judul: dok.judul, namaBerkas: dok.namaBerkas, jenisDiharapkan: dok.dokumenDiharapkan?.nama ?? null },
      halaman,
      potongan,
    );
    // potongan lama dengan teks dan model sama: ID dan vektor dipakai ulang
    const lamaPotongan = await prisma.$queryRaw<{ id: string; teks: string; teksIndeks: string | null; vektor: string | null; vektorKonteks: string | null }[]>`
      SELECT "id", "teks", "teksIndeks", "embedding"::text AS "vektor", "embeddingKonteks"::text AS "vektorKonteks" FROM "Potongan"
      WHERE "dokumenId" = ${dokumenId} AND "modelEmbedding" = ${model}`;
    const pakaiUlang = new Map<string, { id: string; vektor: string }>();
    const konteksLama = new Map<string, string>();
    for (const x of lamaPotongan) {
      if (x.vektor && !pakaiUlang.has(x.teks)) pakaiUlang.set(x.teks, { id: x.id, vektor: x.vektor });
      if (x.teksIndeks && x.vektorKonteks) konteksLama.set(x.teksIndeks, x.vektorKonteks);
    }
    const { peta: vektorBaru } = await embedLiteral(terpilih.penyedia, [
      ...potongan.filter((p) => !pakaiUlang.has(p.teks)).map((p) => p.teks),
      ...kepala.filter((k) => !konteksLama.has(k.teksIndeks)).map((k) => k.teksIndeks),
    ]);
    const dipakai = new Set<string>();
    await prisma.$transaction(async (tx) => {
      await tx.potongan.deleteMany({ where: { dokumenId } });
      for (const [i, p] of potongan.entries()) {
        const ulang = pakaiUlang.get(p.teks);
        const id = ulang && !dipakai.has(ulang.id) ? ulang.id : randomUUID();
        dipakai.add(id);
        const vektor = ulang?.vektor ?? vektorBaru.get(p.teks)!;
        const asal = halamanTeks ? keyakinanPotongan(p.halaman, potongan[i + 1]?.halaman ?? p.halaman, halamanTeks) : { sumber: "teks" as const, keyakinan: null };
        const k = kepala[i];
        const vektorKonteks = konteksLama.get(k.teksIndeks) ?? vektorBaru.get(k.teksIndeks)!;
        await tx.$executeRaw`
          INSERT INTO "Potongan" ("id", "dokumenId", "urutan", "teks", "halaman", "sumberTeks", "keyakinanOcr", "modelEmbedding", "embedding",
                                  "kepala", "teksIndeks", "versiKepala", "embeddingKonteks")
          VALUES (${id}, ${dokumenId}, ${p.urutan}, ${p.teks}, ${p.halaman}, ${asal.sumber}, ${asal.keyakinan}, ${model},
                  ${vektor}::vector, ${k.kepala}, ${k.teksIndeks}, ${VERSI_KEPALA}, ${vektorKonteks}::vector)`;
      }
      await tx.dokumen.update({
        where: { id: dokumenId },
        data: {
          status: "siap", pesan: null, jumlahPotongan: potongan.length, diprosesPada: new Date(),
          halamanTeks: (halamanTeks ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
          versiOcr: halamanTeks ? VERSI_OCR : null,
          versiPemrosesan: versiPemrosesan(model, VERSI_OCR), dokumenSumberPakaiUlangId: null,
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

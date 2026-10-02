import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { bacaBerkas } from "@/lib/penyimpanan";
import { bacaLkpsXlsx } from "@/lib/lkps/baca-xlsx";
import { bacaLkpsPdf } from "@/lib/lkps/baca-pdf";
import type { HasilBacaLkps, MasalahLkps } from "@/lib/lkps/jenis";
import { formatTahunAkademik } from "@/lib/domain/tahun-akademik";

/**
 * F-08/F-09: baca berkas LKPS yang sudah diunggah, simpan tabelnya ke TabelLKPS, dan jadikan berkas aktif
 * (sumber metrik) bila terbaca. Dijalankan worker (antrean "baca-lkps").
 */
export async function prosesBerkasLkps(berkasId: string): Promise<void> {
  const berkas = await prisma.berkasLKPS.findUnique({ where: { id: berkasId }, include: { proyek: true } });
  if (!berkas) return;
  await prisma.berkasLKPS.update({ where: { id: berkasId }, data: { status: "diproses", pesan: null } });

  let hasil: HasilBacaLkps;
  try {
    const isi = await bacaBerkas(berkas.lokasi);
    hasil = berkas.jenis === "pdf" ? await bacaLkpsPdf(isi, berkas.proyek.jenjang) : await bacaLkpsXlsx(isi, berkas.proyek.jenjang);
  } catch (e) {
    await prisma.berkasLKPS.update({
      where: { id: berkasId },
      data: { status: "gagal", pesan: `Berkas tidak bisa dibaca: ${e instanceof Error ? e.message : String(e)}`, diprosesPada: new Date() },
    });
    return;
  }

  const masalah: MasalahLkps[] = [...hasil.masalah];
  // TS di sheet Menu harus sama dengan TS proyek (31/08 tahun akhir TS)
  const tsProyek = `${berkas.proyek.tsTahunMulai + 1}-08-31`;
  if (hasil.identitas.tanggalTs && hasil.identitas.tanggalTs !== tsProyek) {
    masalah.unshift({
      tingkat: "peringatan",
      sheet: "Menu",
      pesan: `TS di LKPS (${hasil.identitas.tanggalTs.split("-").reverse().join("/")}) berbeda dengan TS proyek ` +
        `${formatTahunAkademik(berkas.proyek.tsTahunMulai)} (31/08/${berkas.proyek.tsTahunMulai + 1}). Periksa tahun TS.`,
    });
  }

  const terbaca = hasil.tabel.length > 0;
  await prisma.$transaction(async (tx) => {
    await tx.tabelLKPS.deleteMany({ where: { berkasId } });
    await tx.tabelLKPS.createMany({
      data: hasil.tabel.map((t, i) => ({
        berkasId,
        kode: t.kode ?? t.sheet,
        sheet: t.sheet,
        judul: t.judul,
        blok: t.blok,
        kolom: t.kolom as unknown as Prisma.InputJsonValue,
        kolomRumus: t.kolomRumus,
        baris: t.baris as unknown as Prisma.InputJsonValue,
        perluDicek: berkas.jenis === "pdf",
        urutan: i,
      })),
    });
    if (terbaca) await tx.berkasLKPS.updateMany({ where: { proyekId: berkas.proyekId, NOT: { id: berkasId } }, data: { aktif: false } });
    await tx.berkasLKPS.update({
      where: { id: berkasId },
      data: {
        status: terbaca ? "dibaca" : "gagal",
        aktif: terbaca,
        pesan: terbaca ? null : masalah.find((m) => m.tingkat === "galat")?.pesan ?? "Tidak ada tabel yang terbaca.",
        masalah: masalah as unknown as Prisma.InputJsonValue,
        identitas: hasil.identitas as unknown as Prisma.InputJsonValue,
        diprosesPada: new Date(),
      },
    });
  });
}

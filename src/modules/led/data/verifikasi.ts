import { z } from "zod";
import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, type Pengguna, pastikanPeran } from "@/modules/bersama/akses";
import { ambilProyekUbah } from "@/modules/led/data/proyek";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { bacaDokumen, paragrafBersumber, type RujukanPeriksa } from "@/modules/led/domain/narasi";
import { kunciKalimat, pecahKalimat, periksaKalimat, ringkasVerifikasi, type RingkasVerifikasi } from "@/modules/led/domain/verifikasi";
import {
  SISTEM_PERIKSA, buktiParagraf, kunciTahan, labelAturan, susunPenggunaPeriksa, terapkanLabelAi,
  type HasilVerifikasiAi, type KonfirmasiKalimat, type PemeriksaanT8,
} from "@/modules/led/domain/periksa-bagian";
import { panggilTerstruktur } from "@/modules/led/proses/llm-narasi";

export type { HasilVerifikasiAi };

/**
 * Tombol "Periksa dengan AI" per sub-bagian (revisi 22 Okt 2026), kini dengan masukan yang sama seperti pemeriksaan
 * otomatis per bagian (Rencana 10 Nov T8): kalimat + kutipan bukti yang dirujuk + baris M/T/J, bukan potongan utuh.
 * Hasil disimpan bersama versi draf aktif dan menjadi dasar gerbang ekspor final.
 */

const skema = z.object({
  kalimat: z.array(z.object({
    nomor: z.number().int(),
    label: z.enum(["sesuai", "sebagian", "tidak_didukung"]),
    alasan: z.string(),
  })),
});

type Pemeriksaan = PemeriksaanT8 & { rujukan?: RujukanPeriksa } & Record<string, unknown>;

async function versiAktif(p: Pengguna, proyekId: string, subBagianKode: string) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const bd = await prisma.bagianDraf.findFirst({
    where: { proyekId: proyek.id, subBagian: { kode: subBagianKode, bagian: { versiId: proyek.versiId } } },
  });
  if (!bd?.versiAktifId) throw new GalatPengguna("Sub-bagian ini belum punya draf.");
  const v = await prisma.versiDraf.findUniqueOrThrow({ where: { id: bd.versiAktifId } });
  return { proyek, v, periksa: (v.pemeriksaan ?? {}) as Pemeriksaan };
}

export async function periksaDenganAi(p: Pengguna, proyekId: string, subBagianKode: string): Promise<RingkasVerifikasi> {
  const { proyek, v, periksa } = await versiAktif(p, proyekId, subBagianKode);
  const doc = bacaDokumen(v.isi);
  const teksSumber = periksa.rujukan?.teksSumber ?? {};
  // versi suntingan tidak membawa kutipan; label aturan dihitung ulang dari narasi saat ini
  const kutipan = v.asal === "sunting" ? null : periksa.kutipan;
  const aturan = labelAturan(periksaKalimat(doc, teksSumber, { tahunSah: periksa.rujukan?.tahunSah ?? [] }), kutipan);
  if (aturan.kalimat.length === 0) throw new GalatPengguna("Tidak ada kalimat narasi untuk diperiksa.");
  const paragraf = paragrafBersumber(doc);
  const item = [{ kode: subBagianKode, kalimat: aturan.kalimat, bukti: (i: number) => buktiParagraf(i, paragraf[i]?.sumber ?? [], kutipan, teksSumber) }];
  const { teks, peta } = susunPenggunaPeriksa(item);
  const r = await panggilTerstruktur({
    prodiId: proyek.prodiId, proyekId: proyek.id, tugasId: null, subBagianKode: `verifikasi:${subBagianKode}`,
    sistem: SISTEM_PERIKSA, pengguna: teks, skema, pikir: "rendah",
  });
  const hasil = terapkanLabelAi(item, peta, r.keluaran.kalimat)[0];
  const simpan: HasilVerifikasiAi = { model: r.model, waktu: new Date().toISOString(), hasil };
  await prisma.versiDraf.update({
    where: { id: v.id },
    data: {
      pemeriksaan: {
        ...periksa, kalimatAi: simpan, tahan: kunciTahan(hasil, [], true), statusAi: "selesai", pesanAi: undefined,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  await catatAktivitas(p, "verifikasi_ai", "proyek", proyek.id, { subBagianKode });
  return ringkasVerifikasi(hasil);
}

/**
 * Rencana 10 Nov T8: Tim Prodi mengonfirmasi kalimat berlabel tidak didukung (misalnya fakta yang benar tetapi buktinya
 * belum diunggah) dengan alasan. Kalimat terkonfirmasi tidak lagi menahan ekspor final.
 */
export async function konfirmasiKalimat(p: Pengguna, proyekId: string, subBagianKode: string, teks: string, alasan: string) {
  // Gabung LKPS G1: peran diperiksa sebelum validasi dan pencarian (Tamu ditolak dengan GalatAkses)
  pastikanPeran(p, "ADMIN", "TIM_PRODI", "ASESOR");
  const a = alasan.trim();
  if (a.length < 10) throw new GalatPengguna("Tulis alasan konfirmasi (paling sedikit 10 karakter).");
  const { proyek, v, periksa } = await versiAktif(p, proyekId, subBagianKode);
  const kunci = kunciKalimat(teks);
  const ada = paragrafBersumber(bacaDokumen(v.isi)).flatMap((x) => pecahKalimat(x.teks)).some((x) => kunciKalimat(x) === kunci);
  if (!ada) throw new GalatPengguna("Kalimat itu tidak ada lagi di narasi (mungkin sudah disunting).");
  const lain = (periksa.konfirmasi ?? []).filter((k) => k.kunci !== kunci);
  const baru: KonfirmasiKalimat = { kunci, teks, alasan: a.slice(0, 500), oleh: p.nama || p.email, waktu: new Date().toISOString() };
  await prisma.versiDraf.update({
    where: { id: v.id },
    data: { pemeriksaan: { ...periksa, konfirmasi: [...lain, baru] } as unknown as Prisma.InputJsonValue },
  });
  await catatAktivitas(p, "konfirmasi_kalimat", "proyek", proyek.id, { subBagianKode, alasan: baru.alasan });
  return baru;
}

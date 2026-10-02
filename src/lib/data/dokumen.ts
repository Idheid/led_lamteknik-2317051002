import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatPengguna, type Pengguna } from "@/lib/akses";
import { ambilProyek } from "@/lib/data/proyek";
import { catatAktivitas } from "@/lib/data/log";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/lib/penyimpanan";

/**
 * F-10 dokumen pendukung per sub-bagian/butir (PDF, DOCX, gambar), F-12 gambar disimpan utuh.
 * Setiap dokumen bisa dikaitkan ke satu "dokumen yang diharapkan" (daftar cek) dan diberi tautan bukti sahih.
 */

export const UKURAN_MAKS_DOKUMEN = 25 * 1024 * 1024;

export type JenisDokumen = "pdf" | "docx" | "gambar";

/** Jenis dokumen dari tanda tangan isi berkas (bukan hanya ekstensi). */
export function kenaliJenis(nama: string, isi: Buffer): { jenis: JenisDokumen; mime: string } {
  const n = nama.toLowerCase();
  const awal = isi.subarray(0, 8);
  if (n.endsWith(".pdf") && awal.subarray(0, 5).toString("latin1") === "%PDF-") return { jenis: "pdf", mime: "application/pdf" };
  if (n.endsWith(".docx") && awal.subarray(0, 2).toString("latin1") === "PK") {
    return { jenis: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  if (/\.png$/.test(n) && awal.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { jenis: "gambar", mime: "image/png" };
  if (/\.jpe?g$/.test(n) && awal[0] === 0xff && awal[1] === 0xd8) return { jenis: "gambar", mime: "image/jpeg" };
  if (/\.gif$/.test(n) && awal.subarray(0, 3).toString("latin1") === "GIF") return { jenis: "gambar", mime: "image/gif" };
  if (n.endsWith(".doc")) throw new GalatPengguna("Format .doc lama tidak didukung. Simpan ulang sebagai .docx.");
  throw new GalatPengguna(`Berkas "${nama}" tidak didukung. Unggah PDF, DOCX, atau gambar PNG/JPG/GIF.`);
}

const skemaTautan = z.string().trim().max(1000)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Tautan bukti harus diawali http:// atau https://.")
  .transform((v) => (v === "" ? null : v));

export interface MasukanDokumen {
  nama: string;
  isi: Buffer;
  subBagianKode?: string | null;
  butirKode?: string | null;
  dokumenDiharapkanId?: string | null;
  judul?: string | null;
  tautanBukti?: string | null;
}

async function periksaKaitan(versiId: string, jenjang: string, m: Pick<MasukanDokumen, "subBagianKode" | "butirKode" | "dokumenDiharapkanId">) {
  if (m.subBagianKode) {
    const ada = await prisma.subBagian.count({ where: { kode: m.subBagianKode, bagian: { versiId } } });
    if (!ada) throw new GalatPengguna("Sub-bagian tidak ada di versi instrumen proyek.");
  }
  if (m.butirKode) {
    const ada = await prisma.butirPenilaian.count({ where: { versiId, jenjang, kode: m.butirKode } });
    if (!ada) throw new GalatPengguna("Butir penilaian tidak ada untuk jenjang proyek.");
  }
  if (m.dokumenDiharapkanId) {
    const d = await prisma.dokumenDiharapkan.findUnique({
      where: { id: m.dokumenDiharapkanId },
      include: { butir: { select: { versiId: true } }, subBagian: { select: { bagian: { select: { versiId: true } } } } },
    });
    const v = d?.butir?.versiId ?? d?.subBagian?.bagian.versiId;
    if (!d || v !== versiId) throw new GalatPengguna("Dokumen yang diharapkan tidak dikenal.");
  }
}

export async function unggahDokumen(p: Pengguna, proyekId: string, m: MasukanDokumen) {
  const proyek = await ambilProyek(p, proyekId);
  if (m.isi.length === 0) throw new GalatPengguna(`Berkas "${m.nama}" kosong.`);
  if (m.isi.length > UKURAN_MAKS_DOKUMEN) throw new GalatPengguna(`Berkas "${m.nama}" lebih dari 25 MB.`);
  const { jenis, mime } = kenaliJenis(m.nama, m.isi);
  await periksaKaitan(proyek.versiId, proyek.jenjang, m);
  const tautanBukti = skemaTautan.parse(m.tautanBukti ?? "");
  const simpan = await simpanBerkas(`proyek/${proyek.id}/dokumen`, m.nama, m.isi);
  const d = await prisma.dokumen.create({
    data: {
      proyekId: proyek.id,
      subBagianKode: m.subBagianKode || null,
      butirKode: m.butirKode || null,
      dokumenDiharapkanId: m.dokumenDiharapkanId || null,
      namaBerkas: m.nama.slice(0, 255),
      judul: m.judul?.trim() || null,
      mime, jenis,
      lokasi: simpan.lokasi,
      ukuran: simpan.ukuran,
      hash: simpan.hash,
      tautanBukti,
      diunggahOlehId: p.id,
    },
  });
  await catatAktivitas(p, "unggah", "dokumen", d.id, { nama: d.namaBerkas, jenis, subBagian: d.subBagianKode });
  await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
  return d;
}

export async function dokumenMilik(p: Pengguna, id: string) {
  const d = await prisma.dokumen.findUnique({ where: { id } });
  if (!d) throw new GalatPengguna("Dokumen tidak ditemukan.");
  await ambilProyek(p, d.proyekId);
  return d;
}

export async function daftarDokumen(p: Pengguna, proyekId: string, saring: { subBagianKode?: string } = {}) {
  const proyek = await ambilProyek(p, proyekId);
  return prisma.dokumen.findMany({
    where: { proyekId: proyek.id, ...(saring.subBagianKode ? { subBagianKode: saring.subBagianKode } : {}) },
    orderBy: { createdAt: "desc" },
    include: { dokumenDiharapkan: { select: { id: true, nama: true } } },
  });
}

const skemaUbah = z.object({
  judul: z.string().trim().max(300).optional(),
  tautanBukti: skemaTautan.optional(),
  subBagianKode: z.string().trim().max(60).nullable().optional(),
  dokumenDiharapkanId: z.string().trim().max(40).nullable().optional(),
});

export async function ubahDokumen(p: Pengguna, id: string, masukan: unknown) {
  const d = await dokumenMilik(p, id);
  const data = skemaUbah.parse(masukan);
  const proyek = await ambilProyek(p, d.proyekId);
  await periksaKaitan(proyek.versiId, proyek.jenjang, { subBagianKode: data.subBagianKode, dokumenDiharapkanId: data.dokumenDiharapkanId });
  const hasil = await prisma.dokumen.update({
    where: { id },
    data: {
      ...(data.judul !== undefined ? { judul: data.judul || null } : {}),
      ...(data.tautanBukti !== undefined ? { tautanBukti: data.tautanBukti } : {}),
      ...(data.subBagianKode !== undefined ? { subBagianKode: data.subBagianKode || null } : {}),
      ...(data.dokumenDiharapkanId !== undefined ? { dokumenDiharapkanId: data.dokumenDiharapkanId || null } : {}),
    },
  });
  await catatAktivitas(p, "ubah", "dokumen", id, { judul: hasil.judul, tautanBukti: hasil.tautanBukti });
  return hasil;
}

export async function hapusDokumen(p: Pengguna, id: string) {
  const d = await dokumenMilik(p, id);
  await prisma.dokumen.delete({ where: { id } });
  await hapusBerkas(d.lokasi);
  await catatAktivitas(p, "hapus", "dokumen", id, { nama: d.namaBerkas });
}

export async function prosesUlangDokumen(p: Pengguna, id: string) {
  const d = await dokumenMilik(p, id);
  await prisma.dokumen.update({ where: { id: d.id }, data: { status: "diunggah", pesan: null } });
  await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
}

/** Isi berkas asli untuk diunduh/ditampilkan (byte sama persis dengan unggahan). */
export async function berkasDokumen(p: Pengguna, id: string) {
  const d = await dokumenMilik(p, id);
  return { dokumen: d, isi: await bacaBerkas(d.lokasi) };
}

/**
 * F-12: simpul gambar Tiptap untuk disisipkan ke narasi (editor iterasi 3). `src` menunjuk berkas asli,
 * judul gambar disimpan sebagai `title` dan dipakai sebagai keterangan "Gambar x.y ..." saat ekspor.
 */
export function simpulGambar(d: { id: string; judul: string | null; namaBerkas: string; jenis: string }) {
  if (d.jenis !== "gambar") throw new GalatPengguna("Hanya gambar yang bisa disisipkan sebagai gambar.");
  return {
    type: "image",
    attrs: { src: `/api/dokumen/${d.id}/berkas`, alt: d.judul ?? d.namaBerkas, title: d.judul ?? null, dokumenId: d.id },
  };
}

/** Dokumen yang menunggu kunci API di proyek-proyek prodi, dikirim ulang setelah kunci baru ditambahkan. */
export async function antreUlangMenungguKunci(prodiId: string | null): Promise<number> {
  const daftar = await prisma.dokumen.findMany({
    where: { status: "menunggu_kunci", ...(prodiId ? { proyek: { prodiId } } : {}) },
    select: { id: true },
  });
  for (const d of daftar) {
    await prisma.dokumen.update({ where: { id: d.id }, data: { status: "diunggah", pesan: null } });
    await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
  }
  return daftar.length;
}

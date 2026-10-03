import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatAkses, GalatPengguna, pastikanSuperAdmin, type Pengguna } from "@/lib/akses";
import { ambilProyek, ambilProyekUbah } from "@/lib/data/proyek";
import { catatAktivitas } from "@/lib/data/log";
import { ANTREAN, kirimTugas } from "@/lib/antrean";
import { bacaBerkas, hapusBerkas, simpanBerkas } from "@/lib/penyimpanan";

/**
 * F-10 dokumen pendukung per sub-bagian/butir (PDF, DOCX, gambar), F-12 gambar disimpan utuh.
 * Setiap dokumen bisa dikaitkan ke satu "dokumen yang diharapkan" (daftar cek) dan diberi tautan bukti sahih.
 * U-10: dokumen juga bisa berupa bahan bersama UPPS (uppsId) yang diunggah super admin sekali dan dipakai semua
 * prodi di UPPS itu (ikut dicari saat generate, memenuhi daftar cek). Penanggung jawab hanya bisa membacanya.
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

/** Kaitan bahan bersama UPPS: kode sub-bagian dan dokumen yang diharapkan harus ada di salah satu versi aktif. */
async function periksaKaitanUpps(m: Pick<MasukanDokumen, "subBagianKode" | "dokumenDiharapkanId">) {
  if (m.subBagianKode) {
    const ada = await prisma.subBagian.count({ where: { kode: m.subBagianKode, bagian: { versi: { aktif: true } } } });
    if (!ada) throw new GalatPengguna("Sub-bagian tidak ada di versi instrumen yang aktif.");
  }
  if (m.dokumenDiharapkanId) {
    const ada = await prisma.dokumenDiharapkan.count({ where: { id: m.dokumenDiharapkanId } });
    if (!ada) throw new GalatPengguna("Dokumen yang diharapkan tidak dikenal.");
  }
}

function periksaBerkas(m: MasukanDokumen) {
  if (m.isi.length === 0) throw new GalatPengguna(`Berkas "${m.nama}" kosong.`);
  if (m.isi.length > UKURAN_MAKS_DOKUMEN) throw new GalatPengguna(`Berkas "${m.nama}" lebih dari 25 MB.`);
  return kenaliJenis(m.nama, m.isi);
}

/** U-10: super admin mengunggah bahan bersama untuk satu UPPS (diproses sekali, dipakai semua prodinya). */
export async function unggahDokumenUpps(p: Pengguna, uppsId: string, m: MasukanDokumen) {
  pastikanSuperAdmin(p);
  const upps = await prisma.upps.findUnique({ where: { id: uppsId } });
  if (!upps) throw new GalatPengguna("UPPS tidak ditemukan.");
  const { jenis, mime } = periksaBerkas(m);
  await periksaKaitanUpps(m);
  const tautanBukti = skemaTautan.parse(m.tautanBukti ?? "");
  const simpan = await simpanBerkas(`upps/${upps.id}/dokumen`, m.nama, m.isi);
  const d = await prisma.dokumen.create({
    data: {
      uppsId: upps.id,
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
  await catatAktivitas(p, "unggah", "dokumen_upps", d.id, { nama: d.namaBerkas, upps: upps.kode });
  await kirimTugas(ANTREAN.dokumen, { dokumenId: d.id });
  return d;
}

/** Pilihan sub-bagian (versi instrumen aktif) untuk mengaitkan bahan bersama UPPS. */
export async function pilihanSubBagianUpps(p: Pengguna) {
  pastikanSuperAdmin(p);
  const sub = await prisma.subBagian.findMany({
    where: { bagian: { versi: { aktif: true } }, tipe: { notIn: ["data", "otomatis"] } },
    orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }],
    distinct: ["kode"],
    select: { kode: true, label: true, judul: true, bagian: { select: { kode: true } } },
  });
  return sub.map((s) => ({ kode: s.kode, label: `${s.bagian.kode} ${s.label ? `${s.label} ` : ""}${s.judul}`.slice(0, 120) }));
}

export async function daftarDokumenUpps(p: Pengguna, uppsId: string) {
  pastikanSuperAdmin(p);
  return prisma.dokumen.findMany({
    where: { uppsId },
    orderBy: { createdAt: "desc" },
    include: { dokumenDiharapkan: { select: { id: true, nama: true } } },
  });
}

export async function unggahDokumen(p: Pengguna, proyekId: string, m: MasukanDokumen) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const { jenis, mime } = periksaBerkas(m);
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

/**
 * Dokumen yang boleh diakses: dokumen proyek → hanya prodi pemiliknya; bahan bersama UPPS → super admin, atau
 * penanggung jawab prodi di UPPS itu bila hanya membaca (`baca`).
 */
export async function dokumenMilik(p: Pengguna, id: string, opsi: { baca?: boolean } = {}) {
  const d = await prisma.dokumen.findUnique({ where: { id } });
  if (!d) throw new GalatPengguna("Dokumen tidak ditemukan.");
  if (d.proyekId) {
    await ambilProyek(p, d.proyekId);
    return d;
  }
  if (p.peran === "SUPER_ADMIN") return d;
  if (opsi.baca && p.prodiId) {
    const prodi = await prisma.prodi.findUnique({ where: { id: p.prodiId }, select: { uppsId: true } });
    if (prodi && prodi.uppsId === d.uppsId) return d;
  }
  throw new GalatAkses("Bahan bersama UPPS hanya bisa diubah super admin.");
}

/** Dokumen proyek ditambah bahan bersama UPPS prodinya (`bersama` = true, hanya baca). */
export async function daftarDokumen(p: Pengguna, proyekId: string, saring: { subBagianKode?: string } = {}) {
  const proyek = await ambilProyek(p, proyekId);
  const daftar = await prisma.dokumen.findMany({
    where: {
      OR: [{ proyekId: proyek.id }, { uppsId: proyek.prodi.uppsId }],
      ...(saring.subBagianKode ? { subBagianKode: saring.subBagianKode } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { dokumenDiharapkan: { select: { id: true, nama: true } } },
  });
  return daftar.map((d) => ({ ...d, bersama: d.uppsId !== null }));
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
  if (d.proyekId) {
    const proyek = await ambilProyek(p, d.proyekId);
    await periksaKaitan(proyek.versiId, proyek.jenjang, { subBagianKode: data.subBagianKode, dokumenDiharapkanId: data.dokumenDiharapkanId });
  } else {
    await periksaKaitanUpps({ subBagianKode: data.subBagianKode, dokumenDiharapkanId: data.dokumenDiharapkanId });
  }
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
  const d = await dokumenMilik(p, id, { baca: true });
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

/** Ringkasan bahan untuk Beranda: dokumen per status dan dokumen yang diharapkan yang belum ada. */
export async function ringkasanBahan(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const [perStatus, diharapkan, terpenuhi, lkps, bersama] = await Promise.all([
    prisma.dokumen.groupBy({ by: ["status"], where: { proyekId: proyek.id }, _count: { _all: true } }),
    prisma.dokumenDiharapkan.count({ where: { butir: { versiId: proyek.versiId, jenjang: proyek.jenjang } } }),
    prisma.dokumen.findMany({
      // bahan bersama UPPS juga memenuhi daftar cek
      where: { OR: [{ proyekId: proyek.id }, { uppsId: proyek.prodi.uppsId }], dokumenDiharapkanId: { not: null } },
      distinct: ["dokumenDiharapkanId"],
      select: { dokumenDiharapkanId: true },
    }),
    prisma.berkasLKPS.findFirst({ where: { proyekId: proyek.id, aktif: true }, select: { namaBerkas: true, jenis: true } }),
    prisma.dokumen.count({ where: { uppsId: proyek.prodi.uppsId, status: "siap" } }),
  ]);
  const jumlah = (s: string) => perStatus.find((x) => x.status === s)?._count._all ?? 0;
  return {
    totalDokumen: perStatus.reduce((n, x) => n + x._count._all, 0),
    siap: jumlah("siap"),
    menungguKunci: jumlah("menunggu_kunci"),
    gagal: jumlah("gagal"),
    diharapkan,
    terpenuhi: terpenuhi.length,
    lkps,
    bersama,
  };
}

import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatAkses, GalatPengguna, pastikanPenanggungJawab, type Pengguna } from "@/lib/akses";
import { catatAktivitas } from "@/lib/data/log";
import { berlakuUntukJenjang } from "@/lib/domain/instrumen";
import { skemaJawabanForm, skemaProyek, type MasukanProyek } from "@/lib/validasi";

/**
 * F-07 proyek LED. Penanggung jawab hanya melihat dan mengubah proyek prodinya sendiri:
 * setiap kueri memakai filter prodiId dari sesi, bukan dari masukan pengguna.
 */

export async function daftarProyek(p: Pengguna) {
  const prodiId = pastikanPenanggungJawab(p);
  return prisma.proyekLED.findMany({
    where: { prodiId },
    orderBy: { createdAt: "desc" },
    include: { versi: { select: { kode: true, nama: true } }, prodi: { select: { nama: true } } },
  });
}

export async function prodiSaya(p: Pengguna) {
  const prodiId = pastikanPenanggungJawab(p);
  return prisma.prodi.findUniqueOrThrow({ where: { id: prodiId }, include: { upps: true } });
}

export async function buatProyek(p: Pengguna, masukan: MasukanProyek) {
  const prodiId = pastikanPenanggungJawab(p);
  const data = skemaProyek.parse(masukan);
  const prodi = await prisma.prodi.findUniqueOrThrow({ where: { id: prodiId } });
  const versi = await prisma.versiInstrumen.findUnique({ where: { id: data.versiId } });
  if (!versi || !versi.aktif) throw new GalatPengguna("Versi instrumen tidak tersedia. Pilih versi yang aktif.");
  const butir = await prisma.butirPenilaian.count({ where: { versiId: versi.id, jenjang: prodi.jenjang } });
  if (butir === 0) {
    throw new GalatPengguna(`Versi ${versi.kode} belum punya butir penilaian untuk jenjang ${prodi.jenjang}. Hubungi super admin.`);
  }
  const proyek = await prisma.proyekLED.create({
    data: {
      prodiId,
      versiId: versi.id,
      jenjang: prodi.jenjang,
      nama: data.nama,
      tsTahunMulai: data.tsTahunMulai,
      // salinan anggaran versi: bisa diubah per proyek tanpa mengubah versi
      anggaran: versi.anggaranBawaan as Prisma.InputJsonValue,
    },
  });
  await catatAktivitas(p, "buat", "proyek", proyek.id, { nama: proyek.nama, versi: versi.kode });
  return proyek;
}

/** Ambil proyek milik prodi pengguna; galat akses bila bukan miliknya. */
export async function ambilProyek(p: Pengguna, proyekId: string) {
  const prodiId = pastikanPenanggungJawab(p);
  const proyek = await prisma.proyekLED.findFirst({
    where: { id: proyekId, prodiId },
    include: {
      prodi: { include: { upps: true } },
      versi: { select: { id: true, kode: true, nama: true } },
      status: true,
    },
  });
  if (!proyek) throw new GalatAkses("Proyek tidak ditemukan atau bukan milik program studi Anda.");
  return proyek;
}

export async function ubahTsProyek(p: Pengguna, proyekId: string, tsTahunMulai: number) {
  const proyek = await ambilProyek(p, proyekId);
  const ts = skemaProyek.shape.tsTahunMulai.parse(tsTahunMulai);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { tsTahunMulai: ts } });
  await catatAktivitas(p, "ubah_ts", "proyek", proyek.id, { ts });
}

/** Bagian yang punya halaman form (kriteria C.1–C.7 dan bab lain) untuk sidebar. */
export async function bagianProyek(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const bagian = await prisma.bagian.findMany({
    where: { versiId: proyek.versiId },
    orderBy: { urutan: "asc" },
    select: { id: true, kode: true, nama: true, jenis: true },
  });
  const status = new Map(proyek.status.map((s) => [s.bagianKode, s.status]));
  return { proyek, bagian: bagian.map((b) => ({ ...b, status: status.get(b.kode) ?? "belum" })) };
}

/** Isi halaman form satu kriteria/bagian: sub-bagian yang berlaku untuk jenjang proyek beserta butirnya. */
export async function halamanBagian(p: Pengguna, proyekId: string, kodeBagian: string) {
  const proyek = await ambilProyek(p, proyekId);
  const bagian = await prisma.bagian.findUnique({
    where: { versiId_kode: { versiId: proyek.versiId, kode: kodeBagian } },
    include: {
      subBagian: {
        orderBy: { urutan: "asc" },
        include: {
          butir: {
            where: { butir: { jenjang: proyek.jenjang } },
            include: { butir: { include: { dokumenDiharapkan: { orderBy: { urutan: "asc" } } } } },
          },
          dokumenDiharapkan: { orderBy: { urutan: "asc" } },
        },
      },
    },
  });
  if (!bagian) return null;
  const subBagian = bagian.subBagian
    .filter((s) => berlakuUntukJenjang(s, proyek.jenjang))
    .map((s) => ({ ...s, butir: s.butir.map((r) => r.butir).sort((a, b) => a.urutan - b.urutan) }));
  const jawaban = await prisma.jawabanForm.findMany({
    where: { proyekId: proyek.id, subBagianKode: { in: subBagian.map((s) => s.kode) } },
  });
  return { proyek, bagian: { ...bagian, subBagian }, jawaban: Object.fromEntries(jawaban.map((j) => [j.subBagianKode, j.isi])) };
}

export async function simpanJawaban(p: Pengguna, masukan: { proyekId: string; subBagianKode: string; isi: string }) {
  const data = skemaJawabanForm.parse(masukan);
  const proyek = await ambilProyek(p, data.proyekId);
  const sub = await prisma.subBagian.findFirst({ where: { kode: data.subBagianKode, bagian: { versiId: proyek.versiId } } });
  if (!sub) throw new GalatPengguna("Sub-bagian tidak ada di versi instrumen proyek ini.");
  return prisma.jawabanForm.upsert({
    where: { proyekId_subBagianKode: { proyekId: proyek.id, subBagianKode: data.subBagianKode } },
    create: { proyekId: proyek.id, subBagianKode: data.subBagianKode, isi: data.isi },
    update: { isi: data.isi },
  });
}

/** Jumlah sub-bagian (yang berlaku untuk jenjang proyek) dan butir per bagian, untuk Beranda. */
export async function ringkasanBagianProyek(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const [sub, butir] = await Promise.all([
    prisma.subBagian.findMany({
      where: { bagian: { versiId: proyek.versiId } },
      select: { berlakuUntuk: true, jenjangOverride: true, bagian: { select: { kode: true } } },
    }),
    prisma.butirPenilaian.groupBy({
      by: ["bagianKode"],
      where: { versiId: proyek.versiId, jenjang: proyek.jenjang },
      _count: { _all: true },
      _sum: { bobot: true },
    }),
  ]);
  const jumlahSub = new Map<string, number>();
  for (const s of sub) {
    if (berlakuUntukJenjang(s, proyek.jenjang)) jumlahSub.set(s.bagian.kode, (jumlahSub.get(s.bagian.kode) ?? 0) + 1);
  }
  const jumlahButir = new Map(butir.map((b) => [b.bagianKode, { jumlah: b._count._all, bobot: Number(b._sum.bobot ?? 0) }]));
  return { jumlahSub, jumlahButir };
}

/** Butir jenjang proyek untuk perhitungan anggaran. */
export async function butirAnggaranProyek(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const butir = await prisma.butirPenilaian.findMany({
    where: { versiId: proyek.versiId, jenjang: proyek.jenjang },
    orderBy: { urutan: "asc" },
    select: { kode: true, bagianKode: true, bobot: true, jenis: true },
  });
  return { proyek, butir: butir.map((b) => ({ kode: b.kode, bagian: b.bagianKode, bobot: Number(b.bobot), jenis: b.jenis })) };
}

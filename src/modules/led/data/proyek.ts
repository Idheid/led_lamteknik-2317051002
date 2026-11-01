import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatAkses, GalatPengguna, pastikanPeran, pastikanTimProdi, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { hapusBerkas } from "@/modules/bersama/penyimpanan";
import { berlakuUntukJenjang } from "@/modules/led/domain/instrumen";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { usulanBatasPengajuan } from "@/modules/led/domain/kesiapan";
import { namaLedOtomatis, tsDariTahunPengajuan } from "@/modules/bersama/domain/tahun-akademik";
import { skemaJawabanForm, skemaNamaProyek, skemaProyek, skemaTahunTs, type MasukanProyek } from "@/modules/led/validasi";

/**
 * F-07 LED (ProyekLED). Satu LED = satu pengajuan akreditasi satu prodi yang berlaku 5 tahun; satu prodi hanya boleh
 * punya satu LED aktif (LED periode sebelumnya diarsipkan dulu). Instrumen LED otomatis = instrumen aktif untuk jenjang
 * prodi. Revisi 31 Okt 2026: Tim Prodi membuat dan mengelola LED prodinya sendiri (prodi dari akun; semua akun Tim
 * Prodi satu prodi berbagi LED yang sama); Admin UPPS melihat semua LED hanya baca; asesor hanya LED yang ditugaskan.
 */

/** LED (aktif dulu, lalu arsip) beserta prodi dan versinya. Tim Prodi: LED prodinya; Admin UPPS: semua LED. */
export async function daftarProyek(p: Pengguna) {
  pastikanPeran(p, "ADMIN", "TIM_PRODI");
  return prisma.proyekLED.findMany({
    where: p.peran === "TIM_PRODI" ? { prodiId: p.prodiId ?? "-" } : {},
    orderBy: [{ diarsipkanPada: { sort: "desc", nulls: "first" } }, { tahunPengajuan: "desc" }, { createdAt: "desc" }],
    include: { versi: { select: { kode: true, nama: true } }, prodi: { select: { id: true, nama: true, jenjang: true } } },
  });
}

/** Versi instrumen aktif untuk satu jenjang (versi per jenjang lebih dulu, lalu versi lama lintas jenjang). */
export async function instrumenAktifUntuk(jenjang: string) {
  const kandidat = await prisma.versiInstrumen.findMany({
    where: { aktif: true, OR: [{ jenjangUtama: jenjang }, { jenjangUtama: null }] },
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { butir: { where: { jenjang } } } } },
  });
  return kandidat.find((v) => v.jenjangUtama === jenjang && v._count.butir > 0)
    ?? kandidat.find((v) => v._count.butir > 0)
    ?? null;
}

/** LED aktif (belum diarsipkan) milik prodi, bila ada. */
async function ledAktifProdi(prodiId: string, kecuali?: string) {
  return prisma.proyekLED.findFirst({
    where: { prodiId, diarsipkanPada: null, ...(kecuali ? { NOT: { id: kecuali } } : {}) },
    select: { id: true, nama: true, tahunPengajuan: true },
  });
}

/** Tim Prodi membuat LED untuk prodinya sendiri; prodi diambil dari akun, bukan dari masukan. */
export async function buatProyek(p: Pengguna, masukan: MasukanProyek) {
  pastikanTimProdi(p);
  const data = skemaProyek.parse(masukan);
  const prodi = await prisma.prodi.findUnique({ where: { id: p.prodiId } });
  if (!prodi) throw new GalatPengguna("Program studi tidak ditemukan.");
  const aktif = await ledAktifProdi(prodi.id);
  if (aktif) {
    throw new GalatPengguna(`${prodi.nama} masih punya LED aktif (${aktif.nama}, pengajuan ${aktif.tahunPengajuan}). Arsipkan LED itu dulu sebelum membuat LED periode berikutnya.`);
  }
  const versi = await instrumenAktifUntuk(prodi.jenjang);
  if (!versi) {
    throw new GalatPengguna(`Instrumen jenjang ${namaJenjang(prodi.jenjang)} belum aktif. Unggah dan aktifkan instrumennya di menu Instrumen.`);
  }
  // revisi 31 Okt 2026: TS dipilih Tim Prodi dari dua pilihan; kosong = (P−1)/P. Bisa diubah di Pengaturan LED
  const tsTahunMulai = data.tsTahunMulai ?? tsDariTahunPengajuan(data.tahunPengajuan);
  const proyek = await prisma.proyekLED.create({
    data: {
      prodiId: prodi.id,
      versiId: versi.id,
      jenjang: prodi.jenjang,
      // perbaikan 1 Nov 2026 (P5): kartu Mulai LED tidak punya isian nama; nama otomatis, bisa diubah di Pengaturan LED
      nama: data.nama ?? namaLedOtomatis(prodi.nama, data.tahunPengajuan, tsTahunMulai),
      tahunPengajuan: data.tahunPengajuan,
      tsTahunMulai,
      // salinan anggaran versi: bisa diubah per LED tanpa mengubah versi
      anggaran: versi.anggaranBawaan as Prisma.InputJsonValue,
      // revisi 22 Okt 2026: usulan awal batas pengajuan (6 bulan sebelum akreditasi berakhir), bisa diubah PJ
      batasPengajuan: prodi.akreditasiBerlakuSampai ? usulanBatasPengajuan(prodi.akreditasiBerlakuSampai) : null,
    },
  });
  await catatAktivitas(p, "buat", "proyek", proyek.id, { nama: proyek.nama, prodi: prodi.nama, versi: versi.kode });
  return proyek;
}

/**
 * Ambil LED. Tanpa opsi: hanya Tim Prodi pemilik LED (fungsi ubah dan fungsi khusus penyusun). `baca: true` (hanya
 * fungsi baca) juga mengizinkan Admin UPPS (semua LED, revisi 31 Okt 2026) dan asesor yang ditugaskan ke LED ini
 * (revisi 22 Okt 2026); fungsi ubah memakai ambilProyekUbah sehingga keduanya tidak pernah bisa mengubah.
 */
export async function ambilProyek(p: Pengguna, proyekId: string, opsi: { baca?: boolean } = {}) {
  if (opsi.baca) pastikanPeran(p, "ADMIN", "TIM_PRODI", "ASESOR");
  else pastikanTimProdi(p);
  const proyek = await prisma.proyekLED.findUnique({
    where: { id: proyekId },
    include: {
      prodi: true,
      versi: { select: { id: true, kode: true, nama: true } },
      status: true,
    },
  });
  if (!proyek) throw new GalatAkses("LED tidak ditemukan.");
  if (p.peran === "TIM_PRODI" && proyek.prodiId !== p.prodiId) throw new GalatAkses("LED ini milik program studi lain.");
  if (p.peran === "ASESOR" && proyek.asesorId !== p.id) throw new GalatAkses("LED ini tidak ditugaskan kepada Anda.");
  return proyek;
}

/** Proyek yang diarsipkan hanya bisa dibaca (dan diekspor). */
export function pastikanBisaDiubah(proyek: { diarsipkanPada: Date | null }) {
  if (proyek.diarsipkanPada) {
    throw new GalatPengguna("Proyek ini diarsipkan (hanya baca). Aktifkan kembali dari Beranda proyek untuk mengubahnya.");
  }
}

/** Ambil proyek untuk diubah: Tim Prodi pemilik LED dan LED tidak diarsipkan. */
export async function ambilProyekUbah(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  pastikanBisaDiubah(proyek);
  return proyek;
}

export async function ubahNamaProyek(p: Pengguna, proyekId: string, nama: string) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const baru = skemaNamaProyek.parse(nama);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { nama: baru } });
  await catatAktivitas(p, "ubah_nama", "proyek", proyek.id, { lama: proyek.nama, baru });
}

/** Arsipkan proyek periode lama (tetap tersimpan sebagai rujukan) atau aktifkan kembali. */
export async function aturArsipProyek(p: Pengguna, proyekId: string, arsip: boolean) {
  const proyek = await ambilProyek(p, proyekId);
  if (arsip) {
    const aktif = await prisma.tugasGenerate.count({ where: { proyekId: proyek.id, status: { in: ["antre", "berjalan", "tertunda"] } } });
    if (aktif) throw new GalatPengguna("Masih ada penyusunan berjalan. Tunggu selesai atau batalkan dulu.");
  }
  if (!arsip) {
    const lain = await ledAktifProdi(proyek.prodiId, proyek.id);
    if (lain) throw new GalatPengguna(`${proyek.prodi.nama} sudah punya LED aktif lain (${lain.nama}). Arsipkan LED itu dulu.`);
  }
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { diarsipkanPada: arsip ? new Date() : null } });
  await catatAktivitas(p, arsip ? "arsipkan" : "aktifkan", "proyek", proyek.id, { nama: proyek.nama });
}

/**
 * Hapus proyek beserta seluruh isinya (draf, riwayat versi, LKPS, dokumen, ekspor) dan berkasnya di disk. Untuk
 * proyek yang salah dibuat; proyek periode lama sebaiknya diarsipkan. Wajib mengetik ulang nama proyek.
 */
export async function hapusProyek(p: Pengguna, proyekId: string, konfirmasiNama: string) {
  const proyek = await ambilProyek(p, proyekId);
  if (konfirmasiNama.trim() !== proyek.nama) throw new GalatPengguna("Nama proyek yang diketik tidak sama. Proyek tidak dihapus.");
  const aktif = await prisma.tugasGenerate.count({ where: { proyekId: proyek.id, status: { in: ["antre", "berjalan", "tertunda"] } } });
  if (aktif) throw new GalatPengguna("Masih ada penyusunan berjalan. Batalkan dulu sebelum menghapus proyek.");
  const [dokumen, lkps, ekspor] = await Promise.all([
    prisma.dokumen.findMany({ where: { proyekId: proyek.id }, select: { lokasi: true } }),
    prisma.berkasLKPS.findMany({ where: { proyekId: proyek.id }, select: { lokasi: true } }),
    prisma.ekspor.findMany({ where: { proyekId: proyek.id, lokasi: { not: null } }, select: { lokasi: true } }),
  ]);
  await prisma.proyekLED.delete({ where: { id: proyek.id } });
  for (const l of [...dokumen, ...lkps, ...ekspor].map((x) => x.lokasi).filter((x): x is string => Boolean(x))) {
    await hapusBerkas(l).catch(() => undefined);
  }
  await catatAktivitas(p, "hapus", "proyek", proyek.id, { nama: proyek.nama, dokumen: dokumen.length, lkps: lkps.length });
}

/** Pengaturan LED: tahun pengajuan (label periode). */
export async function ubahTahunPengajuan(p: Pengguna, proyekId: string, tahun: number) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const t = skemaProyek.shape.tahunPengajuan.parse(tahun);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { tahunPengajuan: t } });
  await catatAktivitas(p, "ubah_tahun_pengajuan", "proyek", proyek.id, { tahun: t });
}

/** Pengaturan LED: tahun data LKPS (TS). */
export async function ubahTsProyek(p: Pengguna, proyekId: string, tsTahunMulai: number) {
  const proyek = await ambilProyekUbah(p, proyekId);
  const ts = skemaTahunTs.parse(tsTahunMulai);
  await prisma.proyekLED.update({ where: { id: proyek.id }, data: { tsTahunMulai: ts } });
  await catatAktivitas(p, "ubah_ts", "proyek", proyek.id, { ts });
}

/** Bagian yang punya halaman form (kriteria C.1–C.7 dan bab lain) untuk sidebar. */
export async function bagianProyek(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId, { baca: true });
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
  const proyek = await ambilProyek(p, proyekId, { baca: true });
  const bagian = await prisma.bagian.findUnique({
    where: { versiId_kode: { versiId: proyek.versiId, kode: kodeBagian } },
    include: {
      subBagian: {
        orderBy: { urutan: "asc" },
        include: {
          butir: { where: { butir: { jenjang: proyek.jenjang } }, include: { butir: true } },
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
  const proyek = await ambilProyekUbah(p, data.proyekId);
  const sub = await prisma.subBagian.findFirst({ where: { kode: data.subBagianKode, bagian: { versiId: proyek.versiId } } });
  if (!sub) throw new GalatPengguna("Sub-bagian tidak ada di versi instrumen proyek ini.");
  return prisma.jawabanForm.upsert({
    where: { proyekId_subBagianKode: { proyekId: proyek.id, subBagianKode: data.subBagianKode } },
    create: { proyekId: proyek.id, subBagianKode: data.subBagianKode, isi: data.isi },
    update: { isi: data.isi },
  });
}

/** Jumlah sub-bagian (yang berlaku untuk jenjang proyek), sub-bagian yang sudah punya draf, dan butir per bagian, untuk Beranda. */
export async function ringkasanBagianProyek(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const [sub, butir, draf] = await Promise.all([
    prisma.subBagian.findMany({
      where: { bagian: { versiId: proyek.versiId } },
      select: { tipe: true, berlakuUntuk: true, jenjangOverride: true, bagian: { select: { kode: true } } },
    }),
    prisma.butirPenilaian.groupBy({
      by: ["bagianKode"],
      where: { versiId: proyek.versiId, jenjang: proyek.jenjang },
      _count: { _all: true },
      _sum: { bobot: true },
    }),
    prisma.bagianDraf.findMany({
      where: { proyekId: proyek.id, versiAktifId: { not: null } },
      select: { subBagian: { select: { bagian: { select: { kode: true } } } } },
    }),
  ]);
  const jumlahSub = new Map<string, number>();
  const jumlahSubGenerate = new Map<string, number>();
  for (const s of sub) {
    if (!berlakuUntukJenjang(s, proyek.jenjang)) continue;
    jumlahSub.set(s.bagian.kode, (jumlahSub.get(s.bagian.kode) ?? 0) + 1);
    if (s.tipe !== "data" && s.tipe !== "otomatis") jumlahSubGenerate.set(s.bagian.kode, (jumlahSubGenerate.get(s.bagian.kode) ?? 0) + 1);
  }
  const jumlahDraf = new Map<string, number>();
  for (const d of draf) jumlahDraf.set(d.subBagian.bagian.kode, (jumlahDraf.get(d.subBagian.bagian.kode) ?? 0) + 1);
  const jumlahButir = new Map(butir.map((b) => [b.bagianKode, { jumlah: b._count._all, bobot: Number(b._sum.bobot ?? 0) }]));
  return { jumlahSub, jumlahSubGenerate, jumlahDraf, jumlahButir };
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

/** Pilihan sub-bagian (berlaku untuk jenjang proyek) untuk mengaitkan dokumen. */
export async function pilihanSubBagianProyek(p: Pengguna, proyekId: string) {
  const proyek = await ambilProyek(p, proyekId);
  const sub = await prisma.subBagian.findMany({
    where: { bagian: { versiId: proyek.versiId }, tipe: { notIn: ["data", "otomatis"] } },
    orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }],
    select: { kode: true, label: true, judul: true, berlakuUntuk: true, jenjangOverride: true, bagian: { select: { kode: true } } },
  });
  return sub
    .filter((s) => berlakuUntukJenjang(s, proyek.jenjang))
    .map((s) => ({ kode: s.kode, label: `${s.bagian.kode} ${s.label ? `${s.label} ` : ""}${s.judul}`.slice(0, 120) }));
}

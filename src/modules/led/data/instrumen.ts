import { prisma } from "@/modules/bersama/db";
import type { Prisma } from "@/generated/prisma/client";
import { GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { kodeSalinan } from "@/modules/led/domain/instrumen";
import { BUTIR_ANGKA_SARJANA } from "@/modules/led/domain/metrik-lkps";
import { skemaBagianUbah, skemaButir, skemaSubBagian, skemaVersiUbah, type MasukanButir, type MasukanSubBagian } from "@/modules/led/validasi";

/**
 * F-03 versi instrumen, F-04 bagian dan sub-bagian, F-05 butir per jenjang.
 * Aturan: versi yang sudah dipakai proyek dikunci (tidak bisa diubah atau dihapus); untuk mengubahnya,
 * salin menjadi versi baru. Dengan begitu proyek lama tetap memakai isi versi lamanya.
 */

type Tx = Prisma.TransactionClient;

async function jumlahProyek(db: Tx | typeof prisma, versiId: string): Promise<number> {
  return db.proyekLED.count({ where: { versiId } });
}

async function pastikanVersiBisaDiubah(db: Tx | typeof prisma, versiId: string): Promise<void> {
  const n = await jumlahProyek(db, versiId);
  if (n > 0) {
    throw new GalatPengguna(`Versi ini dipakai ${n} proyek LED sehingga dikunci. Salin versi ini untuk membuat perubahan.`);
  }
}

/** Kode rumus harus ada di katalog rumus; "" berarti tanpa rumus (nilai diisi manual); undefined = tidak diubah. */
export function periksaKodeRumus(kode: string | null | undefined): string | null | undefined {
  if (kode === undefined) return undefined;
  if (!kode) return null;
  if (!BUTIR_ANGKA_SARJANA.includes(kode)) throw new GalatPengguna(`Rumus ${kode} tidak dikenal.`);
  return kode;
}

// ---------------------------------------------------------------- Versi

export async function daftarVersi(p: Pengguna) {
  pastikanAdmin(p);
  return prisma.versiInstrumen.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bagian: true, butir: true, proyek: true } } },
  });
}

/** Versi aktif untuk pilihan saat membuat proyek (boleh dibaca semua peran). */
export async function daftarVersiAktif() {
  return prisma.versiInstrumen.findMany({
    where: { aktif: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, kode: true, nama: true },
  });
}

export async function ambilVersi(p: Pengguna, id: string) {
  pastikanAdmin(p);
  const versi = await prisma.versiInstrumen.findUnique({
    where: { id },
    include: {
      bagian: { orderBy: { urutan: "asc" }, include: { _count: { select: { subBagian: true } } } },
      _count: { select: { proyek: true, butir: true } },
    },
  });
  if (!versi) return null;
  const butirPerJenjang = await prisma.butirPenilaian.groupBy({
    by: ["jenjang"],
    where: { versiId: id },
    _count: { _all: true },
    _sum: { bobot: true },
  });
  const disalinDari = versi.disalinDariId
    ? await prisma.versiInstrumen.findUnique({ where: { id: versi.disalinDariId }, select: { id: true, kode: true } })
    : null;
  return { ...versi, butirPerJenjang, disalinDari, terkunci: versi._count.proyek > 0 };
}

export async function ubahVersi(p: Pengguna, id: string, masukan: unknown) {
  pastikanAdmin(p);
  const data = skemaVersiUbah.parse(masukan);
  await pastikanVersiBisaDiubah(prisma, id);
  const bentrok = await prisma.versiInstrumen.findFirst({ where: { kode: data.kode, NOT: { id } } });
  if (bentrok) throw new GalatPengguna(`Kode versi ${data.kode} sudah dipakai.`);
  const v = await prisma.versiInstrumen.update({ where: { id }, data });
  await catatAktivitas(p, "ubah", "versi_instrumen", id, { kode: v.kode });
  return v;
}

export async function aturAktifVersi(p: Pengguna, id: string, aktif: boolean) {
  pastikanAdmin(p);
  const lama = await prisma.versiInstrumen.findUniqueOrThrow({ where: { id } });
  // revisi 19 Okt 2026: versi hasil unggah diaktifkan pertama kali lewat halaman cek ("Sudah dicek, aktifkan")
  if (aktif && (lama.status === "draf" || lama.status === "diekstrak")) {
    throw new GalatPengguna("Versi ini belum dicek. Buka halaman Periksa hasil ekstraksi, cek semua butir, lalu klik Sudah dicek, aktifkan.");
  }
  const v = await prisma.$transaction(async (tx) => {
    if (aktif && lama.jenjangUtama) {
      await tx.versiInstrumen.updateMany({ where: { jenjangUtama: lama.jenjangUtama, aktif: true, NOT: { id } }, data: { aktif: false, status: "nonaktif" } });
    }
    return tx.versiInstrumen.update({ where: { id }, data: { aktif, status: aktif ? "aktif" : "nonaktif" } });
  });
  await catatAktivitas(p, aktif ? "aktifkan" : "nonaktifkan", "versi_instrumen", id, { kode: v.kode });
  return v;
}

export async function hapusVersi(p: Pengguna, id: string) {
  pastikanAdmin(p);
  const n = await jumlahProyek(prisma, id);
  if (n > 0) throw new GalatPengguna(`Versi ini dipakai ${n} proyek LED dan tidak bisa dihapus.`);
  const v = await prisma.versiInstrumen.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "versi_instrumen", id, { kode: v.kode });
}

/** Salin seluruh isi versi (bagian, sub-bagian, butir, pemetaan, dokumen diharapkan, tabel LKPS) ke versi baru nonaktif. */
export async function salinVersi(p: Pengguna, id: string) {
  pastikanAdmin(p);
  const hasil = await prisma.$transaction(
    async (tx) => {
      const asal = await tx.versiInstrumen.findUniqueOrThrow({
        where: { id },
        include: {
          bagian: { include: { subBagian: { include: { dokumenDiharapkan: true } } } },
          butir: { include: { subBagian: true, dokumenDiharapkan: true } },
          tabelLkps: true,
        },
      });
      const semuaKode = await tx.versiInstrumen.findMany({ select: { kode: true } });
      const baru = await tx.versiInstrumen.create({
        data: {
          kode: kodeSalinan(asal.kode, semuaKode.map((v) => v.kode)),
          nama: `${asal.nama} (salinan)`,
          lembaga: asal.lembaga,
          peraturan: asal.peraturan as Prisma.InputJsonValue,
          catatan: asal.catatan,
          aktif: false,
          disalinDariId: asal.id,
          jenjang: asal.jenjang as Prisma.InputJsonValue,
          statusAkreditasi: (asal.statusAkreditasi ?? undefined) as Prisma.InputJsonValue | undefined,
          anggaranBawaan: asal.anggaranBawaan as Prisma.InputJsonValue,
        },
      });

      const petaSub = new Map<string, string>();
      for (const b of asal.bagian) {
        const bagian = await tx.bagian.create({
          data: {
            versiId: baru.id, kode: b.kode, nama: b.nama, jenis: b.jenis, urutan: b.urutan,
            batasHalamanResmi: b.batasHalamanResmi, pengantar: b.pengantar,
          },
        });
        if (b.subBagian.length === 0) continue;
        const sub = await tx.subBagian.createManyAndReturn({
          data: b.subBagian.map((s) => ({
            bagianId: bagian.id, kode: s.kode, label: s.label, judul: s.judul, grup: s.grup, tipe: s.tipe,
            varian: s.varian as Prisma.InputJsonValue, berlakuUntuk: s.berlakuUntuk, jenjangOverride: s.jenjangOverride,
            sumberInstruksi: s.sumberInstruksi, catatan: s.catatan, urutan: s.urutan,
          })),
          select: { id: true, kode: true },
        });
        const idBaru = new Map(sub.map((s) => [s.kode, s.id]));
        for (const s of b.subBagian) petaSub.set(s.id, idBaru.get(s.kode) as string);
      }

      const petaButir = new Map<string, string>();
      if (asal.butir.length) {
        const butir = await tx.butirPenilaian.createManyAndReturn({
          data: asal.butir.map((t) => ({
            versiId: baru.id, jenjang: t.jenjang, kode: t.kode, no: t.no, sub: t.sub, urutan: t.urutan,
            bagianKode: t.bagianKode, elemen: t.elemen, indikator: t.indikator, bobot: t.bobot, jenis: t.jenis,
            tabelLkps: t.tabelLkps, deskriptorSkor4: t.deskriptorSkor4, unsurSkor4: t.unsurSkor4,
            pertanyaanPemandu: t.pertanyaanPemandu, catatan: t.catatan,
          })),
          select: { id: true, kode: true, jenjang: true },
        });
        const idBaru = new Map(butir.map((t) => [`${t.jenjang}|${t.kode}`, t.id]));
        for (const t of asal.butir) petaButir.set(t.id, idBaru.get(`${t.jenjang}|${t.kode}`) as string);
      }

      await tx.butirSubBagian.createMany({
        data: asal.butir.flatMap((t) =>
          t.subBagian.map((r) => ({ butirId: petaButir.get(t.id) as string, subBagianId: petaSub.get(r.subBagianId) as string })),
        ),
      });

      const dokumen = [
        ...asal.butir.flatMap((t) => t.dokumenDiharapkan),
        ...asal.bagian.flatMap((b) => b.subBagian.flatMap((s) => s.dokumenDiharapkan)),
      ];
      const unik = new Map(dokumen.map((d) => [d.id, d]));
      await tx.dokumenDiharapkan.createMany({
        data: [...unik.values()].map((d) => ({
          nama: d.nama,
          urutan: d.urutan,
          butirId: d.butirId ? petaButir.get(d.butirId) ?? null : null,
          subBagianId: d.subBagianId ? petaSub.get(d.subBagianId) ?? null : null,
        })),
      });

      await tx.tabelLkpsAcuan.createMany({
        data: asal.tabelLkps.map((t) => ({ versiId: baru.id, kode: t.kode, sheet: t.sheet, judul: t.judul })),
      });
      return baru;
    },
    { timeout: 60_000 },
  );
  await catatAktivitas(p, "salin", "versi_instrumen", hasil.id, { dari: id, kode: hasil.kode });
  return hasil;
}

// ---------------------------------------------------------------- Bagian dan sub-bagian

export async function ambilBagian(p: Pengguna, bagianId: string) {
  pastikanAdmin(p);
  return prisma.bagian.findUnique({
    where: { id: bagianId },
    include: {
      versi: { select: { id: true, kode: true, nama: true, _count: { select: { proyek: true } } } },
      subBagian: {
        orderBy: { urutan: "asc" },
        include: { butir: { include: { butir: { select: { id: true, kode: true, jenjang: true, bobot: true } } } } },
      },
    },
  });
}

export async function ubahBagian(p: Pengguna, bagianId: string, masukan: unknown) {
  pastikanAdmin(p);
  const data = skemaBagianUbah.parse(masukan);
  const b = await prisma.bagian.findUniqueOrThrow({ where: { id: bagianId } });
  await pastikanVersiBisaDiubah(prisma, b.versiId);
  await prisma.bagian.update({ where: { id: bagianId }, data });
  await catatAktivitas(p, "ubah", "bagian", bagianId, { kode: b.kode });
}

export async function simpanSubBagian(p: Pengguna, bagianId: string, masukan: MasukanSubBagian, id?: string) {
  pastikanAdmin(p);
  const data = skemaSubBagian.parse(masukan);
  const bagian = await prisma.bagian.findUniqueOrThrow({ where: { id: bagianId } });
  await pastikanVersiBisaDiubah(prisma, bagian.versiId);
  const bentrok = await prisma.subBagian.findFirst({
    where: { kode: data.kode, bagian: { versiId: bagian.versiId }, NOT: id ? { id } : undefined },
  });
  if (bentrok) throw new GalatPengguna(`Kode sub-bagian ${data.kode} sudah dipakai di versi ini.`);
  // form menampilkan jenjang efektif; saat disimpan, penimpaan jenjang diganti isian form
  const isi = { ...data, varian: data.varian as Prisma.InputJsonValue, jenjangOverride: [] };
  const s = id
    ? await prisma.subBagian.update({ where: { id }, data: isi })
    : await prisma.subBagian.create({ data: { ...isi, bagianId } });
  await catatAktivitas(p, id ? "ubah" : "buat", "sub_bagian", s.id, { kode: s.kode });
  return s;
}

export async function hapusSubBagian(p: Pengguna, id: string) {
  pastikanAdmin(p);
  const s = await prisma.subBagian.findUniqueOrThrow({ where: { id }, include: { bagian: true } });
  await pastikanVersiBisaDiubah(prisma, s.bagian.versiId);
  await prisma.subBagian.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "sub_bagian", id, { kode: s.kode });
}

// ---------------------------------------------------------------- Butir

export async function daftarButir(p: Pengguna, versiId: string, jenjang: string) {
  pastikanAdmin(p);
  return prisma.butirPenilaian.findMany({
    where: { versiId, jenjang },
    orderBy: { urutan: "asc" },
    include: { subBagian: { include: { subBagian: { select: { kode: true } } } } },
  });
}

export async function ambilButir(p: Pengguna, id: string) {
  pastikanAdmin(p);
  return prisma.butirPenilaian.findUnique({
    where: { id },
    include: {
      subBagian: true,
      dokumenDiharapkan: { orderBy: { urutan: "asc" } },
      versi: { select: { id: true, kode: true, _count: { select: { proyek: true } } } },
    },
  });
}

/** Pilihan sub-bagian untuk pemetaan butir (IKU dan sub-bagian bab berbutir). */
export async function pilihanSubBagian(p: Pengguna, versiId: string) {
  pastikanAdmin(p);
  return prisma.subBagian.findMany({
    where: { bagian: { versiId }, tipe: { in: ["iku", "narasi", "bersama"] } },
    orderBy: [{ bagian: { urutan: "asc" } }, { urutan: "asc" }],
    select: { id: true, kode: true, label: true, judul: true, bagian: { select: { kode: true } } },
  });
}

export async function simpanButir(p: Pengguna, versiId: string, masukan: MasukanButir, id?: string) {
  pastikanAdmin(p);
  const data = skemaButir.parse(masukan);
  await pastikanVersiBisaDiubah(prisma, versiId);
  const bagian = await prisma.bagian.findFirst({ where: { versiId, kode: data.bagianKode } });
  if (!bagian) throw new GalatPengguna(`Bagian ${data.bagianKode} tidak ada di versi ini.`);
  const bentrok = await prisma.butirPenilaian.findFirst({
    where: { versiId, jenjang: data.jenjang, kode: data.kode, NOT: id ? { id } : undefined },
  });
  if (bentrok) throw new GalatPengguna(`Butir ${data.kode} untuk jenjang ${data.jenjang} sudah ada.`);
  const subSah = await prisma.subBagian.count({ where: { id: { in: data.subBagianIds }, bagian: { versiId } } });
  if (subSah !== data.subBagianIds.length) throw new GalatPengguna("Sub-bagian yang dipilih tidak ada di versi ini.");

  // pertanyaan pemandu dan dokumen yang diharapkan tidak dipakai lagi (revisi 19 Okt 2026)
  const { subBagianIds, dokumenPendukung: _dokumen, pertanyaanPemandu: _pemandu, ...kolom } = { ...data, kodeRumus: periksaKodeRumus(data.kodeRumus) };
  const butir = await prisma.$transaction(async (tx) => {
    const t = id
      ? await tx.butirPenilaian.update({ where: { id }, data: kolom })
      : await tx.butirPenilaian.create({ data: { ...kolom, versiId } });
    await tx.butirSubBagian.deleteMany({ where: { butirId: t.id } });
    await tx.butirSubBagian.createMany({ data: subBagianIds.map((subBagianId) => ({ butirId: t.id, subBagianId })) });
    return t;
  });
  await catatAktivitas(p, id ? "ubah" : "buat", "butir", butir.id, { kode: butir.kode, jenjang: butir.jenjang });
  return butir;
}

export async function hapusButir(p: Pengguna, id: string) {
  pastikanAdmin(p);
  const t = await prisma.butirPenilaian.findUniqueOrThrow({ where: { id } });
  await pastikanVersiBisaDiubah(prisma, t.versiId);
  await prisma.butirPenilaian.delete({ where: { id } });
  await catatAktivitas(p, "hapus", "butir", id, { kode: t.kode, jenjang: t.jenjang });
}

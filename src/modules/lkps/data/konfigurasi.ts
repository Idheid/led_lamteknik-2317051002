import { z } from "zod";
import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaLkps, pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { LAM_TEKNIK_2024_TEMPLATE } from "@/modules/lkps/domain/templat";
import { dataKriteriaDariTemplat } from "@/modules/lkps/domain/konfigurasi-awal";
import { benar, benarBawaanYa, skemaId, teks, teksBebas } from "@/modules/lkps/domain/validasi";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/konfigurasi/route.ts.
// Gabung LKPS G4: aksi dan bentuk respons sama. Perbedaan:
// - GET tidak lagi mengisi konfigurasi bawaan (dipindah ke seed idempoten, G3);
// - menulis hanya Admin UPPS (konfigurasi berlaku seluruh fakultas);
// - menghapus regulasi/kriteria/tabel yang sudah diisi prodi ditolak, karena isian prodi (LkpsIsianTabel, keputusan
//   G0 no. 1) ikut terhapus; nonaktifkan saja. Kode asal tidak punya isian per prodi.

/** GET: `{ regulasiList }` beserta kriteria dan tabel (konfigurasi saja, tanpa isian prodi). */
export async function bacaKonfigurasi(p: Pengguna) {
  pastikanBacaLkps(p, "konfigurasi", null);
  const regulasiList = await prisma.lkpsRegulasi.findMany({
    include: { kriteriaList: { orderBy: { nomorUrut: "asc" }, include: { tabelList: { orderBy: { nomorTabel: "asc" } } } } },
    orderBy: { createdAt: "asc" },
  });
  return { regulasiList };
}

const skemaRegulasi = z.object({
  nama: teks("Nama regulasi", 300),
  tahunAkademik: teks("Tahun akademik", 20),
  keterangan: teksBebas(2000),
  statusAktif: benar,
  cloneFromId: z.string().max(64).nullish(),
});
const skemaUbahRegulasi = skemaRegulasi.omit({ cloneFromId: true }).extend({ id: teks("ID", 64) });
const skemaMuatTemplat = z.object({ regulasiId: teks("ID regulasi tujuan", 64), replaceExisting: benar });
const skemaKriteria = z.object({
  regulasiId: z.string().max(64).nullish(),
  nomorUrut: z.preprocess((v) => Number(v) || 1, z.number().int()),
  kode: teks("Kode kriteria", 20),
  nama: teks("Nama kriteria", 300),
  deskripsi: teksBebas(5000),
  levelWewenang: teksBebas(20).transform((v) => v || "PRODI"),
  statusAktif: benarBawaanYa,
});
const skemaUbahKriteria = skemaKriteria.omit({ regulasiId: true }).extend({ id: teks("ID", 64) });
const skemaStatus = z.object({ id: teks("ID", 64), statusAktif: benar });
const formatKolom = z.unknown().transform((v) => (v && typeof v === "object" ? JSON.stringify(v) : typeof v === "string" ? v : null));
const skemaTabel = z.object({
  kriteriaId: teks("Kriteria", 64),
  nomorTabel: teks("Nomor tabel", 30),
  namaTabel: teks("Nama tabel", 300),
  deskripsi: teksBebas(5000),
  levelPengisi: teksBebas(20).transform((v) => v || "PRODI"),
  wajibUploadBukti: benarBawaanYa,
  statusAktif: benarBawaanYa,
  formatKolom,
});
const skemaUbahTabel = skemaTabel.omit({ kriteriaId: true }).extend({ id: teks("ID", 64) });

async function tolakBilaSudahDiisi(where: { tabelId?: string; tabel?: object }, apa: string): Promise<void> {
  const n = await prisma.lkpsIsianTabel.count({ where });
  if (n > 0) throw new GalatPengguna(`${apa} sudah diisi program studi (${n} isian tabel). Nonaktifkan saja supaya isian tidak hilang.`);
}

/** POST `{ action, payload }` kode asal. Respons sama: `{ success, regulasi | kriteria | tabel | message }`. */
export async function ubahKonfigurasi(p: Pengguna, action: string, payload: unknown) {
  pastikanTulisLkps(p, "konfigurasi", null);
  switch (action) {
    case "createRegulasi": {
      const { cloneFromId, ...data } = skemaRegulasi.parse(payload);
      const regulasi = await prisma.$transaction(async (tx) => {
        const reg = await tx.lkpsRegulasi.create({ data });
        if (cloneFromId) {
          const sumber = await tx.lkpsKriteriaConfig.findMany({ where: { regulasiId: cloneFromId }, include: { tabelList: true }, orderBy: { nomorUrut: "asc" } });
          for (const k of sumber) {
            await tx.lkpsKriteriaConfig.create({
              data: {
                regulasiId: reg.id, nomorUrut: k.nomorUrut, kode: k.kode, nama: k.nama, levelWewenang: k.levelWewenang,
                deskripsi: k.deskripsi, statusAktif: k.statusAktif,
                tabelList: {
                  create: k.tabelList.map((t) => ({
                    nomorTabel: t.nomorTabel, namaTabel: t.namaTabel, levelPengisi: t.levelPengisi, wajibUploadBukti: t.wajibUploadBukti,
                    deskripsi: t.deskripsi, formatKolom: t.formatKolom, statusAktif: t.statusAktif,
                  })),
                },
              },
            });
          }
        }
        return reg;
      });
      return { success: true, regulasi };
    }
    case "updateRegulasi": {
      const { id, ...data } = skemaUbahRegulasi.parse(payload);
      return { success: true, regulasi: await prisma.lkpsRegulasi.update({ where: { id }, data }) };
    }
    case "setActiveRegulasi": {
      const { id } = skemaId.parse(payload);
      const [, regulasi] = await prisma.$transaction([
        prisma.lkpsRegulasi.updateMany({ data: { statusAktif: false } }),
        prisma.lkpsRegulasi.update({ where: { id }, data: { statusAktif: true } }),
      ]);
      return { success: true, regulasi };
    }
    case "deleteRegulasi": {
      const { id } = skemaId.parse(payload);
      await tolakBilaSudahDiisi({ tabel: { kriteria: { regulasiId: id } } }, "Regulasi ini");
      await prisma.lkpsRegulasi.delete({ where: { id } });
      return { success: true };
    }
    case "loadTemplateLAMTeknik": {
      const { regulasiId, replaceExisting } = skemaMuatTemplat.parse(payload);
      if (replaceExisting) await tolakBilaSudahDiisi({ tabel: { kriteria: { regulasiId } } }, "Kriteria regulasi ini");
      await prisma.$transaction(async (tx) => {
        if (replaceExisting) await tx.lkpsKriteriaConfig.deleteMany({ where: { regulasiId } });
        for (const k of LAM_TEKNIK_2024_TEMPLATE) await tx.lkpsKriteriaConfig.create({ data: dataKriteriaDariTemplat(k, regulasiId) });
      });
      return { success: true, message: "Template Baku LAM Teknik berhasil dimuat!" };
    }
    case "createKriteria": {
      const data = skemaKriteria.parse(payload);
      return { success: true, kriteria: await prisma.lkpsKriteriaConfig.create({ data }) };
    }
    case "updateKriteria": {
      const { id, ...data } = skemaUbahKriteria.parse(payload);
      return { success: true, kriteria: await prisma.lkpsKriteriaConfig.update({ where: { id }, data }) };
    }
    case "toggleStatusKriteria": {
      const { id, statusAktif } = skemaStatus.parse(payload);
      return { success: true, kriteria: await prisma.lkpsKriteriaConfig.update({ where: { id }, data: { statusAktif } }) };
    }
    case "deleteKriteria": {
      const { id } = skemaId.parse(payload);
      await tolakBilaSudahDiisi({ tabel: { kriteriaId: id } }, "Kriteria ini");
      await prisma.$transaction([
        prisma.lkpsTabelConfig.deleteMany({ where: { kriteriaId: id } }),
        prisma.lkpsKriteriaConfig.delete({ where: { id } }),
      ]);
      return { success: true, message: "Kriteria beserta seluruh tabel di dalamnya berhasil dihapus" };
    }
    case "createTabel": {
      const data = skemaTabel.parse(payload);
      return { success: true, tabel: await prisma.lkpsTabelConfig.create({ data }) };
    }
    case "updateTabel": {
      const { id, ...data } = skemaUbahTabel.parse(payload);
      return { success: true, tabel: await prisma.lkpsTabelConfig.update({ where: { id }, data }) };
    }
    case "toggleStatusTabel": {
      const { id, statusAktif } = skemaStatus.parse(payload);
      return { success: true, tabel: await prisma.lkpsTabelConfig.update({ where: { id }, data: { statusAktif } }) };
    }
    case "deleteTabel": {
      const { id } = skemaId.parse(payload);
      await tolakBilaSudahDiisi({ tabelId: id }, "Tabel ini");
      await prisma.lkpsTabelConfig.delete({ where: { id } });
      return { success: true, message: "Tabel LKPS berhasil dihapus" };
    }
    default:
      throw new GalatPengguna("Aksi tidak dikenal.");
  }
}

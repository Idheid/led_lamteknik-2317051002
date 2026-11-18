import type { KriteriaTemplateDef } from './templat/index.ts';

/**
 * Gabung LKPS G3: konfigurasi awal kriteria dan tabel LKPS dari templat Ghalib (LAM_TEKNIK_2024_TEMPLATE). Nilainya sama
 * dengan isi otomatis di GET /api/konfigurasi kode asal (c718eff); di sini dipanggil seed idempoten, bukan dari GET.
 */

export const REGULASI_BAWAAN = {
  nama: 'Instrumen Akreditasi LAM Teknik 2024 (Diploma III / Sarjana Terapan)',
  tahunAkademik: '2024/2025',
  statusAktif: true,
  keterangan: 'Template resmi baku LAM Teknik untuk program vokasi dan sarjana keteknikan sesuai regulasi BAN-PT & Kemendikbudristek.',
} as const;

/** Data pembuatan satu kriteria beserta tabelnya (bentuk `create` Prisma untuk LkpsKriteriaConfig). */
export function dataKriteriaDariTemplat(k: KriteriaTemplateDef, regulasiId: string) {
  return {
    regulasiId,
    nomorUrut: k.nomorUrut,
    kode: k.kode,
    nama: k.nama,
    levelWewenang: k.levelWewenang,
    deskripsi: k.deskripsi,
    statusAktif: true,
    tabelList: {
      create: k.tabelList.map((t) => ({
        nomorTabel: t.nomorTabel,
        namaTabel: t.namaTabel,
        levelPengisi: t.levelPengisi,
        wajibUploadBukti: t.wajibUploadBukti,
        deskripsi: t.deskripsi,
        formatKolom: JSON.stringify({
          sheetRef: t.sheetRef,
          targetJenjang: t.targetJenjang,
          konvensiWaktu: t.konvensiWaktu,
          kolom: t.kolom,
          dokumenBukti: t.dokumenBukti,
          rumusPenilaian: t.rumusPenilaian,
        }),
        statusAktif: true,
      })),
    },
  };
}

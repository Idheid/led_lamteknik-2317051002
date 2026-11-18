import { prisma } from "@/modules/bersama/db";
import { LAM_TEKNIK_2024_TEMPLATE } from "@/modules/lkps/domain/templat";
import { REGULASI_BAWAAN, dataKriteriaDariTemplat } from "@/modules/lkps/domain/konfigurasi-awal";

/**
 * Gabung LKPS G3: isi konfigurasi kriteria/tabel LKPS bawaan bila belum ada regulasi sama sekali (idempoten). Dipanggil
 * `npm run db:seed`. Hanya konfigurasi: tanpa akun dan tanpa data contoh (data contoh di seed Ghalib tidak dipindah).
 */
export async function isiKonfigurasiAwalLkps(): Promise<{ dibuat: boolean; kriteria: number }> {
  if ((await prisma.lkpsRegulasi.count()) > 0) return { dibuat: false, kriteria: 0 };
  await prisma.$transaction(async (tx) => {
    const reg = await tx.lkpsRegulasi.create({ data: REGULASI_BAWAAN });
    for (const k of LAM_TEKNIK_2024_TEMPLATE) await tx.lkpsKriteriaConfig.create({ data: dataKriteriaDariTemplat(k, reg.id) });
  });
  return { dibuat: true, kriteria: LAM_TEKNIK_2024_TEMPLATE.length };
}

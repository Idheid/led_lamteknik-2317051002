import { GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { prisma } from "@/modules/bersama/db";
import { pastikanBacaProdiLkps } from "@/modules/lkps/data/akses";
import { pastikanTulisLkps } from "@/modules/lkps/domain/akses";
import { skemaIsianTabel } from "@/modules/lkps/domain/validasi";
import { periksaBuktiDalam } from "@/modules/lkps/data/bantu";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/kriteria/[id]/route.ts.
// Gabung LKPS G4 (keputusan G0 no. 1): kode asal menyimpan baris isian di TabelConfig.formatKolom (`rows`,
// `buktiList`), sehingga semua prodi berbagi isian yang sama. Di sini isian disimpan per prodi di LkpsIsianTabel, lalu
// digabung kembali ke formatKolom saat dibaca supaya bentuk respons dan halaman kode asal tidak berubah.

const PESAN_TIDAK_ADA = "Kriteria tidak ditemukan.";

function uraiFormat(formatKolom: string | null): Record<string, unknown> {
  if (!formatKolom) return {};
  try {
    const v: unknown = JSON.parse(formatKolom);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : { customRaw: formatKolom };
  } catch {
    return { customRaw: formatKolom };
  }
}

function gabungIsian(formatKolom: string | null, isian: { baris: unknown; bukti: unknown } | undefined): string {
  const f = uraiFormat(formatKolom);
  // isian lama di konfigurasi (bila ada) tidak dipakai: isian selalu milik prodi aktif
  delete f.rows;
  delete f.buktiList;
  f.rows = Array.isArray(isian?.baris) ? isian.baris : [];
  if (isian?.bukti !== undefined && isian.bukti !== null) f.buktiList = isian.bukti;
  return JSON.stringify(f);
}

/** GET kode asal: kriteria + regulasi + tabelList; formatKolom tiap tabel memuat `rows`/`buktiList` prodi aktif. */
export async function bacaKriteria(p: Pengguna, prodiId: string, kriteriaId: string) {
  await pastikanBacaProdiLkps(p, "kriteria", prodiId);
  const kriteria = await prisma.lkpsKriteriaConfig.findUnique({
    where: { id: String(kriteriaId) },
    include: {
      regulasi: true,
      tabelList: { orderBy: { nomorTabel: "asc" }, include: { isian: { where: { prodiId } } } },
    },
  });
  if (!kriteria) throw new GalatPengguna(PESAN_TIDAK_ADA);
  return {
    ...kriteria,
    tabelList: kriteria.tabelList.map(({ isian, ...t }) => ({ ...t, formatKolom: gabungIsian(t.formatKolom, isian[0]) })),
  };
}

/** Aksi `saveTableRows { tabelId, rows, buktiList }` → `{ success, tabel }`. */
export async function simpanIsianTabel(p: Pengguna, prodiId: string, kriteriaId: string, masukan: unknown) {
  pastikanTulisLkps(p, "kriteria", prodiId);
  const { tabelId, rows, buktiList } = skemaIsianTabel.parse(masukan);
  const tabel = await prisma.lkpsTabelConfig.findFirst({ where: { id: tabelId, kriteriaId: String(kriteriaId) } });
  if (!tabel) throw new GalatPengguna("Tabel tidak ditemukan.");
  periksaBuktiDalam(rows, prodiId);
  periksaBuktiDalam(buktiList, prodiId);
  const baris = rows as object[];
  const bukti = buktiList === undefined ? undefined : (buktiList as object[]);
  const isian = await prisma.lkpsIsianTabel.upsert({
    where: { prodiId_tabelId: { prodiId, tabelId } },
    update: { baris, ...(bukti !== undefined ? { bukti } : {}) },
    create: { prodiId, tabelId, baris, ...(bukti !== undefined ? { bukti } : {}) },
  });
  return { success: true, tabel: { ...tabel, formatKolom: gabungIsian(tabel.formatKolom, isian) } };
}

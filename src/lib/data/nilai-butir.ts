import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatPengguna, type Pengguna } from "@/lib/akses";
import { ambilProyek, ambilProyekUbah } from "@/lib/data/proyek";
import { catatAktivitas } from "@/lib/data/log";
import { nilaiButirAngka, type NilaiButir } from "@/lib/domain/butir-angka";
import { hitungButir, type TabelMetrik } from "@/lib/domain/metrik-lkps";

/**
 * Nilai butir angka satu LED (revisi 19 Okt 2026): rumus lama lewat kodeRumus butir, atau nilai manual PJ.
 * Dipakai halaman sub-bagian, halaman Data LKPS, dan konteks generate (worker, tanpa sesi).
 */
export async function nilaiButirUntukProyek(proyek: { id: string; versiId: string; jenjang: string; tsTahunMulai: number }): Promise<{
  daftar: NilaiButir[];
  adaLkps: boolean;
  perluDicek: boolean;
}> {
  const [butir, berkas, manual] = await Promise.all([
    prisma.butirPenilaian.findMany({
      where: { versiId: proyek.versiId, jenjang: proyek.jenjang, jenis: "angka" },
      orderBy: { urutan: "asc" },
      select: { kode: true, jenis: true, kodeRumus: true },
    }),
    prisma.berkasLKPS.findFirst({ where: { proyekId: proyek.id, aktif: true }, include: { tabel: { orderBy: { urutan: "asc" } } } }),
    prisma.nilaiManual.findMany({ where: { proyekId: proyek.id } }),
  ]);
  const tabel: TabelMetrik[] = (berkas?.tabel ?? []).map((t) => ({ sheet: t.sheet, baris: t.baris as unknown as TabelMetrik["baris"] }));
  const konteks = { tsTahunMulai: proyek.tsTahunMulai };
  const daftar = nilaiButirAngka({
    butir,
    adaLkps: Boolean(berkas),
    hitung: (kode) => hitungButir(kode, tabel, konteks),
    manual: new Map(manual.map((m) => [m.butirKode, { nilai: m.nilai, keterangan: m.keterangan }])),
  });
  return { daftar, adaLkps: Boolean(berkas), perluDicek: (berkas?.tabel ?? []).some((t) => t.perluDicek) };
}

export async function nilaiButirProyek(p: Pengguna, proyekId: string) {
  return nilaiButirUntukProyek(await ambilProyek(p, proyekId));
}

const skemaNilaiManual = z.object({
  butirKode: z.string().trim().min(1).max(20),
  nilai: z.string().trim().max(500, "Nilai terlalu panjang (maks. 500 karakter)."),
  keterangan: z.string().trim().max(2000, "Keterangan terlalu panjang (maks. 2.000 karakter).").nullish(),
});

/** Simpan (atau hapus bila nilai kosong) nilai hasil hitung manual satu butir angka. */
export async function simpanNilaiManual(p: Pengguna, proyekId: string, masukan: { butirKode: string; nilai: string; keterangan?: string | null }) {
  const data = skemaNilaiManual.parse(masukan);
  const proyek = await ambilProyekUbah(p, proyekId);
  const butir = await prisma.butirPenilaian.findFirst({ where: { versiId: proyek.versiId, jenjang: proyek.jenjang, kode: data.butirKode } });
  if (!butir) throw new GalatPengguna("Butir tidak ada di instrumen LED ini.");
  if (butir.jenis !== "angka") throw new GalatPengguna("Nilai hitung hanya untuk butir angka.");
  if (!data.nilai) {
    await prisma.nilaiManual.deleteMany({ where: { proyekId: proyek.id, butirKode: data.butirKode } });
    return null;
  }
  const r = await prisma.nilaiManual.upsert({
    where: { proyekId_butirKode: { proyekId: proyek.id, butirKode: data.butirKode } },
    create: { proyekId: proyek.id, butirKode: data.butirKode, nilai: data.nilai, keterangan: data.keterangan || null },
    update: { nilai: data.nilai, keterangan: data.keterangan || null },
  });
  await catatAktivitas(p, "nilai_manual", "proyek", proyek.id, { butirKode: data.butirKode });
  return r;
}

import { z } from "zod";
import { prisma } from "@/lib/db";
import { GalatPengguna, type Pengguna } from "@/lib/akses";
import { ambilProyek, ambilProyekUbah } from "@/lib/data/proyek";
import { catatAktivitas } from "@/lib/data/log";
import { nilaiButirUntukProyek } from "@/lib/data/nilai-butir";
import { angkaTeks, hitungCapaian, trenTabel, type HasilCapaian, type Tren } from "@/lib/domain/capaian";
import type { Metrik, Sel } from "@/lib/domain/metrik-lkps";

/**
 * Target per butir angka dan capaian yang dihitung sistem (revisi 22 Okt 2026, saran 2). Capaian = nilai utama rumus
 * butir (atau nilai hitung manual PJ); persen capaian, status, dan tren TS-2..TS dihitung di kode.
 */

export interface CapaianButir {
  butir: string;
  target: { target: string; satuan: string | null; sumber: string | null; lebihKecil: boolean } | null;
  /** capaian dalam satuan target (persen ditulis 0–100) */
  capaian: number | null;
  satuanCapaian: string | null;
  hasil: HasilCapaian | null;
  tren: Tren[];
}

/** Nilai utama rumus dalam satuan yang diketik orang (persen 0–100). */
function nilaiUtama(m: Metrik | undefined): { nilai: number | null; satuan: string | null } {
  if (!m || m.nilai === null) return { nilai: null, satuan: null };
  if (m.satuan === "persen") return { nilai: Math.round(m.nilai * 10_000) / 100, satuan: "%" };
  return { nilai: m.nilai, satuan: m.satuan === "angka" || m.satuan === "rasio" ? null : m.satuan };
}

export async function capaianButirUntukProyek(proyek: { id: string; versiId: string; jenjang: string; tsTahunMulai: number }): Promise<Map<string, CapaianButir>> {
  const [nilai, target, butir, berkas] = await Promise.all([
    nilaiButirUntukProyek(proyek),
    prisma.targetButir.findMany({ where: { proyekId: proyek.id } }),
    prisma.butirPenilaian.findMany({ where: { versiId: proyek.versiId, jenjang: proyek.jenjang, jenis: "angka" }, select: { kode: true, tabelLkps: true } }),
    prisma.berkasLKPS.findFirst({ where: { proyekId: proyek.id, aktif: true }, include: { tabel: { select: { kode: true, kolom: true, baris: true } } } }),
  ]);
  const hasil = new Map<string, CapaianButir>();
  for (const n of nilai.daftar) {
    const t = target.find((x) => x.butirKode === n.butir) ?? null;
    let capaian: number | null = null;
    let satuan: string | null = null;
    if (n.sumber === "rumus" && n.hasil) {
      const u = nilaiUtama(n.hasil.metrik.find((m) => m.kode === n.hasil!.utama));
      capaian = u.nilai;
      satuan = u.satuan;
    } else if (n.sumber === "manual" && n.manual) {
      capaian = angkaTeks(n.manual.nilai);
      satuan = /%/.test(n.manual.nilai) ? "%" : null;
    }
    const kodeTabel = butir.find((b) => b.kode === n.butir)?.tabelLkps ?? [];
    const tren = (berkas?.tabel ?? [])
      .filter((x) => kodeTabel.includes(x.kode))
      .flatMap((x) => trenTabel({ kolom: x.kolom as { kunci: string; label: string }[], baris: x.baris as { sel: Record<string, Sel> }[] }));
    hasil.set(n.butir, {
      butir: n.butir,
      target: t ? { target: t.target, satuan: t.satuan, sumber: t.sumber, lebihKecil: t.lebihKecil } : null,
      capaian,
      satuanCapaian: satuan,
      hasil: t ? hitungCapaian(capaian, angkaTeks(t.target), t.lebihKecil) : null,
      tren,
    });
  }
  return hasil;
}

export async function capaianButirProyek(p: Pengguna, proyekId: string) {
  return capaianButirUntukProyek(await ambilProyek(p, proyekId));
}

const skemaTarget = z.object({
  butirKode: z.string().trim().min(1).max(20),
  target: z.string().trim().max(50),
  satuan: z.string().trim().max(30).nullish(),
  sumber: z.string().trim().max(300).nullish(),
  lebihKecil: z.boolean().default(false),
});

/** Simpan target satu butir angka; target kosong menghapusnya. */
export async function simpanTarget(p: Pengguna, proyekId: string, masukan: z.input<typeof skemaTarget>) {
  const data = skemaTarget.parse(masukan);
  const proyek = await ambilProyekUbah(p, proyekId);
  const butir = await prisma.butirPenilaian.findFirst({ where: { versiId: proyek.versiId, jenjang: proyek.jenjang, kode: data.butirKode } });
  if (!butir) throw new GalatPengguna("Butir tidak ada di instrumen LED ini.");
  if (butir.jenis !== "angka") throw new GalatPengguna("Target hanya untuk butir angka.");
  if (!data.target) {
    await prisma.targetButir.deleteMany({ where: { proyekId: proyek.id, butirKode: data.butirKode } });
    return null;
  }
  if (angkaTeks(data.target) === null) throw new GalatPengguna("Target harus berupa angka, misalnya 70 atau 1,5.");
  const isi = { target: data.target, satuan: data.satuan || null, sumber: data.sumber || null, lebihKecil: data.lebihKecil };
  const r = await prisma.targetButir.upsert({
    where: { proyekId_butirKode: { proyekId: proyek.id, butirKode: data.butirKode } },
    create: { proyekId: proyek.id, butirKode: data.butirKode, ...isi },
    update: isi,
  });
  await catatAktivitas(p, "target_butir", "proyek", proyek.id, { butirKode: data.butirKode });
  return r;
}

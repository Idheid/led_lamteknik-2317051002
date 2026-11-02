import { prisma } from "@/modules/bersama/db";
import { pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";

/**
 * F-20: log pemakaian token per panggilan generate untuk super admin. Isi kunci tidak pernah ditampilkan;
 * hanya label dan 4 karakter terakhir.
 */
export async function ringkasanPemakaian(p: Pengguna, opsi: { hari?: number; prodiId?: string | null } = {}) {
  pastikanAdmin(p);
  const hari = opsi.hari ?? 7;
  const sejak = new Date(Date.now() - hari * 24 * 60 * 60_000);
  const saring = { createdAt: { gte: sejak }, ...(opsi.prodiId ? { prodiId: opsi.prodiId } : {}) };
  const [perModel, perProdi, terbaru, prodi] = await Promise.all([
    prisma.logPemakaian.groupBy({
      by: ["model", "berhasil"],
      where: saring,
      _count: { _all: true },
      _sum: { tokenMasuk: true, tokenKeluar: true },
    }),
    prisma.logPemakaian.groupBy({
      by: ["prodiId"],
      where: { ...saring, berhasil: true },
      _count: { _all: true },
      _sum: { tokenMasuk: true, tokenKeluar: true },
    }),
    prisma.logPemakaian.findMany({
      where: saring,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { kunci: { select: { label: true, akhiran: true, pemilik: true } } },
    }),
    prisma.prodi.findMany({ select: { id: true, nama: true, jenjang: true } }),
  ]);
  const proyekId = [...new Set(terbaru.map((l) => l.proyekId).filter((x): x is string => Boolean(x)))];
  const proyek = await prisma.proyekLED.findMany({ where: { id: { in: proyekId } }, select: { id: true, nama: true } });
  const namaProdi = new Map(prodi.map((x) => [x.id, `${x.nama} (${x.jenjang})`]));
  const namaProyek = new Map(proyek.map((x) => [x.id, x.nama]));

  const model = new Map<string, { model: string; berhasil: number; gagal: number; tokenMasuk: number; tokenKeluar: number }>();
  for (const g of perModel) {
    const m = model.get(g.model) ?? { model: g.model, berhasil: 0, gagal: 0, tokenMasuk: 0, tokenKeluar: 0 };
    if (g.berhasil) m.berhasil += g._count._all;
    else m.gagal += g._count._all;
    m.tokenMasuk += g._sum.tokenMasuk ?? 0;
    m.tokenKeluar += g._sum.tokenKeluar ?? 0;
    model.set(g.model, m);
  }
  const daftarModel = [...model.values()].sort((a, b) => b.berhasil + b.gagal - (a.berhasil + a.gagal));
  return {
    hari,
    total: {
      berhasil: daftarModel.reduce((n, m) => n + m.berhasil, 0),
      gagal: daftarModel.reduce((n, m) => n + m.gagal, 0),
      tokenMasuk: daftarModel.reduce((n, m) => n + m.tokenMasuk, 0),
      tokenKeluar: daftarModel.reduce((n, m) => n + m.tokenKeluar, 0),
    },
    perModel: daftarModel,
    perProdi: perProdi
      .map((g) => ({
        prodi: g.prodiId ? namaProdi.get(g.prodiId) ?? "Prodi terhapus" : "Tanpa prodi",
        panggilan: g._count._all,
        tokenMasuk: g._sum.tokenMasuk ?? 0,
        tokenKeluar: g._sum.tokenKeluar ?? 0,
      }))
      .sort((a, b) => b.panggilan - a.panggilan),
    terbaru: terbaru.map((l) => ({
      id: l.id,
      waktu: l.createdAt,
      prodi: l.prodiId ? namaProdi.get(l.prodiId) ?? "—" : "—",
      proyek: l.proyekId ? namaProyek.get(l.proyekId) ?? "—" : "—",
      subBagian: l.subBagianKode,
      model: l.model,
      kunci: l.kunci ? `${l.kunci.label} (…${l.kunci.akhiran})${l.kunci.pemilik === "super_admin" ? " · cadangan" : ""}` : "kunci terhapus",
      tokenMasuk: l.tokenMasuk,
      tokenKeluar: l.tokenKeluar,
      durasiMs: l.durasiMs,
      berhasil: l.berhasil,
      galat: l.galat,
    })),
  };
}

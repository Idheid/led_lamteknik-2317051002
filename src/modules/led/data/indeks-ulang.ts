import { prisma } from "@/modules/bersama/db";
import { GalatPengguna, pastikanAdmin, type Pengguna } from "@/modules/bersama/akses";
import { catatAktivitas } from "@/modules/bersama/data/log";
import { ANTREAN, kirimTugas } from "@/modules/bersama/antrean";
import { hitungPerluIndeksUlang } from "@/modules/led/proses/indeks-ulang";

/** Rencana 10 Nov T4: status dan perkiraan "Indeks ulang potongan" untuk Admin UPPS. */
export async function statusIndeksUlang(p: Pengguna) {
  pastikanAdmin(p);
  const [perlu, terakhir] = await Promise.all([
    hitungPerluIndeksUlang(),
    prisma.tugasIndeksUlang.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  return { perlu, terakhir };
}

export async function mulaiIndeksUlang(p: Pengguna) {
  pastikanAdmin(p);
  const berjalan = await prisma.tugasIndeksUlang.findFirst({ where: { status: { in: ["antre", "berjalan"] } } });
  if (berjalan) throw new GalatPengguna("Indeks ulang masih berjalan.");
  const perlu = await hitungPerluIndeksUlang();
  if (perlu.potongan === 0) throw new GalatPengguna("Semua potongan sudah berkepala konteks.");
  const t = await prisma.tugasIndeksUlang.create({ data: { total: perlu.potongan, dibuatOlehId: p.id } });
  await catatAktivitas(p, "mulai", "indeks_ulang", t.id, perlu);
  await kirimTugas(ANTREAN.indeksUlang, { tugasId: t.id });
  return t;
}

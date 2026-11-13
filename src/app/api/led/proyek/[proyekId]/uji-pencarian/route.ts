import { jalankanRute } from "@/modules/bersama/rute";
import { eksporDataUjiPencarian } from "@/modules/led/data/uji-pencarian";
import { responsCsv } from "@/modules/led/data/unduh-csv";

/** Rencana 10 Nov T2: unduh data uji pencarian satu LED (Tim Prodi LED prodinya, Admin UPPS LED mana pun). */
export async function GET(_req: Request, ctx: RouteContext<"/api/led/proyek/[proyekId]/uji-pencarian">) {
  const { proyekId } = await ctx.params;
  return jalankanRute(async (p) => {
    const h = await eksporDataUjiPencarian(p, proyekId);
    return responsCsv(h.csv, h.namaBerkas);
  });
}

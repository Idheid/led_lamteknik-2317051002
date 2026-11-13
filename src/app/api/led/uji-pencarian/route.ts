import { jalankanRute } from "@/modules/bersama/rute";
import { eksporDataUjiPencarian } from "@/modules/led/data/uji-pencarian";
import { responsCsv } from "@/modules/led/data/unduh-csv";

/** Rencana 10 Nov T2: unduh data uji pencarian semua LED (Admin UPPS). */
export async function GET() {
  return jalankanRute(async (p) => {
    const h = await eksporDataUjiPencarian(p, null);
    return responsCsv(h.csv, h.namaBerkas);
  });
}

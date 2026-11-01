import type { PgBoss } from "pg-boss";
import { ANTREAN } from "@/modules/bersama/antrean";
import { buatCadangan, jadwalCadangan } from "@/modules/bersama/proses/cadangan";
import { kirimPengingatAkreditasi } from "@/modules/bersama/data/pengingat-akreditasi";

/**
 * Pengerja bersama: cadangan harian basis data dan folder unggahan (revisi 22 Okt 2026). "missed: once" = laptop/server
 * yang mati saat jadwal tetap mencadangkan sekali ketika worker menyala lagi.
 */
export async function daftarkanPengerjaBersama(bos: PgBoss): Promise<void> {
  await bos.work(ANTREAN.cadangan, { localConcurrency: 1 }, async () => {
    const h = await buatCadangan();
    console.log(`[cadangan] ${h.berhasil ? `berhasil ${h.folder}` : `gagal: ${h.pesan}`}`);
    if (!h.berhasil) throw new Error(h.pesan);
  });
  if (process.env.CADANGAN_NONAKTIF === "1") await bos.unschedule(ANTREAN.cadangan);
  else await bos.schedule(ANTREAN.cadangan, jadwalCadangan(), null, { tz: "Asia/Jakarta", missed: "once" });

  // L2: pengingat akreditasi berakhir (sekali per ambang 18/12/6 bulan, dicatat di PengingatTerkirim)
  await bos.work(ANTREAN.pengingatAkreditasi, { localConcurrency: 1 }, async () => {
    console.log(`[pengingat-akreditasi] ${await kirimPengingatAkreditasi()} prodi diingatkan`);
  });
  await bos.schedule(ANTREAN.pengingatAkreditasi, process.env.PENGINGAT_JADWAL || "0 7 * * *", null, { tz: "Asia/Jakarta", missed: "once" });
}

export function keteranganCadangan(): string {
  return process.env.CADANGAN_NONAKTIF === "1" ? "Cadangan harian dimatikan (CADANGAN_NONAKTIF=1)." : `Cadangan harian: ${jadwalCadangan()} WIB.`;
}

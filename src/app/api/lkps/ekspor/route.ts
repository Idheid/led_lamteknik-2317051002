import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { eksporLkps } from "@/modules/lkps/data/ekspor";

/** Gabung LKPS G4: pengganti /api/export kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff); LKPS prodi aktif. */
export function GET(req: Request) {
  return jalankanRute(async (p) => {
    const { nama, isi } = await eksporLkps(p, await prodiAktifWajib(p, req));
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nama}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}

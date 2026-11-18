import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { GalatOneDataMati, sinkronOneData } from "@/modules/lkps/data/onedata/sinkron";

/**
 * Gabung LKPS G6: pengganti /api/onedata/sync kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). Mati secara bawaan:
 * tanpa LKPS_ONEDATA_AKTIF=true dan variabel MYUNILA_* lengkap → 503 "Sinkron One Data belum diaktifkan".
 */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const masukan = await req.json().catch(() => ({}));
    try {
      return NextResponse.json(await sinkronOneData(p, prodiId, masukan));
    } catch (e) {
      if (e instanceof GalatOneDataMati) return NextResponse.json({ pesan: e.message }, { status: 503 });
      throw e;
    }
  });
}

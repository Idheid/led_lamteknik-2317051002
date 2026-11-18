import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { hitungSkorLkps } from "@/modules/lkps/data/hitung";

/** Gabung LKPS G4: pengganti /api/computation kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff); skor prodi aktif. */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await hitungSkorLkps(p, await prodiAktifWajib(p, req))));
}

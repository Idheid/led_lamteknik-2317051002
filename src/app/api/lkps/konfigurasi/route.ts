import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { bacaAksi } from "@/modules/lkps/rute";
import { bacaKonfigurasi, ubahKonfigurasi } from "@/modules/lkps/data/konfigurasi";

/** Gabung LKPS G4: pengganti /api/konfigurasi kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff); berlaku seluruh fakultas, tanpa prodi. */
export function GET() {
  return jalankanRute(async (p) => NextResponse.json(await bacaKonfigurasi(p)));
}

/** `{ action, payload }`; menulis hanya Admin UPPS. */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const { action, payload } = await bacaAksi(req);
    return NextResponse.json(await ubahKonfigurasi(p, action, payload));
  });
}

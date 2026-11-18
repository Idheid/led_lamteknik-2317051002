import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { bacaJson } from "@/modules/lkps/rute";
import { bacaKerjasama, gantiKerjasama } from "@/modules/lkps/data/kerjasama";

/** Gabung LKPS G4: pengganti /api/kerjasama kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaKerjasama(p, await prodiAktifWajib(p, req))));
}

/** `{ rows }` → ganti semua kerja sama prodi aktif. */
export function POST(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await gantiKerjasama(p, await prodiAktifWajib(p, req), await bacaJson(req))));
}

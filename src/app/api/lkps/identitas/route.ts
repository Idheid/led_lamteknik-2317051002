import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { bacaJson } from "@/modules/lkps/rute";
import { bacaIdentitas, simpanIdentitas } from "@/modules/lkps/data/identitas";

/** Gabung LKPS G4: pengganti /api/identitas kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaIdentitas(p, await prodiAktifWajib(p, req))));
}

/** `{ identitas, prodiList, timList }`: hanya tim penyusun yang disimpan (identitas dan prodi dikelola di Pengaturan). */
export function POST(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await simpanIdentitas(p, await prodiAktifWajib(p, req), await bacaJson(req))));
}

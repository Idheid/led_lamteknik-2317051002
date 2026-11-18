import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { bacaAksi, pilihAksi } from "@/modules/lkps/rute";
import { bacaPenjaminan, simpanDokumenSpmi } from "@/modules/lkps/data/penjaminan";

/** Gabung LKPS G4: pengganti /api/penjaminan kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaPenjaminan(p, await prodiAktifWajib(p, req))));
}

const AKSI = {
  saveDokumen: simpanDokumenSpmi,
} as const;

/** `{ action, payload }` dengan nama aksi kode asal. */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const { action, payload } = await bacaAksi(req);
    return NextResponse.json(await pilihAksi(AKSI, action)(p, prodiId, payload));
  });
}

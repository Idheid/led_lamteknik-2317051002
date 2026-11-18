import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { bacaJson } from "@/modules/lkps/rute";
import { bacaMahasiswa, simpanMahasiswa } from "@/modules/lkps/data/mahasiswa";

/** Gabung LKPS G4: pengganti /api/mahasiswa kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaMahasiswa(p, await prodiAktifWajib(p, req))));
}

/** `{ seleksi, asing }`. */
export function POST(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await simpanMahasiswa(p, await prodiAktifWajib(p, req), await bacaJson(req))));
}

import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { bacaAksi, pilihAksi } from "@/modules/lkps/rute";
import { bacaPendidikan, simpanMataKuliah, hapusMataKuliah, simpanMbkm, hapusMbkm } from "@/modules/lkps/data/pendidikan";

/** Gabung LKPS G4: pengganti /api/pendidikan kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaPendidikan(p, await prodiAktifWajib(p, req))));
}

const AKSI = {
  saveMK: simpanMataKuliah,
  deleteMK: hapusMataKuliah,
  saveMBKM: simpanMbkm,
  deleteMBKM: hapusMbkm,
} as const;

/** `{ action, payload }` dengan nama aksi kode asal. */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const { action, payload } = await bacaAksi(req);
    return NextResponse.json(await pilihAksi(AKSI, action)(p, prodiId, payload));
  });
}

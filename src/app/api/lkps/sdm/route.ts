import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { bacaAksi, pilihAksi } from "@/modules/lkps/rute";
import { bacaSdm, simpanDosen, hapusDosen, simpanBimbingan, hapusBimbingan, simpanEwmp, hapusEwmp, simpanLuaranDosen, hapusLuaranDosen, simpanTendik, hapusTendik } from "@/modules/lkps/data/sdm";

/** Gabung LKPS G4: pengganti /api/sdm kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaSdm(p, await prodiAktifWajib(p, req))));
}

const AKSI = {
  saveDosen: simpanDosen,
  deleteDosen: hapusDosen,
  saveBimbingan: simpanBimbingan,
  deleteBimbingan: hapusBimbingan,
  saveEwmp: simpanEwmp,
  deleteEwmp: hapusEwmp,
  saveLuaranDosen: simpanLuaranDosen,
  deleteLuaranDosen: hapusLuaranDosen,
  saveTendik: simpanTendik,
  deleteTendik: hapusTendik,
} as const;

/** `{ action, payload }` dengan nama aksi kode asal. */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const { action, payload } = await bacaAksi(req);
    return NextResponse.json(await pilihAksi(AKSI, action)(p, prodiId, payload));
  });
}

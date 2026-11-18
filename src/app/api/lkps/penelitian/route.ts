import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { aksiTidakDikenal, bacaAksi } from "@/modules/lkps/rute";
import { bacaPenelitianDosen, hapusPenelitianDosen, simpanPenelitianDosen } from "@/modules/lkps/data/penelitian";

/** Gabung LKPS G4: pengganti /api/penelitian kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff); jenis "Penelitian". */
export function GET(req: Request) {
  return jalankanRute(async (p) => NextResponse.json(await bacaPenelitianDosen(p, await prodiAktifWajib(p, req), "Penelitian")));
}

/** Aksi `save` dan `delete`. */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const { action, payload } = await bacaAksi(req);
    if (action === "save") return NextResponse.json(await simpanPenelitianDosen(p, prodiId, "Penelitian", payload));
    if (action === "delete") return NextResponse.json(await hapusPenelitianDosen(p, prodiId, "Penelitian", payload));
    return aksiTidakDikenal();
  });
}

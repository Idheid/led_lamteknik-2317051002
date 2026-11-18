import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { aksiTidakDikenal, bacaAksi } from "@/modules/lkps/rute";
import { bacaKriteria, simpanIsianTabel } from "@/modules/lkps/data/kriteria";

/** Gabung LKPS G4: pengganti /api/kriteria/[id] kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export async function GET(req: Request, { params }: RouteContext<"/api/lkps/kriteria/[id]">) {
  const { id } = await params;
  return jalankanRute(async (p) => NextResponse.json(await bacaKriteria(p, await prodiAktifWajib(p, req), id)));
}

/** Aksi `saveTableRows { tabelId, rows, buktiList }`: isian disimpan per prodi (LkpsIsianTabel). */
export async function POST(req: Request, { params }: RouteContext<"/api/lkps/kriteria/[id]">) {
  const { id } = await params;
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const { action, payload } = await bacaAksi(req);
    if (action === "saveTableRows") return NextResponse.json(await simpanIsianTabel(p, prodiId, id, payload));
    return aksiTidakDikenal();
  });
}

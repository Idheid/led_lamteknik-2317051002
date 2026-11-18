import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { berkasDariForm, teksForm } from "@/modules/bersama/rute";
import { bacaJson } from "@/modules/lkps/rute";
import { pratinjauImpor, terapkanImpor } from "@/modules/lkps/data/impor";

/**
 * Gabung LKPS G4: pengganti /api/ingestion kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff).
 * JSON `{ action: "apply", domain, items }` menerapkan data; formData `file` (+ `domain`) mengembalikan pratinjau.
 */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      return NextResponse.json(await terapkanImpor(p, prodiId, await bacaJson(req)));
    }
    const form = await req.formData();
    const [berkas] = await berkasDariForm(form, "file");
    return NextResponse.json(await pratinjauImpor(p, prodiId, berkas ?? null, teksForm(form, "domain")));
  });
}

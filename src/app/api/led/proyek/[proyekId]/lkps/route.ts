import { NextResponse } from "next/server";
import { berkasDariForm, jalankanRute } from "@/modules/bersama/rute";
import { unggahLkps } from "@/modules/led/data/lkps";
import { GalatPengguna } from "@/modules/bersama/akses";

/** F-08/F-09: unggah satu berkas LKPS (.xlsx atau .pdf). Pembacaan dilakukan worker. */
export async function POST(req: Request, { params }: RouteContext<"/api/led/proyek/[proyekId]/lkps">) {
  const { proyekId } = await params;
  return jalankanRute(async (p) => {
    const [berkas] = await berkasDariForm(await req.formData());
    if (!berkas) throw new GalatPengguna("Pilih berkas LKPS yang akan diunggah.");
    const b = await unggahLkps(p, proyekId, berkas);
    return NextResponse.json({ id: b.id, status: b.status }, { status: 201 });
  });
}

import { NextResponse } from "next/server";
import { jalankanRute } from "@/lib/rute";
import { daftarCatatan } from "@/lib/data/review";

/** Catatan revisi satu sub-bagian (?sub=) atau satu LED, untuk pembaruan berkala di layar PJ dan asesor. */
export async function GET(req: Request, { params }: RouteContext<"/api/proyek/[proyekId]/catatan">) {
  const { proyekId } = await params;
  const sub = new URL(req.url).searchParams.get("sub") ?? undefined;
  return jalankanRute(async (p) => NextResponse.json(await daftarCatatan(p, proyekId, sub), { headers: { "Cache-Control": "no-store" } }));
}

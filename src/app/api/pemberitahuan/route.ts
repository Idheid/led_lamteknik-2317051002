import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { daftarPemberitahuan } from "@/modules/bersama/data/pemberitahuan";

/** Pemberitahuan ikon lonceng (diperbarui berkala). */
export async function GET() {
  return jalankanRute(async (p) => NextResponse.json(await daftarPemberitahuan(p), { headers: { "Cache-Control": "no-store" } }));
}

import { NextResponse } from "next/server";
import { jalankanRute } from "@/lib/rute";
import { daftarPemberitahuan } from "@/lib/data/review";

/** Pemberitahuan ikon lonceng (diperbarui berkala). */
export async function GET() {
  return jalankanRute(async (p) => NextResponse.json(await daftarPemberitahuan(p), { headers: { "Cache-Control": "no-store" } }));
}

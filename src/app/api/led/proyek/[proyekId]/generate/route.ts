import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { tugasProyek } from "@/modules/led/data/generate";

/** Status antrean generate proyek (dipantau banner antrean). */
export async function GET(_req: Request, ctx: RouteContext<"/api/led/proyek/[proyekId]/generate">) {
  const { proyekId } = await ctx.params;
  return jalankanRute(async (p) => NextResponse.json({ tugas: await tugasProyek(p, proyekId) }, { headers: { "Cache-Control": "no-store" } }));
}

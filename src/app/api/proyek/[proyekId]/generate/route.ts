import { NextResponse } from "next/server";
import { jalankanRute } from "@/lib/rute";
import { tugasProyek } from "@/lib/data/generate";

/** Status antrean generate proyek (dipantau banner antrean). */
export async function GET(_req: Request, ctx: RouteContext<"/api/proyek/[proyekId]/generate">) {
  const { proyekId } = await ctx.params;
  return jalankanRute(async (p) => NextResponse.json({ tugas: await tugasProyek(p, proyekId) }, { headers: { "Cache-Control": "no-store" } }));
}

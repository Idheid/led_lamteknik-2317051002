import { jalankanRute } from "@/modules/bersama/rute";
import { berkasSkAkreditasi } from "@/modules/led/data/akreditasi";

/** L1: PDF SK akreditasi yang tersimpan di riwayat. */
export async function GET(_req: Request, ctx: RouteContext<"/api/akreditasi/[id]/sk">) {
  const { id } = await ctx.params;
  return jalankanRute(async (p) => {
    const { nama, isi } = await berkasSkAkreditasi(p, id);
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(isi.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

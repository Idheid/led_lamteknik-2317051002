import { jalankanRute } from "@/lib/rute";
import { berkasEkspor } from "@/lib/data/ekspor";

/** Unduh berkas .docx hasil ekspor (hanya milik prodi pengguna dan berstatus siap). */
export async function GET(_req: Request, ctx: RouteContext<"/api/ekspor/[eksporId]/berkas">) {
  const { eksporId } = await ctx.params;
  return jalankanRute(async (p) => {
    const { ekspor, isi } = await berkasEkspor(p, eksporId);
    const nama = ekspor.namaBerkas ?? "LED.docx";
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nama.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "Cache-Control": "no-store",
      },
    });
  });
}

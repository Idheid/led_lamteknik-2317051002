import { NextResponse } from "next/server";
import { GalatPengguna } from "@/lib/akses";
import { berkasDariForm, jalankanRute } from "@/lib/rute";
import { unggahTemplateLed } from "@/lib/data/ekspor";

/** Super admin mengunggah template LEDPS resmi (.docx) untuk satu versi instrumen. */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/versi/[versiId]/template">) {
  const { versiId } = await ctx.params;
  return jalankanRute(async (p) => {
    const [berkas] = await berkasDariForm(await req.formData());
    if (!berkas) throw new GalatPengguna("Pilih berkas template LEDPS (.docx).");
    const laporan = await unggahTemplateLed(p, versiId, berkas);
    return NextResponse.json({ laporan }, { status: 201 });
  });
}

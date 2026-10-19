import { NextResponse } from "next/server";
import { GalatPengguna } from "@/lib/akses";
import { berkasDariForm, jalankanRute } from "@/lib/rute";
import { berkasInstrumen, unggahBerkasInstrumen, type JenisBerkasInstrumen } from "@/lib/data/unggah-instrumen";

const JENIS: Record<string, { label: string; mime: string }> = {
  template: { label: "Template LED (.docx)", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  matriks: { label: "Matriks Penilaian (.pdf)", mime: "application/pdf" },
  pedoman: { label: "Pedoman Penilaian (.pdf)", mime: "application/pdf" },
};

function jenisSah(jenis: string): JenisBerkasInstrumen {
  if (!(jenis in JENIS)) throw new GalatPengguna("Jenis berkas tidak dikenal.");
  return jenis as JenisBerkasInstrumen;
}

/** PJ mengunggah berkas sumber instrumen (revisi 19 Okt 2026). */
export async function POST(req: Request, ctx: RouteContext<"/api/instrumen/[versiId]/berkas/[jenis]">) {
  const { versiId, jenis } = await ctx.params;
  return jalankanRute(async (p) => {
    const j = jenisSah(jenis);
    const [berkas] = await berkasDariForm(await req.formData());
    if (!berkas) throw new GalatPengguna(`Pilih berkas ${JENIS[j].label}.`);
    const hasil = await unggahBerkasInstrumen(p, versiId, j, berkas);
    return NextResponse.json(hasil, { status: 201 });
  });
}

/** Berkas sumber untuk halaman cek (PDF ditampilkan di samping tabel). */
export async function GET(_req: Request, ctx: RouteContext<"/api/instrumen/[versiId]/berkas/[jenis]">) {
  const { versiId, jenis } = await ctx.params;
  return jalankanRute(async (p) => {
    const j = jenisSah(jenis);
    const { nama, isi } = await berkasInstrumen(p, versiId, j);
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": JENIS[j].mime,
        "Content-Length": String(isi.length),
        "Content-Disposition": `${j === "template" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

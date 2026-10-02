import { NextResponse } from "next/server";
import { berkasDariForm, jalankanRute, teksForm } from "@/lib/rute";
import { unggahDokumen } from "@/lib/data/dokumen";
import { GalatPengguna } from "@/lib/akses";

/** F-10: unggah satu atau beberapa dokumen pendukung (PDF, DOCX, gambar) untuk sub-bagian/butir tertentu. */
export async function POST(req: Request, { params }: RouteContext<"/api/proyek/[proyekId]/dokumen">) {
  const { proyekId } = await params;
  return jalankanRute(async (p) => {
    const f = await req.formData();
    const berkas = await berkasDariForm(f);
    if (berkas.length === 0) throw new GalatPengguna("Pilih berkas yang akan diunggah.");
    if (berkas.length > 10) throw new GalatPengguna("Unggah paling banyak 10 berkas sekaligus.");
    const umum = {
      subBagianKode: teksForm(f, "subBagianKode"),
      butirKode: teksForm(f, "butirKode"),
      dokumenDiharapkanId: teksForm(f, "dokumenDiharapkanId"),
      judul: teksForm(f, "judul"),
      tautanBukti: teksForm(f, "tautanBukti"),
    };
    const hasil = [];
    for (const b of berkas) hasil.push(await unggahDokumen(p, proyekId, { ...b, ...umum }));
    return NextResponse.json({ dokumen: hasil.map((d) => ({ id: d.id, namaBerkas: d.namaBerkas, status: d.status })) }, { status: 201 });
  });
}

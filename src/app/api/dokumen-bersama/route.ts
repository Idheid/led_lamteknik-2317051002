import { NextResponse } from "next/server";
import { berkasDariForm, jalankanRute, teksForm } from "@/lib/rute";
import { unggahDokumenBersama } from "@/lib/data/dokumen";
import { GalatPengguna } from "@/lib/akses";

/** U-10: PJ mengunggah dokumen bersama fakultas (dipakai semua LED). */
export async function POST(req: Request) {
  return jalankanRute(async (p) => {
    const f = await req.formData();
    const berkas = await berkasDariForm(f);
    if (berkas.length === 0) throw new GalatPengguna("Pilih berkas yang akan diunggah.");
    if (berkas.length > 10) throw new GalatPengguna("Unggah paling banyak 10 berkas sekaligus.");
    const umum = { subBagianKode: teksForm(f, "subBagianKode"), judul: teksForm(f, "judul"), tautanBukti: teksForm(f, "tautanBukti") };
    const hasil = [];
    for (const b of berkas) hasil.push(await unggahDokumenBersama(p, { ...b, ...umum }));
    return NextResponse.json({ dokumen: hasil.map((d) => ({ id: d.id, namaBerkas: d.namaBerkas, status: d.status })) }, { status: 201 });
  });
}

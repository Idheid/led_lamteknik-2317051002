import { NextResponse } from "next/server";
import { GalatPengguna } from "@/modules/bersama/akses";
import { berkasDariForm, jalankanRute } from "@/modules/bersama/rute";
import { hapusLogo, simpanLogo } from "@/modules/led/data/logo";

/** D8: Admin UPPS mengunggah (POST) atau menghapus (DELETE) logo perguruan tinggi untuk halaman muka LED. */
export async function POST(req: Request) {
  return jalankanRute(async (p) => {
    const [berkas] = await berkasDariForm(await req.formData());
    if (!berkas) throw new GalatPengguna("Pilih berkas logo lebih dulu.");
    const logo = await simpanLogo(p, berkas);
    return NextResponse.json({ nama: logo.nama, lebar: logo.lebar, tinggi: logo.tinggi }, { status: 201 });
  });
}

export async function DELETE() {
  return jalankanRute(async (p) => {
    await hapusLogo(p);
    return NextResponse.json({ ok: true });
  });
}

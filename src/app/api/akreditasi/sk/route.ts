import { NextResponse } from "next/server";
import { GalatPengguna } from "@/modules/bersama/akses";
import { berkasDariForm, jalankanRute, teksForm } from "@/modules/bersama/rute";
import { bacaSkAi, bacaSkPola, perkiraanBacaSkAi } from "@/modules/led/data/akreditasi";

/**
 * L1: bantuan isi dari PDF SK. mode "pola" (tanpa AI), "perkiraan" (token dan model sebelum AI), "ai" (hanya setelah
 * Admin/Tim Prodi mengonfirmasi perkiraan). Berkas tidak disimpan; hasilnya hanya usulan di formulir.
 */
export async function POST(req: Request) {
  return jalankanRute(async (p) => {
    const f = await req.formData();
    const [berkas] = await berkasDariForm(f);
    if (!berkas) throw new GalatPengguna("Pilih PDF SK lebih dulu.");
    const mode = teksForm(f, "mode") ?? "pola";
    if (mode === "perkiraan") return NextResponse.json(await perkiraanBacaSkAi(p, berkas.isi));
    if (mode === "ai") return NextResponse.json({ usulan: await bacaSkAi(p, berkas.isi) });
    return NextResponse.json({ usulan: await bacaSkPola(p, berkas.isi) });
  });
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { GalatPengguna } from "@/modules/bersama/akses";
import { berkasDariForm, jalankanRute } from "@/modules/bersama/rute";
import { catatHasilAkreditasi } from "@/modules/led/data/akreditasi";

/** L1: catat hasil akreditasi (isian JSON di "data" dan PDF SK opsional di "berkas"). */
export async function POST(req: Request) {
  return jalankanRute(async (p) => {
    const f = await req.formData();
    const mentah = f.get("data");
    if (typeof mentah !== "string") throw new GalatPengguna("Isian tidak lengkap.");
    const [berkas] = await berkasDariForm(f);
    const r = await catatHasilAkreditasi(p, JSON.parse(mentah), berkas ?? null);
    revalidatePath("/led", "layout");
    revalidatePath("/pengaturan/prodi", "layout");
    return NextResponse.json({ id: r.id, status: r.status }, { status: 201 });
  });
}

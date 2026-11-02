import { NextResponse } from "next/server";
import { berkasDariForm, jalankanRute } from "@/modules/bersama/rute";
import { unggahLkps } from "@/modules/led/data/lkps";
import { GalatPengguna } from "@/modules/bersama/akses";

/**
 * F-08/F-09: unggah berkas LKPS (.xlsx atau .pdf). Revisi 31 Okt 2026: boleh banyak PDF sekaligus (satu tabel per
 * berkas); berkas diunggah sesuai urutan pilihan sehingga berkas terakhir menjadi yang terbaru. Pembacaan oleh worker.
 */
export async function POST(req: Request, { params }: RouteContext<"/api/led/proyek/[proyekId]/lkps">) {
  const { proyekId } = await params;
  return jalankanRute(async (p) => {
    const daftar = await berkasDariForm(await req.formData());
    if (!daftar.length) throw new GalatPengguna("Pilih berkas LKPS yang akan diunggah.");
    const hasil = [];
    for (const berkas of daftar) {
      const b = await unggahLkps(p, proyekId, berkas);
      hasil.push({ id: b.id, status: b.status });
    }
    return NextResponse.json(hasil.length === 1 ? hasil[0] : { berkas: hasil }, { status: 201 });
  });
}

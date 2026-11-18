import { NextResponse } from "next/server";
import { jalankanRute } from "@/modules/bersama/rute";
import { prodiAktifWajib } from "@/modules/lkps/data/prodi-aktif";
import { berkasDariForm } from "@/modules/bersama/rute";
import { berkasBukti, unggahBukti } from "@/modules/lkps/data/bukti";

/**
 * Gabung LKPS G4: pengganti /api/upload kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). Unggah (POST formData `file`) ke penyimpanan LED per
 * prodi; unduh (GET `?kunci=`) hanya untuk pengguna yang boleh membaca LKPS prodi itu. Tanpa login → 401 (jalankanRute).
 */
export function POST(req: Request) {
  return jalankanRute(async (p) => {
    const prodiId = await prodiAktifWajib(p, req);
    const [berkas] = await berkasDariForm(await req.formData(), "file");
    return NextResponse.json(await unggahBukti(p, prodiId, berkas ?? null));
  });
}

export function GET(req: Request) {
  return jalankanRute(async (p) => {
    const kunci = new URL(req.url).searchParams.get("kunci") ?? "";
    const { nama, mime, isi } = await berkasBukti(p, kunci);
    const tampil = mime === "application/pdf" || mime.startsWith("image/");
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(isi.length),
        "Content-Disposition": `${tampil ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

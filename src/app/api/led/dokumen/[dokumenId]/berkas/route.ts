import { jalankanRute } from "@/modules/bersama/rute";
import { berkasDokumen } from "@/modules/led/data/dokumen";

/** Berkas asli dokumen (byte sama dengan unggahan). Gambar dan PDF ditampilkan langsung, DOCX diunduh. */
export async function GET(req: Request, { params }: RouteContext<"/api/led/dokumen/[dokumenId]/berkas">) {
  const { dokumenId } = await params;
  const unduh = new URL(req.url).searchParams.has("unduh");
  return jalankanRute(async (p) => {
    const { dokumen, isi } = await berkasDokumen(p, dokumenId);
    const tampil = !unduh && (dokumen.jenis === "gambar" || dokumen.jenis === "pdf");
    const nama = encodeURIComponent(dokumen.namaBerkas);
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": dokumen.mime,
        "Content-Length": String(isi.length),
        "Content-Disposition": `${tampil ? "inline" : "attachment"}; filename*=UTF-8''${nama}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

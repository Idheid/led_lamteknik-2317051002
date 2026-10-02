import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/lib/akses";
import { ambilPengguna } from "@/lib/sesi";
import { pesanGalatZod } from "@/lib/validasi";

/** Pembungkus Route Handler: periksa sesi, ubah galat menjadi JSON { pesan } dengan status HTTP yang sesuai. */
export async function jalankanRute(fn: (p: Pengguna) => Promise<Response>): Promise<Response> {
  const p = await ambilPengguna();
  if (!p) return NextResponse.json({ pesan: "Sesi Anda berakhir. Silakan masuk lagi." }, { status: 401 });
  try {
    return await fn(p);
  } catch (e) {
    if (e instanceof GalatAkses) return NextResponse.json({ pesan: e.message }, { status: 403 });
    if (e instanceof GalatPengguna) return NextResponse.json({ pesan: e.message }, { status: 400 });
    if (e instanceof ZodError) return NextResponse.json({ pesan: pesanGalatZod(e) }, { status: 400 });
    console.error("Rute gagal:", e);
    return NextResponse.json({ pesan: "Terjadi kesalahan di server. Coba lagi." }, { status: 500 });
  }
}

/** Ambil berkas dari FormData sebagai Buffer. */
export async function berkasDariForm(f: FormData, nama = "berkas"): Promise<{ nama: string; isi: Buffer }[]> {
  const hasil: { nama: string; isi: Buffer }[] = [];
  for (const v of f.getAll(nama)) {
    if (typeof v === "object" && "arrayBuffer" in v) hasil.push({ nama: v.name, isi: Buffer.from(await v.arrayBuffer()) });
  }
  return hasil;
}

export function teksForm(f: FormData, kunci: string): string | null {
  const v = f.get(kunci);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

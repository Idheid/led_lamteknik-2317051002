"use server";

import { ZodError } from "zod";
import { GalatPengguna } from "@/modules/bersama/akses";
import { buatAdminPertama } from "@/modules/bersama/data/pemasangan";
import { pesanGalatZod, type MasukanAkun } from "@/modules/bersama/validasi";

/** Buat admin pertama (tanpa sesi; hanya berhasil bila belum ada admin sama sekali). */
export async function aksiBuatAdminPertama(masukan: MasukanAkun): Promise<{ ok: true } | { ok: false; pesan: string }> {
  try {
    await buatAdminPertama(masukan);
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, pesan: pesanGalatZod(e) || "Isian belum benar." };
    if (e instanceof GalatPengguna) return { ok: false, pesan: e.message };
    console.error("Admin pertama gagal:", e);
    return { ok: false, pesan: "Terjadi kesalahan di server. Coba lagi." };
  }
}

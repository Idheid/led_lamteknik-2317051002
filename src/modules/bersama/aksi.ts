import "server-only";
import { ZodError } from "zod";
import { GalatAkses, GalatPengguna, type Pengguna } from "@/modules/bersama/akses";
import { ambilPengguna } from "@/modules/bersama/sesi";
import { pesanGalatZod } from "@/modules/bersama/validasi";

export type HasilAksi<T = null> = { ok: true; data: T } | { ok: false; pesan: string };

function kodePrisma(e: unknown): string | null {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string"
    ? (e as { code: string }).code
    : null;
}

/**
 * Bungkus aksi server: periksa sesi, jalankan, dan ubah galat menjadi pesan bahasa sehari-hari.
 * Pemeriksaan peran dan prodi dilakukan di lapisan data (src/lib/data).
 */
export async function jalankanAksi<T>(
  fn: (p: Pengguna) => Promise<T>,
  opsi: { bolehBelumGantiSandi?: boolean } = {},
): Promise<HasilAksi<T>> {
  const p = await ambilPengguna();
  if (!p) return { ok: false, pesan: "Sesi Anda berakhir. Silakan masuk lagi." };
  if (p.wajibGantiSandi && !opsi.bolehBelumGantiSandi) {
    return { ok: false, pesan: "Ganti kata sandi Anda terlebih dahulu (menu akun)." };
  }
  try {
    return { ok: true, data: await fn(p) };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, pesan: pesanGalatZod(e) || "Isian belum benar." };
    if (e instanceof GalatPengguna || e instanceof GalatAkses) return { ok: false, pesan: e.message };
    const kode = kodePrisma(e);
    if (kode === "P2025") return { ok: false, pesan: "Data tidak ditemukan. Muat ulang halaman lalu coba lagi." };
    if (kode === "P2002") return { ok: false, pesan: "Data dengan kode yang sama sudah ada." };
    if (kode === "P2003") return { ok: false, pesan: "Data ini masih dipakai data lain sehingga tidak bisa dihapus." };
    console.error("Aksi gagal:", e);
    return { ok: false, pesan: "Terjadi kesalahan di server. Coba lagi; bila berulang, hubungi admin." };
  }
}

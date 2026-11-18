"use client";

import { toast } from "sonner";

/**
 * Gabung LKPS G5: `fetch` untuk halaman LKPS yang di kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff) mengabaikan
 * respons gagal (`if (res.ok) { ... }` tanpa cabang lain). Respons tetap dikembalikan apa adanya; bila gagal, pesan
 * galat server (`{ pesan }`, mis. validasi atau hak akses) ditampilkan sebagai toast supaya penyimpanan tidak gagal diam-diam.
 */
export async function kirimLkps(alamat: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(alamat, init);
  if (!res.ok) {
    const isi = (await res.clone().json().catch(() => null)) as { pesan?: unknown } | null;
    toast.error(typeof isi?.pesan === "string" ? isi.pesan : `Permintaan gagal (${res.status}).`);
  }
  return res;
}

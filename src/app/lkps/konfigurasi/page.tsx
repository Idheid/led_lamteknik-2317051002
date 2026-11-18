import type { Metadata } from "next";
import { wajibPeran } from "@/modules/bersama/sesi";
import HalamanKonfigurasi from "@/modules/lkps/komponen/konfigurasi/halaman-konfigurasi";

export const metadata: Metadata = { title: "Struktur kriteria & tabel · LKPS" };

/** Gabung LKPS G5: struktur kriteria dan tabel LKPS seluruh fakultas, hanya Admin UPPS (RENCANA-GABUNG-LKPS G5). */
export default async function Halaman() {
  await wajibPeran("ADMIN");
  return <HalamanKonfigurasi />;
}

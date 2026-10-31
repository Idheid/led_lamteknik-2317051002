import { wajibTimProdi } from "@/modules/bersama/sesi";

/**
 * Halaman Tim Prodi di modul LED (revisi 31 Okt 2026): /led (LED prodi), /led/baru, /led/[proyekId]/... Grup rute
 * (tim-prodi) hanya memisahkan pemeriksaan peran; alamatnya tetap /led/... Peran lain diarahkan ke halaman awal.
 */
export default async function LayoutTimProdiLed({ children }: LayoutProps<"/led">) {
  await wajibTimProdi();
  return children;
}

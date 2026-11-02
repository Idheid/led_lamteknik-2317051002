import { wajibAdmin } from "@/modules/bersama/sesi";

/**
 * Halaman Admin UPPS di modul LED (revisi 31 Okt 2026): /led/pantau (beranda LED Admin), /led/instrumen, /led/dokumen-bersama, /led/logo-sampul (D8). Peran lain
 * diarahkan ke halaman awal. LED satu prodi dibaca admin lewat tampilan hanya-baca di /led/asesor/[proyekId].
 */
export default async function LayoutAdminLed({ children }: LayoutProps<"/led">) {
  await wajibAdmin();
  return children;
}

import { wajibAdmin } from "@/modules/bersama/sesi";

/**
 * Halaman Admin UPPS di modul LED (revisi 31 Okt 2026): /led/instrumen, /led/dokumen-bersama (/led/pantau dialihkan ke /dashboard, desain form 2). Peran lain
 * diarahkan ke halaman awal. LED satu prodi dibaca admin lewat tampilan hanya-baca di /led/asesor/[proyekId].
 */
export default async function LayoutAdminLed({ children }: LayoutProps<"/led">) {
  await wajibAdmin();
  return children;
}

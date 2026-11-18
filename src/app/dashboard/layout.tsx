import { wajibPeran } from "@/modules/bersama/sesi";
import { ShellBersama } from "@/components/shell/shell-bersama";

/** Dashboard akreditasi Fakultas/UPPS (desain form 2, 2 Nov 2026): Admin UPPS dan Tamu (Gabung LKPS G1, hanya baca). */
export default async function LayoutDashboard({ children }: LayoutProps<"/dashboard">) {
  const p = await wajibPeran("ADMIN", "TAMU");
  // halaman bersama LED dan LKPS: sidebar Bersama, LED, dan LKPS
  return <ShellBersama pengguna={p}>{children}</ShellBersama>;
}

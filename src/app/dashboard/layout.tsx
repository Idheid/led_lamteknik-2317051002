import { wajibAdmin } from "@/modules/bersama/sesi";
import { ShellBersama } from "@/components/shell/shell-bersama";

/** Dashboard akreditasi Fakultas/UPPS (desain form 2, 2 Nov 2026): hanya Admin UPPS. */
export default async function LayoutDashboard({ children }: LayoutProps<"/dashboard">) {
  const p = await wajibAdmin();
  // halaman bersama LED dan LKPS: sidebar Bersama, LED, dan LKPS
  return <ShellBersama pengguna={p}>{children}</ShellBersama>;
}

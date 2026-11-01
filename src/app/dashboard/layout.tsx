import { wajibAdmin } from "@/modules/bersama/sesi";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";

/** Dashboard akreditasi Fakultas/UPPS (desain form 2, 2 Nov 2026): hanya Admin UPPS. */
export default async function LayoutDashboard({ children }: LayoutProps<"/dashboard">) {
  const p = await wajibAdmin();
  return <ShellMenuLed pengguna={p}>{children}</ShellMenuLed>;
}

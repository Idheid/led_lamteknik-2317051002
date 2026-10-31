import { ShellBersama } from "@/components/shell/shell-bersama";
import { wajibAdmin } from "@/modules/bersama/sesi";

/** Admin UPPS: Kelola akun, Kunci API, Penugasan asesor (menu di src/components/shell/menu-peran.ts). */
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const p = await wajibAdmin();
  return <ShellBersama pengguna={p}>{children}</ShellBersama>;
}

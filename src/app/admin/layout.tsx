import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import { MENU_ADMIN } from "@/components/shell/menu-peran";
import { wajibSuperAdmin } from "@/lib/sesi";

/** Admin: Kelola akun, Penugasan asesor, Kunci API (menu di src/components/shell/menu-peran.ts). */
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const p = await wajibSuperAdmin();
  return (
    <ShellAplikasi pengguna={p} grup={[MENU_ADMIN]} subjudul="Admin" beranda="/admin/akun">
      {children}
    </ShellAplikasi>
  );
}

import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import type { GrupNav } from "@/components/shell/nav-sidebar";
import { wajibSuperAdmin } from "@/lib/sesi";

/**
 * Revisi 19 Okt 2026: admin hanya mengurus akun PJ dan kunci API (beserta pilihan model dan log pemakaian).
 * Revisi 22 Okt 2026: ditambah akun asesor dan penugasannya ke LED.
 */
const MENU: GrupNav[] = [
  {
    label: "Admin",
    item: [
      { judul: "Akun PJ", href: "/admin/akun", ikon: "akun" },
      { judul: "Penugasan asesor", href: "/admin/penugasan", ikon: "review" },
      { judul: "Kunci API", href: "/admin/kunci-api", ikon: "kunci" },
    ],
  },
];

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const p = await wajibSuperAdmin();
  return (
    <ShellAplikasi pengguna={p} grup={MENU} subjudul="Admin" beranda="/admin/akun">
      {children}
    </ShellAplikasi>
  );
}

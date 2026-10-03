import { ShellAplikasi } from "@/components/shell/shell-aplikasi";
import type { GrupNav } from "@/components/shell/nav-sidebar";
import { wajibSuperAdmin } from "@/lib/sesi";

const MENU: GrupNav[] = [
  {
    label: "Super admin",
    item: [
      { judul: "Ringkasan", href: "/admin", ikon: "dasbor", persis: true },
      { judul: "Instrumen", href: "/admin/instrumen", ikon: "instrumen" },
      { judul: "Prodi dan UPPS", href: "/admin/prodi", ikon: "prodi" },
      { judul: "Bahan bersama UPPS", href: "/admin/bahan-upps", ikon: "dokumen" },
      { judul: "Akun", href: "/admin/akun", ikon: "akun" },
      { judul: "Model LLM", href: "/admin/model", ikon: "model" },
      { judul: "Kunci API cadangan", href: "/admin/kunci-api", ikon: "kunci" },
      { judul: "Log pemakaian", href: "/admin/log", ikon: "log" },
    ],
  },
];

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const p = await wajibSuperAdmin();
  return (
    <ShellAplikasi pengguna={p} grup={MENU} subjudul="Super admin" beranda="/admin">
      {children}
    </ShellAplikasi>
  );
}

import { wajibLogin } from "@/modules/bersama/sesi";
import { ShellLkps } from "@/modules/lkps/komponen/shell-lkps";

/** Modul LKPS (31 Okt 2026): terbuka untuk ketiga peran (Admin UPPS, Tim Prodi, Asesor). */
export default async function LayoutLkps({ children }: LayoutProps<"/lkps">) {
  const p = await wajibLogin();
  return <ShellLkps pengguna={p}>{children}</ShellLkps>;
}

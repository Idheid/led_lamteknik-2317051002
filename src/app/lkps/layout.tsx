import { redirect } from "next/navigation";
import { wajibLogin } from "@/modules/bersama/sesi";
import { berandaPeran } from "@/modules/bersama/peran";
import { ShellLkps } from "@/modules/lkps/komponen/shell-lkps";

/** Modul LKPS (31 Okt 2026): penyusun dan asesor; admin tidak membuka modul. */
export default async function LayoutLkps({ children }: LayoutProps<"/lkps">) {
  const p = await wajibLogin();
  if (p.peran === "SUPER_ADMIN") redirect(berandaPeran(p.peran));
  return <ShellLkps pengguna={p}>{children}</ShellLkps>;
}

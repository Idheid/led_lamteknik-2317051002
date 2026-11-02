import { wajibAdmin } from "@/modules/bersama/sesi";
import { ShellBersama } from "@/components/shell/shell-bersama";

/** Instrumen dikelola Admin UPPS (revisi 31 Okt 2026); fitur bersama LED dan LKPS (D4). */
export default async function LayoutInstrumen({ children }: LayoutProps<"/led/instrumen">) {
  const p = await wajibAdmin();
  return <ShellBersama pengguna={p}>{children}</ShellBersama>;
}

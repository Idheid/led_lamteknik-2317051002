import { wajibAdmin } from "@/modules/bersama/sesi";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";

/** Instrumen dikelola Admin UPPS (revisi 31 Okt 2026). */
export default async function LayoutInstrumen({ children }: LayoutProps<"/led/instrumen">) {
  const p = await wajibAdmin();
  return <ShellMenuLed pengguna={p}>{children}</ShellMenuLed>;
}

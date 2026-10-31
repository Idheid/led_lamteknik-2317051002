import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { ShellMenuLed } from "@/modules/led/komponen/shell-led";

/** Instrumen dikelola PJ fakultas (revisi 19 Okt 2026). */
export default async function LayoutInstrumen({ children }: LayoutProps<"/led/instrumen">) {
  const p = await wajibPenanggungJawab();
  return <ShellMenuLed pengguna={p}>{children}</ShellMenuLed>;
}

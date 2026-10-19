import { wajibPenanggungJawab } from "@/lib/sesi";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";

/** Instrumen dikelola PJ fakultas (revisi 19 Okt 2026). */
export default async function LayoutInstrumen({ children }: LayoutProps<"/proyek/instrumen">) {
  const p = await wajibPenanggungJawab();
  return <ShellDaftarProyek pengguna={p}>{children}</ShellDaftarProyek>;
}

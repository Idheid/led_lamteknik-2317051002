import { wajibPenanggungJawab } from "@/lib/sesi";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";

export default async function LayoutProdi({ children }: LayoutProps<"/proyek/prodi">) {
  const p = await wajibPenanggungJawab();
  return <ShellDaftarProyek pengguna={p}>{children}</ShellDaftarProyek>;
}

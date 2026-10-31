import { wajibAdmin } from "@/modules/bersama/sesi";
import { ShellBersama } from "@/components/shell/shell-bersama";

export default async function LayoutProdi({ children }: LayoutProps<"/pengaturan/prodi">) {
  const p = await wajibAdmin();
  return <ShellBersama pengguna={p}>{children}</ShellBersama>;
}

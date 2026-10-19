import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { HalamanKunci } from "@/components/kunci-api/halaman-kunci";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";

export const metadata: Metadata = { title: "Kunci API fakultas" };

export default async function HalamanKunciProdi() {
  const p = await wajibPenanggungJawab();
  return (
    <ShellDaftarProyek pengguna={p}>
      <HalamanKunci pengguna={p} remah={[{ label: "Semua LED", href: "/proyek" }, { label: "Kunci API fakultas" }]} />
    </ShellDaftarProyek>
  );
}

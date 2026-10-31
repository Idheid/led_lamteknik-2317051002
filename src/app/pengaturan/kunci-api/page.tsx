import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { HalamanKunci } from "@/components/kunci-api/halaman-kunci";
import { ShellBersama } from "@/components/shell/shell-bersama";

export const metadata: Metadata = { title: "Kunci API fakultas" };

export default async function HalamanKunciProdi() {
  const p = await wajibPenanggungJawab();
  return (
    <ShellBersama pengguna={p}>
      <HalamanKunci pengguna={p} hrefTambah="/pengaturan/kunci-api/tambah" />
    </ShellBersama>
  );
}

import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { ShellBersama } from "@/components/shell/shell-bersama";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormKunci } from "@/components/kunci-api/komponen";

export const metadata: Metadata = { title: "Tambah kunci API" };

export default async function HalamanTambahKunci() {
  const p = await wajibPenanggungJawab();
  return (
    <ShellBersama pengguna={p}>
      <HalamanTambah
        judul="Tambah kunci API"
        remah={[{ label: "Kunci API fakultas", href: "/pengaturan/kunci-api" }, { label: "Tambah" }]}
        kembali="/pengaturan/kunci-api"
        catatan="Buat kunci di aistudio.google.com → Get API key, lalu tempel di sini. Kunci dari project Google lain menambah kuota."
      >
        <FormKunci kembaliKe="/pengaturan/kunci-api" />
      </HalamanTambah>
    </ShellBersama>
  );
}

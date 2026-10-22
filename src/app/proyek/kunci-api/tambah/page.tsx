import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ShellDaftarProyek } from "@/components/shell/shell-daftar-proyek";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormKunci } from "@/components/kunci-api/komponen";

export const metadata: Metadata = { title: "Tambah kunci API" };

export default async function HalamanTambahKunci() {
  const p = await wajibPenanggungJawab();
  return (
    <ShellDaftarProyek pengguna={p}>
      <HalamanTambah
        judul="Tambah kunci API"
        remah={[{ label: "Kunci API fakultas", href: "/proyek/kunci-api" }, { label: "Tambah" }]}
        kembali="/proyek/kunci-api"
        catatan="Buat kunci di aistudio.google.com → Get API key, lalu tempel di sini. Kunci dari project Google lain menambah kuota."
      >
        <FormKunci kembaliKe="/proyek/kunci-api" />
      </HalamanTambah>
    </ShellDaftarProyek>
  );
}

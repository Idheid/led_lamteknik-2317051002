import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormKunci } from "@/components/kunci-api/komponen";

export const metadata: Metadata = { title: "Tambah kunci cadangan" };

export default async function HalamanTambahKunciAdmin() {
  await wajibSuperAdmin();
  return (
    <HalamanTambah
      judul="Tambah kunci cadangan"
      remah={[{ label: "Kunci API", href: "/admin/kunci-api" }, { label: "Tambah" }]}
      kembali="/admin/kunci-api"
      catatan="Kunci cadangan dipakai setelah kunci fakultas habis (bila diizinkan di tab Model Gemini)."
    >
      <FormKunci kembaliKe="/admin/kunci-api" />
    </HalamanTambah>
  );
}

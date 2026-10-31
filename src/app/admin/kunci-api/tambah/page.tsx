import type { Metadata } from "next";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { LABEL_JENIS_KUNCI } from "@/modules/bersama/data/kunci-api";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormKunci } from "@/components/kunci-api/komponen";

export const metadata: Metadata = { title: "Tambah kunci API" };

/** Tambah kunci utama fakultas (bawaan) atau kunci cadangan (?jenis=cadangan). */
export default async function HalamanTambahKunciAdmin({ searchParams }: PageProps<"/admin/kunci-api/tambah">) {
  await wajibAdmin();
  const jenis = (await searchParams).jenis === "cadangan" ? "cadangan" : "utama";
  return (
    <HalamanTambah
      judul={`Tambah ${LABEL_JENIS_KUNCI[jenis].toLowerCase()}`}
      remah={[{ label: "Kunci API", href: "/admin/kunci-api" }, { label: "Tambah" }]}
      kembali="/admin/kunci-api"
      catatan={jenis === "cadangan"
        ? "Kunci cadangan dipakai setelah semua kunci utama habis (bila diizinkan di tab Model Gemini)."
        : "Buat kunci di aistudio.google.com, Get API key, lalu tempel di sini. Kunci dari project Google lain menambah kuota."}
    >
      <FormKunci kembaliKe="/admin/kunci-api" jenis={jenis} />
    </HalamanTambah>
  );
}

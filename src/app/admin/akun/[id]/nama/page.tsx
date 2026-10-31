import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilAkun } from "@/modules/bersama/data/organisasi";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormUbahNama } from "../form-ubah";

export const metadata: Metadata = { title: "Ubah nama akun" };

export default async function HalamanUbahNamaAkun({ params }: PageProps<"/admin/akun/[id]/nama">) {
  const p = await wajibAdmin();
  const akun = await ambilAkun(p, (await params).id);
  if (!akun) notFound();
  return (
    <HalamanTambah judul="Ubah nama akun" remah={[{ label: "Kelola akun", href: "/admin/akun" }, { label: "Ubah nama" }]} kembali="/admin/akun" catatan={akun.email}>
      <FormUbahNama id={akun.id} awal={akun.name} />
    </HalamanTambah>
  );
}

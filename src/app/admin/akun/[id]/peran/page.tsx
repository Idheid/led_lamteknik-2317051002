import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { wajibAdmin } from "@/modules/bersama/sesi";
import { ambilAkun, daftarProdi } from "@/modules/bersama/data/organisasi";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import { LABEL_PERAN } from "@/modules/bersama/peran";
import { HalamanTambah } from "@/components/halaman-tambah";
import { FormUbahPeran } from "../form-ubah";

export const metadata: Metadata = { title: "Ubah peran akun" };

/** Perbaikan 1 Nov 2026 (P1): ubah peran akun di halaman sendiri, konsisten dengan Tambah akun. */
export default async function HalamanUbahPeranAkun({ params }: PageProps<"/admin/akun/[id]/peran">) {
  const p = await wajibAdmin();
  const { id } = await params;
  if (id === p.id) redirect("/admin/akun");
  const [akun, daftar] = await Promise.all([ambilAkun(p, id), daftarProdi(p)]);
  if (!akun) notFound();
  const prodi = daftar.map((x) => ({ id: x.id, label: `${namaJenjang(x.jenjang)} ${x.nama}` }));
  return (
    <HalamanTambah
      judul={`Ubah peran ${akun.name}`}
      remah={[{ label: "Kelola akun", href: "/admin/akun" }, { label: "Ubah peran" }]}
      kembali="/admin/akun"
      catatan={`${akun.email} · peran sekarang ${LABEL_PERAN[akun.role]}. Setelah peran diubah, pemilik akun keluar dari semua perangkat dan login ulang dengan peran baru.`}
    >
      <FormUbahPeran id={akun.id} peranAwal={akun.role} prodiAwal={akun.prodiId} prodi={prodi} />
    </HalamanTambah>
  );
}

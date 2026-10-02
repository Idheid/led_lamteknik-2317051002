import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibSuperAdmin } from "@/lib/sesi";
import { prisma } from "@/lib/db";
import { ambilProdi } from "@/lib/data/organisasi";
import type { KodeJenjang } from "@/lib/domain/instrumen";
import type { IdentitasProdi } from "@/lib/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormProdi } from "../form-prodi";

export const metadata: Metadata = { title: "Ubah program studi" };

export default async function HalamanUbahProdi({ params }: PageProps<"/admin/prodi/[id]">) {
  const p = await wajibSuperAdmin();
  const { id } = await params;
  const prodi = await ambilProdi(p, id);
  if (!prodi) notFound();
  const upps = await prisma.upps.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } });
  return (
    <>
      <JudulHalaman
        judul={prodi.nama}
        deskripsi={`${prodi.upps.nama} · ${prodi.upps.perguruanTinggi}`}
        remah={[{ label: "Prodi dan UPPS", href: "/admin/prodi" }, { label: prodi.nama }]}
      />
      <Petunjuk
        kunci="admin-prodi-ubah"
        fungsi="Identitas program studi. Data ini dipakai di halaman identitas pengusul dan prompt penyusunan narasi."
        langkah={[
          "Perbarui data yang berubah (misalnya SK akreditasi terbaru), lalu simpan.",
        ]}
      />
      <FormProdi
        id={prodi.id}
        upps={upps}
        awal={{
          uppsId: prodi.uppsId,
          nama: prodi.nama,
          jenjang: prodi.jenjang as KodeJenjang,
          kodePddikti: prodi.kodePddikti ?? "",
          identitas: (prodi.identitas ?? {}) as Partial<IdentitasProdi>,
        }}
      />
    </>
  );
}

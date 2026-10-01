import type { Metadata } from "next";
import { wajibSuperAdmin } from "@/lib/sesi";
import { prisma } from "@/lib/db";
import { JudulHalaman } from "@/components/judul-halaman";
import { FormProdi } from "../form-prodi";

export const metadata: Metadata = { title: "Tambah program studi" };

export default async function HalamanProdiBaru({ searchParams }: PageProps<"/admin/prodi/baru">) {
  await wajibSuperAdmin();
  const { upps: uppsId } = await searchParams;
  const upps = await prisma.upps.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } });
  return (
    <>
      <JudulHalaman
        judul="Tambah program studi"
        remah={[{ label: "Prodi dan UPPS", href: "/admin/prodi" }, { label: "Tambah" }]}
      />
      <FormProdi
        upps={upps}
        awal={{
          uppsId: typeof uppsId === "string" ? uppsId : upps[0]?.id ?? "",
          nama: "",
          jenjang: "S1",
          kodePddikti: "",
          identitas: {},
        }}
      />
    </>
  );
}

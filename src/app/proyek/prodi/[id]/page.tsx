import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { ambilProdi } from "@/lib/data/organisasi";
import type { KodeJenjang } from "@/lib/domain/instrumen";
import { namaJenjang } from "@/lib/domain/instrumen";
import type { IdentitasProdi } from "@/lib/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormProdi } from "../form-prodi";

export const metadata: Metadata = { title: "Ubah program studi" };

export default async function HalamanUbahProdi({ params }: PageProps<"/proyek/prodi/[id]">) {
  const p = await wajibPenanggungJawab();
  const { id } = await params;
  const prodi = await ambilProdi(p, id);
  if (!prodi) notFound();
  return (
    <>
      <JudulHalaman
        judul={prodi.nama}
        deskripsi={namaJenjang(prodi.jenjang)}
        remah={[{ label: "Program studi", href: "/proyek/prodi" }, { label: prodi.nama }]}
      />
      <Petunjuk
        kunci="pj-prodi-ubah"
        fungsi="Identitas program studi. Data ini dipakai di halaman identitas pengusul dan prompt penyusunan narasi."
        langkah={["Perbarui data yang berubah (misalnya SK akreditasi terbaru dan tanggal berakhirnya), lalu simpan."]}
      />
      <FormProdi
        id={prodi.id}
        awal={{
          nama: prodi.nama,
          jenjang: prodi.jenjang as KodeJenjang,
          kodePddikti: prodi.kodePddikti ?? "",
          akreditasiBerlakuSampai: prodi.akreditasiBerlakuSampai ? prodi.akreditasiBerlakuSampai.toISOString().slice(0, 10) : "",
          identitas: (prodi.identitas ?? {}) as Partial<IdentitasProdi>,
        }}
      />
    </>
  );
}

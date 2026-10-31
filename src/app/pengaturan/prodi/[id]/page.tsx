import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { wajibPenanggungJawab } from "@/modules/bersama/sesi";
import { ambilProdi } from "@/modules/bersama/data/organisasi";
import type { KodeJenjang } from "@/modules/bersama/domain/jenjang";
import { namaJenjang } from "@/modules/bersama/domain/jenjang";
import type { IdentitasProdi } from "@/modules/bersama/validasi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormProdi } from "../form-prodi";

export const metadata: Metadata = { title: "Ubah program studi" };

export default async function HalamanUbahProdi({ params }: PageProps<"/pengaturan/prodi/[id]">) {
  const p = await wajibPenanggungJawab();
  const { id } = await params;
  const prodi = await ambilProdi(p, id);
  if (!prodi) notFound();
  return (
    <>
      <JudulHalaman
        judul={prodi.nama}
        deskripsi={namaJenjang(prodi.jenjang)}
        remah={[{ label: "Program studi", href: "/pengaturan/prodi" }, { label: prodi.nama }]}
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

import type { Metadata } from "next";
import { wajibPenanggungJawab } from "@/lib/sesi";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { FormProdi } from "../form-prodi";

export const metadata: Metadata = { title: "Tambah program studi" };

export default async function HalamanProdiBaru() {
  await wajibPenanggungJawab();
  return (
    <>
      <JudulHalaman judul="Tambah program studi" remah={[{ label: "Program studi", href: "/proyek/prodi" }, { label: "Tambah" }]} />
      <Petunjuk
        kunci="pj-prodi-baru"
        fungsi="Formulir program studi baru."
        langkah={["Isi nama, jenjang, kode PDDikti, tanggal akreditasi berakhir, dan identitas pengusul, lalu simpan."]}
      />
      <FormProdi awal={{ nama: "", jenjang: "S1", kodePddikti: "", akreditasiBerlakuSampai: "", identitas: {} }} />
    </>
  );
}

import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanIdentitas from "@/modules/lkps/komponen/identitas/halaman-identitas";

export const metadata: Metadata = { title: "Identitas & Tim Penyusun · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/identitas. */
export default function Halaman() {
  return <WajibProdi judul="Identitas & Tim Penyusun"><HalamanIdentitas /></WajibProdi>;
}

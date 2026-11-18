import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanEkspor from "@/modules/lkps/komponen/ekspor/halaman-ekspor";

export const metadata: Metadata = { title: "Ekspor Excel · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/ekspor. */
export default function Halaman() {
  return <WajibProdi judul="Ekspor Excel"><HalamanEkspor /></WajibProdi>;
}

import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanImpor from "@/modules/lkps/komponen/impor/halaman-impor";

export const metadata: Metadata = { title: "Impor One Data · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/impor. */
export default function Halaman() {
  return <WajibProdi judul="Impor One Data"><HalamanImpor /></WajibProdi>;
}

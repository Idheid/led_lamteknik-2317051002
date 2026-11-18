import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanPenelitian from "@/modules/lkps/komponen/penelitian/halaman-penelitian";

export const metadata: Metadata = { title: "Kriteria 6: Penelitian · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/penelitian. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 6: Penelitian"><HalamanPenelitian /></WajibProdi>;
}

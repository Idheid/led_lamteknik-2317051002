import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanKerjasama from "@/modules/lkps/komponen/kerjasama/halaman-kerjasama";

export const metadata: Metadata = { title: "Kriteria 1: Tata Pamong & Kerjasama · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/kerjasama. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 1: Tata Pamong & Kerjasama"><HalamanKerjasama /></WajibProdi>;
}

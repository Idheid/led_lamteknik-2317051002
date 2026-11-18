import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanPendidikan from "@/modules/lkps/komponen/pendidikan/halaman-pendidikan";

export const metadata: Metadata = { title: "Kriteria 5: Pendidikan · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/pendidikan. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 5: Pendidikan"><HalamanPendidikan /></WajibProdi>;
}

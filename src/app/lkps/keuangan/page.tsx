import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanKeuangan from "@/modules/lkps/komponen/keuangan/halaman-keuangan";

export const metadata: Metadata = { title: "Kriteria 4: Keuangan, Sarana & Prasarana · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/keuangan. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 4: Keuangan, Sarana & Prasarana"><HalamanKeuangan /></WajibProdi>;
}

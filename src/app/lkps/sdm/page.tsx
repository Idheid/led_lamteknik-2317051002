import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanSdm from "@/modules/lkps/komponen/sdm/halaman-sdm";

export const metadata: Metadata = { title: "Kriteria 3: Sumber Daya Manusia · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/sdm. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 3: Sumber Daya Manusia"><HalamanSdm /></WajibProdi>;
}

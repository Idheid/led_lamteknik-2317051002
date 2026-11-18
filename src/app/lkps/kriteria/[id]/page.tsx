import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanKriteria from "@/modules/lkps/komponen/kriteria/halaman-kriteria";

export const metadata: Metadata = { title: "Kriteria · LKPS" };

/** Gabung LKPS G5: kriteria dinamis dari konfigurasi; isi di src/modules/lkps/komponen/kriteria. */
export default function Halaman({ params }: PageProps<"/lkps/kriteria/[id]">) {
  return <WajibProdi judul="Kriteria"><HalamanKriteria params={params} /></WajibProdi>;
}

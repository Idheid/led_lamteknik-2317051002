import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanPenjaminan from "@/modules/lkps/komponen/penjaminan/halaman-penjaminan";

export const metadata: Metadata = { title: "Kriteria 9: Sistem Penjaminan Mutu Internal · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/penjaminan. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 9: Sistem Penjaminan Mutu Internal"><HalamanPenjaminan /></WajibProdi>;
}

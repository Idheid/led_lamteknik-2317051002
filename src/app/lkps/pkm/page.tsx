import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanPkm from "@/modules/lkps/komponen/pkm/halaman-pkm";

export const metadata: Metadata = { title: "Kriteria 7: Pengabdian kepada Masyarakat · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/pkm. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 7: Pengabdian kepada Masyarakat"><HalamanPkm /></WajibProdi>;
}

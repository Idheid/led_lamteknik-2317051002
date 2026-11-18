import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanLuaran from "@/modules/lkps/komponen/luaran/halaman-luaran";

export const metadata: Metadata = { title: "Kriteria 8: Luaran & Capaian Tridharma · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/luaran. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 8: Luaran & Capaian Tridharma"><HalamanLuaran /></WajibProdi>;
}

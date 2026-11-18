import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanImpor from "@/modules/lkps/komponen/impor/halaman-impor";
import { oneDataAktif } from "@/modules/lkps/data/onedata/konfigurasi";

export const metadata: Metadata = { title: "Impor One Data · LKPS" };

/** Gabung LKPS G5/G6: halaman tipis; isi di src/modules/lkps/komponen/impor. Status One Data dibaca di server. */
export default function Halaman() {
  return <WajibProdi judul="Impor One Data"><HalamanImpor oneDataAktif={oneDataAktif()} /></WajibProdi>;
}

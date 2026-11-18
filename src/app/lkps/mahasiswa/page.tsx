import type { Metadata } from "next";
import { WajibProdi } from "@/modules/lkps/komponen/wajib-prodi";
import HalamanMahasiswa from "@/modules/lkps/komponen/mahasiswa/halaman-mahasiswa";

export const metadata: Metadata = { title: "Kriteria 2: Mahasiswa · LKPS" };

/** Gabung LKPS G5: halaman tipis; isi di src/modules/lkps/komponen/mahasiswa. */
export default function Halaman() {
  return <WajibProdi judul="Kriteria 2: Mahasiswa"><HalamanMahasiswa /></WajibProdi>;
}

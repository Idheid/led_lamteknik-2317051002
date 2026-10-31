import type { Metadata } from "next";
import { wajibTimProdi } from "@/modules/bersama/sesi";
import { penilaianProyek } from "@/modules/led/data/review";
import { LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Petunjuk } from "@/components/petunjuk";
import { Badge } from "@/components/ui/badge";
import { HalamanPenilaian } from "@/modules/led/komponen/penilaian/halaman-penilaian";

export const metadata: Metadata = { title: "Perkiraan nilai" };

/** Perkiraan nilai Tim Prodi (revisi 31 Okt 2026): usulan skor AI, skor sistem, skor asesor; Tim Prodi tidak mengubah skor. */
export default async function HalamanPerkiraanNilai({ params }: PageProps<"/led/[proyekId]/penilaian">) {
  const p = await wajibTimProdi();
  const { proyekId } = await params;
  const n = await penilaianProyek(p, proyekId);
  return (
    <>
      <JudulHalaman
        judul="Perkiraan nilai"
        deskripsi="Perkiraan, bukan nilai resmi LAM Teknik"
        remah={[{ label: "Beranda LED", href: `/led/${proyekId}` }, { label: "Perkiraan nilai" }]}
        aksi={<Badge variant="outline">{LABEL_REVIEW[n.review]}</Badge>}
      />
      <Petunjuk
        kunci="tim-perkiraan-nilai"
        fungsi="Memperkirakan nilai LED sebelum diajukan: skor otomatis dari rubrik (AI untuk butir narasi, sistem untuk butir angka dari LKPS) dan skor asesor bila sudah ada."
        langkah={[
          "Klik Hitung usulan skor setelah narasi tersusun. Butir yang narasinya tidak berubah tidak dihitung ulang.",
          "Buka baris butir untuk membaca narasinya, alasan AI, dan unsur skor 4 yang masih kurang, lalu perbaiki narasinya.",
          "Skor resmi tetap diberikan asesor; Tim Prodi tidak bisa mengubah skor.",
        ]}
      />
      <HalamanPenilaian proyekId={proyekId} data={n} mode="tim" />
    </>
  );
}

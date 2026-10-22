import type { Metadata } from "next";
import { wajibAsesor } from "@/lib/sesi";
import { penilaianProyek } from "@/lib/data/review";
import { LABEL_REVIEW } from "@/lib/domain/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { FormPenilaian } from "./form-penilaian";

export const metadata: Metadata = { title: "Penilaian akhir" };

/** Penilaian akhir asesor (revisi 22 Okt 2026): skor 0-4 per butir sesuai deskriptor matriks, lalu keputusan. */
export default async function HalamanPenilaian({ params }: PageProps<"/asesor/[proyekId]/penilaian">) {
  const p = await wajibAsesor();
  const { proyekId } = await params;
  const n = await penilaianProyek(p, proyekId);
  return (
    <>
      <JudulHalaman
        judul="Penilaian akhir"
        deskripsi="Pilih skor 0–4 per butir; setiap pilihan menampilkan deskriptor matriks untuk skor itu. Untuk butir angka, skor hitungan sistem dari LKPS menjadi acuan; skor yang berbeda wajib diberi alasan."
        remah={[{ label: "Ringkasan review", href: `/asesor/${proyekId}` }, { label: "Penilaian akhir" }]}
        aksi={<Badge variant={n.review === "direview" ? "default" : "outline"}>{LABEL_REVIEW[n.review]}</Badge>}
      />
      <FormPenilaian proyekId={proyekId} data={n} />
    </>
  );
}

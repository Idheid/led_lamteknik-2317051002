import type { Metadata } from "next";
import { wajibPeran } from "@/modules/bersama/sesi";
import { penilaianProyek } from "@/modules/led/data/review";
import { LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { HalamanPenilaian } from "@/modules/led/komponen/penilaian/halaman-penilaian";

export const metadata: Metadata = { title: "Penilaian" };

/**
 * Penilaian (revisi 31 Okt 2026): item pertama menu LED asesor. Asesor membaca narasi tiap butir di halaman yang sama,
 * memilih skor 0-4 (skor otomatis AI/sistem sebagai acuan), lalu memutuskan. Admin UPPS membaca tanpa mengubah.
 */
export default async function HalamanPenilaianAsesor({ params }: PageProps<"/led/asesor/[proyekId]/penilaian">) {
  const p = await wajibPeran("ASESOR", "ADMIN");
  const { proyekId } = await params;
  const n = await penilaianProyek(p, proyekId);
  return (
    <>
      <JudulHalaman
        judul="Penilaian"
        deskripsi="Skor 0–4 per butir sesuai deskriptor matriks; nilai = bobot × skor"
        remah={[{ label: "Ringkasan review", href: `/led/asesor/${proyekId}` }, { label: "Penilaian" }]}
        aksi={<Badge variant={n.review === "direview" ? "default" : "outline"}>{LABEL_REVIEW[n.review]}</Badge>}
      />
      <HalamanPenilaian proyekId={proyekId} data={n} mode={p.peran === "ADMIN" ? "baca" : "asesor"} />
    </>
  );
}

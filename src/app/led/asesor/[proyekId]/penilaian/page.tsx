import type { Metadata } from "next";
import { wajibPeran } from "@/modules/bersama/sesi";
import { penilaianProyek } from "@/modules/led/data/review";
import { LABEL_REVIEW } from "@/modules/led/domain/kesiapan";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { FormPenilaian } from "./form-penilaian";

export const metadata: Metadata = { title: "Penilaian akhir" };

/** Penilaian akhir asesor (revisi 22 Okt 2026): skor 0-4 per butir sesuai deskriptor matriks, lalu keputusan. */
export default async function HalamanPenilaian({ params }: PageProps<"/led/asesor/[proyekId]/penilaian">) {
  const p = await wajibPeran("ASESOR", "ADMIN");
  const { proyekId } = await params;
  const n = await penilaianProyek(p, proyekId);
  return (
    <>
      <JudulHalaman
        judul="Penilaian akhir"
        deskripsi="Skor 0–4 per butir sesuai deskriptor matriks"
        remah={[{ label: "Ringkasan review", href: `/led/asesor/${proyekId}` }, { label: "Penilaian akhir" }]}
        aksi={<Badge variant={n.review === "direview" ? "default" : "outline"}>{LABEL_REVIEW[n.review]}</Badge>}
      />
      <FormPenilaian proyekId={proyekId} data={n} hanyaBaca={p.peran === "ADMIN"} />
    </>
  );
}

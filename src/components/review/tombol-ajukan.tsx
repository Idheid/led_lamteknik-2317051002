"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IkonSibuk, useAksi } from "@/components/aksi-klien";
import { aksiAjukanReview } from "@/app/review/aksi";

/** PJ mengajukan LED untuk direview asesor (Draf atau Perlu revisi → Direview). */
export function TombolAjukanReview({ proyekId, ulang, nonaktif }: { proyekId: string; ulang: boolean; nonaktif?: boolean }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <Button size="sm" disabled={sibuk || nonaktif} onClick={() => jalankan(() => aksiAjukanReview(proyekId), { sukses: "Review diajukan; asesor diberi tahu." })}>
      {sibuk ? <IkonSibuk sibuk /> : <Send aria-hidden />}
      {ulang ? "Ajukan review ulang" : "Ajukan review"}
    </Button>
  );
}

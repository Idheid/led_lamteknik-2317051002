"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAksi } from "@/components/aksi-klien";
import { aksiTugaskanAsesor } from "@/app/led/aksi-review";

const KOSONG = "__kosong__";

export function PilihAsesor({ proyekId, asesorId, pilihan }: { proyekId: string; asesorId: string | null; pilihan: { id: string; nama: string }[] }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <Select
      value={asesorId ?? KOSONG}
      disabled={sibuk}
      onValueChange={(v) => jalankan(() => aksiTugaskanAsesor(proyekId, v === KOSONG ? null : v), {
        sukses: v === KOSONG ? "Asesor dilepas dari LED ini." : "Asesor ditugaskan dan diberi tahu.",
      })}
    >
      <SelectTrigger size="sm" className="w-60" aria-label="Asesor"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={KOSONG}>Belum ada asesor</SelectItem>
        {pilihan.map((a) => <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

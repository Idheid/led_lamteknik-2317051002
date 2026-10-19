"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiHapusSubBagian } from "@/app/proyek/instrumen/aksi";

export function TombolHapusSubBagian({ id, kode }: { id: string; kode: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={
        <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Hapus ${kode}`}>
          <Trash2 aria-hidden />
        </Button>
      }
      judul={`Hapus sub-bagian ${kode}?`}
      deskripsi="Pemetaan butir ke sub-bagian ini ikut terhapus; butirnya tetap ada."
      onKonfirmasi={() => jalankan(() => aksiHapusSubBagian(id), { sukses: "Sub-bagian dihapus." })}
    />
  );
}

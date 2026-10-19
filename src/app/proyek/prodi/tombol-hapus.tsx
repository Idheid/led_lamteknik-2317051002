"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiHapusProdi } from "./aksi";

export function TombolHapusProdi({ id, nama }: { id: string; nama: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={
        <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label={`Hapus ${nama}`}>
          <Trash2 aria-hidden />
        </Button>
      }
      judul={`Hapus ${nama}?`}
      deskripsi="Prodi yang sudah punya LED tidak bisa dihapus."
      onKonfirmasi={() => jalankan(() => aksiHapusProdi(id), { sukses: "Program studi dihapus." })}
    />
  );
}

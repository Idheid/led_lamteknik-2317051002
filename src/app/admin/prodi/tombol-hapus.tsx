"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiHapusProdi, aksiHapusUpps } from "../aksi";

export function TombolHapusUpps({ id, nama }: { id: string; nama: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={
        <Button variant="ghost" size="sm" disabled={sibuk}>
          <Trash2 aria-hidden />
          Hapus UPPS
        </Button>
      }
      judul={`Hapus ${nama}?`}
      deskripsi="UPPS hanya bisa dihapus bila tidak punya program studi."
      onKonfirmasi={() => jalankan(() => aksiHapusUpps(id), { sukses: "UPPS dihapus." })}
    />
  );
}

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
      deskripsi="Prodi yang sudah punya proyek LED atau akun penanggung jawab tidak bisa dihapus."
      onKonfirmasi={() => jalankan(() => aksiHapusProdi(id), { sukses: "Program studi dihapus." })}
    />
  );
}

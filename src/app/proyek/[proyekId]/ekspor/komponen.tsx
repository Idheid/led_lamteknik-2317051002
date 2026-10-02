"use client";

import { FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiHapusEkspor, aksiMulaiEkspor } from "@/app/proyek/aksi";

export function TombolEkspor({ proyekId, bisa }: { proyekId: string; bisa: boolean }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <Button
      disabled={!bisa || sibuk}
      onClick={() => jalankan(() => aksiMulaiEkspor(proyekId), {
        lalu: () => toast.success("Ekspor masuk antrean. Berkas siap diunduh dalam beberapa saat; halaman boleh ditinggal."),
      })}
    >
      {sibuk ? <IkonSibuk sibuk /> : <FileDown aria-hidden />}
      Ekspor ke Word
    </Button>
  );
}

export function TombolHapusEkspor({ proyekId, eksporId }: { proyekId: string; eksporId: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <TombolKonfirmasi
      pemicu={<Button variant="ghost" size="icon-sm" aria-label="Hapus berkas ekspor" disabled={sibuk}><Trash2 /></Button>}
      judul="Hapus berkas ekspor ini?"
      deskripsi="Berkas Word hasil ekspor ini dihapus. Narasi dan riwayat versi tidak terpengaruh."
      onKonfirmasi={() => jalankan(() => aksiHapusEkspor(proyekId, eksporId), { sukses: "Berkas ekspor dihapus." })}
    />
  );
}

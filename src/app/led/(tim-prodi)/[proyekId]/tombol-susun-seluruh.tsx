"use client";

import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { aksiSusunSeluruh } from "../aksi";

/**
 * Tombol "Susun seluruh LED" (revisi 31 Okt 2026, Pak Tris): menyusun draf semua bagian sekaligus, dari kriteria sampai
 * kata pengantar dan ringkasan, supaya Tim Prodi tinggal menyunting. Konfirmasi menyebut jumlah sub-bagian.
 */
export function TombolSusunSeluruh({ proyekId, bagian, jumlahSub, nonaktif, alasan }: {
  proyekId: string; bagian: string[]; jumlahSub: number; nonaktif: boolean; alasan: string | null;
}) {
  const { sibuk, jalankan } = useAksi();
  return (
    <div className="flex flex-col gap-1">
      <TombolKonfirmasi
        pemicu={<Button size="lg" disabled={nonaktif || sibuk || jumlahSub === 0}><IkonSibuk sibuk={sibuk} /><Wand2 aria-hidden />Susun seluruh LED</Button>}
        judul="Susun seluruh LED?"
        deskripsi={
          <>
            {jumlahSub} sub-bagian dari {bagian.length} bagian akan disusun berurutan: {bagian.join(", ")}. Sub-bagian yang sudah
            ditandai selesai dilewati. Draf yang sudah ada disimpan sebagai versi lama dan bisa dipulihkan. Penyusunan berjalan di
            latar dan bisa dibatalkan kapan saja.
          </>
        }
        labelAksi="Susun sekarang"
        berbahaya={false}
        onKonfirmasi={() => jalankan(() => aksiSusunSeluruh(proyekId), { sukses: "Penyusunan seluruh LED dimulai." })}
      />
      {alasan && <span className="text-xs text-muted-foreground">{alasan}</span>}
    </div>
  );
}

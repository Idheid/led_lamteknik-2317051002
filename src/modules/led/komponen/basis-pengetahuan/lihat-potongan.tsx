"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IkonSibuk } from "@/components/aksi-klien";
import { aksiPotonganDokumen } from "@/app/led/(penyusun)/aksi";

interface Potongan {
  urutan: number;
  halaman: number | null;
  teks: string;
  terindeks: boolean;
}

/**
 * Lihat potongan satu dokumen (revisi 22 Okt 2026, Basis Pengetahuan): teks per potongan persis seperti yang disimpan
 * dan dicari, supaya PJ bisa mengecek apakah buktinya terbaca dengan benar.
 */
export function LihatPotongan({ dokumenId, nama, jumlah }: { dokumenId: string; nama: string; jumlah: number }) {
  const [buka, setBuka] = useState(false);
  const [data, setData] = useState<{ potongan: Potongan[]; model: string | null } | null>(null);
  const [sibuk, mulai] = useTransition();
  const muat = () => mulai(async () => {
    const r = await aksiPotonganDokumen(dokumenId);
    if (!r.ok) {
      toast.error(r.pesan);
      return;
    }
    setData(r.data);
    setBuka(true);
  });
  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 px-2 tabular-nums" onClick={muat} disabled={sibuk || jumlah === 0} aria-label={`Lihat ${jumlah} potongan ${nama}`}>
        {sibuk ? <IkonSibuk sibuk /> : <Layers aria-hidden />}
        {jumlah}
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">Potongan: {nama}</DialogTitle>
            <DialogDescription>
              {data?.potongan.length ?? 0} potongan (800–1.200 karakter, tumpang tindih ± 15%)
              {data?.model ? `, embedding ${data.model}` : ""}. Inilah teks yang dicari dan diberikan ke AI.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto pr-1">
            {data?.potongan.map((x) => (
              <li key={x.urutan} className="rounded-lg border p-3 text-sm">
                <div className="mb-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">#{x.urutan + 1}</span>
                  {x.halaman && <span>hlm. {x.halaman}</span>}
                  <span>{x.teks.length.toLocaleString("id-ID")} karakter</span>
                  {!x.terindeks && <span className="text-amber-700 dark:text-amber-300">belum ada embedding</span>}
                </div>
                <p className="whitespace-pre-line">{x.teks}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

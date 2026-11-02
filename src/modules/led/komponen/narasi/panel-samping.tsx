"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/modules/bersama/utils";

export interface ItemPeriksa {
  kunci: string;
  label: string;
  /** angka pada lencana; null = tanpa lencana */
  jumlah: number | null;
  /** lencana kuning bila ada yang perlu ditindaklanjuti */
  perhatian?: boolean;
  ikon: ReactNode;
  keterangan?: string;
  isi: ReactNode;
}

/**
 * Baris "Periksa" di atas editor narasi (perbaikan 1 Nov 2026, P4): tombol berlencana untuk Catatan asesor, Pemeriksaan,
 * dan Verifikasi. Klik membuka panel samping (Sheet, ± 26rem) yang bisa ditutup; panel tidak terbuka sendiri dan tidak
 * menghalangi editor, jadi sorotan kalimat dan klik sorotan tetap berfungsi.
 */
export function BarisPeriksa({ item, buka, onBuka }: { item: ItemPeriksa[]; buka: string | null; onBuka: (kunci: string | null) => void }) {
  const terbuka = item.find((x) => x.kunci === buka) ?? null;
  // isi panel terakhir dipertahankan selama animasi tutup
  const [kunciTerakhir, setKunciTerakhir] = useState(buka);
  if (buka && buka !== kunciTerakhir) setKunciTerakhir(buka);
  const tampil = terbuka ?? item.find((x) => x.kunci === kunciTerakhir) ?? null;
  if (item.length === 0) return null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Periksa narasi">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Periksa</span>
        {item.map((x) => (
          <Button
            key={x.kunci}
            type="button"
            size="sm"
            variant={buka === x.kunci ? "secondary" : "outline"}
            aria-pressed={buka === x.kunci}
            onClick={() => onBuka(buka === x.kunci ? null : x.kunci)}
          >
            {x.ikon}
            {x.label}
            {x.jumlah !== null && (
              <span
                className={cn(
                  "ml-0.5 min-w-5 rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                  x.perhatian ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100" : "bg-muted text-muted-foreground",
                )}
              >
                {x.jumlah}
              </span>
            )}
          </Button>
        ))}
      </div>
      <Sheet open={terbuka !== null} onOpenChange={(v) => !v && onBuka(null)} modal={false}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-[26rem]"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {tampil && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2">{tampil.ikon}{tampil.label}</SheetTitle>
                {tampil.keterangan && <SheetDescription>{tampil.keterangan}</SheetDescription>}
              </SheetHeader>
              <div className="flex flex-col gap-3 p-4">{tampil.isi}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

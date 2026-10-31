"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/modules/bersama/utils";
import { aksiTandaiDibaca } from "@/app/aksi-pemberitahuan";

interface Data {
  belumDibaca: number;
  daftar: { id: string; pesan: string; tautan: string | null; dibaca: boolean; waktu: string }[];
}

const JEDA_MS = 15_000;

/** Ikon lonceng (revisi 22 Okt 2026): pemberitahuan review asesor, diperbarui berkala tanpa muat ulang. */
export function Lonceng() {
  const router = useRouter();
  const [data, setData] = useState<Data>({ belumDibaca: 0, daftar: [] });
  const muat = useCallback(async () => {
    try {
      const r = await fetch("/api/pemberitahuan", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      // coba lagi pada putaran berikutnya
    }
  }, []);
  useEffect(() => {
    // muat pertama sedikit ditunda supaya tidak berebut dengan render halaman
    const awal = setTimeout(() => void muat(), 300);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void muat();
    }, JEDA_MS);
    return () => {
      clearTimeout(awal);
      clearInterval(t);
    };
  }, [muat]);

  const buka = async (x: Data["daftar"][number]) => {
    if (!x.dibaca) await aksiTandaiDibaca(x.id);
    void muat();
    if (x.tautan) router.push(x.tautan);
  };

  return (
    <DropdownMenu onOpenChange={(b) => b && void muat()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 rounded-full [&_svg]:size-5" aria-label={`Pemberitahuan${data.belumDibaca ? `, ${data.belumDibaca} belum dibaca` : ""}`}>
          <Bell aria-hidden />
          {data.belumDibaca > 0 && (
            <span className="absolute top-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-semibold text-white tabular-nums ring-2 ring-background">
              {data.belumDibaca > 99 ? "99+" : data.belumDibaca}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Pemberitahuan
          {data.belumDibaca > 0 && (
            <button type="button" className="text-xs font-normal text-primary hover:underline" onClick={async () => { await aksiTandaiDibaca(null); void muat(); }}>
              Tandai semua dibaca
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data.daftar.length === 0 && <DropdownMenuItem disabled>Belum ada pemberitahuan.</DropdownMenuItem>}
        {data.daftar.map((x) => (
          <DropdownMenuItem key={x.id} onSelect={() => void buka(x)} className="flex flex-col items-start gap-0.5">
            <span className={cn("line-clamp-2 text-sm", !x.dibaca && "font-medium")}>
              {!x.dibaca && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" aria-hidden />}
              {x.pesan}
            </span>
            <span className="text-xs text-muted-foreground">{new Date(x.waktu).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

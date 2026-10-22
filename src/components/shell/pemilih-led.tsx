"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Layers, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KUKI_LED } from "@/lib/kuki";

/** Ingat LED yang terakhir dibuka (kuki 1 tahun) supaya menu LED tetap ada saat PJ membuka menu fakultas. */
export function IngatLed({ id }: { id: string }) {
  useEffect(() => {
    document.cookie = `${KUKI_LED}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
  }, [id]);
  return null;
}

interface Led {
  id: string;
  nama: string;
  prodi: string;
}

/** Kotak LED yang sedang dibuka di atas sidebar, dengan daftar untuk berpindah LED (revisi 23 Okt 2026). */
export function PemilihLed({ aktif, pilihan }: { aktif: Led | null; pilihan: (Led & { arsip: boolean })[] }) {
  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left shadow-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <Layers className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">LED yang dibuka</span>
            <span className="block truncate text-sm font-medium">{aktif ? aktif.prodi : "Pilih LED"}</span>
            {aktif && <span className="block truncate text-xs text-muted-foreground">{aktif.nama}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Pindah ke LED</DropdownMenuLabel>
          {pilihan.length === 0 && <DropdownMenuItem disabled>Belum ada LED.</DropdownMenuItem>}
          {pilihan.map((l) => (
            <DropdownMenuItem key={l.id} asChild>
              <Link href={`/proyek/${l.id}`} className="flex items-start gap-2">
                <Check className={`mt-0.5 size-4 shrink-0 ${aktif?.id === l.id ? "opacity-100" : "opacity-0"}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{l.prodi}</span>
                  <span className="block truncate text-xs text-muted-foreground">{l.nama}{l.arsip ? " · diarsipkan" : ""}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/proyek"><Layers aria-hidden />Semua LED</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/proyek/baru"><Plus aria-hidden />Buat LED baru</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

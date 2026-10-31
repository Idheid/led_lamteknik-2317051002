"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/modules/bersama/utils";

/**
 * Tombol pindah modul di kepala halaman (31 Okt 2026): satu website, dua modul. Ikon kotak kembali ke halaman awal
 * (pilih modul); LKPS dan LED berpindah langsung. Modul aktif dibaca dari alamat halaman (/lkps/... atau /led/...).
 */
export function PindahModul({ hrefLed }: { hrefLed: string }) {
  const jalur = usePathname();
  const aktif = jalur === "/lkps" || jalur.startsWith("/lkps/") ? "lkps" : jalur === "/led" || jalur.startsWith("/led/") ? "led" : null;
  const modul = [
    { kode: "lkps", label: "LKPS", judul: "Laporan Kinerja Program Studi", href: "/lkps" },
    { kode: "led", label: "LED", judul: "Laporan Evaluasi Diri", href: hrefLed },
  ] as const;
  return (
    <nav aria-label="Pindah modul" className="flex min-w-0 items-center gap-2">
      <Link
        href="/"
        title="Halaman awal: pilih modul"
        aria-label="Halaman awal: pilih modul"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <LayoutGrid className="size-4" aria-hidden />
      </Link>
      <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
        {modul.map((m) => (
          <Link
            key={m.kode}
            href={m.href}
            title={m.judul}
            aria-current={aktif === m.kode ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              aktif === m.kode ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </Link>
        ))}
      </div>
      <span className="hidden truncate text-sm text-muted-foreground lg:inline">
        {aktif === "lkps" ? "Laporan Kinerja Program Studi" : aktif === "led" ? "Laporan Evaluasi Diri" : "LAM Teknik"}
      </span>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/modules/bersama/utils";

/**
 * Tombol pindah modul di kepala halaman: LKPS dan LED berpindah langsung; ikon kotak kembali ke beranda peran.
 * Desain form 2 (2 Nov 2026, atas permintaan Adrianne): tombol ini dipertahankan untuk fitur khusus tiap modul, sedangkan
 * fitur bersama ada di grup "Bersama" di sidebar. Modul aktif dibaca dari alamat halaman; Data LKPS yang sementara
 * diunggah ke LED (/led/{id}/lkps) dihitung sebagai LKPS. Halaman bersama (dashboard, pengaturan) tidak menandai modul.
 */
export function PindahModul({ hrefLed }: { hrefLed: string }) {
  const jalur = usePathname();
  const aktif = jalur === "/lkps" || jalur.startsWith("/lkps/") || /^\/led\/[^/]+\/lkps(\/|$)/.test(jalur) ? "lkps"
    : jalur === "/led" || jalur.startsWith("/led/") ? "led" : null;
  const modul = [
    { kode: "lkps", label: "LKPS", judul: "Laporan Kinerja Program Studi", href: "/lkps" },
    { kode: "led", label: "LED", judul: "Laporan Evaluasi Diri", href: hrefLed },
  ] as const;
  return (
    <nav aria-label="Pindah modul" className="flex min-w-0 items-center gap-2">
      <Link
        href="/"
        title="Beranda"
        aria-label="Beranda"
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
        {aktif === "lkps" ? "Laporan Kinerja Program Studi" : aktif === "led" ? "Laporan Evaluasi Diri" : "Bersama: LED dan LKPS LAM Teknik"}
      </span>
    </nav>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/modules/bersama/utils";
import { STATUS_BERJALAN } from "@/modules/bersama/tampil";

const GAYA: Record<string, { label: string; kelas: string }> = {
  diunggah: { label: "Menunggu antrean", kelas: "bg-muted text-muted-foreground" },
  diproses: { label: "Diproses", kelas: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" },
  dibaca: { label: "Terbaca", kelas: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  siap: { label: "Siap dicari", kelas: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  gagal: { label: "Gagal", kelas: "bg-destructive/10 text-destructive" },
  menunggu_kunci: { label: "Menunggu kunci API", kelas: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
};


export function LencanaProses({ status }: { status: string }) {
  const g = GAYA[status] ?? { label: status, kelas: "bg-muted" };
  return (
    <Badge className={cn("gap-1 border-transparent", g.kelas)}>
      {STATUS_BERJALAN.includes(status) && <Loader2 className="size-3 animate-spin" aria-hidden />}
      {g.label}
    </Badge>
  );
}

/** Segarkan data halaman berkala selama masih ada proses di antrean (notifikasi, bukan layar menunggu). */
export function PemantauProses({ aktif, detik = 3 }: { aktif: boolean; detik?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!aktif) return;
    const t = setInterval(() => router.refresh(), detik * 1000);
    return () => clearInterval(t);
  }, [aktif, detik, router]);
  return null;
}

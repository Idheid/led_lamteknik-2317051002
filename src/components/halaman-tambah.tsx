import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import type { Remah } from "@/components/judul-halaman";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Halaman khusus menambah data (revisi 23 Okt 2026; tata letak 26 Okt 2026): kartu selebar halaman, tautan kembali
 * kecil di atas judul (seperti remah roti), keterangan di dalam kartu, formulir memenuhi kartu.
 */
export function HalamanTambah({ judul, remah, kembali, children, catatan }: {
  judul: string;
  remah: Remah[];
  kembali: string;
  children: ReactNode;
  catatan?: ReactNode;
}) {
  const labelKembali = remah[0]?.label ?? "daftar";
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href={kembali} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />{labelKembali}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{judul}</h1>
      </div>
      <Card className="w-full rounded-2xl">
        <CardContent className="flex flex-col gap-6 px-6 py-2 sm:px-8">
          {catatan && (
            <div className="flex gap-3 rounded-lg bg-primary/5 p-4 text-sm leading-relaxed">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>{catatan}</div>
            </div>
          )}
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

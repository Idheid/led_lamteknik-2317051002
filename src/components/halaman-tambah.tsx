import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import type { Remah } from "@/components/judul-halaman";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Halaman khusus menambah data (revisi 23 Okt 2026; tata letak 26 Okt 2026): satu kolom di tengah yang cukup lebar,
 * tautan "Kembali ke …" di kiri atas (arah baca), keterangan di dalam kartu, formulir memenuhi kartu.
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 py-2">
      <Link
        href={kembali}
        className="inline-flex w-fit items-center gap-2 rounded-md py-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />Kembali ke {labelKembali}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{judul}</h1>
      <Card className="w-full">
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

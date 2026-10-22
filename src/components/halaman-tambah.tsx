import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JudulHalaman, type Remah } from "@/components/judul-halaman";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Halaman khusus menambah data (revisi 23 Okt 2026): satu formulir, tombol Kembali ke daftar. Daftar data (LKPS,
 * dokumen, kunci API) tidak lagi berbagi halaman dengan formulir unggah supaya tidak penuh.
 */
export function HalamanTambah({ judul, remah, kembali, children, catatan }: {
  judul: string;
  remah: Remah[];
  kembali: string;
  children: ReactNode;
  catatan?: ReactNode;
}) {
  return (
    <>
      <JudulHalaman
        judul={judul}
        remah={remah}
        aksi={<Button asChild variant="outline"><Link href={kembali}><ArrowLeft aria-hidden />Kembali</Link></Button>}
      />
      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
      {catatan && <div className="max-w-2xl text-sm text-muted-foreground">{catatan}</div>}
    </>
  );
}

import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataKosong } from "@/modules/led/domain/rangkaian";

/**
 * Halaman muka (sampul), identitas pengusul, dan tim penyusun tidak disusun AI: isinya diambil dari data saat ekspor
 * (revisi 31 Okt 2026). Kartu ini menandainya "otomatis dari data" dan menunjukkan data yang masih kosong.
 */
export function HalamanOtomatis({ proyekId, kosong }: { proyekId: string; kosong: DataKosong }) {
  const baris = [
    { judul: "Halaman muka (sampul)", kosong: kosong.muka, href: `/led/${proyekId}/halaman-muka`, sumber: "Halaman muka & identitas" },
    { judul: "Identitas pengusul", kosong: kosong.identitas, href: `/led/${proyekId}/halaman-muka`, sumber: "Halaman muka & identitas" },
    { judul: "Tim penyusun (Tabel 2.1, 2.2)", kosong: kosong.tim, href: `/led/${proyekId}/tim`, sumber: "Tim penyusun" },
  ];
  return (
    <ul className="divide-y text-sm">
      {baris.map((b) => (
        <li key={b.judul} className="flex flex-col gap-1 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {b.kosong.length ? <CircleAlert className="size-4 text-amber-600" aria-hidden /> : <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />}
            <span className="font-medium">{b.judul}</span>
            <Badge variant="secondary">otomatis dari data</Badge>
          </div>
          {b.kosong.length > 0 ? (
            <p className="pl-6 text-xs text-muted-foreground">
              Belum diisi: {b.kosong.join(", ")}. Lengkapi di <Link className="text-primary underline" href={b.href}>{b.sumber}</Link>.
            </p>
          ) : (
            <p className="pl-6 text-xs text-muted-foreground">Data lengkap.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

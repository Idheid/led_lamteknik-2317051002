"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { simpanSemuaTertunda } from "@/modules/bersama/simpan-tertunda";

/**
 * Pemilih sub-bagian berbentuk dropdown ("2 dari 7"), pengganti kolom daftar sub-bagian di kanan halaman (perbaikan
 * 1 Nov 2026, P4). Seperti tombol Sebelumnya/Berikutnya, isian yang belum tersimpan disimpan dulu sebelum pindah.
 */
export function PemilihSub({ kini, pilihan }: {
  kini: string;
  pilihan: { kode: string; label: string; href: string; status: string }[];
}) {
  const router = useRouter();
  const [pindah, mulai] = useTransition();
  const [menyimpan, setMenyimpan] = useState(false);
  const nomor = pilihan.findIndex((x) => x.kode === kini) + 1;
  return (
    <Select
      value={kini}
      disabled={pindah || menyimpan}
      onValueChange={async (kode) => {
        const x = pilihan.find((y) => y.kode === kode);
        if (!x || kode === kini) return;
        setMenyimpan(true);
        const ok = await simpanSemuaTertunda();
        setMenyimpan(false);
        if (!ok) {
          toast.error("Isian belum tersimpan. Periksa koneksi lalu coba lagi.");
          return;
        }
        mulai(() => router.push(x.href));
      }}
    >
      <SelectTrigger size="sm" className="w-auto min-w-36" aria-label="Pilih sub-bagian">
        <SelectValue>{nomor} dari {pilihan.length}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-w-md">
        {pilihan.map((x, i) => (
          <SelectItem key={x.kode} value={x.kode}>
            <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
            <span className="line-clamp-2">{x.label}</span>
            <span className="ml-1 text-xs text-muted-foreground">· {x.status}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

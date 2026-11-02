"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, PencilLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Dua tab berurutan di halaman sub-bagian (perbaikan 1 Nov 2026, P4): "1. Bahan untuk AI" dan "2. Narasi (masuk ke
 * Word)". Tab awal Narasi bila sudah ada draf. Kedua isi tetap terpasang (hanya disembunyikan), jadi isian yang belum
 * tersimpan tidak hilang saat berpindah tab. Bila draf baru muncul (generate selesai), tab pindah ke Narasi.
 */
export function TabSubBagian({ bahan, narasi, adaNarasi, kunciNarasi }: {
  bahan: ReactNode;
  narasi: ReactNode;
  adaNarasi: boolean;
  /** id versi aktif; berubah saat generate selesai */
  kunciNarasi: string | null;
}) {
  const [tab, setTab] = useState(adaNarasi ? "narasi" : "bahan");
  const sebelumnya = useRef(kunciNarasi);
  useEffect(() => {
    if (kunciNarasi && kunciNarasi !== sebelumnya.current) setTab("narasi");
    sebelumnya.current = kunciNarasi;
  }, [kunciNarasi]);
  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList className="h-auto">
        <TabsTrigger value="bahan" className="px-3 py-1.5"><FileText aria-hidden />1. Bahan untuk AI</TabsTrigger>
        <TabsTrigger value="narasi" className="px-3 py-1.5"><PencilLine aria-hidden />2. Narasi (masuk ke Word)</TabsTrigger>
      </TabsList>
      <TabsContent value="bahan" forceMount className="flex flex-col gap-6 data-[state=inactive]:hidden">{bahan}</TabsContent>
      <TabsContent value="narasi" forceMount className="data-[state=inactive]:hidden">{narasi}</TabsContent>
    </Tabs>
  );
}

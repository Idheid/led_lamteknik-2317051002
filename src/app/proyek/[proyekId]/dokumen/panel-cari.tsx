"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aksiCariDokumen } from "@/app/proyek/aksi";
import type { HasilCari } from "@/lib/data/pencarian";

export function PanelCari({ proyekId, pilihan }: { proyekId: string; pilihan: { kode: string; label: string }[] }) {
  const [kueri, setKueri] = useState("");
  const [sub, setSub] = useState("semua");
  const [hasil, setHasil] = useState<HasilCari[] | null>(null);
  const [catatan, setCatatan] = useState<string[]>([]);
  const [sibuk, mulai] = useTransition();

  function cari(e: React.FormEvent) {
    e.preventDefault();
    mulai(async () => {
      const r = await aksiCariDokumen(proyekId, kueri, sub === "semua" ? null : sub);
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      setHasil(r.data.hasil);
      setCatatan(r.data.catatan);
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={cari} className="flex flex-col gap-2 sm:flex-row">
        <Input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="contoh: tracer study waktu tunggu lulusan" aria-label="Kata pencarian" />
        <Select value={sub} onValueChange={setSub}>
          <SelectTrigger className="sm:w-64" aria-label="Saring sub-bagian"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="semua">Semua dokumen</SelectItem>
            {pilihan.map((s) => <SelectItem key={s.kode} value={s.kode}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={sibuk || kueri.trim().length < 2}>
          {sibuk ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          Cari
        </Button>
      </form>
      {catatan.map((c, i) => <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{c}</p>)}
      {hasil && hasil.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada potongan yang cocok.</p>}
      {hasil && hasil.length > 0 && (
        <ol className="space-y-2">
          {hasil.map((h, i) => (
            <li key={h.potonganId} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">D{i + 1}</span>
                <span className="font-medium text-foreground">{h.judul ?? h.namaBerkas}</span>
                {h.halaman && <span>hlm. {h.halaman}</span>}
                <Badge variant="outline">vektor #{h.peringkatVektor ?? "–"}</Badge>
                <Badge variant="outline">kata kunci #{h.peringkatKataKunci ?? "–"}</Badge>
              </div>
              <p className="line-clamp-4 whitespace-pre-line">{h.teks}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

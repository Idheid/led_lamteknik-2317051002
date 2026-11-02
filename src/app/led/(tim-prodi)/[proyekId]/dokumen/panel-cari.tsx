"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aksiCariDokumen, aksiKueriGenerate } from "@/app/led/(tim-prodi)/aksi";
import type { HasilCari } from "@/modules/led/data/pencarian";

/**
 * Uji cari (revisi 22 Okt 2026): 8 potongan yang akan diberikan ke AI beserta skor gabungan (RRF) dan peringkat
 * vektor/kata kunci. "Pakai kueri generate" mengisi kueri persis seperti saat generate sub-bagian terpilih.
 */
export function PanelCari({ proyekId, pilihan }: { proyekId: string; pilihan: { kode: string; label: string }[] }) {
  const [kueri, setKueri] = useState("");
  const [sub, setSub] = useState("semua");
  const [hasil, setHasil] = useState<HasilCari[] | null>(null);
  const [catatan, setCatatan] = useState<string[]>([]);
  const [sibuk, mulai] = useTransition();
  // kode sumber sama dengan saat generate: dokumen LED D1, D2, …; dokumen bersama fakultas U1, U2, …
  const kode = (() => {
    let d = 0;
    let u = 0;
    return (hasil ?? []).map((h) => (h.bersama ? `U${++u}` : `D${++d}`));
  })();

  function jalankan(q: string) {
    mulai(async () => {
      const r = await aksiCariDokumen(proyekId, q, sub === "semua" ? null : sub);
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      setHasil(r.data.hasil);
      setCatatan(r.data.catatan);
    });
  }

  function pakaiKueriGenerate() {
    mulai(async () => {
      const r = await aksiKueriGenerate(proyekId, sub);
      if (!r.ok) {
        toast.error(r.pesan);
        return;
      }
      setKueri(r.data);
      const c = await aksiCariDokumen(proyekId, r.data, sub);
      if (c.ok) {
        setHasil(c.data.hasil);
        setCatatan(c.data.catatan);
      }
    });
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          jalankan(kueri);
        }}
        className="flex flex-col gap-2"
      >
        <Textarea value={kueri} onChange={(e) => setKueri(e.target.value)} rows={2} placeholder="contoh: tracer study waktu tunggu lulusan" aria-label="Pertanyaan atau kata pencarian" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger className="sm:w-72" aria-label="Saring sub-bagian"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="semua">Semua dokumen</SelectItem>
              {pilihan.map((s) => <SelectItem key={s.kode} value={s.kode}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={sibuk || kueri.trim().length < 2}>
            {sibuk ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
            Cari
          </Button>
          <Button type="button" variant="outline" disabled={sibuk || sub === "semua"} onClick={pakaiKueriGenerate} title={sub === "semua" ? "Pilih sub-bagian dulu" : undefined}>
            <Wand2 aria-hidden />Pakai kueri generate
          </Button>
        </div>
      </form>
      {catatan.map((c, i) => <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{c}</p>)}
      {hasil && hasil.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada potongan yang cocok.</p>}
      {hasil && hasil.length > 0 && (
        <ol className="space-y-2">
          {hasil.map((h, i) => (
            <li key={h.potonganId} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{kode[i]}</span>
                <span className="font-medium text-foreground">{h.judul ?? h.namaBerkas}</span>
                {h.halaman && <span>hlm. {h.halaman}</span>}
                <span>potongan #{h.urutan + 1}</span>
                <Badge variant="secondary" className="tabular-nums" title="Skor RRF = Σ 1/(60 + peringkat)">skor {h.skor.toFixed(4)}</Badge>
                <Badge variant="outline">vektor #{h.peringkatVektor ?? "–"}</Badge>
                <Badge variant="outline">kata kunci #{h.peringkatKataKunci ?? "–"}</Badge>
                {h.bersama && <Badge variant="outline">bersama fakultas</Badge>}
              </div>
              <p className="line-clamp-4 whitespace-pre-line">{h.teks}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
